// ─────────────────────────────────────────────
//  처방전 등록 중간 상태
//  처방전 화면 → 증상 대화 화면으로 넘어가는 한 번의 흐름에서만 쓴다.
//  구조화된 약 목록을 라우터 파라미터에 JSON으로 실으면 길이 제한에 걸리므로
//  모듈 하나에 담아두고 다음 화면이 꺼내 쓴다.
// ─────────────────────────────────────────────
import type { AnalyzedMedication } from '../types/Api';

export interface RegistrationDraft {
  /** 스캔을 위해 먼저 만들어 둔 방문 기록의 id */
  visitId: number;
  hospitalName: string;
  departmentName: string | null;
  /** 'YYYY-MM-DD' */
  visitedAt: string;
  rawOcrText: string | null;
  medications: AnalyzedMedication[];
  imageUri: string | null;
}

let draft: RegistrationDraft | null = null;

export function setDraft(next: RegistrationDraft) {
  draft = next;
}

export function getDraft(): RegistrationDraft | null {
  return draft;
}

export function patchDraft(changes: Partial<RegistrationDraft>) {
  if (draft) draft = { ...draft, ...changes };
}

export function clearDraft() {
  draft = null;
}
