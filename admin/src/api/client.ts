// ─────────────────────────────────────────────
//  API Client
//  앱(frontend/src/api/Client.ts)과 같은 규칙을 쓴다 —
//  Bearer 토큰, 401이면 refresh 한 번 시도, 실패하면 로그아웃.
// ─────────────────────────────────────────────
import type {
  AdminDashboardResponse,
  AdminUserDetail,
  AdminUserSummary,
  AuthResponse,
  KnowledgeEntry,
  KnowledgeEntryInput,
  KnowledgeReindexResponse,
  OcrFailure,
} from './types';

// 비워두면 vite 프록시(/api → localhost:8080)를 탄다
const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

const ACCESS_KEY = 'admin_access_token';
const REFRESH_KEY = 'admin_refresh_token';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const tokenStorage = {
  get: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

/** 본문이 비었거나 JSON이 아닐 수 있다 */
async function parseBody(res: Response): Promise<any> {
  if (res.status === 204) return undefined;
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

// 여러 요청이 동시에 401을 받아도 갱신은 한 번만 한다
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = tokenStorage.getRefresh();
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return null;

      const auth = (await parseBody(res)) as AuthResponse;
      tokenStorage.set(auth.accessToken, auth.refreshToken);
      return auth.accessToken;
    } catch {
      return null;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = tokenStorage.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  const send = () => fetch(`${BASE_URL}${path}`, { ...options, headers });

  let res: Response;
  try {
    res = await send();
  } catch {
    throw new ApiError(0, `서버에 연결하지 못했습니다. (${BASE_URL || '개발 서버 프록시'})`);
  }

  // 로그인·갱신 자체가 401이면 갱신을 시도할 이유가 없다
  const canRefresh = !path.startsWith('/api/v1/auth/');
  if (res.status === 401 && canRefresh) {
    const fresh = await refreshAccessToken();
    if (fresh) {
      headers.Authorization = `Bearer ${fresh}`;
      res = await send();
    } else {
      onUnauthorized?.();
    }
  }

  const data = await parseBody(res);

  if (!res.ok) {
    // 관리자 권한이 없는 계정으로 들어온 경우를 구분해 준다
    if (res.status === 403) {
      throw new ApiError(403, '관리자 권한이 없는 계정입니다.');
    }
    throw new ApiError(res.status, data?.message ?? '오류가 발생했습니다.');
  }

  return data as T;
}

// ── 인증 ─────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<AuthResponse['user']>('/api/v1/users/me'),
};

// ── 관리자 ───────────────────────────────────
export const adminApi = {
  dashboard: () => request<AdminDashboardResponse>('/api/v1/admin/dashboard'),

  users: () => request<AdminUserSummary[]>('/api/v1/admin/users'),

  user: (userId: number) => request<AdminUserDetail>(`/api/v1/admin/users/${userId}`),

  ocrFailures: () => request<OcrFailure[]>('/api/v1/admin/ocr-failures'),

  knowledge: () => request<KnowledgeEntry[]>('/api/v1/admin/knowledge'),

  createKnowledge: (body: KnowledgeEntryInput) =>
    request<KnowledgeEntry>('/api/v1/admin/knowledge', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateKnowledge: (id: number, body: KnowledgeEntryInput) =>
    request<KnowledgeEntry>(`/api/v1/admin/knowledge/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteKnowledge: (id: number) =>
    request<void>(`/api/v1/admin/knowledge/${id}`, { method: 'DELETE' }),

  reindex: () =>
    request<KnowledgeReindexResponse>('/api/v1/admin/knowledge/reindex', { method: 'POST' }),
};
