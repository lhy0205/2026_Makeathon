import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MOCK_SIDE_EFFECTS } from '../constants/mockData';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../constants/theme';
import type { SideEffectItem } from '../types';

function getScoreLabel(score: number): string {
  if (score <= 20) return '매우 나쁨';
  if (score <= 40) return '나쁨';
  if (score <= 60) return '보통';
  if (score <= 80) return '좋음';
  return '매우 좋음';
}

function getScoreColor(score: number): string {
  if (score <= 30) return '#EF4444';
  if (score <= 50) return '#F97316';
  if (score <= 70) return '#EAB308';
  return COLORS.success;
}

export default function StatusCheckScreen() {
  const router = useRouter();
  const [sideEffects, setSideEffects] = useState<SideEffectItem[]>(MOCK_SIDE_EFFECTS);

  const toggleEffect = (id: string) => {
    setSideEffects((prev) =>
      prev.map((item) => item.id === id ? { ...item, enabled: !item.enabled } : item)
    );
  };

  const updateScore = (id: string, score: number) => {
    setSideEffects((prev) =>
      prev.map((item) => item.id === id ? { ...item, score: Math.round(score) } : item)
    );
  };

  const activeEffects = sideEffects.filter((e) => e.enabled);
  const avgScore = activeEffects.length > 0
    ? Math.round(activeEffects.reduce((sum, e) => sum + e.score, 0) / activeEffects.length)
    : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>

      {/* 헤더 */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelBtn}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>상태 체크</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.doneBtn}>완료</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* 평균 수치 카드 */}
        {avgScore !== null && (
          <View style={[styles.avgCard, { borderColor: getScoreColor(avgScore) }]}>
            <Text style={styles.avgLabel}>부작용 평균 수치</Text>
            <View style={styles.avgValueRow}>
              <Text style={[styles.avgScore, { color: getScoreColor(avgScore) }]}>{avgScore}</Text>
              <Text style={[styles.avgScoreLabel, { color: getScoreColor(avgScore) }]}>
                {getScoreLabel(avgScore)}
              </Text>
            </View>
            <Text style={styles.avgSub}>활성 증상 {activeEffects.length}개 기준</Text>
          </View>
        )}

        {/* 부작용 항목 */}
        <Text style={styles.sectionLabel}>부작용 증상별 컨디션</Text>
        <Text style={styles.sectionHint}>항목을 탭해 활성화한 후 슬라이더로 조절하세요</Text>

        {sideEffects.map((item) => (
          <View key={item.id} style={[styles.effectCard, !item.enabled && styles.effectCardDisabled]}>
            <TouchableOpacity style={styles.effectHeader} onPress={() => toggleEffect(item.id)} activeOpacity={0.7}>
              <View style={[styles.effectDot, { backgroundColor: item.enabled ? getScoreColor(item.score) : COLORS.border }]} />
              <Text style={[styles.effectLabel, !item.enabled && styles.effectLabelDisabled]}>
                {item.label}
              </Text>
              {item.enabled && (
                <Text style={[styles.effectScoreText, { color: getScoreColor(item.score) }]}>
                  {item.score} · {getScoreLabel(item.score)}
                </Text>
              )}
              <Text style={styles.effectToggle}>{item.enabled ? '✓' : '+'}</Text>
            </TouchableOpacity>

            {item.enabled && (
              <View style={styles.sliderWrap}>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={100}
                  step={1}
                  value={item.score}
                  onValueChange={(v) => updateScore(item.id, v)}
                  minimumTrackTintColor={getScoreColor(item.score)}
                  maximumTrackTintColor={COLORS.border}
                  thumbTintColor={getScoreColor(item.score)}
                />
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderLabelText}>0 나쁨</Text>
                  <Text style={styles.sliderLabelText}>50 보통</Text>
                  <Text style={styles.sliderLabelText}>100 좋음</Text>
                </View>
              </View>
            )}
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
  content: { padding: SPACING.base, gap: SPACING.sm, paddingBottom: SPACING.xl },
  avgCard: {
    borderWidth: 1.5, borderRadius: RADIUS.lg,
    padding: SPACING.base, gap: SPACING.xs,
    backgroundColor: COLORS.surface, marginBottom: SPACING.sm, ...SHADOW.sm,
  },
  avgLabel: { fontSize: TYPOGRAPHY.xs, color: COLORS.textSecondary, fontWeight: TYPOGRAPHY.semibold },
  avgValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.sm },
  avgScore: { fontSize: 36, fontWeight: TYPOGRAPHY.extrabold },
  avgScoreLabel: { fontSize: TYPOGRAPHY.base, fontWeight: TYPOGRAPHY.bold },
  avgSub: { fontSize: TYPOGRAPHY.xs, color: COLORS.textSecondary },
  sectionLabel: { fontSize: TYPOGRAPHY.base, fontWeight: TYPOGRAPHY.bold, color: COLORS.textPrimary },
  sectionHint: { fontSize: TYPOGRAPHY.xs, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  effectCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: SPACING.sm, gap: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  effectCardDisabled: { opacity: 0.55 },
  effectHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  effectDot: { width: 10, height: 10, borderRadius: RADIUS.round },
  effectLabel: { flex: 1, fontSize: TYPOGRAPHY.base, color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.medium },
  effectLabelDisabled: { color: COLORS.textSecondary },
  effectScoreText: { fontSize: TYPOGRAPHY.xs, fontWeight: TYPOGRAPHY.bold },
  effectToggle: { fontSize: TYPOGRAPHY.md, color: COLORS.primary, fontWeight: TYPOGRAPHY.bold, width: 20, textAlign: 'center' },
  sliderWrap: { paddingHorizontal: SPACING.xs },
  slider: { width: '100%', height: 36 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -SPACING.xs },
  sliderLabelText: { fontSize: 9, color: COLORS.textSecondary },
});
