import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import {
  CUSTOM_EFFECT_ID,
  MAX_SEVERITY,
  freshSideEffects,
  fromSideEffectLabels,
  toSideEffectLabels,
} from '../constants/sideEffects';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useActiveVisit } from '../hooks/useActiveVisit';
import { useHealthLogDay } from '../hooks/useHealthLogDay';
import type { SideEffectItem } from '../types';
import { toLocalDate } from '../utils/datetime';

const TOTAL_PAGES = 5;
const CURRENT_PAGE = 4;

// 오늘의 컨디션 점수 (1~5). 1이 가장 나쁘다
const CONDITION_MAX = 5;
const DEFAULT_CONDITION = 3;

/** 컨디션 1~5 → 서버 증상 심각도 0~10 (값이 클수록 심하다) */
function conditionToSeverity(condition: number): number {
  return Math.round(((CONDITION_MAX - condition) / (CONDITION_MAX - 1)) * MAX_SEVERITY);
}

/** 서버 증상 심각도 0~10 → 컨디션 1~5 */
function severityToCondition(severity: number): number {
  const value = CONDITION_MAX - (severity / MAX_SEVERITY) * (CONDITION_MAX - 1);
  return Math.min(CONDITION_MAX, Math.max(1, Math.round(value)));
}

export default function SideEffectScreen() {
  const router = useRouter();
  const today = toLocalDate();

  const { visit, loading: visitLoading } = useActiveVisit();
  const { log, loading: logLoading, save } = useHealthLogDay(visit?.id ?? null, today);

  const [conditionScore, setConditionScore] = useState(DEFAULT_CONDITION);
  const [sideEffects, setSideEffects] = useState<SideEffectItem[]>(freshSideEffects);
  const [saving, setSaving] = useState(false);

  // 오늘 이미 남긴 기록이 있으면 이어서 고칠 수 있게 채워 둔다
  useEffect(() => {
    if (logLoading) return;

    if (!log) {
      setConditionScore(DEFAULT_CONDITION);
      setSideEffects(freshSideEffects());
      return;
    }

    setConditionScore(
      log.symptomSeverity != null ? severityToCondition(log.symptomSeverity) : DEFAULT_CONDITION,
    );
    setSideEffects(fromSideEffectLabels(log.sideEffects, 50));
  }, [log, logLoading]);

  const toggleEffect = (id: string) => {
    setSideEffects((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    );
  };

  const updateCustom = (value: string) => {
    setSideEffects((prev) =>
      prev.map((item) =>
        item.id === CUSTOM_EFFECT_ID ? { ...item, customValue: value } : item
      )
    );
  };

  const customItem = sideEffects.find((e) => e.id === CUSTOM_EFFECT_ID);

  const handleComplete = async () => {
    if (saving) return;

    if (!visit) {
      Alert.alert('기록할 치료가 없어요', '처방전을 먼저 등록해주세요.');
      return;
    }

    const labels = toSideEffectLabels(sideEffects);

    setSaving(true);
    try {
      // 상태 체크 화면과 같은 하루치 기록에 이어 쓴다.
      // 생활 기록(수면·음수·체온)은 그 화면에서 넣은 값을 지우지 않는다.
      await save({
        symptomName: labels[0] ?? null,
        symptomSeverity: conditionToSeverity(conditionScore),
        sideEffects: labels,
        bodyTemperature: log?.bodyTemperature ?? null,
        sleepHours: log?.sleepHours ?? null,
        waterIntakeMl: log?.waterIntakeMl ?? null,
        activityMinutes: log?.activityMinutes ?? null,
        memo: log?.memo ?? null,
      });

      Alert.alert('기록 완료', '오늘의 부작용 기록이 저장되었습니다.', [
        { text: '확인', onPress: () => router.back() },
      ]);
    } catch (e) {
      const message = e instanceof Error ? e.message : '저장하지 못했습니다.';
      Alert.alert('저장 실패', message);
    } finally {
      setSaving(false);
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
        <Text style={styles.navTitle}>Medi-Self 부작용 기록</Text>
        <View style={styles.navBtn}>
          {/* 마지막 페이지이므로 다음 없음 */}
          <Text style={styles.pageIndicator}>{CURRENT_PAGE}/{TOTAL_PAGES}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {(visitLoading || logLoading) && (
          <ActivityIndicator size="small" color={COLORS.primary} />
        )}

        {!visitLoading && !visit && (
          <Text style={styles.emptyText}>
            처방전을 먼저 등록하면 부작용을 기록할 수 있어요.
          </Text>
        )}

        {visit && (
          <Text style={styles.contextText}>
            {visit.hospitalName}{visit.visitReason ? ` · ${visit.visitReason}` : ''}
          </Text>
        )}

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
              {item.id === CUSTOM_EFFECT_ID ? (
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
                    placeholder="직접 입력 (쉼표로 구분)"
                    placeholderTextColor={COLORS.textPlaceholder}
                    value={customItem?.customValue ?? ''}
                    onChangeText={updateCustom}
                    editable={item.enabled}
                  />
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
        <TouchableOpacity
          style={[styles.completeBtn, saving && styles.completeBtnOff]}
          onPress={handleComplete}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator size="small" color={COLORS.white} />
            : <Text style={styles.completeBtnText}>✓ 체크 완료</Text>}
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

  emptyText: {
    fontSize: TYPOGRAPHY.sm, color: COLORS.textSecondary,
    textAlign: 'center', paddingVertical: SPACING.base,
  },
  contextText: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.semibold,
    textAlign: 'center',
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
  completeBtnOff: { opacity: 0.6 },
  completeBtnText: {
    fontSize: TYPOGRAPHY.md,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.white,
    letterSpacing: 0.5,
  },
});
