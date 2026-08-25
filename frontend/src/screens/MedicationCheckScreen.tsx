import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { visualizationApi } from '../api/Client';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useActiveVisit } from '../hooks/useActiveVisit';
import { useAsync } from '../hooks/useAsync';
import { useDoseDay } from '../hooks/useDoseDay';
import { toClockLabel, toLocalDate } from '../utils/datetime';

const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

function todayLabel(): string {
  const d = new Date();
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}`;
}

/**
 * 증상이 얼마나 나아졌는지 — 처음 기록한 증상 강도 대비 지금.
 * 증상 기록이 없으면 계산할 수 없으므로 null을 준다.
 */
function recoveryPercent(initial: number | null, final: number | null): number | null {
  if (initial == null || final == null || initial <= 0) return null;
  const improved = (initial - final) / initial;
  return Math.max(0, Math.min(100, Math.round(improved * 100)));
}

export default function MedicationCheckScreen() {
  const router = useRouter();
  const today = toLocalDate();

  const { visit } = useActiveVisit();
  const { groups, loading, error, refresh, mark, percent, total, queued } = useDoseDay(today);

  // 진행 중인 치료의 증상 변화 — 방문이 정해진 뒤에만 부른다
  const visitId = visit?.id ?? null;
  const { data: summary } = useAsync(
    async () => (visitId == null ? null : visualizationApi.summary(visitId)),
    [visitId],
    { enabled: visitId != null },
  );

  const recovery = recoveryPercent(
    summary?.initialSymptomSeverity ?? null,
    summary?.finalSymptomSeverity ?? null,
  );

  const toggleDose = async (doseId: number, isTaken: boolean) => {
    // 서버에 'PENDING으로 되돌리기'가 없다. 체크 해제는 건너뜀으로 기록한다
    try {
      await mark([doseId], isTaken ? 'SKIPPED' : 'TAKEN');
    } catch (e) {
      const message = e instanceof Error ? e.message : '기록하지 못했습니다.';
      Alert.alert('기록 실패', message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* 이전/다음 네비게이션 */}
      <View style={styles.navRow}>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
          <Text style={styles.navBtnText}>{'< 이전'}</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>{todayLabel()} 복약 기록</Text>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/medlog')}>
          <Text style={styles.navBtnText}>{'다음 >'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* 회복률 카드 */}
        <View style={styles.recoveryCard}>
          <Text style={styles.recoveryPercent}>
            {recovery != null
              ? `${recovery}% 회복 중이에요!`
              : '오늘도 잊지 말고 챙겨요!'}
          </Text>
          {recovery == null && (
            <Text style={styles.recoveryHint}>
              상태 기록을 쌓으면 회복 정도를 알려드려요.
            </Text>
          )}

          {/* 모래시계 아이콘 영역 */}
          <View style={styles.hourglassBox}>
            <Text style={styles.hourglassEmoji}>⏳</Text>
          </View>

          <TouchableOpacity
            style={styles.checkBtn}
            onPress={() => router.push('/medcheckpage')}
            activeOpacity={0.85}
          >
            <Text style={styles.checkBtnText}>복약 체크하기</Text>
          </TouchableOpacity>
        </View>

        {loading && <ActivityIndicator size="small" color={COLORS.primary} />}

        {error && !loading && (
          <TouchableOpacity style={styles.errorBox} onPress={refresh} activeOpacity={0.8}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorRetry}>다시 시도</Text>
          </TouchableOpacity>
        )}

        {!loading && !error && total === 0 && (
          <Text style={styles.emptyText}>오늘 복용할 약이 없습니다.</Text>
        )}

        {/* 복약 그룹별 목록 */}
        {groups.map((group) => (
          <View key={group.period} style={styles.groupCard}>
            <Text style={styles.groupPeriod}>{group.period}</Text>

            {group.doses.map((dose) => {
              const isTaken = dose.doseStatus === 'TAKEN';
              return (
                <TouchableOpacity
                  key={dose.id}
                  style={[styles.itemRow, isTaken && styles.itemRowTaken]}
                  onPress={() => toggleDose(dose.id, isTaken)}
                  activeOpacity={0.7}
                >
                  {/* 체크박스 */}
                  <View style={[styles.checkbox, isTaken && styles.checkboxDone]}>
                    {isTaken && <Text style={styles.checkmark}>✓</Text>}
                  </View>

                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemTime, isTaken && styles.itemTimeTaken]}>
                      {toClockLabel(dose.scheduledAt)} {isTaken ? '복용 완료' : '복용 미완료'}
                    </Text>
                    <Text style={styles.itemName}>{dose.medicationName}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* 전체 복약률 바 */}
        {total > 0 && (
          <View style={styles.progressCard}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>
                오늘 복약률{queued > 0 ? ` · 동기화 대기 ${queued}건` : ''}
              </Text>
              <Text style={styles.progressPercent}>{percent}%</Text>
            </View>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${percent}%` }]} />
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // 이전/다음 네비게이션
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  navBtn: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  navBtnText: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.semibold,
  },
  navTitle: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },

  content: {
    padding: SPACING.base,
    gap: SPACING.base,
    paddingBottom: SPACING.base,
  },

  errorBox: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: SPACING.base, alignItems: 'center', gap: SPACING.xs,
  },
  errorText: { fontSize: TYPOGRAPHY.sm, color: COLORS.error, textAlign: 'center' },
  errorRetry: { fontSize: TYPOGRAPHY.xs, color: COLORS.primary, fontWeight: TYPOGRAPHY.bold },
  emptyText: {
    fontSize: TYPOGRAPHY.sm, color: COLORS.textSecondary,
    textAlign: 'center', paddingVertical: SPACING.xl,
  },

  // 회복률 카드
  recoveryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.base,
    ...SHADOW.sm,
  },
  recoveryPercent: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },
  recoveryHint: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textSecondary,
    marginTop: -SPACING.sm,
  },
  hourglassBox: {
    width: 100,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hourglassEmoji: {
    fontSize: 80,
  },
  checkBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.round,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxxl,
    ...SHADOW.md,
  },
  checkBtnText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.white,
  },

  // 복약 그룹 카드
  groupCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    gap: SPACING.sm,
    ...SHADOW.sm,
  },
  groupPeriod: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
  },
  itemRowTaken: {
    backgroundColor: COLORS.primary + '12',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.bold,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemTime: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textSecondary,
  },
  itemTimeTaken: {
    color: COLORS.primary,
  },
  itemName: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textPrimary,
  },

  // 복약률 바
  progressCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    gap: SPACING.sm,
    ...SHADOW.sm,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textPrimary,
  },
  progressPercent: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.primary,
  },
  progressBg: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.round,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.round,
  },
});
