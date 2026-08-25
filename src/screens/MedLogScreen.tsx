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
import { MOCK_MED_CHECK } from '../constants/mockData';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../constants/theme';
import type { MedCheckGroup } from '../types';

const TODAY = '8월 23일 월요일';
const TOTAL_DAYS = 7;
const CURRENT_DAY = 5;

export default function MedLogScreen() {
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* 이전/다음 네비게이션 */}
      <View style={styles.navRow}>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
          <Text style={styles.navBtnText}>{'< 이전'}</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>{TODAY} 복약 기록</Text>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.push('/sideeffect')}>
          <Text style={styles.navBtnText}>{'다음 >'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* 복약 일수 진행 바 */}
        <View style={styles.dayCard}>
          <View style={styles.dayLabelRow}>
            <Text style={styles.dayLabel}>복약 진행</Text>
            <Text style={styles.dayCount}>{CURRENT_DAY}/{TOTAL_DAYS}일</Text>
          </View>
          <View style={styles.dayBarBg}>
            <View style={[styles.dayBarFill, { width: `${(CURRENT_DAY / TOTAL_DAYS) * 100}%` }]} />
          </View>
        </View>

        {/* 복약 그룹별 체크 목록 */}
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

        {/* 스크롤 안내 문구 */}
        <Text style={styles.scrollHint}>
          스크롤 내리면 수면시간/음수량도 기록할 수 있게
        </Text>

        {/* 수면 / 음수 기록 카드 */}
        <View style={styles.extraCard}>
          <Text style={styles.extraTitle}>수면 시간</Text>
          <View style={styles.extraRow}>
            {['6시간', '7시간', '8시간', '9시간+'].map((v) => (
              <TouchableOpacity key={v} style={styles.extraChip}>
                <Text style={styles.extraChipText}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.extraCard}>
          <Text style={styles.extraTitle}>음수량</Text>
          <View style={styles.extraRow}>
            {['500ml', '1L', '1.5L', '2L+'].map((v) => (
              <TouchableOpacity key={v} style={styles.extraChip}>
                <Text style={styles.extraChipText}>{v}</Text>
              </TouchableOpacity>
            ))}
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
  extraChipText: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.medium,
  },
});
