// ─────────────────────────────────────────────
//  API Client
// ─────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import type {
  AuthResponse,
  ChatMessageResponse,
  ComparisonResponse,
  CreateDosesRequest,
  HealthLogRequest,
  HealthLogResponse,
  HealthTrendResponse,
  LifestyleTrendResponse,
  LoginRequest,
  MedicationDoseResponse,
  MedicationRequest,
  MedicationResponse,
  PrescriptionAnalysisResponse,
  PrescriptionResponse,
  PushTokenResponse,
  RegisterRequest,
  ReportResponse,
  TreatmentComparisonChartResponse,
  TreatmentSummaryResponse,
  UserResponse,
  VisitRequest,
  VisitResponse,
} from '../types/Api';

// ── 서버 주소 ─────────────────────────────────
// 1순위: .env 의 EXPO_PUBLIC_API_BASE_URL (배포·팀 공용 서버)
// 2순위: Expo 개발 서버와 같은 호스트의 8080 포트
//        (실기기는 localhost가 폰 자신을 가리키므로 PC의 LAN IP가 필요하다)
// 3순위: localhost — 웹/에뮬레이터 폴백
const DEFAULT_PORT = 8080;

function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  // '192.168.0.5:8081' 또는 'localhost:8081' 형태
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants.expoGoConfig as { debuggerHost?: string } | undefined)?.debuggerHost;
  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:${DEFAULT_PORT}`;

  return `http://localhost:${DEFAULT_PORT}`;
}

export const BASE_URL = resolveBaseUrl();

const TOKEN_KEY = 'access_token';

// ── 오류 ─────────────────────────────────────
/** status를 함께 들고 다니는 오류. 401이면 세션 만료로 처리한다 */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** 서버가 꺼져 있거나 주소가 틀렸을 때 — status 0 */
const networkError = () =>
  new ApiError(0, `서버에 연결하지 못했습니다. (${BASE_URL})`);

// ── 토큰 저장소 ───────────────────────────────
export const tokenStorage = {
  get: () => AsyncStorage.getItem(TOKEN_KEY),
  set: (token: string) => AsyncStorage.setItem(TOKEN_KEY, token),
  remove: () => AsyncStorage.removeItem(TOKEN_KEY),
};

// ── 401 처리 훅 ───────────────────────────────
// AuthContext가 등록해두고, 토큰이 만료되면 로그인 화면으로 되돌린다.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

// ── 응답 해석 ─────────────────────────────────
/** 본문이 비었거나 JSON이 아닐 수 있다. 그래도 앱이 죽지 않게 한다 */
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

async function handle<T>(res: Response): Promise<T> {
  const data = await parseBody(res);

  if (!res.ok) {
    if (res.status === 401) onUnauthorized?.();
    throw new ApiError(res.status, data?.message ?? '오류가 발생했습니다.');
  }

  return data as T;
}

// ── 기본 fetch 래퍼 ───────────────────────────
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await tokenStorage.get();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw networkError();
  }

  return handle<T>(res);
}

// multipart/form-data 전용 (처방전 이미지 업로드)
// Content-Type을 직접 넣으면 boundary가 빠져 서버가 파싱하지 못한다. fetch가 채우게 둔다.
async function requestFormData<T>(path: string, formData: FormData): Promise<T> {
  const token = await tokenStorage.get();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: formData });
  } catch {
    throw networkError();
  }

  return handle<T>(res);
}

