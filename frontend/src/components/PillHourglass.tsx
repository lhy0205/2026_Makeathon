import { Accelerometer } from 'expo-sensors';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

// ── 좌표계 ────────────────────────────────────
const VB_W = 200;
const VB_H = 330;
const CX = VB_W / 2;

const CYL_HALF = 88;   // 바깥 유리 원통 반폭
const RIM_H = 13;      // 금속 테 몸통 높이
const RIM_RY = 8;      // 금속 테 타원 반높이

const TOP_Y = 56;      // 모래시계 유리 천장
const NECK_Y = 172;    // 잘록한 목
const BOTTOM_Y = 276;  // 유리 바닥
const HALF = 80;
const NECK_HALF = 8;

const RIM_TOP_Y = 26;
const RIM_BOT_Y = VB_H - 39 - RIM_H;  // 유리 밑면을 살짝 덮도록 올림
const CYL_TOP = RIM_TOP_Y;
const CYL_LEN = RIM_BOT_Y + RIM_H - RIM_TOP_Y;

// ── 알약 ──────────────────────────────────────
const PW = 26;
const PH = 12;
const GAP = 3;
const STEP = PH + 3;

/** 참고 이미지 팔레트 — 네이비 · 틸그린 · 오렌지 · 하늘 · 화이트 */
const PALETTE = [
  { face: '#2B5FA8' },
  { face: '#39A891' },
  { face: '#E8A044' },
  { face: '#7FB6E0' },
  { face: '#EDF2F7' },
];

/** 하이라이트가 유리 밖으로 새지 않도록 중심축 쪽으로 당긴다 */
const HL_INSET = 0.72;
const inset = (x: number) => CX - (CX - x) * HL_INSET;

type Chamber = 'top' | 'bottom';
type Slot = { x: number; y: number; i: number };

type Pt = { x: number; y: number };

/** 유리 왼쪽 벽 — 아래 glass 경로와 똑같은 제어점을 쓴다 */
const TOP_WALL: Pt[] = [
  { x: CX - HALF, y: TOP_Y + 8 },
  { x: CX - HALF, y: TOP_Y + 64 },
  { x: CX - NECK_HALF - 3, y: NECK_Y - 36 },
  { x: CX - NECK_HALF, y: NECK_Y },
];
const BOTTOM_WALL: Pt[] = [
  { x: CX - NECK_HALF, y: NECK_Y },
  { x: CX - NECK_HALF - 3, y: NECK_Y + 42 },
  { x: CX - HALF, y: BOTTOM_Y - 72 },
  { x: CX - HALF, y: BOTTOM_Y - 11 },
];

function bezier(p: Pt[], t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * p[0].x + 3 * u * u * t * p[1].x + 3 * u * t * t * p[2].x + t * t * t * p[3].x,
    y: u * u * u * p[0].y + 3 * u * u * t * p[1].y + 3 * u * t * t * p[2].y + t * t * t * p[3].y,
  };
}

/**
 * 높이 y에서 유리 폭.
 * 근사식을 쓰면 실제 곡선과 어긋나 알약이 유리 밖으로 나가므로,
 * 벽 곡선에서 해당 y를 이분 탐색해 정확한 x를 구한다.
 */
function halfWidth(y: number, chamber: Chamber) {
  const wall = chamber === 'top' ? TOP_WALL : BOTTOM_WALL;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (bezier(wall, mid).y < y) lo = mid;
    else hi = mid;
  }
  return CX - bezier(wall, (lo + hi) / 2).x;
}

