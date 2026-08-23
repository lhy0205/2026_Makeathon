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
export interface MedCheckItem {
  id: string;
  name: string;
  dosage: string;
  time: string;           // '오전 8:00' 등
  taken: boolean;
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
  customValue?: string;   // '직접 입력' 항목
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
