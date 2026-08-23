import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MOCK_SIDE_EFFECTS } from '../constants/mockData';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../constants/theme';
import type { SideEffectItem } from '../types';

const TOTAL_PAGES = 5;
const CURRENT_PAGE = 4;

// 오늘의 컨디션 점수 (1~5)
const CONDITION_MAX = 5;

export default function SideEffectScreen() {
  const router = useRouter();
  const [conditionScore, setConditionScore] = useState(3);
  const [sideEffects, setSideEffects] = useState<SideEffectItem[]>(MOCK_SIDE_EFFECTS);
  const [customText, setCustomText] = useState('');

  const toggleEffect = (id: string) => {
    setSideEffects((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    );
  };

  const handleComplete = () => {
    Alert.alert('기록 완료', '오늘의 부작용 기록이 저장되었습니다.', [
      { text: '확인', onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* 이전/다음 네비게이션 */}
      <View style={styles.navRow}>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
          <Text style={styles.navBtnText}>{'< 이전'}</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Medi-Self 부작용 기록</Text>
        <View style={styles.navBtn}>
          {/* 마지막 페이지이므로 다음 없음 */}
          <Text style={styles.pageIndicator}>{CURRENT_PAGE}/{TOTAL_PAGES}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* 오늘의 컨디션 점수 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>오늘의 컨디션 점수</Text>
          <Text style={styles.cardSub}>오늘 몸 상태가 어떠신가요?</Text>
          <View style={styles.scoreRow}>
            {Array.from({ length: CONDITION_MAX }, (_, i) => i + 1).map((score) => (
              <TouchableOpacity
                key={score}
                style={[styles.scoreBtn, conditionScore === score && styles.scoreBtnActive]}
                onPress={() => setConditionScore(score)}
              >
                <Text style={[styles.scoreBtnText, conditionScore === score && styles.scoreBtnTextActive]}>
                  {score}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.scoreLabelRow}>
            <Text style={styles.scoreLabel}>매우 나쁨</Text>
            <Text style={styles.scoreLabel}>매우 좋음</Text>
          </View>
        </View>

        {/* 오늘의 부작용 체크 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>오늘의 부작용 체크</Text>
          <Text style={styles.cardSub}>선택된 약의 증상이 있으신가요?</Text>

          {sideEffects.map((item) => (
            <View key={item.id} style={styles.effectRow}>
              {item.id === 'se_006' ? (
                // 직접 입력 항목
                <View style={styles.customRow}>
                  <Switch
                    value={item.enabled}
                    onValueChange={() => toggleEffect(item.id)}
                    trackColor={{ false: COLORS.border, true: COLORS.primary }}
                    thumbColor={COLORS.white}
                  />
                  <TextInput
                    style={styles.customInput}
                    placeholder="직접 입력"
                    placeholderTextColor={COLORS.textPlaceholder}
                    value={customText}
                    onChangeText={setCustomText}
                    editable={item.enabled}
                  />
                  <TouchableOpacity style={styles.editIconBtn}>
                    <Text style={styles.editIcon}>✏️</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.switchRow}>
                  <Text style={styles.effectLabel}>{item.label}</Text>
                  <Switch
                    value={item.enabled}
                    onValueChange={() => toggleEffect(item.id)}
                    trackColor={{ false: COLORS.border, true: COLORS.primary }}
                    thumbColor={COLORS.white}
                  />
                </View>
              )}
            </View>
          ))}
        </View>

      </ScrollView>

      {/* 하단 완료 버튼 */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.completeBtn} onPress={handleComplete} activeOpacity={0.85}>
          <Text style={styles.completeBtnText}>✓ 체크 완료</Text>
        </TouchableOpacity>
      </View>
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
    minWidth: 60,
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
    flex: 1,
    textAlign: 'center',
  },
  pageIndicator: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },

  content: {
    padding: SPACING.base,
    gap: SPACING.base,
    paddingBottom: SPACING.base,
  },

  // 카드 공통
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    gap: SPACING.sm,
    ...SHADOW.sm,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },
  cardSub: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },

  // 컨디션 점수
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  scoreBtn: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  scoreBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  scoreBtnText: {
    fontSize: TYPOGRAPHY.md,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textSecondary,
  },
  scoreBtnTextActive: {
    color: COLORS.white,
  },
  scoreLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreLabel: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textSecondary,
  },

  // 부작용 항목
  effectRow: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: SPACING.xs,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  effectLabel: {
    fontSize: TYPOGRAPHY.base,
    color: COLORS.textPrimary,
  },

  // 직접 입력 행
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  customInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.base,
    color: COLORS.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: SPACING.xs,
  },
  editIconBtn: {
    padding: SPACING.xs,
  },
  editIcon: {
    fontSize: 16,
  },

  // 완료 버튼
  footer: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  completeBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    ...SHADOW.md,
  },
  completeBtnText: {
    fontSize: TYPOGRAPHY.md,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.white,
    letterSpacing: 0.5,
  },
});
