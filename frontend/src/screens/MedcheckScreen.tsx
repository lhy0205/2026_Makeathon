import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../constants/theme';
import type { DosePeriodGroup } from '../hooks/useDoseDay';
import { useDoseDay } from '../hooks/useDoseDay';
import { useMedicationIndex } from '../hooks/useMedicationIndex';
import type { MedCheckStatus } from '../types';
import type { MedicationDoseResponse } from '../types/Api';
import { toClockLabel, toLocalDate } from '../utils/datetime';

// ── 선택지 ────────────────────────────────────
// 값은 서버 DoseStatus와 동일하게 맞춘다.
// '누락'(MISSED)은 아직 아무 코드도 설정하지 않는다 — enum에만 있다.
// 지난 일정을 정리하는 배치가 생기기 전까지는 눌러서 고를 수 없는 표시 전용 칸이다.
const CHOICES: {
  key: Exclude<MedCheckStatus, 'PENDING'>;
  label: string;
  color: string;
  selectable: boolean;
}[] = [
  { key: 'TAKEN',   label: '복용',   color: '#2F9E68', selectable: true },
  { key: 'SKIPPED', label: '건너뜀', color: '#E2A03F', selectable: true },
  { key: 'MISSED',  label: '누락',   color: '#DC5B54', selectable: false },
];

// ── 날짜 ──────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0');
const dateLabel = (d: Date) => `${pad(d.getMonth() + 1)}월 ${pad(d.getDate())}일`;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * 한 행 = 한 병원의 처방.
 * 사용자는 약 이름을 외우지 못하고, 한 병원에서 받은 약은 보통 같이 먹는다.
 */
type Row = {
  key: string;
  hospital: string;
  reason: string;
  medicationNames: string[];
  doseIds: number[];
  status: MedCheckStatus;
};

const UNKNOWN_KEY = 'unknown';

function toRows(
  group: DosePeriodGroup,
  originOf: (dose: MedicationDoseResponse) => { hospitalName: string; visitReason: string | null } | undefined,
): Row[] {
  const order: string[] = [];
  const byVisit = new Map<string, MedicationDoseResponse[]>();

  for (const dose of group.doses) {
    const origin = originOf(dose);
    const key = origin ? origin.hospitalName : UNKNOWN_KEY;
    if (!byVisit.has(key)) { byVisit.set(key, []); order.push(key); }
    byVisit.get(key)!.push(dose);
  }

  return order.map((key) => {
    const doses = byVisit.get(key)!;
    const origin = originOf(doses[0]);

    // 같은 병원 약은 함께 체크되므로 보통 상태가 같다. 갈리면 미선택으로 본다
    const first = doses[0].doseStatus;
    const same = doses.every((d) => d.doseStatus === first);

    return {
      key,
      hospital: origin?.hospitalName ?? '기타',
      reason: origin?.visitReason ?? '',
      medicationNames: Array.from(new Set(doses.map((d) => d.medicationName))),
      doseIds: doses.map((d) => d.id),
      status: same ? (first as MedCheckStatus) : 'PENDING',
    };
  });
}

