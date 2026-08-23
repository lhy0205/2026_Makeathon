import { MOCK_MED_CHECK, MOCK_RECOVERY_PERCENT, MOCK_SIDE_EFFECTS } from '@/src/constants/mockData';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '@/src/constants/theme';
import type { MedCheckGroup, SideEffectItem } from '@/src/types';
import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TODAY = '8월 23일 월요일';

type ModalTab = 'med' | 'status';

export default function HistoryTab() {
  const [groups, setGroups] = useState<MedCheckGroup[]>(MOCK_MED_CHECK);
  const [sideEffects, setSideEffects] = useState<SideEffectItem[]>(MOCK_SIDE_EFFECTS);
  const [conditionScore, setConditionScore] = useState(3);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<ModalTab>('med');

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

  const toggleEffect = (id: string) => {
    setSideEffects((prev) =>
      prev.map((item) => item.id === id ? { ...item, enabled: !item.enabled } : item)
    );
  };

  const allItems = groups.flatMap((g) => g.items);
  const totalItems = allItems.length;
  const takenItems = allItems.filter((i) => i.taken).length;
  const percent = totalItems > 0 ? Math.round((takenItems / totalItems) * 100) : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{TODAY}</Text>
      </View>

      {/* 본문 */}
      <View style={styles.body}>
        <Text style={styles.recoveryText}>{MOCK_RECOVERY_PERCENT}% 회복 중이에요!</Text>

        <Text style={styles.hourglassEmoji}>⏳</Text>

        {/* 복약 체크하기 버튼 */}
        <TouchableOpacity
          style={styles.checkBtn}
          onPress={() => { setActiveTab('med'); setModalVisible(true); }}
          activeOpacity={0.85}
        >
          <Text style={styles.checkBtnText}>복약 체크하기</Text>
        </TouchableOpacity>

        {/* 상태 체크하기 버튼 */}
        <TouchableOpacity
          style={styles.statusBtn}
          onPress={() => { setActiveTab('status'); setModalVisible(true); }}
          activeOpacity={0.85}
        >
          <Text style={styles.statusBtnText}>상태 체크하기</Text>
        </TouchableOpacity>
      </View>

      {/* ── 모달 ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>

            {/* 모달 헤더 */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{TODAY}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* 탭 */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'med' && styles.tabActive]}
                onPress={() => setActiveTab('med')}
              >
                <Text style={[styles.tabText, activeTab === 'med' && styles.tabTextActive]}>
                  복약 체크
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'status' && styles.tabActive]}
                onPress={() => setActiveTab('status')}
              >
                <Text style={[styles.tabText, activeTab === 'status' && styles.tabTextActive]}>
                  상태 체크
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>

              {/* ── 복약 체크 탭 ── */}
              {activeTab === 'med' && (
                <View style={styles.tabContent}>
                  {/* 복약률 바 */}
                  <View style={styles.progressWrap}>
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
                    <View key={group.period} style={styles.groupBlock}>
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
                              {item.time}  {item.taken ? '복용 완료' : '복용 미완료'}
                            </Text>
                            <Text style={styles.itemName}>{item.name} {item.dosage}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                </View>
              )}

              {/* ── 상태 체크 탭 ── */}
              {activeTab === 'status' && (
                <View style={styles.tabContent}>

                  {/* 컨디션 점수 */}
                  <Text style={styles.sectionLabel}>오늘 컨디션</Text>
                  <View style={styles.scoreRow}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.scoreBtn, conditionScore === s && styles.scoreBtnActive]}
                        onPress={() => setConditionScore(s)}
                      >
                        <Text style={[styles.scoreBtnText, conditionScore === s && styles.scoreBtnTextActive]}>
                          {s}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.scoreLabelRow}>
                    <Text style={styles.scoreHint}>매우 나쁨</Text>
                    <Text style={styles.scoreHint}>매우 좋음</Text>
                  </View>

                  {/* 부작용 체크 */}
                  <Text style={[styles.sectionLabel, { marginTop: SPACING.base }]}>
                    부작용 증상
                  </Text>
                  {sideEffects.map((item) => (
                    <View key={item.id} style={styles.effectRow}>
                      <Text style={styles.effectLabel}>{item.label}</Text>
                      <Switch
                        value={item.enabled}
                        onValueChange={() => toggleEffect(item.id)}
                        trackColor={{ false: COLORS.border, true: COLORS.primary }}
                        thumbColor={COLORS.white}
                      />
                    </View>
                  ))}
                </View>
              )}

            </ScrollView>

            {/* 완료 버튼 */}
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.doneBtnText}>완료</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  header: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  recoveryText: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },
  hourglassEmoji: {
    fontSize: 140,
  },
  checkBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.round,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxxl,
    width: '100%',
    alignItems: 'center',
    ...SHADOW.md,
  },
  checkBtnText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.white,
  },
  statusBtn: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.round,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxxl,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    ...SHADOW.sm,
  },
  statusBtnText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.primary,
  },

  // 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.xl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.md,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },
  modalClose: {
    fontSize: TYPOGRAPHY.md,
    color: COLORS.textSecondary,
    padding: SPACING.xs,
  },

  // 탭
  tabRow: {
    flexDirection: 'row',
    marginTop: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.medium,
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.bold,
  },

  modalScroll: { flexGrow: 0 },
  tabContent: { paddingVertical: SPACING.base, gap: SPACING.sm },

  // 복약률 바
  progressWrap: { gap: SPACING.sm, marginBottom: SPACING.base },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: TYPOGRAPHY.sm, fontWeight: TYPOGRAPHY.semibold, color: COLORS.textPrimary },
  progressValue: { fontSize: TYPOGRAPHY.sm, fontWeight: TYPOGRAPHY.bold, color: COLORS.primary },
  progressBg: { height: 8, backgroundColor: COLORS.border, borderRadius: RADIUS.round, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: RADIUS.round },

  // 복약 목록
  groupBlock: { marginBottom: SPACING.base, gap: SPACING.sm },
  groupPeriod: { fontSize: TYPOGRAPHY.base, fontWeight: TYPOGRAPHY.bold, color: COLORS.textPrimary },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md, backgroundColor: COLORS.background,
  },
  itemRowTaken: { backgroundColor: COLORS.primary + '12' },
  checkbox: {
    width: 22, height: 22, borderRadius: RADIUS.sm,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkmark: { fontSize: 11, color: COLORS.white, fontWeight: TYPOGRAPHY.bold },
  itemInfo: { flex: 1, gap: 2 },
  itemTime: { fontSize: TYPOGRAPHY.xs, color: COLORS.textSecondary },
  itemTimeDone: { color: COLORS.primary },
  itemName: { fontSize: TYPOGRAPHY.sm, fontWeight: TYPOGRAPHY.semibold, color: COLORS.textPrimary },

  // 상태 체크
  sectionLabel: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  scoreRow: { flexDirection: 'row', gap: SPACING.sm },
  scoreBtn: {
    flex: 1, aspectRatio: 1, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  scoreBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  scoreBtnText: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.bold, color: COLORS.textSecondary },
  scoreBtnTextActive: { color: COLORS.white },
  scoreLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.xs },
  scoreHint: { fontSize: TYPOGRAPHY.xs, color: COLORS.textSecondary },
  effectRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  effectLabel: { fontSize: TYPOGRAPHY.base, color: COLORS.textPrimary },

  // 완료 버튼
  doneBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: SPACING.md, alignItems: 'center',
    marginTop: SPACING.base, ...SHADOW.md,
  },
  doneBtnText: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.bold, color: COLORS.white },
});
