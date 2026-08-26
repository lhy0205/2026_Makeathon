// ─────────────────────────────────────────────
//  부작용 체크 항목
//  서버는 부작용을 자유 문자열 목록(HealthLogRequest.sideEffects)으로 받는다.
//  아래는 사용자가 매번 타이핑하지 않도록 미리 준비한 보기다.
// ─────────────────────────────────────────────
import type { SideEffectItem } from '../types';

type SymptomOption = { id: string; label: string };

/**
 * 약을 먹으면 진료과와 상관없이 나타날 수 있는 것들.
 * 어느 치료에서든 보기로 내놓는다.
 */
export const SIDE_EFFECT_CATALOG: SymptomOption[] = [
  { id: 'se_001', label: '구역감' },
  { id: 'se_002', label: '두통' },
  { id: 'se_003', label: '속쓰림' },
  { id: 'se_004', label: '어지러움' },
  { id: 'se_005', label: '발진' },
];

/**
 * 진료과마다 실제로 겪는 증상이 다르다.
 *
 * 안과 치료를 받는 사람에게 '속쓰림·발진'만 내놓으면 정작 겪는
 * 눈 시림이나 충혈을 적을 곳이 없어서 매번 직접 입력해야 한다.
 * 그러면 사람마다 다르게 적어서 나중에 증상별로 견줄 수도 없다.
 *
 * 진료과 이름은 서버가 방문 기록에 적어 준 값을 그대로 쓴다.
 * 목록에 없는 진료과는 공통 항목만 보인다.
 */
export const SYMPTOMS_BY_DEPARTMENT: Record<string, SymptomOption[]> = {
  안과: [
    { id: 'ey_001', label: '눈 시림' },
    { id: 'ey_002', label: '충혈' },
    { id: 'ey_003', label: '이물감' },
    { id: 'ey_004', label: '눈부심' },
    { id: 'ey_005', label: '시야 흐림' },
    { id: 'ey_006', label: '눈물 흐름' },
  ],
  이비인후과: [
    { id: 'en_001', label: '인후통' },
    { id: 'en_002', label: '코막힘' },
    { id: 'en_003', label: '콧물' },
    { id: 'en_004', label: '기침' },
    { id: 'en_005', label: '가래' },
    { id: 'en_006', label: '귀 먹먹함' },
  ],
  피부과: [
    { id: 'sk_001', label: '가려움' },
    { id: 'sk_002', label: '붉어짐' },
    { id: 'sk_003', label: '건조함' },
    { id: 'sk_004', label: '화끈거림' },
    { id: 'sk_005', label: '부기' },
  ],
  내과: [
    { id: 'im_001', label: '복통' },
    { id: 'im_002', label: '설사' },
    { id: 'im_003', label: '소화불량' },
    { id: 'im_004', label: '발열' },
    { id: 'im_005', label: '기운 없음' },
  ],
  정형외과: [
    { id: 'or_001', label: '통증' },
    { id: 'or_002', label: '부기' },
    { id: 'or_003', label: '저림' },
    { id: 'or_004', label: '움직임 불편' },
  ],
  소아청소년과: [
    { id: 'pd_001', label: '발열' },
    { id: 'pd_002', label: '보챔' },
    { id: 'pd_003', label: '식욕 저하' },
    { id: 'pd_004', label: '기침' },
  ],
  가정의학과: [
    { id: 'fm_001', label: '피로감' },
    { id: 'fm_002', label: '발열' },
    { id: 'fm_003', label: '근육통' },
    { id: 'fm_004', label: '기침' },
  ],
};

/** 이 진료과에서 내놓을 보기. 진료과 증상이 먼저, 공통 항목이 뒤에 온다 */
export function symptomsFor(department?: string | null): SymptomOption[] {
  const specific = SYMPTOMS_BY_DEPARTMENT[(department ?? '').trim()] ?? [];
  return [...specific, ...SIDE_EFFECT_CATALOG];
}

/** '직접 입력' 항목의 id — 화면에서 텍스트 입력으로 다룬다 */
export const CUSTOM_EFFECT_ID = 'se_custom';

/** 아무것도 고르지 않은 초기 상태 */
export function freshSideEffects(department?: string | null): SideEffectItem[] {
  return [
    ...symptomsFor(department).map((e) => ({ ...e, enabled: false, score: 50 })),
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
export function fromSideEffectLabels(
  labels: string[],
  score: number,
  department?: string | null,
): SideEffectItem[] {
  const options = symptomsFor(department);
  const known = new Set(options.map((e) => e.label));
  const custom = labels.filter((l) => !known.has(l));

  return [
    ...options.map((e) => ({
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
