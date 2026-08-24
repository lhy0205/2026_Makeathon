import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MOCK_MED_CHECK } from '../constants/mockData';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../constants/theme';
import type { MedCheckGroup } from '../types';

export default function MedCheckScreen() {
  const router = useRouter();
  const [groups, setGroups] = useState<MedCheckGroup[]>(MOCK_MED_CHECK);

  const toggleItem = (gi: number, ii: number) => {
    setGroups((prev) =>
      prev.map((g, gIdx) =>
        gIdx !== gi ? g : {
          ...g,
          items: g.items.map((item, iIdx) =>
            iIdx !== ii ? item : { ...item, taken: !item.taken }
          ),
        }
      )
    );
  };

  const allItems   = groups.flatMap((g) => g.items);
  const totalItems = allItems.length;
  const takenItems = allItems.filter((i) => i.taken).length;
  const percent    = totalItems > 0 ? Math.round((takenItems / totalItems) * 100) : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>

      {/* 헤더 */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelBtn}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>복약 체크</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.doneBtn}>완료</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* 복약률 바 */}
        <View style={styles.progressCard}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>오늘 복약률</Text>
            <Text style={styles.progressValue}>{takenItems}/{totalItems}회 ({percent}%)</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${percent}%` as any }]} />
          </View>
        </View>

        {/* 복약 목록 */}
        {groups.map((group, gi) => (
          <View key={group.period} style={styles.groupCard}>
            <Text style={styles.groupPeriod}>{group.period}</Text>
            {group.items.map((item, ii) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.itemRow, item.taken && styles.itemRowTaken]}
                onPress={() => toggleItem(gi, ii)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, item.taken && styles.checkboxDone]}>
                  {item.taken && <Text style={styles.checkmark}>V</Text>}
                </View>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemTime, item.taken && styles.itemTimeDone]}>
                    {item.time}{'  '}{item.taken ? '복용 완료' : '복용 미완료'}
                  </Text>
                  <Text style={styles.itemName}>{item.name} {item.dosage}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}

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
  headerTitle: { fontSize: TYPOGRAPHY.lg, fontWeight: TYPOGRAPHY.bold, color: COLORS.textPrimary },
  cancelBtn: { fontSize: TYPOGRAPHY.base, color: COLORS.textSecondary, fontWeight: TYPOGRAPHY.medium },
  doneBtn: { fontSize: TYPOGRAPHY.base, color: COLORS.primary, fontWeight: TYPOGRAPHY.bold },
  content: { padding: SPACING.base, gap: SPACING.base, paddingBottom: SPACING.xl },
  progressCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.base, gap: SPACING.sm, ...SHADOW.sm,
  },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: TYPOGRAPHY.sm, fontWeight: TYPOGRAPHY.semibold, color: COLORS.textPrimary },
  progressValue: { fontSize: TYPOGRAPHY.sm, fontWeight: TYPOGRAPHY.bold, color: COLORS.primary },
  progressBg: { height: 8, backgroundColor: COLORS.border, borderRadius: RADIUS.round, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: RADIUS.round },
  groupCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.base, gap: SPACING.sm, ...SHADOW.sm,
  },
  groupPeriod: { fontSize: TYPOGRAPHY.base, fontWeight: TYPOGRAPHY.bold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md, backgroundColor: COLORS.background,
  },
  itemRowTaken: { backgroundColor: COLORS.primary + '12' },
  checkbox: {
    width: 22, height: 22, borderRadius: RADIUS.sm,
    borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkmark: { fontSize: 11, color: COLORS.white, fontWeight: TYPOGRAPHY.bold },
  itemInfo: { flex: 1, gap: 2 },
  itemTime: { fontSize: TYPOGRAPHY.xs, color: COLORS.textSecondary },
  itemTimeDone: { color: COLORS.primary },
  itemName: { fontSize: TYPOGRAPHY.sm, fontWeight: TYPOGRAPHY.semibold, color: COLORS.textPrimary },
});
