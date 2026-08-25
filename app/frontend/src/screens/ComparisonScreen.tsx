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
import { ApiError, comparisonApi, visitApi } from '../api/Client';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useActiveVisit } from '../hooks/useActiveVisit';
import { useAsync } from '../hooks/useAsync';
import type { ComparisonResponse, VisitResponse } from '../types/Api';

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
