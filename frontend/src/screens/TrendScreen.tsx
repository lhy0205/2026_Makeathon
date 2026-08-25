import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { visualizationApi } from '../api/Client';
import TrendChart from '../components/TrendChart';
import type { TrendPoint } from '../components/TrendChart';
import { MAX_SEVERITY } from '../constants/sideEffects';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useActiveVisit } from '../hooks/useActiveVisit';
import { useAsync } from '../hooks/useAsync';

// 지표마다 색을 달리해 어떤 줄이 무엇인지 바로 읽히게 한다
const HUE = {
  symptom: '#D2544E',
  temp: '#E0559B',
  sleep: '#7C6BD6',
  water: '#38A3E8',
  activity: '#2F9E68',
};

/** 값이 하나도 없으면 차트를 그리지 않는다 */
const hasAny = (points: TrendPoint[]) => points.some((p) => p.value != null);

function fmt(value: number | null, digits = 0): string {
  if (value == null) return '—';
  return digits > 0 ? value.toFixed(digits) : String(Math.round(value));
}

/** 요약 타일 하나 */
function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

export default function TrendScreen() {
  const router = useRouter();
  const { visit, loading: visitLoading } = useActiveVisit();
  const visitId = visit?.id ?? null;

  const enabled = visitId != null;

  const health = useAsync(() => visualizationApi.healthTrend(visitId!), [visitId], { enabled });
  const lifestyle = useAsync(() => visualizationApi.lifestyleTrend(visitId!), [visitId], { enabled });
  const summary = useAsync(() => visualizationApi.summary(visitId!), [visitId], { enabled });

  const loading = visitLoading || health.loading || lifestyle.loading || summary.loading;

  const symptomPoints = useMemo<TrendPoint[]>(
    () => (health.data?.data ?? []).map((p) => ({ date: p.date, value: p.symptomSeverity })),
    [health.data],
  );
  const tempPoints = useMemo<TrendPoint[]>(
    () => (health.data?.data ?? []).map((p) => ({ date: p.date, value: p.bodyTemperature })),
    [health.data],
  );
  const sleepPoints = useMemo<TrendPoint[]>(
    () => (lifestyle.data?.data ?? []).map((p) => ({ date: p.date, value: p.sleepHours })),
    [lifestyle.data],
  );
  const waterPoints = useMemo<TrendPoint[]>(
    () => (lifestyle.data?.data ?? []).map((p) => ({ date: p.date, value: p.waterIntakeMl })),
    [lifestyle.data],
  );
  const activityPoints = useMemo<TrendPoint[]>(
    () => (lifestyle.data?.data ?? []).map((p) => ({ date: p.date, value: p.activityMinutes })),
    [lifestyle.data],
  );

  const s = summary.data;
  const severityDelta =
    s?.initialSymptomSeverity != null && s?.finalSymptomSeverity != null
      ? s.finalSymptomSeverity - s.initialSymptomSeverity
      : null;

  const anyChart =
    hasAny(symptomPoints) || hasAny(tempPoints) ||
    hasAny(sleepPoints) || hasAny(waterPoints) || hasAny(activityPoints);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* 헤더 */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>{'< 이전'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>회복 추이</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {visit && (
          <Text style={styles.context}>
            {visit.hospitalName}{visit.visitReason ? ` · ${visit.visitReason}` : ''}
            {visit.medicationStartDate ? `  ${visit.medicationStartDate} ~` : ''}
          </Text>
        )}

        {loading && <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />}

        {!loading && !visit && (
          <Text style={styles.emptyText}>
            처방전을 먼저 등록하면 회복 추이를 볼 수 있어요.
          </Text>
        )}

        {!loading && visit && (
          <>
            {/* 치료 요약 */}
            {s && (
              <View style={styles.summaryCard}>
                <Text style={styles.sectionTitle}>치료 요약</Text>

                <View style={styles.statRow}>
                  <Stat
                    label="증상 강도"
                    value={
                      s.initialSymptomSeverity != null && s.finalSymptomSeverity != null
                        ? `${s.initialSymptomSeverity} → ${s.finalSymptomSeverity}`
                        : '—'
                    }
                    sub={
                      severityDelta == null
                        ? '기록 없음'
                        : severityDelta < 0 ? '호전'
                        : severityDelta > 0 ? '악화' : '변화 없음'
                    }
                  />
                  <Stat
                    label="복약률"
                    value={`${fmt(s.adherenceRate)}%`}
                    sub="기록한 일정 기준"
                  />
                  <Stat
                    label="체온"
                    value={
                      s.finalBodyTemperature != null ? `${fmt(s.finalBodyTemperature, 1)}℃` : '—'
                    }
                    sub={
                      s.initialBodyTemperature != null
                        ? `처음 ${fmt(s.initialBodyTemperature, 1)}℃`
                        : '기록 없음'
                    }
                  />
                </View>

                {s.majorSideEffects.length > 0 && (
                  <View style={styles.chipWrap}>
                    <Text style={styles.chipLabel}>기록된 부작용</Text>
                    <View style={styles.chips}>
                      {s.majorSideEffects.map((label) => (
                        <View key={label} style={styles.chip}>
                          <Text style={styles.chipText}>{label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {!anyChart && (
              <Text style={styles.emptyText}>
                상태 기록을 이틀 이상 남기면 추이가 그려져요.
              </Text>
            )}

            {/* 증상 */}
            {hasAny(symptomPoints) && (
              <TrendChart
                title="증상 강도"
                points={symptomPoints}
                color={HUE.symptom}
                lowerIsBetter
                domain={[0, MAX_SEVERITY]}
              />
            )}

            {hasAny(tempPoints) && (
              <TrendChart
                title="체온"
                points={tempPoints}
                color={HUE.temp}
                unit="℃"
                lowerIsBetter
              />
            )}

            {/* 생활 */}
            {hasAny(sleepPoints) && (
              <TrendChart title="수면 시간" points={sleepPoints} color={HUE.sleep} unit="시간" />
            )}

            {hasAny(waterPoints) && (
              <TrendChart title="음수량" points={waterPoints} color={HUE.water} unit="ml" />
            )}

            {hasAny(activityPoints) && (
              <TrendChart title="활동 시간" points={activityPoints} color={HUE.activity} unit="분" />
            )}

            <Text style={styles.footnote}>
              증상 강도는 0에 가까울수록 좋아진 상태입니다.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },

  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.md,
  },
  backBtn: { fontSize: TYPOGRAPHY.sm, color: COLORS.primary, fontWeight: TYPOGRAPHY.semibold, width: 48 },
  headerTitle: { fontSize: TYPOGRAPHY.lg, fontWeight: TYPOGRAPHY.bold, color: COLORS.textPrimary },

  content: { padding: SPACING.base, gap: SPACING.base, paddingBottom: SPACING.xxl },

  context: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.semibold,
    textAlign: 'center',
  },
  loader: { marginVertical: SPACING.xxxl },
  emptyText: {
    fontSize: TYPOGRAPHY.sm, color: COLORS.textSecondary,
    textAlign: 'center', paddingVertical: SPACING.xl,
  },
  footnote: {
    fontSize: 11, color: COLORS.textSecondary, textAlign: 'center',
  },

  // 요약
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    gap: SPACING.md,
    ...SHADOW.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },
  statRow: { flexDirection: 'row', gap: SPACING.sm },
  stat: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    gap: 2,
  },
  statLabel: { fontSize: TYPOGRAPHY.xs, color: COLORS.textSecondary, fontWeight: TYPOGRAPHY.semibold },
  statValue: {
    fontSize: TYPOGRAPHY.md,
    fontWeight: TYPOGRAPHY.extrabold,
    color: COLORS.textPrimary,
  },
  statSub: { fontSize: 10, color: COLORS.textSecondary },

  chipWrap: { gap: SPACING.xs },
  chipLabel: { fontSize: TYPOGRAPHY.xs, color: COLORS.textSecondary, fontWeight: TYPOGRAPHY.semibold },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  chip: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: RADIUS.round,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  chipText: { fontSize: TYPOGRAPHY.xs, color: COLORS.primary, fontWeight: TYPOGRAPHY.semibold },
});
