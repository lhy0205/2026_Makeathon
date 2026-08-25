// ─────────────────────────────────────────────
//  화면 전용 타입
//  서버와 주고받는 모양은 types/Api.ts 에 있다.
//  여기에는 화면이 다루기 편하도록 다시 빚은 형태만 둔다.
// ─────────────────────────────────────────────

// ── OCR ───────────────────────────────────────
/** 처방전 인식 결과를 사람이 확인·수정하는 폼의 값 */
export interface OcrResult {
  patientName: string;
  date: string;           // 'YYYY-MM-DD'
  hospital: string;
  medications: string;    // 약 목록을 한 줄로 합친 것
}

// ── Chat ──────────────────────────────────────
/** 말풍선 하나. 서버 ChatMessageResponse를 화면용으로 줄인 것 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  time: string;           // '오전 9:00'
}

// ── MedicationCheck ───────────────────────────
/** 서버 DoseStatus와 같은 값을 쓴다 (types/Api.ts) */
export type MedCheckStatus = 'PENDING' | 'TAKEN' | 'SKIPPED' | 'MISSED';

// ── SideEffect ────────────────────────────────
/** 부작용 체크 한 줄. 켜고 끄기 + 0(나쁨)~100(좋음) 컨디션 */
export interface SideEffectItem {
  id: string;
  label: string;
  enabled: boolean;
  score: number;
  customValue?: string;
}

// ── Navigation ────────────────────────────────
/**
 * 화면 이동은 expo-router가 맡는다.
 * 라우트 래퍼가 화면에 넘겨주는 최소한의 navigation 모양 —
 * @react-navigation 타입에 기대지 않는다.
 */
export interface ScreenNav {
  navigate?: (name: string) => void;
  replace?: (name: string) => void;
  goBack?: () => void;
}
