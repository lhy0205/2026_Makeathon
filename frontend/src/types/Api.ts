// ─────────────────────────────────────────────
//  API Response / Request Types (명세 기반)
// ─────────────────────────────────────────────

// ── 1. 인증 ───────────────────────────────────
export interface UserResponse {
  id: number;
  email: string;
  nickname: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserResponse;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nickname: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// ── 2. 병원 방문 ──────────────────────────────
export type TreatmentStatus = 'REGISTERED' | 'IN_PROGRESS' | 'COMPLETED';

export interface VisitRequest {
  hospitalName: string;
  departmentName: string | null;
  visitedAt: string;             // ISO string
  visitReason: string | null;
  medicationStartDate: string | null;
  medicationEndDate: string | null;
}

export interface VisitResponse {
  id: number;
  hospitalName: string;
  departmentName: string | null;
  visitedAt: string;
  visitReason: string | null;
  treatmentStatus: TreatmentStatus;
  medicationStartDate: string | null;
  medicationEndDate: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── 3. 처방전·약 ──────────────────────────────
export type AnalysisStatus = 'UPLOADED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface AnalyzedMedication {
  medicationName: string;
  dosage: number | null;
  doseUnit: string | null;
  frequencyPerDay: number | null;
  durationDays: number | null;
  instructions: string | null;
  purpose: string | null;
  sideEffectSummary: string | null;
  confidence: number;
  unmatched: boolean;
}

export interface PrescriptionAnalysisResponse {
  rawOcrText: string;
  hospitalName: string | null;
  departmentName: string | null;
  medications: AnalyzedMedication[];
}

export interface MedicationRequest {
  medicationName: string;
  dosage: number | null;
  doseUnit: string | null;
  frequencyPerDay: number | null;
  durationDays: number | null;
  instructions: string | null;
  purpose: string | null;
  sideEffectSummary: string | null;
}

export interface MedicationResponse {
  id: number;
  medicationName: string;
  dosage: number | null;
  doseUnit: string | null;
  frequencyPerDay: number | null;
  durationDays: number | null;
  instructions: string | null;
  purpose: string | null;
  sideEffectSummary: string | null;
}

export interface PrescriptionResponse {
  id: number;
  visitId: number;
  imageUrl: string | null;
  rawOcrText: string | null;
  analysisStatus: AnalysisStatus;
  analyzedAt: string | null;
  medications: MedicationResponse[];
}

// ── 4. 복약 일정 ──────────────────────────────
export type DoseStatus = 'PENDING' | 'TAKEN' | 'SKIPPED' | 'MISSED';

export interface MedicationDoseResponse {
  id: number;
  medicationId: number;
  medicationName: string;
  scheduledAt: string;
  doseStatus: DoseStatus;
  takenAt: string | null;
}

// ── 5. 건강 기록 ──────────────────────────────
export interface HealthLogRequest {
  recordedAt: string;
  symptomName: string | null;
  symptomSeverity: number | null;
  sideEffects: string[];
  bodyTemperature: number | null;
  sleepHours: number | null;
  waterIntakeMl: number | null;
  activityMinutes: number | null;
  memo: string | null;
}

export interface HealthLogResponse {
  id: number;
  visitId: number;
  recordedAt: string;
  symptomName: string | null;
  symptomSeverity: number | null;
  sideEffects: string[];
  bodyTemperature: number | null;
  sleepHours: number | null;
  waterIntakeMl: number | null;
  activityMinutes: number | null;
  memo: string | null;
  createdAt: string;
}

// ── 6. 챗봇 ──────────────────────────────────
export interface SourceResponse {
  title: string;
  url: string | null;
}

export interface ChatMessageResponse {
  id: number;
  role: 'USER' | 'ASSISTANT';
  content: string;
  sources: SourceResponse[];
  disclaimer: string | null;
  createdAt: string;
}

// ── 오류 ─────────────────────────────────────
export interface ErrorResponse {
  status: number;
  message: string;
  timestamp: string;
}
