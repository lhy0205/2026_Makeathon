// ─────────────────────────────────────────────
//  API Response / Request Types (명세 기반)
// ─────────────────────────────────────────────

// ── 1. 인증 ───────────────────────────────────
export interface UserResponse {
  id: number;
  email: string;
  nickname: string;
  role: 'USER' | 'ADMIN';
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
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
  visitedAt: string;             // 'YYYY-MM-DD' — 서버는 LocalDate로 받는다
  visitReason: string | null;
  medicationStartDate: string | null;
  medicationEndDate: string | null;
}

export interface VisitResponse {
  id: number;
  hospitalName: string;
  departmentName: string | null;
  visitedAt: string;             // 'YYYY-MM-DD'
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
  itemSeq: string | null;
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
  imageUrl: string;
}

export interface MedicationRequest {
  medicationName: string;
  itemSeq: string | null;
  dosage: number | null;
  doseUnit: string | null;
  frequencyPerDay: number | null;
  durationDays: number | null;
  instructions: string | null;
  purpose: string | null;
  sideEffectSummary: string | null;
  confidence: number | null;
  unmatched: boolean;
}

export interface MedicationResponse {
  id: number;
  medicationName: string;
  itemSeq: string | null;
  dosage: number | null;
  doseUnit: string | null;
  frequencyPerDay: number | null;
  durationDays: number | null;
  instructions: string | null;
  purpose: string | null;
  sideEffectSummary: string | null;
  confidence: number | null;
  unmatched: boolean;
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

export interface BatchDoseUpdateRequest {
  doseId: number;
  status: 'TAKEN' | 'SKIPPED';
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

// ── 7. 복약 일정 생성 ─────────────────────────
export interface CreateDosesRequest {
  startDate: string;             // 'YYYY-MM-DD'
  endDate: string;               // 'YYYY-MM-DD'
  times: string[];               // ['08:00:00', '20:00:00'] — 서버는 LocalTime으로 받는다
}

// ── 8. 리포트 ─────────────────────────────────
export interface ReportResponse {
  id: number;
  visitId: number;
  summary: string | null;
  symptomChanges: string | null;
  suspectedSideEffects: string | null;
  lifestyleSummary: string | null;
  adherenceRate: number;
  doctorNotes: string | null;
  generatedAt: string;
}

// ── 9. 치료 비교 ──────────────────────────────
export interface VisitHistoryItem {
  visitId: number;
  hospitalName: string;
  departmentName: string | null;
  visitedAt: string;             // 'YYYY-MM-DD'
  treatmentStatus: TreatmentStatus;
}

export interface ComparisonResponse {
  currentVisitId: number;
  pastVisitId: number;
  commonPoints: string[];
  differences: string[];
  summary: string | null;
  createdAt: string;
}

// ── 10. 시각화 ────────────────────────────────
export interface HealthTrendPoint {
  date: string;                  // 'YYYY-MM-DD'
  symptomSeverity: number | null;
  bodyTemperature: number | null;
}

export interface HealthTrendResponse {
  data: HealthTrendPoint[];
}

export interface LifestyleTrendPoint {
  date: string;
  sleepHours: number | null;
  waterIntakeMl: number | null;
  activityMinutes: number | null;
}

export interface LifestyleTrendResponse {
  data: LifestyleTrendPoint[];
}

export interface SymptomTrendPoint {
  date: string;
  symptomSeverity: number | null;
}

export interface TreatmentChartData {
  visitId: number;
  symptomTrend: SymptomTrendPoint[];
  adherenceRate: number;
  finalSymptomSeverity: number | null;
}

export interface TreatmentComparisonChartResponse {
  currentTreatment: TreatmentChartData | null;
  pastTreatment: TreatmentChartData | null;
}

export interface TreatmentSummaryResponse {
  initialSymptomSeverity: number | null;
  finalSymptomSeverity: number | null;
  initialBodyTemperature: number | null;
  finalBodyTemperature: number | null;
  majorSideEffects: string[];
  adherenceRate: number;
}

// ── 11. 푸시 토큰 ─────────────────────────────
export interface PushTokenResponse {
  id: number;
  token: string;
}

// ── 오류 ─────────────────────────────────────
export interface ErrorResponse {
  status: number;
  message: string;
  timestamp: string;
}
