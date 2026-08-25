// ─────────────────────────────────────────────
//  TrendChart — 날짜별 수치 하나를 선으로 그린다
//  기록을 빠뜨린 날은 값이 null로 오므로 선을 잇지 않고 끊는다.
// ─────────────────────────────────────────────
import React, { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';

export interface TrendPoint {
  /** 'YYYY-MM-DD' */
  date: string;
  value: number | null;
}

interface Props {
  title: string;
  points: TrendPoint[];
  color: string;
  unit?: string;
  /** 값이 작을수록 좋은 지표인지 (증상 심각도가 그렇다) */
  lowerIsBetter?: boolean;
  /** y축을 이 범위로 고정한다. 없으면 데이터에 맞춘다 */
  domain?: [number, number];
  height?: number;
}

const PAD = { top: 16, right: 14, bottom: 26, left: 34 };
const GRID_LINES = 4;

/** 'YYYY-MM-DD' → '11/24' */
function shortDate(date: string): string {
  const [, m, d] = date.split('-');
  return `${Number(m)}/${d}`;
}

/** 소수점이 필요할 때만 붙인다 */
function fmt(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default function TrendChart({
  title,
  points,
  color,
  unit,
  lowerIsBetter = false,
  domain,
  height = 180,
}: Props) {
  const { width: screenWidth } = useWindowDimensions();
  // 카드 바깥 여백(16*2) + 카드 안쪽 여백(16*2)
  const width = Math.max(240, screenWidth - 64);

  const chart = useMemo(() => {
    const filled = points
      .map((p, i) => ({ ...p, i }))
      .filter((p): p is TrendPoint & { i: number; value: number } => p.value != null);

    if (filled.length === 0) return null;

    const values = filled.map((p) => p.value);
    let min = domain ? domain[0] : Math.min(...values);
    let max = domain ? domain[1] : Math.max(...values);

    // 값이 하나뿐이거나 전부 같으면 위아래로 여유를 준다
    if (min === max) {
      const pad = Math.abs(min) * 0.1 || 1;
      min -= pad;
      max += pad;
    } else if (!domain) {
      const pad = (max - min) * 0.15;
      min -= pad;
      max += pad;
    }

    const plotW = width - PAD.left - PAD.right;
    const plotH = height - PAD.top - PAD.bottom;
    const stepX = points.length > 1 ? plotW / (points.length - 1) : 0;

    const x = (i: number) => PAD.left + (points.length > 1 ? i * stepX : plotW / 2);
    const y = (v: number) => PAD.top + plotH - ((v - min) / (max - min)) * plotH;

    // 기록이 없는 날에서 선을 끊는다
    const segments: { i: number; value: number }[][] = [];
    let run: { i: number; value: number }[] = [];
    for (const p of points.map((p, i) => ({ i, value: p.value }))) {
      if (p.value == null) {
        if (run.length) segments.push(run);
        run = [];
      } else {
        run.push({ i: p.i, value: p.value });
      }
    }
    if (run.length) segments.push(run);

    const paths = segments
      .filter((seg) => seg.length > 1)
      .map((seg) => seg.map((p, k) => `${k === 0 ? 'M' : 'L'}${x(p.i)},${y(p.value)}`).join(' '));

    // 점 하나짜리 구간은 선이 안 되므로 원으로만 남긴다
    const lonely = segments.filter((seg) => seg.length === 1).map((seg) => seg[0]);

    const gridY = Array.from({ length: GRID_LINES + 1 }, (_, k) => {
      const v = min + ((max - min) * k) / GRID_LINES;
      return { v, y: y(v) };
    });

    const last = filled[filled.length - 1];
    const first = filled[0];
    const delta = filled.length > 1 ? last.value - first.value : null;

    return { x, y, paths, lonely, gridY, filled, last, delta, plotH };
  }, [points, domain, width, height]);

  if (!chart) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <View style={[styles.empty, { height }]}>
          <Text style={styles.emptyText}>아직 기록이 없어요</Text>
        </View>
      </View>
    );
  }

  const { x, y, paths, lonely, gridY, filled, last, delta } = chart;

  // 좋아졌는지 나빠졌는지 — 지표에 따라 방향이 반대다
  const improving = delta == null ? null : (lowerIsBetter ? delta < 0 : delta > 0);
  const deltaColor = improving == null
    ? COLORS.textSecondary
    : improving ? COLORS.success : COLORS.error;

  // 라벨이 겹치지 않게 몇 개만 남긴다
  const labelStep = Math.max(1, Math.ceil(points.length / 5));

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.readout}>
          <Text style={[styles.current, { color }]}>
            {fmt(last.value)}{unit ? <Text style={styles.unit}> {unit}</Text> : null}
          </Text>
          {delta != null && delta !== 0 && (
            <Text style={[styles.delta, { color: deltaColor }]}>
              {delta > 0 ? '▲' : '▼'} {fmt(Math.abs(delta))}
            </Text>
          )}
        </View>
      </View>

      <Svg width={width} height={height}>
        {/* 눈금선 */}
        {gridY.map((g, i) => (
          <React.Fragment key={`g${i}`}>
            <Line
              x1={PAD.left}
              y1={g.y}
              x2={width - PAD.right}
              y2={g.y}
              stroke={COLORS.border}
              strokeWidth={1}
            />
            <SvgText
              x={PAD.left - 6}
              y={g.y + 3.5}
              fontSize={9}
              fill={COLORS.textSecondary}
              textAnchor="end"
            >
              {fmt(g.v)}
            </SvgText>
          </React.Fragment>
        ))}

        {/* 추이선 */}
        {paths.map((d, i) => (
          <Path
            key={`p${i}`}
            d={d}
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}

        {/* 기록한 날 */}
        {filled.map((p) => (
          <Circle key={`c${p.i}`} cx={x(p.i)} cy={y(p.value)} r={3} fill={color} />
        ))}

        {/* 앞뒤가 비어 혼자 남은 기록 */}
        {lonely.map((p) => (
          <Circle
            key={`l${p.i}`}
            cx={x(p.i)}
            cy={y(p.value)}
            r={4}
            fill={COLORS.surface}
            stroke={color}
            strokeWidth={2}
          />
        ))}

        {/* 마지막 값은 크게 — 지금 상태가 제일 중요하다 */}
        <Circle
          cx={x(last.i)}
          cy={y(last.value)}
          r={5.5}
          fill={color}
          stroke={COLORS.surface}
          strokeWidth={2.5}
        />

        {/* 날짜 */}
        {points.map((p, i) =>
          i % labelStep === 0 || i === points.length - 1 ? (
            <SvgText
              key={`d${i}`}
              x={x(i)}
              y={height - 8}
              fontSize={9}
              fill={COLORS.textSecondary}
              textAnchor="middle"
            >
              {shortDate(p.date)}
            </SvgText>
          ) : null,
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    flex: 1,
  },
  readout: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.xs },
  current: { fontSize: TYPOGRAPHY.lg, fontWeight: TYPOGRAPHY.extrabold },
  unit: { fontSize: TYPOGRAPHY.xs, fontWeight: TYPOGRAPHY.medium, color: COLORS.textSecondary },
  delta: { fontSize: TYPOGRAPHY.xs, fontWeight: TYPOGRAPHY.bold },

  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: TYPOGRAPHY.sm, color: COLORS.textSecondary },
});
