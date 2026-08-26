import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CUSTOM_EFFECT_ID,
  freshSideEffects,
  fromSideEffectLabels,
  scoreToSeverity,
  severityToScore,
  toSideEffectLabels,
} from '../constants/sideEffects';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useActiveVisit } from '../hooks/useActiveVisit';
import { useHealthLogDay } from '../hooks/useHealthLogDay';
import type { SideEffectItem } from '../types';
import type { VisitResponse } from '../types/Api';
import { toLocalDate } from '../utils/datetime';

// ── 기록 항목 설정 ────────────────────────────
// 단위는 서버 HealthLogRequest와 동일하게 맞춘다
// (waterIntakeMl: ml / sleepHours: 시간 / bodyTemperature: ℃)
const WATER = { step: 250, min: 0, max: 4000, targetMl: 2250, accent: '#38A3E8' };
const SLEEP = { step: 0.5, min: 0, max: 14, targetH: 8, accent: '#7C6BD6' };
const TEMP = { step: 0.1, min: 34, max: 42, accent: '#E0559B' };

const DEFAULT_TEMP = 36.5;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** 1250 → '1.25', 2000 → '2' 처럼 뒤의 0을 떼고 보여준다 */
function toLiter(ml: number) {
  return String(parseFloat((ml / 1000).toFixed(2)));
}

// ── 날짜 ──────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0');
const dateLabel = (d: Date) => `${pad(d.getMonth() + 1)}월 ${pad(d.getDate())}일`;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

const visitLabel = (v: VisitResponse) => `${v.hospitalName} (${v.visitedAt})`;

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

