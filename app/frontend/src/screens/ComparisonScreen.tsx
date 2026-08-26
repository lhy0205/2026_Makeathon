import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError, comparisonApi, healthLogApi, visitApi } from '../api/Client';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useActiveVisit } from '../hooks/useActiveVisit';
import { useAsync } from '../hooks/useAsync';
import type { ComparisonResponse, HealthLogResponse, VisitResponse } from '../types/Api';

/** 아직 비교한 적 없는 건 오류가 아니다 */
async function loadLatest(visitId: number): Promise<ComparisonResponse | null> {
  try {
    return await comparisonApi.getLatest(visitId);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

const visitLabel = (v: VisitResponse) =>
  `${v.hospitalName} · ${v.visitedAt}`;

/** 한 증상이 어느 치료에서 얼마나 심했는지 */
interface SymptomStat {
  days: number;
  severity: number;
}

/**
 * 그 증상이 적힌 날들만 모아 평균을 낸다.
 * symptomSeverity는 기록 하나에 하나뿐이라 그날 적은 증상 전부가 같은 값을 쓴다.
 * 증상별로 따로 매긴 점수는 아니지만, 그 증상을 겪은 날의 몸 상태이므로
 * '이 증상이 있던 날은 대체로 어땠나'를 보여주는 값으로는 쓸 수 있다.
 */
function statFor(logs: HealthLogResponse[], symptom: string): SymptomStat | null {
  const days = logs.filter(
    (log) => log.symptomSeverity != null && log.sideEffects?.includes(symptom),
  );
  if (days.length === 0) return null;

  const total = days.reduce((sum, log) => sum + (log.symptomSeverity ?? 0), 0);
  return { days: days.length, severity: total / days.length };
}

// symptomSeverity는 작을수록 호전이다 (서버가 감소를 회복으로 읽는다).
// 이만큼도 차이가 안 나면 비슷하다고 본다
const SAME_MARGIN = 0.5;

function verdictOf(now: SymptomStat | null, past: SymptomStat | null) {
  if (!now) return { text: '이번엔 기록 없음', tint: COLORS.textSecondary };
  if (!past) return { text: '지난 치료엔 기록 없음', tint: COLORS.textSecondary };

  const gap = past.severity - now.severity;
  if (Math.abs(gap) < SAME_MARGIN) return { text: '비슷', tint: COLORS.textSecondary };
  return gap > 0
    ? { text: `${gap.toFixed(1)} 호전`, tint: COLORS.success }
    : { text: `${Math.abs(gap).toFixed(1)} 악화`, tint: COLORS.error };
}

/** 공통점 / 차이점 목록 */
function Findings({
  label, items, bullet, tint,
}: {
  label: string; items: string[]; bullet: string; tint: string;
}) {
  if (items.length === 0) return null;
  return (
    <View style={styles.findings}>
      <Text style={[styles.findingsLabel, { color: tint }]}>{label}</Text>
      {items.map((text, i) => (
        <View key={`${label}-${i}`} style={styles.findingRow}>
          <Text style={[styles.bullet, { color: tint }]}>{bullet}</Text>
          <Text style={styles.findingText}>{text}</Text>
        </View>
      ))}
    </View>
  );
}

export default function ComparisonScreen() {
  const router = useRouter();
  const { visit, loading: visitLoading } = useActiveVisit();
  const visitId = visit?.id ?? null;

  // 서버는 진료과명으로 후보를 좁힌다. 진료과가 없으면 전체에서 고른다
  const category = visit?.departmentName ?? '';

  const candidates = useAsync(
    () => visitApi.getHistory(category),
    [category, visitId],
    { enabled: visitId != null },
  );

  const { data: comparison, loading, error, refresh, setData } = useAsync(
    async () => (visitId == null ? null : loadLatest(visitId)),
    [visitId],
    { enabled: visitId != null },
  );

  const [pickerOpen, setPickerOpen] = useState(false);
  const [comparing, setComparing] = useState(false);

  // 서버 비교 결과는 자유 문장이라 '어떤 증상이 어떻게 달라졌는지'를
  // 골라 볼 수 없다. 두 치료의 상태 기록을 직접 받아 증상별로 나눈다
  const pastVisitId = comparison?.pastVisitId ?? null;

  const currentLogs = useAsync(
    async () => (visitId == null ? [] : healthLogApi.getByVisit(visitId)),
    [visitId],
    { enabled: visitId != null },
  );

  const pastLogs = useAsync(
    async () => (pastVisitId == null ? [] : healthLogApi.getByVisit(pastVisitId)),
    [pastVisitId],
    { enabled: pastVisitId != null },
  );

  // 두 치료에 한 번이라도 적힌 증상 전부
  const symptoms = useMemo(() => {
    const found = new Set<string>();
    for (const log of [...(currentLogs.data ?? []), ...(pastLogs.data ?? [])]) {
      for (const name of log.sideEffects ?? []) {
        if (name) found.add(name);
      }
    }
    return [...found].sort();
  }, [currentLogs.data, pastLogs.data]);

  // 켜진 목록이 아니라 꺼진 목록을 들고 있는다.
  // 그래야 증상이 뒤늦게 도착해도 저절로 켜진 상태로 나온다
  const [hidden, setHidden] = useState<string[]>([]);

  const toggleSymptom = (name: string) =>
    setHidden((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );

  const shownSymptoms = symptoms.filter((name) => !hidden.includes(name));

  // 자기 자신은 비교 대상이 될 수 없다
  const pastVisits = useMemo(
    () => (candidates.data ?? []).filter((v) => v.id !== visitId),
    [candidates.data, visitId],
  );

  const handleCompare = async (pastVisitId: number) => {
    if (visitId == null || comparing) return;

    setPickerOpen(false);
    setComparing(true);
    try {
      const result = await comparisonApi.create(visitId, pastVisitId);
      setData(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : '비교하지 못했습니다.';
      Alert.alert('비교 실패', message);
    } finally {
      setComparing(false);
    }
  };

  const busy = visitLoading || loading || candidates.loading;

  const comparedPast = comparison
    ? pastVisits.find((v) => v.id === comparison.pastVisitId)
    : undefined;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* 헤더 */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>{'< 이전'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>치료 비교</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {busy && <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />}

        {!busy && !visit && (
          <Text style={styles.emptyText}>
            처방전을 먼저 등록하면 지난 치료와 비교할 수 있어요.
          </Text>
        )}

        {!busy && error && (
          <TouchableOpacity style={styles.errorBox} onPress={refresh} activeOpacity={0.8}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorRetry}>다시 시도</Text>
          </TouchableOpacity>
        )}

        {!busy && visit && !error && (
          <>
            {/* 이번 치료 */}
            <View style={styles.nowCard}>
              <Text style={styles.nowLabel}>이번 치료</Text>
              <Text style={styles.nowTitle}>{visit.hospitalName}</Text>
              <Text style={styles.nowMeta}>
                {visit.departmentName ? `${visit.departmentName} · ` : ''}
                {visit.visitReason ?? '방문 사유 미기록'} · {visit.visitedAt}
              </Text>
            </View>

            {pastVisits.length === 0 ? (
              <View style={styles.blank}>
                <Text style={styles.blankTitle}>비교할 지난 치료가 없어요</Text>
                <Text style={styles.blankText}>
                  {category
                    ? `${category} 진료 기록이 하나 더 쌓이면\n이번 치료와 견줘 볼 수 있어요.`
                    : '치료 기록이 하나 더 쌓이면\n이번 치료와 견줘 볼 수 있어요.'}
                </Text>
              </View>
            ) : (
              <>
                {/* 비교 대상 고르기 */}
                <View style={styles.picker}>
                  <TouchableOpacity
                    style={styles.pickerHead}
                    onPress={() => setPickerOpen((v) => !v)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pickerChevron}>{pickerOpen ? '⌄' : '›'}</Text>
                    <Text style={styles.pickerText} numberOfLines={1}>
                      {comparedPast ? visitLabel(comparedPast) : '비교할 지난 치료 고르기'}
                    </Text>
                    <Text style={styles.pickerCount}>{pastVisits.length}건</Text>
                  </TouchableOpacity>

                  {pickerOpen && (
                    <View style={styles.pickerList}>
                      {pastVisits.map((v) => (
                        <TouchableOpacity
                          key={v.id}
                          style={styles.pickerItem}
                          onPress={() => handleCompare(v.id)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.pickerItemText} numberOfLines={1}>
                            {visitLabel(v)}
                          </Text>
                          {v.id === comparison?.pastVisitId && (
                            <Text style={styles.pickerCheck}>✓</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {comparing && (
                  <View style={styles.working}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.workingText}>두 치료를 견주는 중…</Text>
                  </View>
                )}

                {/* 결과 */}
                {comparison && !comparing && (
                  <View style={styles.resultCard}>
                    {comparison.summary?.trim() ? (
                      <View style={styles.summaryBox}>
                        <Text style={styles.summaryText}>{comparison.summary.trim()}</Text>
                      </View>
                    ) : null}

                    <Findings
                      label="닮은 점"
                      items={comparison.commonPoints}
                      bullet="="
                      tint={COLORS.primary}
                    />
                    <Findings
                      label="달라진 점"
                      items={comparison.differences}
                      bullet="→"
                      tint={COLORS.success}
                    />

                    {comparison.commonPoints.length === 0 &&
                      comparison.differences.length === 0 &&
                      !comparison.summary?.trim() && (
                        <Text style={styles.emptyText}>
                          비교할 만한 기록이 부족해요. 상태 기록을 더 남겨 보세요.
                        </Text>
                      )}
                  </View>
                )}

                {/* 증상별로 골라 보기 */}
                {comparison && !comparing && symptoms.length > 0 && (
                  <View style={styles.symptomCard}>
                    <Text style={styles.symptomTitle}>증상별 비교</Text>
                    <Text style={styles.symptomHint}>
                      보고 싶은 증상만 남겨 보세요
                    </Text>

                    <View style={styles.chipRow}>
                      {symptoms.map((name) => {
                        const on = !hidden.includes(name);
                        return (
                          <TouchableOpacity
                            key={name}
                            style={[styles.chip, on && styles.chipOn]}
                            onPress={() => toggleSymptom(name)}
                            activeOpacity={0.75}
                          >
                            <Text style={[styles.chipText, on && styles.chipTextOn]}>
                              {name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {shownSymptoms.length === 0 ? (
                      <Text style={styles.emptyText}>
                        증상을 하나 이상 골라 주세요.
                      </Text>
                    ) : (
                      <>
                        <View style={styles.symptomHead}>
                          <Text style={styles.symptomHeadName}>증상</Text>
                          <Text style={styles.symptomHeadCell}>지난</Text>
                          <Text style={styles.symptomHeadCell}>이번</Text>
                          <Text style={styles.symptomHeadVerdict}>변화</Text>
                        </View>

                        {shownSymptoms.map((name) => {
                          const now = statFor(currentLogs.data ?? [], name);
                          const past = statFor(pastLogs.data ?? [], name);
                          const verdict = verdictOf(now, past);

                          return (
                            <View key={name} style={styles.symptomRow}>
                              <Text style={styles.symptomName} numberOfLines={1}>
                                {name}
                              </Text>
                              <Text style={styles.symptomCell}>
                                {past ? `${past.severity.toFixed(1)}\n${past.days}일` : '—'}
                              </Text>
                              <Text style={styles.symptomCell}>
                                {now ? `${now.severity.toFixed(1)}\n${now.days}일` : '—'}
                              </Text>
                              <Text style={[styles.symptomVerdict, { color: verdict.tint }]}>
                                {verdict.text}
                              </Text>
                            </View>
                          );
                        })}

                        <Text style={styles.symptomFoot}>
                          숫자는 그 증상을 적은 날의 평균 심각도입니다. 낮을수록 좋습니다.
                        </Text>
                      </>
                    )}
                  </View>
                )}

                {!comparison && !comparing && (
                  <Text style={styles.hint}>
                    위에서 지난 치료를 고르면 이번 치료와 견줘 드릴게요.
                  </Text>
                )}
              </>
            )}
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

  loader: { marginVertical: SPACING.xxxl },
  emptyText: {
    fontSize: TYPOGRAPHY.sm, color: COLORS.textSecondary,
    textAlign: 'center', paddingVertical: SPACING.base,
  },

  // 증상별 비교
  symptomCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    gap: SPACING.sm,
    ...SHADOW.sm,
  },
  symptomTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },
  symptomHint: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textSecondary,
    marginTop: -SPACING.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs + 2,
  },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.round,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.inputBg,
  },
  chipOn: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  chipText: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.medium,
  },
  chipTextOn: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.semibold,
  },
  symptomHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.xs,
  },
  symptomHeadName: { flex: 1, fontSize: 10, color: COLORS.textSecondary },
  symptomHeadCell: { width: 48, fontSize: 10, color: COLORS.textSecondary, textAlign: 'center' },
  symptomHeadVerdict: { width: 62, fontSize: 10, color: COLORS.textSecondary, textAlign: 'right' },
  symptomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs + 2,
  },
  symptomName: {
    flex: 1,
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.medium,
  },
  symptomCell: {
    width: 48,
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  symptomVerdict: {
    width: 62,
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.bold,
    textAlign: 'right',
  },
  symptomFoot: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  hint: {
    fontSize: TYPOGRAPHY.xs, color: COLORS.textSecondary,
    textAlign: 'center', paddingVertical: SPACING.base,
  },
  errorBox: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: SPACING.base, alignItems: 'center', gap: SPACING.xs,
  },
  errorText: { fontSize: TYPOGRAPHY.sm, color: COLORS.error, textAlign: 'center' },
  errorRetry: { fontSize: TYPOGRAPHY.xs, color: COLORS.primary, fontWeight: TYPOGRAPHY.bold },

  // 이번 치료
  nowCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    gap: 2,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    ...SHADOW.sm,
  },
  nowLabel: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.primary,
    letterSpacing: 0.4,
  },
  nowTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },
  nowMeta: { fontSize: TYPOGRAPHY.xs, color: COLORS.textSecondary },

  // 대상 고르기
  picker: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  pickerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  pickerChevron: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.primary,
    width: 12,
    textAlign: 'center',
  },
  pickerText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textPrimary,
  },
  pickerCount: { fontSize: 10, color: COLORS.textSecondary, fontWeight: TYPOGRAPHY.medium },
  pickerList: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.inputBg,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingLeft: SPACING.md + 20,
    paddingVertical: SPACING.md,
  },
  pickerItemText: { flex: 1, fontSize: TYPOGRAPHY.sm, color: COLORS.textSecondary },
  pickerCheck: { fontSize: TYPOGRAPHY.sm, color: COLORS.primary, fontWeight: TYPOGRAPHY.bold },

  working: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xl,
  },
  workingText: { fontSize: TYPOGRAPHY.sm, color: COLORS.textSecondary },

  // 결과
  resultCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    gap: SPACING.base,
    ...SHADOW.sm,
  },
  summaryBox: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  summaryText: {
    fontSize: TYPOGRAPHY.sm,
    lineHeight: 22,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.medium,
  },

  findings: { gap: SPACING.xs },
  findingsLabel: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.bold,
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  findingRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start' },
  bullet: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.bold,
    width: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  findingText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sm,
    lineHeight: 21,
    color: COLORS.textPrimary,
  },

  blank: { alignItems: 'center', gap: SPACING.xs, paddingVertical: SPACING.xxl },
  blankTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },
  blankText: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
});
