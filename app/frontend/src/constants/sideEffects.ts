// ─────────────────────────────────────────────
//  부작용 체크 항목
//  서버는 부작용을 자유 문자열 목록(HealthLogRequest.sideEffects)으로 받는다.
//  아래는 사용자가 매번 타이핑하지 않도록 미리 준비한 보기다.
// ─────────────────────────────────────────────
import type { SideEffectItem } from '../types';

export const SIDE_EFFECT_CATALOG: { id: string; label: string }[] = [
  { id: 'se_001', label: '구역감' },
  { id: 'se_002', label: '두통' },
  { id: 'se_003', label: '속쓰림' },
  { id: 'se_004', label: '어지러움' },
  { id: 'se_005', label: '발진' },
];

/** '직접 입력' 항목의 id — 화면에서 텍스트 입력으로 다룬다 */
export const CUSTOM_EFFECT_ID = 'se_custom';

/** 아무것도 고르지 않은 초기 상태 */
export function freshSideEffects(): SideEffectItem[] {
  return [
    ...SIDE_EFFECT_CATALOG.map((e) => ({ ...e, enabled: false, score: 50 })),
    { id: CUSTOM_EFFECT_ID, label: '직접 입력', enabled: false, score: 50, customValue: '' },
  ];
}

// ── 서버 값과의 환산 ──────────────────────────
// 화면의 score는 0(나쁨)~100(좋음)인데,
// 서버 symptomSeverity는 0~10이고 값이 클수록 증상이 심하다.
// (ai-server가 severity 감소를 '호전'으로 읽는다)
export const MAX_SEVERITY = 10;

/** 컨디션 점수(0~100) → 증상 심각도(0~10) */
export function scoreToSeverity(score: number): number {
  return Math.round(((100 - score) / 100) * MAX_SEVERITY);
}

/** 증상 심각도(0~10) → 컨디션 점수(0~100) */
export function severityToScore(severity: number): number {
  return Math.round(100 - (severity / MAX_SEVERITY) * 100);
}

/** 켜져 있는 항목의 라벨만 추린다. '직접 입력'은 적어 넣은 값을 쓴다 */
export function toSideEffectLabels(items: SideEffectItem[]): string[] {
  return items
    .filter((e) => e.enabled)
    .map((e) => (e.id === CUSTOM_EFFECT_ID ? (e.customValue ?? '').trim() : e.label))
    .filter((label) => label.length > 0);
}

/**
 * 서버가 돌려준 라벨 목록을 화면 항목으로 되돌린다.
 * 보기에 없는 라벨은 '직접 입력'에 담는다.
 */
export function fromSideEffectLabels(labels: string[], score: number): SideEffectItem[] {
  const known = new Set(SIDE_EFFECT_CATALOG.map((e) => e.label));
  const custom = labels.filter((l) => !known.has(l));

  return [
    ...SIDE_EFFECT_CATALOG.map((e) => ({
      ...e,
      enabled: labels.includes(e.label),
      score,
    })),
    {
      id: CUSTOM_EFFECT_ID,
      label: '직접 입력',
      enabled: custom.length > 0,
      score,
      customValue: custom.join(', '),
    },
  ];
}
