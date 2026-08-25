// ─────────────────────────────────────────────
//  Medi-Link Type Definitions
// ─────────────────────────────────────────────

// ── User ─────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
}

// ── Medication ────────────────────────────────
export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  days: number;
}

// ── Prescription ──────────────────────────────
export interface Prescription {
  id: string;
  patientName: string;
  date: string;           // 'YYYY-MM-DD'
  hospital: string;
  reason: string;         // 방문 사유. 서버의 VisitResponse.visitReason 에 대응
  medications: Medication[];
  imageUri: string | null;
}

// ── Schedule ──────────────────────────────────
export interface MedicationSchedule {
  id: string;
  date: string;           // 'YYYY-MM-DD'
  label: string;
  medications: string[];
  taken: boolean;
}

// ── Calendar ──────────────────────────────────
export interface CalendarDayInfo {
  hasMed: boolean;
  taken: boolean;         // true: 복약 완료 / false: 미복약
}

// ── OCR ───────────────────────────────────────
export interface OcrResult {
  patientName: string;
  date: string;
  hospital: string;
  medications: string;
}

// ── Chat ──────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  time: string;
}

// ── MedicationCheck ───────────────────────────
/** 서버 DoseStatus와 같은 값을 쓴다 (types/Api.ts) */
export type MedCheckStatus = 'PENDING' | 'TAKEN' | 'SKIPPED' | 'MISSED';

export interface MedCheckItem {
  id: string;
  rxId: string;           // 어느 처방전(병원)의 약인지
  name: string;
  dosage: string;
  time: string;           // '오전 8:00' 등
  status: MedCheckStatus;
}

export interface MedCheckGroup {
  period: '아침' | '점심' | '저녁' | '자기전';
  items: MedCheckItem[];
}

// ── SideEffect ────────────────────────────────
export type SideEffectLevel = 'none' | 'mild' | 'moderate' | 'severe';

export interface SideEffectItem {
  id: string;
  label: string;
  enabled: boolean;
  score: number;          // 0(나쁨) ~ 100(좋음)
  customValue?: string;
}

// ── Navigation ────────────────────────────────
export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  History: undefined;
  Profile: undefined;
};

export type HomeStackParamList = {
  HomeMain: undefined;
  Prescription: undefined;
};

export type HistoryStackParamList = {
  MedLog: undefined;
  SideEffect: undefined;
};
