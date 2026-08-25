import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MOCK_MED_CHECK, MOCK_RECOVERY_PERCENT } from '../constants/mockData';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../constants/theme';
import type { MedCheckGroup } from '../types';

const TODAY = '8월 23일 월요일';

export default function MedicationCheckScreen() {
  const router = useRouter();
  const [groups, setGroups] = useState<MedCheckGroup[]>(MOCK_MED_CHECK);

  const toggleItem = (groupIdx: number, itemIdx: number) => {
    setGroups((prev) =>
      prev.map((g, gi) =>
        gi !== groupIdx
          ? g
          : {
              ...g,
              items: g.items.map((item, ii) =>
                ii !== itemIdx ? item : { ...item, status: item.status === 'TAKEN' ? 'PENDING' as const : 'TAKEN' as const }
              ),
            }
      )
    );
  };

  // 전체 복약률 계산
  const totalItems = groups.flatMap((g) => g.items).length;
  const takenItems = groups.flatMap((g) => g.items).filter((i) => i.status === 'TAKEN').length;
  const percent = totalItems > 0 ? Math.round((takenItems / totalItems) * 100) : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* 이전/다음 네비게이션 */}
      <View style={styles.navRow}>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
          <Text style={styles.navBtnText}>{'< 이전'}</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>{TODAY} 복약 기록</Text>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/medlog')}>
          <Text style={styles.navBtnText}>{'다음 >'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* 회복률 카드 */}
        <View style={styles.recoveryCard}>
          <Text style={styles.recoveryPercent}>{MOCK_RECOVERY_PERCENT}% 회복 중이에요!</Text>

          {/* 모래시계 아이콘 영역 */}
          <View style={styles.hourglassBox}>
            <Text style={styles.hourglassEmoji}>⏳</Text>
          </View>

          <TouchableOpacity style={styles.checkBtn} activeOpacity={0.85}>
            <Text style={styles.checkBtnText}>복약 체크하기</Text>
          </TouchableOpacity>
        </View>

        {/* 복약 그룹별 목록 */}
        {groups.map((group, gi) => (
          <View key={group.period} style={styles.groupCard}>
            <Text style={styles.groupPeriod}>{group.period}</Text>

            {group.items.map((item, ii) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.itemRow, item.status === 'TAKEN' && styles.itemRowTaken]}
                onPress={() => toggleItem(gi, ii)}
                activeOpacity={0.7}
              >
                {/* 체크박스 */}
                <View style={[styles.checkbox, item.status === 'TAKEN' && styles.checkboxDone]}>
                  {item.status === 'TAKEN' && <Text style={styles.checkmark}>✓</Text>}
                </View>

                <View style={styles.itemInfo}>
                  <Text style={[styles.itemTime, item.status === 'TAKEN' && styles.itemTimeTaken]}>
                    {item.time} {item.status === 'TAKEN' ? '복용 완료' : '복용 미완료'}
                  </Text>
                  <Text style={styles.itemName}>
                    {item.name} {item.dosage}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* 전체 복약률 바 */}
        <View style={styles.progressCard}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>오늘 복약률</Text>
            <Text style={styles.progressPercent}>{percent}%</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${percent}%` }]} />
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