/** 아래에서부터 층층이 쌓되, 층마다 들어가는 개수를 폭에 맞춰 계산 */
function stack(count: number, chamber: Chamber): Slot[] {
  const slots: Slot[] = [];
  const startY = chamber === 'top' ? NECK_Y - 22 : BOTTOM_Y - 14;

  let placed = 0;
  let row = 0;

  while (placed < count && row < 14) {
    const y = startY - row * STEP;
    // 알약 높이만큼 좁아지는 쪽 끝에서 재야 모서리가 유리를 뚫지 않는다
    const edgeY = chamber === 'top' ? y + PH / 2 : y - PH / 2;
    // 기울임(최대 13°) 여유까지 빼둔다
    const capacity = Math.max(
      1,
      Math.floor((halfWidth(edgeY, chamber) * 2 - 12) / (PW + GAP))
    );
    const n = Math.min(capacity, count - placed);
    const rowW = n * PW + (n - 1) * GAP;

    for (let i = 0; i < n; i++) {
      slots.push({ x: CX - rowW / 2 + i * (PW + GAP), y, i: placed + i });
    }
    placed += n;
    row++;
  }
  return slots;
}

type Color = { face: string };

/** 투톤 캡슐 — 왼쪽 절반만 다른 색 */
function Capsule({ x, y, c, alt }: { x: number; y: number; c: Color; alt: Color }) {
  const top = y - PH / 2;
  const r = PH / 2;
  const halfCap =
    'M ' + (x + PW / 2) + ' ' + top +
    ' L ' + (x + r) + ' ' + top +
    ' A ' + r + ' ' + r + ' 0 0 0 ' + (x + r) + ' ' + (top + PH) +
    ' L ' + (x + PW / 2) + ' ' + (top + PH) + ' Z';

  return (
    <G>
      <Rect x={x} y={top} width={PW} height={PH} rx={r} fill={c.face} />
      <Path d={halfCap} fill={alt.face} />
      {/* 아래쪽 그늘 */}
      <Rect x={x + r} y={top + PH - 2.4} width={PW - PH} height={2.4} fill="#000000" opacity={0.14} />
      {/* 윗면 반사광 */}
      <Rect x={x + 4} y={top + 1.7} width={PW - 11} height={1.9} rx={0.95} fill="#FFFFFF" opacity={0.5} />
    </G>
  );
}

function Pill({ slot }: { slot: Slot }) {
  const c = PALETTE[slot.i % PALETTE.length];
  const alt = PALETTE[(slot.i + 3) % PALETTE.length];
  // 격자처럼 보이지 않도록 알약마다 조금씩 기울인다
  const tilt = ((slot.i * 41) % 27) - 13;
  return (
    <G transform={'rotate(' + tilt + ' ' + (slot.x + PW / 2) + ' ' + slot.y + ')'}>
      <Capsule x={slot.x} y={slot.y} c={c} alt={alt} />
    </G>
  );
}

