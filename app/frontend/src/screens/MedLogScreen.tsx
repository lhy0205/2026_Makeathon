import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
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
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useActiveVisit } from '../hooks/useActiveVisit';
import { useDoseDay } from '../hooks/useDoseDay';
import { useHealthLogDay } from '../hooks/useHealthLogDay';
import type { VisitResponse } from '../types/Api';
import { toClockLabel, toLocalDate } from '../utils/datetime';

const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

function todayLabel(): string {
  const d = new Date();
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}`;
}

/** 'YYYY-MM-DD' 사이의 일수 (양끝 포함) */
function daysBetween(from: string, to: string): number {
  const a = new Date(from);
  const b = new Date(to);
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000) + 1;
}

/** 복약 기간 중 오늘이 며칠째인지 */
function medicationProgress(visit: VisitResponse | null, today: string) {
  if (!visit?.medicationStartDate || !visit?.medicationEndDate) return null;

  const total = daysBetween(visit.medicationStartDate, visit.medicationEndDate);
  if (total <= 0) return null;

  const elapsed = daysBetween(visit.medicationStartDate, today);
  return { current: Math.min(total, Math.max(1, elapsed)), total };
}

// 자주 쓰는 값만 빠르게 누를 수 있게 — 정밀 조절은 상태 체크 화면에서 한다
const SLEEP_CHOICES = [6, 7, 8, 9];
const WATER_CHOICES = [500, 1000, 1500, 2000];

const toLiterLabel = (ml: number) => (ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`);

export default function MedLogScreen() {
  const router = useRouter();
  const today = toLocalDate();

  const { visit } = useActiveVisit();
  const { groups, loading, error, refresh, mark, total } = useDoseDay(today);
  const { log, save } = useHealthLogDay(visit?.id ?? null, today);

  const [savingField, setSavingField] = useState<'sleep' | 'water' | null>(null);

  const progress = useMemo(() => medicationProgress(visit, today), [visit, today]);

  const toggleDose = async (doseId: number, isTaken: boolean) => {
    try {
      // 서버에 'PENDING으로 되돌리기'가 없다. 체크 해제는 건너뜀으로 기록한다
      await mark([doseId], isTaken ? 'SKIPPED' : 'TAKEN');
    } catch (e) {
      const message = e instanceof Error ? e.message : '기록하지 못했습니다.';
      Alert.alert('기록 실패', message);
    }
  };

  /** 칩 하나를 누르면 그 값만 바꾸고 나머지 하루치 기록은 그대로 둔다 */
  const saveMetric = async (field: 'sleep' | 'water', value: number) => {
    if (!visit) {
      Alert.alert('기록할 치료가 없어요', '처방전을 먼저 등록해주세요.');
      return;
    }

    setSavingField(field);
    try {
      await save({
        symptomName: log?.symptomName ?? null,
        symptomSeverity: log?.symptomSeverity ?? null,
        sideEffects: log?.sideEffects ?? [],
        bodyTemperature: log?.bodyTemperature ?? null,
        sleepHours: field === 'sleep' ? value : (log?.sleepHours ?? null),
        waterIntakeMl: field === 'water' ? value : (log?.waterIntakeMl ?? null),
        activityMinutes: log?.activityMinutes ?? null,
        memo: log?.memo ?? null,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : '저장하지 못했습니다.';
      Alert.alert('저장 실패', message);
    } finally {
      setSavingField(null);
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
        <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/sideeffect')}>
          <Text style={styles.navBtnText}>{'다음 >'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* 복약 일수 진행 바 */}
        {progress && (
          <View style={styles.dayCard}>
            <View style={styles.dayLabelRow}>
              <Text style={styles.dayLabel}>복약 진행</Text>
              <Text style={styles.dayCount}>{progress.current}/{progress.total}일</Text>
            </View>
            <View style={styles.dayBarBg}>
              <View style={[
                styles.dayBarFill,
                { width: `${(progress.current / progress.total) * 100}%` },
              ]} />
            </View>
          </View>
        )}

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

        {/* 복약 그룹별 체크 목록 */}
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

        {/* 스크롤 안내 문구 */}
        <Text style={styles.scrollHint}>
          아래에서 수면시간과 음수량도 함께 기록할 수 있어요
        </Text>

        {/* 수면 / 음수 기록 카드 */}
        <View style={styles.extraCard}>
          <View style={styles.extraTitleRow}>
            <Text style={styles.extraTitle}>수면 시간</Text>
            {savingField === 'sleep' && <ActivityIndicator size="small" color={COLORS.primary} />}
          </View>
          <View style={styles.extraRow}>
            {SLEEP_CHOICES.map((hours, idx) => {
              const on = log?.sleepHours === hours;
              const label = idx === SLEEP_CHOICES.length - 1 ? `${hours}시간+` : `${hours}시간`;
              return (
                <TouchableOpacity
                  key={hours}
                  style={[styles.extraChip, on && styles.extraChipOn]}
                  onPress={() => saveMetric('sleep', hours)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.extraChipText, on && styles.extraChipTextOn]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.extraCard}>
          <View style={styles.extraTitleRow}>
            <Text style={styles.extraTitle}>음수량</Text>
            {savingField === 'water' && <ActivityIndicator size="small" color={COLORS.primary} />}
          </View>
          <View style={styles.extraRow}>
            {WATER_CHOICES.map((ml, idx) => {
              const on = log?.waterIntakeMl === ml;
              const label = idx === WATER_CHOICES.length - 1
                ? `${toLiterLabel(ml)}+`
                : toLiterLabel(ml);
              return (
                <TouchableOpacity
                  key={ml}
                  style={[styles.extraChip, on && styles.extraChipOn]}
                  onPress={() => saveMetric('water', ml)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.extraChipText, on && styles.extraChipTextOn]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // 네비게이션
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

  // 복약 일수 바
  dayCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    gap: SPACING.sm,
    ...SHADOW.sm,
  },
  dayLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayLabel: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textPrimary,
  },
  dayCount: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.primary,
  },
  dayBarBg: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.round,
    overflow: 'hidden',
  },
  dayBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.round,
  },

  // 복약 그룹
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

  // 스크롤 힌트
  scrollHint: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // 수면/음수 카드
  extraCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    gap: SPACING.sm,
    ...SHADOW.sm,
  },
  extraTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  extraTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },
  extraRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  extraChip: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.round,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  extraChipOn: {
    backgroundColor: COLORS.primary,
  },
  extraChipText: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.medium,
  },
  extraChipTextOn: {
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.bold,
  },
});
