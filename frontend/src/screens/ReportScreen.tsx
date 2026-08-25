import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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
import { ApiError, reportApi } from '../api/Client';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useActiveVisit } from '../hooks/useActiveVisit';
import { useAsync } from '../hooks/useAsync';
import type { ReportResponse } from '../types/Api';

/** 아직 만든 리포트가 없는 건 오류가 아니다 */
async function loadLatest(visitId: number): Promise<ReportResponse | null> {
  try {
    return await reportApi.getLatest(visitId);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

/** 'YYYY-MM-DDTHH:mm:ss' → '11월 24일 오후 3:20' */
function stamp(iso: string): string {
  const [date, time = ''] = iso.split('T');
  const [, m, d] = date.split('-');
  const [hStr = '0', min = '00'] = time.split(':');
  const h = Number(hStr);
  const suffix = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${Number(m)}월 ${Number(d)}일 ${suffix} ${h12}:${min}`;
}

/** 리포트 한 단락 */
function Block({ label, body }: { label: string; body: string | null }) {
  if (!body?.trim()) return null;
  return (
    <View style={styles.block}>
      <Text style={styles.blockLabel}>{label}</Text>
      <Text style={styles.blockBody}>{body.trim()}</Text>
    </View>
  );
}

export default function ReportScreen() {
  const router = useRouter();
  const { visit, loading: visitLoading } = useActiveVisit();
  const visitId = visit?.id ?? null;

  const { data: report, loading, error, refresh, setData } = useAsync(
    () => loadLatest(visitId!),
    [visitId],
    { enabled: visitId != null },
  );

  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (visitId == null || generating) return;

    setGenerating(true);
    try {
      const fresh = await reportApi.generate(visitId);
      setData(fresh);
    } catch (e) {
      const message = e instanceof Error ? e.message : '리포트를 만들지 못했습니다.';
      Alert.alert('생성 실패', message);
    } finally {
      setGenerating(false);
    }
  };

  const busy = visitLoading || loading;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* 헤더 */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>{'< 이전'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>진료 리포트</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {busy && <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />}

        {!busy && !visit && (
          <Text style={styles.emptyText}>
            처방전을 먼저 등록하면 진료 리포트를 만들 수 있어요.
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
            {/* 문서 머리 — 진료실에서 이대로 보여준다 */}
            <View style={styles.sheet}>
              <View style={styles.sheetHead}>
                <Text style={styles.sheetEyebrow}>복약 경과 요약</Text>
                <Text style={styles.sheetTitle}>{visit.hospitalName}</Text>
                <Text style={styles.sheetMeta}>
                  {visit.departmentName ? `${visit.departmentName} · ` : ''}
                  {visit.visitReason ?? '방문 사유 미기록'}
                </Text>
                <Text style={styles.sheetMeta}>
                  {visit.medicationStartDate && visit.medicationEndDate
                    ? `복약 ${visit.medicationStartDate} ~ ${visit.medicationEndDate}`
                    : `방문일 ${visit.visitedAt}`}
                </Text>
              </View>

              {report ? (
                <>
                  <View style={styles.adherenceRow}>
                    <Text style={styles.adherenceLabel}>복약률</Text>
                    <Text style={styles.adherenceValue}>
                      {Math.round(report.adherenceRate)}
                      <Text style={styles.adherenceUnit}>%</Text>
                    </Text>
                  </View>

                  <Block label="요약" body={report.summary} />
                  <Block label="증상 변화" body={report.symptomChanges} />
                  <Block label="의심되는 부작용" body={report.suspectedSideEffects} />
                  <Block label="생활 기록" body={report.lifestyleSummary} />
                  <Block label="의사 선생님께" body={report.doctorNotes} />

                  <Text style={styles.stamp}>{stamp(report.generatedAt)} 생성</Text>
                </>
              ) : (
                <View style={styles.blank}>
                  <Text style={styles.blankTitle}>아직 만든 리포트가 없어요</Text>
                  <Text style={styles.blankText}>
                    지금까지 남긴 복약 기록과 상태 기록을 모아{'\n'}
                    진료 때 보여줄 한 장으로 정리해 드릴게요.
                  </Text>
                </View>
              )}
            </View>

            {/* 생성 / 다시 생성 */}
            <TouchableOpacity
              style={[styles.action, generating && styles.actionOff]}
              onPress={handleGenerate}
              disabled={generating}
              activeOpacity={0.85}
            >
              {generating
                ? <ActivityIndicator size="small" color={COLORS.white} />
                : <Text style={styles.actionText}>
                    {report ? '최신 기록으로 다시 만들기' : '리포트 만들기'}
                  </Text>}
            </TouchableOpacity>

            {report && (
              <Text style={styles.footnote}>
                기록이 쌓인 뒤 다시 만들면 그때까지의 내용으로 갱신됩니다.
                이전 리포트도 그대로 남아 있어요.
              </Text>
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
    textAlign: 'center', paddingVertical: SPACING.xl,
  },
  errorBox: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: SPACING.base, alignItems: 'center', gap: SPACING.xs,
  },
  errorText: { fontSize: TYPOGRAPHY.sm, color: COLORS.error, textAlign: 'center' },
  errorRetry: { fontSize: TYPOGRAPHY.xs, color: COLORS.primary, fontWeight: TYPOGRAPHY.bold },
  footnote: {
    fontSize: 11, color: COLORS.textSecondary,
    textAlign: 'center', lineHeight: 16,
  },

  // 리포트 본문 — 종이 한 장처럼
  sheet: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.base,
    ...SHADOW.sm,
  },
  sheetHead: {
    gap: 2,
    paddingBottom: SPACING.md,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  sheetEyebrow: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.primary,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  sheetTitle: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.extrabold,
    color: COLORS.textPrimary,
  },
  sheetMeta: { fontSize: TYPOGRAPHY.xs, color: COLORS.textSecondary },

  adherenceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
  },
  adherenceLabel: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textSecondary,
  },
  adherenceValue: {
    fontSize: 28,
    fontWeight: TYPOGRAPHY.extrabold,
    color: COLORS.primary,
  },
  adherenceUnit: { fontSize: TYPOGRAPHY.base, fontWeight: TYPOGRAPHY.bold },

  block: { gap: SPACING.xs },
  blockLabel: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.primary,
    letterSpacing: 0.4,
  },
  blockBody: {
    fontSize: TYPOGRAPHY.sm,
    lineHeight: 22,
    color: COLORS.textPrimary,
  },

  stamp: {
    fontSize: 10,
    color: COLORS.textPlaceholder,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },

  blank: { alignItems: 'center', gap: SPACING.xs, paddingVertical: SPACING.xl },
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

  action: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.round,
    paddingVertical: SPACING.base,
    alignItems: 'center',
    ...SHADOW.md,
  },
  actionOff: { opacity: 0.6 },
  actionText: {
    fontSize: TYPOGRAPHY.md,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.white,
    letterSpacing: 0.3,
  },
});
