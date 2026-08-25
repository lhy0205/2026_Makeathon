// ─────────────────────────────────────────────
//  API Client
// ─────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AuthResponse,
  ChatMessageResponse,
  HealthLogRequest,
  HealthLogResponse,
  LoginRequest,
  MedicationDoseResponse,
  MedicationRequest,
  MedicationResponse,
  PrescriptionAnalysisResponse,
  PrescriptionResponse,
  RegisterRequest,
  UserResponse,
  VisitRequest,
  VisitResponse,
} from '../types/Api';

// ── 설정 ─────────────────────────────────────
const BASE_URL = 'https://api.medi-link.com'; // 실제 서버 주소로 교체
const TOKEN_KEY = 'access_token';

// ── 토큰 저장소 ───────────────────────────────
export const tokenStorage = {
  get: () => AsyncStorage.getItem(TOKEN_KEY),
  set: (token: string) => AsyncStorage.setItem(TOKEN_KEY, token),
  remove: () => AsyncStorage.removeItem(TOKEN_KEY),
};

// ── 기본 fetch 래퍼 ───────────────────────────
async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await tokenStorage.get();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 204) return undefined as T;

  const data = await res.json();
  if (!res.ok) throw { status: res.status, message: data.message ?? '오류가 발생했습니다.' };

  return data as T;
}

// multipart/form-data 전용 (처방전 이미지 업로드)
async function requestFormData<T>(path: string, formData: FormData): Promise<T> {
  const token = await tokenStorage.get();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw { status: res.status, message: data.message ?? '오류가 발생했습니다.' };
  return data as T;
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

  complete: (visitId: number, completedAt: string) =>
    request<VisitResponse>(`/api/v1/visits/${visitId}/complete`, {
      method: 'PUT',
      body: JSON.stringify({ completedAt }),
    }),
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
  getToday: () =>
    request<MedicationDoseResponse[]>('/api/v1/doses/today'),

  getByDate: (date: string) =>
    request<MedicationDoseResponse[]>(`/api/v1/doses?date=${date}`),

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