/** 어느 치료에 대한 기록인지 고르는 드롭다운 */
function VisitPicker({
  items, selectedId, onSelect,
}: {
  items: VisitResponse[]; selectedId: number | null; onSelect: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = items.find((v) => v.id === selectedId);

  return (
    <View style={styles.picker}>
      <TouchableOpacity
        style={styles.pickerHead}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
      >
        <Text style={styles.pickerChevron}>{open ? '⌄' : '›'}</Text>
        <Text style={styles.pickerText} numberOfLines={1}>
          {selected ? visitLabel(selected) : '치료 선택'}
        </Text>
        <Text style={styles.pickerCount}>{items.length}건</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.pickerList}>
          {items.map((v) => {
            const on = v.id === selectedId;
            return (
              <TouchableOpacity
                key={v.id}
                style={styles.pickerItem}
                onPress={() => { onSelect(v.id); setOpen(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.pickerItemText, on && styles.pickerItemTextOn]} numberOfLines={1}>
                  {visitLabel(v)}
                </Text>
                {on && <Text style={styles.pickerCheck}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

/** 상단 요약 타일 하나 */
function StatTile({
  label, value, sub, accent,
}: {
  label: string; value: string; sub: string; accent: string;
}) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={[styles.tileValue, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.tileSub} numberOfLines={1}>{sub}</Text>
    </View>
  );
}

/** 아이콘 + 라벨 + 증감 버튼 + 수치로 이루어진 기록 카드 */
function MetricCard({
  icon, label, value, unit, accent, onMinus, onPlus,
}: {
  icon: string; label: string; value: string; unit: string; accent: string;
  onMinus: () => void; onPlus: () => void;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricIcon}>{icon}</Text>
        <Text style={styles.metricLabel}>{label}</Text>

        <View style={styles.stepper}>
          <TouchableOpacity style={styles.stepBtn} onPress={onMinus} activeOpacity={0.7}>
            <Text style={styles.stepSign}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.stepBtn, { backgroundColor: accent }]}
            onPress={onPlus}
            activeOpacity={0.85}
          >
            <Text style={[styles.stepSign, styles.stepSignPlus]}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.metricValueRow}>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricUnit}>{unit}</Text>
      </View>
    </View>
  );
}

export default function StatusCheckScreen() {
  const router = useRouter();

  const today = useMemo(startOfToday, []);
  const [dayOffset, setDayOffset] = useState(0);

  const current = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + dayOffset);
    return d;
  }, [today, dayOffset]);

  const key = toLocalDate(current);
  const isToday = dayOffset === 0;

  const { visit, visits, loading: visitsLoading, error: visitsError } = useActiveVisit();
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);

  // 진행 중인 치료를 기본값으로 잡는다
  useEffect(() => {
    if (selectedVisitId == null && visit) setSelectedVisitId(visit.id);
  }, [visit, selectedVisitId]);

  const { log, loading: logLoading, save } = useHealthLogDay(selectedVisitId, key);

  // ── 화면 입력값 ─────────────────────────────
  const [waterMl, setWaterMl] = useState(0);
  const [sleepHours, setSleepHours] = useState(0);
  const [tempC, setTempC] = useState(DEFAULT_TEMP);
  const [effects, setEffects] = useState<SideEffectItem[]>(freshSideEffects);
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);

  // 증상 보기는 진료과를 따른다 — 안과 치료에 '속쓰림'만 내놓으면
  // 정작 겪는 눈 시림을 적을 곳이 없다
  const department = visits.find((v) => v.id === selectedVisitId)?.departmentName ?? null;

  // 날짜나 치료를 바꾸면 그 날 저장해 둔 값으로 채운다
  useEffect(() => {
    if (logLoading) return;

    if (!log) {
      setWaterMl(0);
      setSleepHours(0);
      setTempC(DEFAULT_TEMP);
      setEffects(freshSideEffects(department));
      setMemo('');
      return;
    }

    setWaterMl(log.waterIntakeMl ?? 0);
    setSleepHours(log.sleepHours ?? 0);
    setTempC(log.bodyTemperature ?? DEFAULT_TEMP);
    setMemo(log.memo ?? '');
    // 서버는 항목별 점수를 따로 두지 않는다. 저장된 심각도 하나를 모든 항목에 되돌려 놓는다
    setEffects(fromSideEffectLabels(
      log.sideEffects,
      log.symptomSeverity != null ? severityToScore(log.symptomSeverity) : 50,
      department,
    ));
  }, [log, logLoading, department]);

  const toggleEffect = (id: string) =>
    setEffects((prev) => prev.map((item) =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    ));

  const updateScore = (id: string, score: number) =>
    setEffects((prev) => prev.map((item) =>
      item.id === id ? { ...item, score: Math.round(score) } : item
    ));

  const updateCustom = (value: string) =>
    setEffects((prev) => prev.map((item) =>
      item.id === CUSTOM_EFFECT_ID ? { ...item, customValue: value } : item
    ));

  const activeEffects = effects.filter((e) => e.enabled);
  const avgScore = activeEffects.length > 0
    ? Math.round(activeEffects.reduce((sum, e) => sum + e.score, 0) / activeEffects.length)
    : null;

  const handleDone = async () => {
    if (saving) return;

    if (selectedVisitId == null) {
      Alert.alert('기록할 치료가 없어요', '처방전을 먼저 등록해주세요.');
      return;
    }

    const labels = toSideEffectLabels(effects);

    setSaving(true);
    try {
      await save({
        // 가장 두드러진 증상을 대표 이름으로 남긴다
        symptomName: labels[0] ?? null,
        symptomSeverity: avgScore != null ? scoreToSeverity(avgScore) : null,
        sideEffects: labels,
        bodyTemperature: tempC,
        sleepHours,
        waterIntakeMl: waterMl,
        activityMinutes: null,
        memo: memo.trim() || null,
      });
      router.back();
    } catch (e) {
      const message = e instanceof Error ? e.message : '저장하지 못했습니다.';
      Alert.alert('저장 실패', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>

      {/* 헤더 */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelBtn}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>상태 체크</Text>
        <TouchableOpacity onPress={handleDone} disabled={saving}>
          {saving
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : <Text style={styles.doneBtn}>완료</Text>}
        </TouchableOpacity>
      </View>

      {/* 날짜 — 하루에 한 번 기록하는 화면이라는 걸 드러낸다 */}
      <View style={styles.dateRow}>
        <TouchableOpacity
          style={styles.dateArrow}
          onPress={() => setDayOffset((v) => v - 1)}
          activeOpacity={0.6}
        >
          <Text style={styles.dateArrowText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.dateCenter}>
          <Text style={styles.dateText}>{dateLabel(current)}</Text>
          {isToday && <Text style={styles.dateToday}>오늘</Text>}
        </View>

        <TouchableOpacity
          style={[styles.dateArrow, isToday && styles.dateArrowOff]}
          onPress={() => setDayOffset((v) => Math.min(0, v + 1))}
          disabled={isToday}
          activeOpacity={0.6}
        >
          <Text style={[styles.dateArrowText, isToday && styles.dateArrowTextOff]}>›</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {(visitsLoading || logLoading) && (
          <ActivityIndicator size="small" color={COLORS.primary} />
        )}

        {visitsError && <Text style={styles.errorText}>{visitsError}</Text>}

        {!visitsLoading && visits.length === 0 && (
          <Text style={styles.emptyText}>
            처방전을 먼저 등록하면 상태를 기록할 수 있어요.
          </Text>
        )}

        {log && <Text style={styles.savedBadge}>이 날짜에 저장된 기록을 불러왔습니다</Text>}

        {/* 요약 3종 */}
        <View style={styles.tileRow}>
          <StatTile
            label="부작용 평균"
            value={avgScore !== null ? String(avgScore) : '—'}
            sub={avgScore !== null ? getScoreLabel(avgScore) : '기록 없음'}
            accent={avgScore !== null ? getScoreColor(avgScore) : COLORS.textPlaceholder}
          />
          <StatTile
            label="음수량"
            value={toLiter(waterMl)}
            sub={`/ ${toLiter(WATER.targetMl)} 리터`}
            accent={WATER.accent}
          />
          <StatTile
            label="수면 시간"
            value={String(sleepHours)}
            sub={`/ ${SLEEP.targetH} 시간`}
            accent={SLEEP.accent}
          />
        </View>

        {/* 부작용 항목 */}
        <Text style={styles.sectionLabel}>부작용 증상별 컨디션</Text>
        <Text style={styles.sectionHint}>항목을 탭해 활성화한 후 슬라이더로 조절하세요</Text>

        <VisitPicker
          items={visits}
          selectedId={selectedVisitId}
          onSelect={setSelectedVisitId}
        />

        {effects.map((item) => (
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

            {item.id === CUSTOM_EFFECT_ID && item.enabled && (
              <TextInput
                style={styles.customInput}
                placeholder="증상을 적어주세요 (쉼표로 구분)"
                placeholderTextColor={COLORS.textPlaceholder}
                value={item.customValue ?? ''}
                onChangeText={updateCustom}
              />
            )}

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

        {/* 생활 기록 */}
        <Text style={[styles.sectionLabel, styles.sectionGap]}>오늘의 생활 기록</Text>
        <Text style={styles.sectionHint}>버튼으로 수치를 올리고 내리세요</Text>

        <MetricCard
          icon="💧"
          label="음수량"
          value={toLiter(waterMl)}
          unit={`/ ${toLiter(WATER.targetMl)} 리터`}
          accent={WATER.accent}
          onMinus={() => setWaterMl((v) => clamp(v - WATER.step, WATER.min, WATER.max))}
          onPlus={() => setWaterMl((v) => clamp(v + WATER.step, WATER.min, WATER.max))}
        />

        <MetricCard
          icon="🛏️"
          label="수면 시간"
          value={String(sleepHours)}
          unit={`/ ${SLEEP.targetH} 시간`}
          accent={SLEEP.accent}
          onMinus={() => setSleepHours((v) => clamp(+(v - SLEEP.step).toFixed(1), SLEEP.min, SLEEP.max))}
          onPlus={() => setSleepHours((v) => clamp(+(v + SLEEP.step).toFixed(1), SLEEP.min, SLEEP.max))}
        />

        <MetricCard
          icon="🌡️"
          label="기초 체온"
          value={tempC.toFixed(1)}
          unit="℃"
          accent={TEMP.accent}
          onMinus={() => setTempC((v) => clamp(+(v - TEMP.step).toFixed(1), TEMP.min, TEMP.max))}
          onPlus={() => setTempC((v) => clamp(+(v + TEMP.step).toFixed(1), TEMP.min, TEMP.max))}
        />

        {/* 메모 */}
        <Text style={[styles.sectionLabel, styles.sectionGap]}>메모</Text>
        <TextInput
          style={styles.memoInput}
          placeholder="오늘 몸 상태에 대해 남기고 싶은 말"
          placeholderTextColor={COLORS.textPlaceholder}
          value={memo}
          onChangeText={setMemo}
          multiline
        />

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

  // 날짜 이동
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  dateArrow: {
    width: 28, height: 28,
    borderRadius: RADIUS.round,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surface,
    ...SHADOW.sm,
  },
  dateArrowOff: { opacity: 0.35, shadowOpacity: 0 },
  dateArrowText: {
    fontSize: 18, lineHeight: 21,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.primary,
  },
  dateArrowTextOff: { color: COLORS.textPlaceholder },
  dateCenter: { alignItems: 'center', minWidth: 110 },
  dateText: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },
  dateToday: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.semibold,
    marginTop: -1,
  },

  content: { padding: SPACING.base, gap: SPACING.sm, paddingBottom: SPACING.xxl },

  errorText: { fontSize: TYPOGRAPHY.sm, color: COLORS.error, textAlign: 'center' },
  emptyText: {
    fontSize: TYPOGRAPHY.sm, color: COLORS.textSecondary,
    textAlign: 'center', paddingVertical: SPACING.base,
  },
  savedBadge: {
    fontSize: 10, color: COLORS.primary, fontWeight: TYPOGRAPHY.semibold,
    textAlign: 'center',
  },

  // 상단 요약 타일
  tileRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  tile: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    gap: 2,
    alignItems: 'center',
    ...SHADOW.sm,
  },
  tileLabel: { fontSize: TYPOGRAPHY.xs, color: COLORS.textSecondary, fontWeight: TYPOGRAPHY.semibold },
  tileValue: { fontSize: 26, fontWeight: TYPOGRAPHY.extrabold },
  tileSub: { fontSize: 10, color: COLORS.textSecondary },

  sectionLabel: { fontSize: TYPOGRAPHY.base, fontWeight: TYPOGRAPHY.bold, color: COLORS.textPrimary },
  sectionHint: { fontSize: TYPOGRAPHY.xs, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  sectionGap: { marginTop: SPACING.lg },

  // 치료 선택 드롭다운
  picker: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  pickerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  pickerChevron: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.primary,
    width: 12,
    textAlign: 'center',
  },
  pickerText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textPrimary,
  },
  pickerCount: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.medium,
  },
  pickerList: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.inputBg,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingLeft: SPACING.md + 20,
    paddingVertical: SPACING.sm + 1,
  },
  pickerItemText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
  },
  pickerItemTextOn: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.semibold,
  },
  pickerCheck: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.bold,
  },

  // 부작용
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
  customInput: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  sliderWrap: { paddingHorizontal: SPACING.xs },
  slider: { width: '100%', height: 36 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -SPACING.xs },
  sliderLabelText: { fontSize: 9, color: COLORS.textSecondary },

  // 생활 기록 카드 — 부작용 카드와 크기 차이가 크지 않게
  metricCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  metricIcon: { fontSize: 18 },
  metricLabel: {
    flex: 1,
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },
  stepper: { flexDirection: 'row', gap: SPACING.xs + 2 },
  stepBtn: {
    width: 30, height: 30,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepSign: {
    fontSize: 17,
    lineHeight: 20,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textSecondary,
  },
  stepSignPlus: { color: COLORS.white },

  metricValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.xs },
  metricValue: {
    fontSize: 24,
    fontWeight: TYPOGRAPHY.extrabold,
    color: COLORS.textPrimary,
  },
  metricUnit: {
    fontSize: TYPOGRAPHY.base,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.medium,
  },

  memoInput: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textPrimary,
  },
});