// ── 흔들림 ────────────────────────────────────
/** 알약 더미가 좌우로 밀릴 수 있는 최대 거리(px). 넘기면 유리를 뚫는다 */
const MAX_SHIFT_X = 7;
const MAX_SHIFT_Y = 4;
/** 살짝 늦게 따라오고 살짝 넘쳤다 돌아와야 출렁이는 느낌이 난다 */
const SPRING = { damping: 10, stiffness: 80, mass: 0.7 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Props = {
  /** 처방 전체 복용 횟수 */
  total: number;
  /** 이미 복용한 횟수 */
  taken: number;
  width?: number;
  /** 기기를 기울이면 알약이 따라 움직인다 */
  shake?: boolean;
};

export default function PillHourglass({ total, taken, width = 258, shake = true }: Props) {
  const shiftX = useSharedValue(0);
  const shiftY = useSharedValue(0);

  useEffect(() => {
    if (!shake) return;

    let sub: { remove: () => void } | undefined;
    let alive = true;

    Accelerometer.isAvailableAsync().then((ok) => {
      if (!ok || !alive) return;
      Accelerometer.setUpdateInterval(60);
      sub = Accelerometer.addListener(({ x, y }) => {
        // x는 세워 든 상태에서 0이라 그대로 쓴다
        shiftX.value = withSpring(clamp(x * 14, -MAX_SHIFT_X, MAX_SHIFT_X), SPRING);
        // y는 세워 들면 -1이므로 +1 해서 기준점을 0으로 맞춘다
        shiftY.value = withSpring(clamp((y + 1) * 10, -MAX_SHIFT_Y, MAX_SHIFT_Y), SPRING);
      });
    });

    return () => {
      alive = false;
      sub?.remove();
    };
  }, [shake, shiftX, shiftY]);

  const pillLayer = useAnimatedStyle(() => ({
    transform: [
      { translateX: shiftX.value },
      { translateY: shiftY.value },
      // 기울인 쪽으로 더미 전체가 살짝 기운다
      { rotate: shiftX.value * 0.35 + 'deg' },
    ],
  }));

  const done = Math.max(0, Math.min(taken, total));
  const remaining = total - done;

  // 마지막 한 알은 떨어지는 중으로 그린다
  const falling = done > 0 && remaining > 0;
  const settled = falling ? done - 1 : done;

  const topSlots = stack(remaining, 'top');
  const bottomSlots = stack(settled, 'bottom');

  const glass = [
    'M', CX - HALF, TOP_Y + 8,
    'Q', CX - HALF, TOP_Y + ',' , CX - HALF + 9, TOP_Y,
    'L', CX + HALF - 9, TOP_Y,
    'Q', CX + HALF, TOP_Y + ',', CX + HALF, TOP_Y + 8,
    'C', CX + HALF, TOP_Y + 64 + ',', CX + NECK_HALF + 3, NECK_Y - 36 + ',', CX + NECK_HALF, NECK_Y,
    'C', CX + NECK_HALF + 3, NECK_Y + 42 + ',', CX + HALF, BOTTOM_Y - 72 + ',', CX + HALF, BOTTOM_Y - 11,
    'Q', CX + HALF, BOTTOM_Y + ',', CX + HALF - 11, BOTTOM_Y,
    'L', CX - HALF + 11, BOTTOM_Y,
    'Q', CX - HALF, BOTTOM_Y + ',', CX - HALF, BOTTOM_Y - 11,
    'C', CX - HALF, BOTTOM_Y - 72 + ',', CX - NECK_HALF - 3, NECK_Y + 42 + ',', CX - NECK_HALF, NECK_Y,
    'C', CX - NECK_HALF - 3, NECK_Y - 36 + ',', CX - HALF, TOP_Y + 64 + ',', CX - HALF, TOP_Y + 8,
    'Z',
  ].join(' ');

  // 빛이 왼쪽 위에서 든다고 보고, 오른쪽 벽에만 두꺼운 강조선을 덧그린다
  const rimTop = [
    'M', CX + HALF, TOP_Y + 8,
    'C', CX + HALF, TOP_Y + 64 + ',',
    CX + NECK_HALF + 3, NECK_Y - 36 + ',',
    CX + NECK_HALF, NECK_Y,
  ].join(' ');

  const rimBottom = [
    'M', CX + NECK_HALF, NECK_Y,
    'C', CX + NECK_HALF + 3, NECK_Y + 42 + ',',
    CX + HALF, BOTTOM_Y - 72 + ',',
    CX + HALF, BOTTOM_Y - 11,
  ].join(' ');

  const hlTop = [
    'M', inset(CX - HALF), TOP_Y + 26,
    'C', inset(CX - HALF), TOP_Y + 70 + ',',
    inset(CX - NECK_HALF - 3), NECK_Y - 34 + ',',
    inset(CX - NECK_HALF), NECK_Y - 14,
  ].join(' ');

  const hlBottom = [
    'M', inset(CX - NECK_HALF), NECK_Y + 18,
    'C', inset(CX - NECK_HALF - 3), NECK_Y + 52 + ',',
    inset(CX - HALF), BOTTOM_Y - 70 + ',',
    inset(CX - HALF), BOTTOM_Y - 24,
  ].join(' ');

  const w = width;
  const h = (width * VB_H) / VB_W;
  const gw = w * 1.5; // 글로우가 퍼질 여유 폭

  return (
    <View style={{ width: gw, height: h, alignItems: 'center', justifyContent: 'center' }}>
      {/* 뒤에 깔리는 연한 하늘색 그라데이션 */}
      <Svg width={gw} height={h} viewBox={'0 0 ' + gw + ' ' + h} style={{ position: 'absolute' }}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="#B4DCF2" stopOpacity="0.75" />
            <Stop offset="0.5" stopColor="#D3EAF7" stopOpacity="0.4" />
            <Stop offset="1" stopColor="#D3EAF7" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx={gw / 2} cy={h / 2} rx={gw / 2} ry={h / 2} fill="url(#glow)" />
      </Svg>

      {/* 세 겹을 정확히 포개기 위한 고정 크기 컨테이너 */}
      <View style={{ width: w, height: h }}>
      {/* 1층 — 유리와 원통 (고정) */}
      <Svg
        width={w}
        height={h}
        viewBox={'0 0 ' + VB_W + ' ' + VB_H}
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          {/* 바깥 유리 원통 */}
          <LinearGradient id="cyl" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.6" />
            <Stop offset="0.16" stopColor="#E3EEF6" stopOpacity="0.22" />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.08" />
            <Stop offset="0.86" stopColor="#D6E5F0" stopOpacity="0.28" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.55" />
          </LinearGradient>
          {/* 바닥 그림자 */}
          <RadialGradient id="shadow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="#1E4678" stopOpacity="0.2" />
            <Stop offset="0.55" stopColor="#1E4678" stopOpacity="0.09" />
            <Stop offset="1" stopColor="#1E4678" stopOpacity="0" />
          </RadialGradient>
          {/* 유리 윤곽선 — 왼쪽은 밝고 오른쪽은 어둡게 */}
          <LinearGradient id="edge" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#E2EDF7" stopOpacity="0.9" />
            <Stop offset="0.42" stopColor="#C2D9EC" stopOpacity="0.85" />
            <Stop offset="1" stopColor="#8FB2D2" stopOpacity="0.95" />
          </LinearGradient>
          {/* 그늘진 쪽 강조선 — 양 끝이 투명해 이음매가 안 보인다 */}
          <LinearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#8FB2D2" stopOpacity="0" />
            <Stop offset="0.35" stopColor="#7FA5C8" stopOpacity="0.85" />
            <Stop offset="0.7" stopColor="#7FA5C8" stopOpacity="0.7" />
            <Stop offset="1" stopColor="#8FB2D2" stopOpacity="0" />
          </LinearGradient>
          {/* 모래시계 유리 */}
          <LinearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.66" />
            <Stop offset="0.45" stopColor="#EAF3FA" stopOpacity="0.4" />
            <Stop offset="1" stopColor="#CFE2F0" stopOpacity="0.36" />
          </LinearGradient>
        </Defs>

        {/* 바닥 그림자 */}
        <Ellipse
          cx={CX}
          cy={RIM_BOT_Y + RIM_H + 16}
          rx={CYL_HALF + 12}
          ry={11}
          fill="url(#shadow)"
        />

        {/* 바깥 유리 원통 */}
        <Rect x={CX - CYL_HALF} y={CYL_TOP} width={CYL_HALF * 2} height={CYL_LEN} fill="url(#cyl)" />
        <Rect x={CX - CYL_HALF} y={CYL_TOP} width={1.6} height={CYL_LEN} fill="#FFFFFF" opacity={0.85} />
        <Rect x={CX + CYL_HALF - 1.6} y={CYL_TOP} width={1.6} height={CYL_LEN} fill="#C6D6E4" opacity={0.8} />

        {/* 모래시계 유리 */}
        <Path d={glass} fill="url(#glass)" stroke="url(#edge)" strokeWidth={1.1} strokeLinejoin="round" />

        {/* 그늘진 오른쪽 벽 — 굵게 덧그려 유리 두께를 느끼게 한다 */}
        <Path d={rimTop} stroke="url(#rim)" strokeWidth={2.9} fill="none" strokeLinecap="round" />
        <Path d={rimBottom} stroke="url(#rim)" strokeWidth={2.9} fill="none" strokeLinecap="round" />

        {/* 왼쪽 하이라이트 — 유리 곡선을 중심축 쪽으로 당겨 항상 안쪽에 머물게 한다 */}
        <Path d={hlTop} stroke="#FFFFFF" strokeWidth={5} strokeOpacity={0.5} fill="none" strokeLinecap="round" />
        <Path d={hlBottom} stroke="#FFFFFF" strokeWidth={5} strokeOpacity={0.45} fill="none" strokeLinecap="round" />
      </Svg>

      {/* 2층 — 알약. 이 레이어만 기기 기울기를 따라 움직인다 */}
      <Animated.View style={[StyleSheet.absoluteFill, pillLayer]} pointerEvents="none">
        <Svg width={w} height={h} viewBox={'0 0 ' + VB_W + ' ' + VB_H}>
          {topSlots.map((s) => <Pill key={'t' + s.i} slot={s} />)}
          {bottomSlots.map((s) => <Pill key={'b' + s.i} slot={s} />)}

          {/* 떨어지는 한 알 + 낙하 흔적 */}
          {falling && (
            <G>
              <Path
                d={'M ' + CX + ' ' + (NECK_Y + 10) + ' L ' + CX + ' ' + (NECK_Y + 32)}
                stroke="#8FB4D0" strokeWidth={1.6} strokeDasharray="3 4" strokeLinecap="round"
              />
              <G transform={'rotate(-14 ' + CX + ' ' + (NECK_Y + 48) + ')'}>
                <Capsule x={CX - PW / 2} y={NECK_Y + 48} c={PALETTE[4]} alt={PALETTE[0]} />
              </G>
            </G>
          )}
        </Svg>
      </Animated.View>

      {/* 3층 — 금속 테. 알약 위에 덮여야 유리 안에 갇힌 것처럼 보인다 */}
      <Svg
        width={w}
        height={h}
        viewBox={'0 0 ' + VB_W + ' ' + VB_H}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          {/* 크롬 — 밝고 어두운 띠를 교차시켜 금속 느낌 */}
          <LinearGradient id="chrome" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#8492A0" />
            <Stop offset="0.1" stopColor="#E7EDF3" />
            <Stop offset="0.26" stopColor="#FFFFFF" />
            <Stop offset="0.44" stopColor="#B5C1CC" />
            <Stop offset="0.6" stopColor="#818F9E" />
            <Stop offset="0.78" stopColor="#DBE3EA" />
            <Stop offset="1" stopColor="#75838F" />
          </LinearGradient>
          <LinearGradient id="chromeFace" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#BCC7D2" />
            <Stop offset="0.32" stopColor="#FFFFFF" />
            <Stop offset="0.66" stopColor="#D3DCE5" />
            <Stop offset="1" stopColor="#A2AFBB" />
          </LinearGradient>
        </Defs>

        <Rect x={CX - CYL_HALF - 6} y={RIM_TOP_Y} width={(CYL_HALF + 6) * 2} height={RIM_H} fill="url(#chrome)" />
        <Ellipse cx={CX} cy={RIM_TOP_Y + RIM_H} rx={CYL_HALF + 6} ry={RIM_RY} fill="url(#chrome)" />
        <Ellipse cx={CX} cy={RIM_TOP_Y} rx={CYL_HALF + 6} ry={RIM_RY} fill="url(#chromeFace)" />

        {/* 아래 테 — 위에서 내려다보는 시점이므로 윗면이 보여야 한다.
            밑면 곡선 → 몸통 → 윗면(밝게) 순으로 겹쳐 그린다 */}
        <Ellipse cx={CX} cy={RIM_BOT_Y + RIM_H} rx={CYL_HALF + 6} ry={RIM_RY} fill="url(#chrome)" />
        <Rect x={CX - CYL_HALF - 6} y={RIM_BOT_Y} width={(CYL_HALF + 6) * 2} height={RIM_H} fill="url(#chrome)" />
        <Ellipse cx={CX} cy={RIM_BOT_Y} rx={CYL_HALF + 6} ry={RIM_RY} fill="url(#chromeFace)" />
      </Svg>
      </View>
    </View>
  );
}