export default function MedCheckScreen() {
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

  const { groups, loading, error, refresh, mark, taken, total, decided } = useDoseDay(key);
  const { index } = useMedicationIndex();

  const originOf = (dose: MedicationDoseResponse) => index[dose.medicationId];

  /** 같은 행의 약들을 한꺼번에 바꾼다. 같은 걸 다시 누르면 해제한다 */
  const handlePick = async (row: Row, choice: typeof CHOICES[number]) => {
    if (!choice.selectable) return;
    // 서버에 'PENDING으로 되돌리기'가 없어서, 이미 고른 값을 다시 누르면 그대로 둔다
    if (row.status === choice.key) return;

    try {
      await mark(row.doseIds, choice.key as 'TAKEN' | 'SKIPPED');
    } catch (e) {
      const message = e instanceof Error ? e.message : '기록하지 못했습니다.';
      Alert.alert('기록 실패', message);
    }
  };

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

      {/* 날짜 */}
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

        {loading && <ActivityIndicator size="small" color={COLORS.primary} />}

        {error && !loading && (
          <TouchableOpacity style={styles.errorBox} onPress={refresh} activeOpacity={0.8}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorRetry}>다시 시도</Text>
          </TouchableOpacity>
        )}

        {!loading && !error && total === 0 && (
          <Text style={styles.emptyText}>이 날짜에 등록된 복약 일정이 없습니다.</Text>
        )}

        {/* 진행 요약 */}
        {total > 0 && (
          <View style={styles.summary}>
            <Text style={styles.summaryMain}>
              <Text style={styles.summaryNum}>{taken}</Text>
              <Text style={styles.summaryUnit}> / {total}회 복용</Text>
            </Text>
            <Text style={styles.summarySub}>
              {decided === total ? '기록 완료' : `미기록 ${total - decided}건`}
            </Text>
          </View>
        )}

        {groups.map((group) => (
          <View key={group.period} style={styles.groupCard}>

            {/* 시간대 */}
            <View style={styles.groupHead}>
              <Text style={styles.groupPeriod}>{group.period}</Text>
              <Text style={styles.groupTime}>
                {group.doses[0] ? toClockLabel(group.doses[0].scheduledAt) : ''}
              </Text>
            </View>

            {/* 열 제목 — 표는 아니지만 표처럼 읽히도록 */}
            <View style={styles.matrixHead}>
              <View style={styles.medCol} />
              {CHOICES.map((c) => (
                <Text key={c.key} style={styles.colLabel}>{c.label}</Text>
              ))}
            </View>

            {/* 병원 하나 = 한 행 */}
            {toRows(group, originOf).map((row, idx) => (
              <View
                key={row.key}
                style={[styles.matrixRow, idx > 0 && styles.matrixRowDivider]}
              >
                <View style={styles.medCol}>
                  <Text style={styles.medName} numberOfLines={1}>
                    {row.hospital}
                  </Text>
                  <Text style={styles.medHospital} numberOfLines={1}>
                    {row.reason ? `${row.reason} · ` : ''}{row.medicationNames.length}종
                  </Text>
                </View>

                {CHOICES.map((c) => {
                  const on = row.status === c.key;
                  return (
                    <TouchableOpacity
                      key={c.key}
                      style={styles.cell}
                      onPress={() => handlePick(row, c)}
                      disabled={!c.selectable}
                      activeOpacity={0.6}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on, disabled: !c.selectable }}
                      accessibilityLabel={`${row.hospital} ${c.label}`}
                    >
                      <View
                        style={[
                          styles.radio,
                          !c.selectable && styles.radioReadonly,
                          on && { borderColor: c.color, backgroundColor: c.color },
                        ]}
                      >
                        {on && <Text style={styles.radioMark}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        ))}

        {total > 0 && (
          <Text style={styles.footnote}>
            기록하지 않은 일정은 &lsquo;미기록&rsquo;으로 남습니다.
          </Text>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const CELL_W = 56;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.md,
  },
  headerTitle: { fontSize: TYPOGRAPHY.lg, fontWeight: TYPOGRAPHY.bold, color: COLORS.textPrimary },
  cancelBtn: { fontSize: TYPOGRAPHY.base, color: COLORS.textSecondary, fontWeight: TYPOGRAPHY.medium },
  doneBtn: { fontSize: TYPOGRAPHY.base, color: COLORS.primary, fontWeight: TYPOGRAPHY.bold },

  // 날짜
  dateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.lg, paddingBottom: SPACING.sm,
  },
  dateArrow: {
    width: 28, height: 28, borderRadius: RADIUS.round,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surface, ...SHADOW.sm,
  },
  dateArrowOff: { opacity: 0.35, shadowOpacity: 0 },
  dateArrowText: {
    fontSize: 18, lineHeight: 21,
    fontWeight: TYPOGRAPHY.bold, color: COLORS.primary,
  },
  dateArrowTextOff: { color: COLORS.textPlaceholder },
  dateCenter: { alignItems: 'center', minWidth: 110 },
  dateText: { fontSize: TYPOGRAPHY.lg, fontWeight: TYPOGRAPHY.bold, color: COLORS.textPrimary },
  dateToday: {
    fontSize: 10, color: COLORS.primary,
    fontWeight: TYPOGRAPHY.semibold, marginTop: -1,
  },

  content: { padding: SPACING.base, gap: SPACING.md, paddingBottom: SPACING.xxl },

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
  footnote: {
    fontSize: 11, color: COLORS.textSecondary,
    textAlign: 'center', paddingHorizontal: SPACING.base,
  },

  // 요약
  summary: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.base,
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    ...SHADOW.sm,
  },
  summaryMain: { flexDirection: 'row', alignItems: 'baseline' },
  summaryNum: { fontSize: 24, fontWeight: TYPOGRAPHY.extrabold, color: COLORS.primary },
  summaryUnit: { fontSize: TYPOGRAPHY.base, color: COLORS.textSecondary, fontWeight: TYPOGRAPHY.medium },
  summarySub: { fontSize: TYPOGRAPHY.xs, color: COLORS.textSecondary },

  // 시간대 카드
  groupCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.md,
    ...SHADOW.sm,
  },
  groupHead: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.sm },
  groupPeriod: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.bold, color: COLORS.textPrimary },
  groupTime: { fontSize: TYPOGRAPHY.xs, color: COLORS.textSecondary },

  // 행렬
  matrixHead: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: SPACING.sm, paddingBottom: SPACING.xs,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  colLabel: {
    width: CELL_W, textAlign: 'center',
    fontSize: TYPOGRAPHY.xs, fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textSecondary,
  },
  matrixRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm },
  matrixRowDivider: { borderTopWidth: 1, borderTopColor: COLORS.border },
  medCol: { flex: 1, paddingRight: SPACING.sm, gap: 1 },
  medName: { fontSize: TYPOGRAPHY.sm, fontWeight: TYPOGRAPHY.semibold, color: COLORS.textPrimary },
  medHospital: { fontSize: 11, color: COLORS.textSecondary },

  cell: { width: CELL_W, alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.xs },
  radio: {
    width: 24, height: 24, borderRadius: RADIUS.round,
    borderWidth: 1.8, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  radioReadonly: { borderStyle: 'dashed' },
  radioMark: { fontSize: 12, color: COLORS.white, fontWeight: TYPOGRAPHY.bold },
});