// ── 1. 인증 ───────────────────────────────────
export const authApi = {
  register: (body: RegisterRequest) =>
    request<AuthResponse>('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: LoginRequest) =>
    request<AuthResponse>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  getMe: () =>
    request<UserResponse>('/api/v1/users/me'),

  updateMe: (body: { nickname: string }) =>
    request<UserResponse>('/api/v1/users/me', { method: 'PUT', body: JSON.stringify(body) }),
};

// ── 2. 병원 방문·달력 ─────────────────────────
export const visitApi = {
  create: (body: VisitRequest) =>
    request<VisitResponse>('/api/v1/visits', { method: 'POST', body: JSON.stringify(body) }),

  getAll: () =>
    request<VisitResponse[]>('/api/v1/visits'),

  getById: (visitId: number) =>
    request<VisitResponse>(`/api/v1/visits/${visitId}`),

  // 캘린더용 — year/month 기준 방문 목록
  getCalendar: (year: number, month: number) =>
    request<VisitResponse[]>(`/api/v1/visits/calendar?year=${year}&month=${month}`),

  update: (visitId: number, body: VisitRequest) =>
    request<VisitResponse>(`/api/v1/visits/${visitId}`, { method: 'PUT', body: JSON.stringify(body) }),

  delete: (visitId: number) =>
    request<void>(`/api/v1/visits/${visitId}`, { method: 'DELETE' }),

  /** completedAt은 'YYYY-MM-DD' — 서버는 LocalDate로 받는다 */
  complete: (visitId: number, completedAt: string) =>
    request<VisitResponse>(`/api/v1/visits/${visitId}/complete`, {
      method: 'PUT',
      body: JSON.stringify({ completedAt }),
    }),

  /**
   * 비교 대상으로 고를 수 있는 지난 방문 목록.
   * symptomCategory는 진료과명으로 부분 일치시킨다 — 빈 문자열이면 전체가 나온다.
   */
  getHistory: (symptomCategory = '') =>
    request<VisitResponse[]>(
      `/api/v1/visits/history?symptomCategory=${encodeURIComponent(symptomCategory)}`,
    ),
};

// ── 3. 처방전·약 ──────────────────────────────
export const prescriptionApi = {
  scan: (visitId: number, imageUri: string) => {
    const formData = new FormData();
    formData.append('image', { uri: imageUri, name: 'prescription.jpg', type: 'image/jpeg' } as any);
    return requestFormData<PrescriptionAnalysisResponse>(
      `/api/v1/visits/${visitId}/prescriptions/scan`,
      formData,
    );
  },

  create: (visitId: number, body: {
    imageUrl: string | null;
    rawOcrText: string | null;
    medications: MedicationRequest[];
  }) =>
    request<PrescriptionResponse>(`/api/v1/visits/${visitId}/prescriptions`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getByVisit: (visitId: number) =>
    request<PrescriptionResponse>(`/api/v1/visits/${visitId}/prescription`),

  updateMedication: (medicationId: number, body: MedicationRequest) =>
    request<MedicationResponse>(`/api/v1/medications/${medicationId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteMedication: (medicationId: number) =>
    request<void>(`/api/v1/medications/${medicationId}`, { method: 'DELETE' }),
};

// ── 4. 복약 일정 ──────────────────────────────
export const doseApi = {
  /** 약 하나에 기간·시간대를 주면 그만큼 복약 일정을 만들어 준다 */
  createDoses: (medicationId: number, body: CreateDosesRequest) =>
    request<MedicationDoseResponse[]>(`/api/v1/medications/${medicationId}/doses`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  /** 치료 한 건의 복약 일정 전체 — 진행률 계산에 쓴다 */
  getByVisit: (visitId: number) =>
    request<MedicationDoseResponse[]>(`/api/v1/visits/${visitId}/doses`),

  getToday: () =>
    request<MedicationDoseResponse[]>('/api/v1/doses/today'),

  /** date는 'YYYY-MM-DD' */
  getByDate: (date: string) =>
    request<MedicationDoseResponse[]>(`/api/v1/doses?date=${date}`),

  /** takenAt은 'YYYY-MM-DDTHH:mm:ss' — 서버는 LocalDateTime으로 받는다 */
  markTaken: (doseId: number, takenAt: string) =>
    request<MedicationDoseResponse>(`/api/v1/doses/${doseId}/taken`, {
      method: 'PUT',
      body: JSON.stringify({ takenAt }),
    }),

  markSkipped: (doseId: number) =>
    request<MedicationDoseResponse>(`/api/v1/doses/${doseId}/skipped`, { method: 'PUT' }),
};

// ── 5. 건강 기록 ──────────────────────────────
export const healthLogApi = {
  create: (visitId: number, body: HealthLogRequest) =>
    request<HealthLogResponse>(`/api/v1/visits/${visitId}/health-logs`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getByVisit: (visitId: number) =>
    request<HealthLogResponse[]>(`/api/v1/visits/${visitId}/health-logs`),

  getById: (healthLogId: number) =>
    request<HealthLogResponse>(`/api/v1/health-logs/${healthLogId}`),

  update: (healthLogId: number, body: HealthLogRequest) =>
    request<HealthLogResponse>(`/api/v1/health-logs/${healthLogId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: (healthLogId: number) =>
    request<void>(`/api/v1/health-logs/${healthLogId}`, { method: 'DELETE' }),
};

// ── 6. 챗봇 ──────────────────────────────────
export const chatApi = {
  send: (visitId: number, content: string) =>
    request<ChatMessageResponse>(`/api/v1/visits/${visitId}/chat/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  getMessages: (visitId: number) =>
    request<ChatMessageResponse[]>(`/api/v1/visits/${visitId}/chat/messages`),

  clearMessages: (visitId: number) =>
    request<void>(`/api/v1/visits/${visitId}/chat/messages`, { method: 'DELETE' }),
};

// ── 7. 리포트 ─────────────────────────────────
export const reportApi = {
  generate: (visitId: number) =>
    request<ReportResponse>(`/api/v1/visits/${visitId}/reports`, { method: 'POST' }),

  getByVisit: (visitId: number) =>
    request<ReportResponse[]>(`/api/v1/visits/${visitId}/reports`),

  getLatest: (visitId: number) =>
    request<ReportResponse>(`/api/v1/visits/${visitId}/reports/latest`),

  getById: (reportId: number) =>
    request<ReportResponse>(`/api/v1/reports/${reportId}`),

  delete: (reportId: number) =>
    request<void>(`/api/v1/reports/${reportId}`, { method: 'DELETE' }),
};

// ── 8. 치료 비교 ──────────────────────────────
export const comparisonApi = {
  create: (visitId: number, pastVisitId: number) =>
    request<ComparisonResponse>(`/api/v1/visits/${visitId}/comparisons`, {
      method: 'POST',
      body: JSON.stringify({ pastVisitId }),
    }),

  getLatest: (visitId: number) =>
    request<ComparisonResponse>(`/api/v1/visits/${visitId}/comparisons/latest`),
};

// ── 9. 시각화 ─────────────────────────────────
export const visualizationApi = {
  healthTrend: (visitId: number) =>
    request<HealthTrendResponse>(`/api/v1/visits/${visitId}/visualizations/health-trend`),

  lifestyleTrend: (visitId: number) =>
    request<LifestyleTrendResponse>(`/api/v1/visits/${visitId}/visualizations/lifestyle-trend`),

  summary: (visitId: number) =>
    request<TreatmentSummaryResponse>(`/api/v1/visits/${visitId}/visualizations/summary`),

  comparison: (visitId: number) =>
    request<TreatmentComparisonChartResponse>(`/api/v1/visits/${visitId}/visualizations/comparison`),
};

// ── 10. 푸시 토큰 ─────────────────────────────
export const pushTokenApi = {
  register: (token: string) =>
    request<PushTokenResponse>('/api/v1/push-tokens', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  delete: (pushTokenId: number) =>
    request<void>(`/api/v1/push-tokens/${pushTokenId}`, { method: 'DELETE' }),
};
