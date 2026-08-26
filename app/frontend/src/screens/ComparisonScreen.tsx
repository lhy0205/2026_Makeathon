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
import { ApiError, comparisonApi, healthLogApi, prescriptionApi, visitApi } from '../api/Client';
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
// 그래서 치료끼리 견줄 때도 값이 낮은 쪽이 나았던 치료다.

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

  // 같은 진료과의 치료 전부를 상태 기록·처방 약과 함께 받는다.
  //
  // 서버 비교(닮은 점/달라진 점)는 두 치료를 자유 문장으로 견주는 것이라
  // '이 증상엔 어느 병원 약이 나았나'를 답하지 못한다. 그 물음에 답하려면
  // 두 건이 아니라 이력 전체를 한자리에 놓아야 한다.
  const treatments = useAsync(
    async () => {
      const visits = candidates.data ?? [];
      return Promise.all(
        visits.map(async (v) => {
          const [logs, prescription] = await Promise.all([
            healthLogApi.getByVisit(v.id).catch(() => [] as HealthLogResponse[]),
            // 처방전이 없는 방문도 있다. 기록만으로도 견줄 수 있으므로 넘어간다
            prescriptionApi.getByVisit(v.id).catch(() => null),
          ]);
          return {
            visit: v,
            logs,
            drugs: (prescription?.medications ?? [])
              .map((m) => m.medicationName)
              .filter(Boolean),
          };
        }),
      );
    },
    [candidates.data],
    { enabled: (candidates.data?.length ?? 0) > 0 },
  );

  // 이력 전체에 한 번이라도 적힌 증상.
  //
  // 여러 치료에 걸쳐 적힌 것부터 앞에 둔다. 한 치료에만 있는 증상은
  // 견줄 상대가 없어서 목록 맨 앞에 있어 봐야 빈 표만 보여준다.
  const symptoms = useMemo(() => {
    const treatmentsWith = new Map<string, number>();
    for (const t of treatments.data ?? []) {
      const inThis = new Set<string>();
      for (const log of t.logs) {
        for (const name of log.sideEffects ?? []) {
          if (name) inThis.add(name);
        }
      }
      for (const name of inThis) {
        treatmentsWith.set(name, (treatmentsWith.get(name) ?? 0) + 1);
      }
    }
    return [...treatmentsWith.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name]) => name);
  }, [treatments.data]);

  const [symptomOpen, setSymptomOpen] = useState(false);
  // 고른 값을 따로 들고, 아직 안 골랐으면 첫 증상을 쓴다.
  // 증상 목록은 기록을 받아온 뒤에야 정해지므로 초기값을 미리 넣을 수 없다
  const [chosen, setChosen] = useState<string | null>(null);
  const symptom = chosen && symptoms.includes(chosen) ? chosen : (symptoms[0] ?? null);

  // 고른 증상을 실제로 적은 치료들. 적힌 적 없는 치료는 견줄 것이 없어 뺀다
  const symptomRows = useMemo(() => {
    if (!symptom) return [];
    return (treatments.data ?? [])
      .map((t) => ({ ...t, stat: statFor(t.logs, symptom) }))
      .filter((r): r is typeof r & { stat: SymptomStat } => r.stat != null);
  }, [symptom, treatments.data]);

  // 가장 낮은 값 = 그 증상에 가장 나았던 치료
  const bestSeverity = symptomRows.length
    ? Math.min(...symptomRows.map((r) => r.stat.severity))
    : null;

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
                {/* 증상 고르기 — 고른 증상에 어느 병원 치료가 나았는지 아래에 나온다 */}
                <View style={styles.picker}>
                  <TouchableOpacity
                    style={styles.pickerHead}
                    onPress={() => setSymptomOpen((v) => !v)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pickerChevron}>{symptomOpen ? '⌄' : '›'}</Text>
                    <Text style={styles.pickerText} numberOfLines={1}>
                      {symptom ?? '증상 고르기'}
                    </Text>
                    <Text style={styles.pickerCount}>{symptomRows.length}건</Text>
                  </TouchableOpacity>

                  {symptomOpen && (
                    <View style={styles.pickerList}>
                      {symptoms.map((name) => (
                        <TouchableOpacity
                          key={name}
                          style={styles.pickerItem}
                          onPress={() => { setChosen(name); setSymptomOpen(false); }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.pickerItemText,
                              name === symptom && styles.pickerItemTextOn,
                            ]}
                            numberOfLines={1}
                          >
                            {name}
                          </Text>
                          {name === symptom && (
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

                {/* 고른 증상에 대한 병원별 비교 */}
                {symptom && (
                  <View style={styles.symptomCard}>
                    <Text style={styles.symptomTitle}>
                      ‘{symptom}’에 어느 병원 치료가 나았나
                    </Text>

                    {symptomRows.length === 0 ? (
                      <Text style={styles.emptyText}>
                        이 증상을 적은 치료가 아직 없어요.
                      </Text>
                    ) : (
                      <>
                        <View style={styles.symptomHead}>
                          <Text style={styles.symptomHeadName}>치료 · 처방</Text>
                          <Text style={styles.symptomHeadCell}>심각도</Text>
                          <Text style={styles.symptomHeadCell}>기록</Text>
                        </View>

                        {symptomRows.map(({ visit: v, drugs, stat }) => {
                          const best = stat.severity === bestSeverity;
                          return (
                            <View
                              key={v.id}
                              style={[styles.symptomRow, v.id === visitId && styles.symptomRowNow]}
                            >
                              <View style={styles.treatmentCol}>
                                <Text style={styles.treatmentName} numberOfLines={1}>
                                  {v.hospitalName}
                                  {v.id === visitId ? ' · 이번' : ''}
                                </Text>
                                <Text style={styles.treatmentMeta} numberOfLines={1}>
                                  {v.visitedAt}
                                  {v.visitReason ? ` · ${v.visitReason}` : ''}
                                </Text>
                                {drugs.length > 0 && (
                                  <Text style={styles.treatmentDrugs} numberOfLines={2}>
                                    {drugs.join(' · ')}
                                  </Text>
                                )}
                              </View>

                              <View style={styles.symptomCellBox}>
                                <Text style={[styles.symptomCell, best && styles.symptomCellBest]}>
                                  {stat.severity.toFixed(1)}
                                </Text>
                                {best && <Text style={styles.bestTag}>가장 나음</Text>}
                              </View>

                              <View style={styles.symptomCellBox}>
                                <Text style={styles.symptomCell}>{stat.days}일</Text>
                              </View>
                            </View>
                          );
                        })}

                        <Text style={styles.symptomFoot}>
                          심각도는 그 증상을 적은 날의 평균입니다. 낮을수록 좋습니다.
                          하루에 하나만 기록되므로 그날의 전반적인 몸 상태에 가깝습니다.
                        </Text>
                      </>
                    )}
                  </View>
                )}

                {/* AI가 두 치료를 견준 결과 — 위 표와 별개로 문장으로 읽는다 */}
                <View style={styles.picker}>
                  <TouchableOpacity
                    style={styles.pickerHead}
                    onPress={() => setPickerOpen((v) => !v)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.pickerChevron}>{pickerOpen ? '⌄' : '›'}</Text>
                    <Text style={styles.pickerText} numberOfLines={1}>
                      {comparedPast
                        ? `AI 비교 · ${visitLabel(comparedPast)}`
                        : 'AI에게 지난 치료와 견주게 하기'}
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
  symptomHeadCell: { width: 52, fontSize: 10, color: COLORS.textSecondary, textAlign: 'center' },
  symptomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  // 이번 치료는 견주는 기준이라 눈에 띄어야 한다
  symptomRowNow: { backgroundColor: COLORS.calSelected },
  treatmentCol: { flex: 1, paddingRight: SPACING.sm },
  treatmentName: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.semibold,
  },
  treatmentMeta: { fontSize: 10, color: COLORS.textSecondary },
  treatmentDrugs: { fontSize: 10, color: COLORS.textPlaceholder, marginTop: 1 },
  symptomCellBox: { width: 52, alignItems: 'center' },
  symptomCell: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.medium,
  },
  symptomCellBest: { color: COLORS.success, fontWeight: TYPOGRAPHY.bold },
  symptomCellDays: { fontSize: 9, color: COLORS.textPlaceholder },
  bestTag: {
    fontSize: 9,
    color: COLORS.success,
    fontWeight: TYPOGRAPHY.semibold,
    marginTop: 1,
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
  pickerItemTextOn: { color: COLORS.primary, fontWeight: TYPOGRAPHY.semibold },
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
