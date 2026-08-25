// ─────────────────────────────────────────────
//  백엔드 DTO와 1:1로 맞춘 타입
//  com.medilink.admin.dto.* 및 auth/user DTO에 대응한다.
//  백엔드 DTO를 고치면 여기도 같은 PR에서 고쳐야 한다.
// ─────────────────────────────────────────────

export type UserRole = 'USER' | 'ADMIN';

export interface UserResponse {
  id: number;
  email: string;
  nickname: string;
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
}

// ── 대시보드 ─────────────────────────────────
export interface AdminDashboardResponse {
  userCount: number;
  prescriptionCount: number;
  /** 기록한 일정 중 복용 비율 (%) */
  averageAdherenceRate: number;
  /** 지식베이스에서 못 찾은 약 비율 (%) */
  ocrUnmatchedRate: number;
}

// ── 사용자 ───────────────────────────────────
export interface AdminUserSummary {
  id: number;
  email: string;
  nickname: string;
  role: UserRole;
  joinedAt: string;

  visitCount: number;
  medicationCount: number;

  doseTotal: number;
  doseTaken: number;
  adherenceRate: number;

  healthLogCount: number;
  chatMessageCount: number;
  reportCount: number;
  interactionWarningCount: number;

  lastActiveAt: string | null;
}

export type TreatmentStatus = 'REGISTERED' | 'IN_PROGRESS' | 'COMPLETED';

export interface AdminUserVisit {
  visitId: number;
  hospitalName: string;
  departmentName: string | null;
  visitReason: string | null;
  treatmentStatus: TreatmentStatus;
  visitedAt: string;
  medicationStartDate: string | null;
  medicationEndDate: string | null;

  medicationNames: string[];
  unmatchedMedicationCount: number;

  doseTotal: number;
  doseTaken: number;
  doseSkipped: number;
  doseMissed: number;

  healthLogCount: number;
  chatMessageCount: number;
  reportCount: number;
}

export type ActivityType = 'DOSE' | 'HEALTH_LOG' | 'CHAT' | 'REPORT' | 'INTERACTION';

export interface AdminActivity {
  type: ActivityType;
  summary: string;
  at: string;
}

export interface AdminUserDetail {
  summary: AdminUserSummary;
  visits: AdminUserVisit[];
  recentActivity: AdminActivity[];
}

// ── 지식베이스 ───────────────────────────────
export interface KnowledgeEntry {
  id: number;
  itemSeq: string;
  medicationName: string;
  purpose: string | null;
  sideEffects: string | null;
  updatedAt: string;
}

export interface KnowledgeEntryInput {
  itemSeq: string;
  medicationName: string;
  purpose: string | null;
  sideEffects: string | null;
}

export interface KnowledgeReindexResponse {
  documentsIndexed: number;
  chunksIndexed: number;
}

// ── OCR 실패 ─────────────────────────────────
export interface OcrFailure {
  medicationId: number;
  prescriptionId: number;
  medicationName: string;
  itemSeq: string | null;
  confidence: number | null;
}

// ── 오류 ─────────────────────────────────────
export interface ErrorResponse {
  status: number;
  message: string;
  timestamp: string;
}
