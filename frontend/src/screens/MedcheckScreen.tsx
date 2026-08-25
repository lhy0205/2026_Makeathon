import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MOCK_MED_CHECK, MOCK_PRESCRIPTIONS } from '../constants/mockData';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../constants/theme';
import type { MedCheckGroup, MedCheckStatus } from '../types';

// ── 선택지 3가지 ──────────────────────────────
// 값은 서버 DoseStatus와 동일하게 맞춘다
const CHOICES: { key: Exclude<MedCheckStatus, 'PENDING'>; label: string; color: string }[] = [
  { key: 'TAKEN', label: '복용', color: '#2F9E68' },
  { key: 'SKIPPED', label: '건너뜀', color: '#E2A03F' },
  { key: 'MISSED', label: '누락', color: '#DC5B54' },
];

// ── 날짜 ──────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0');
const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dateLabel = (d: Date) => `${pad(d.getMonth() + 1)}월 ${pad(d.getDate())}일`;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 아직 아무것도 체크하지 않은 날 */
function blankDay(): MedCheckGroup[] {
  return MOCK_MED_CHECK.map((g) => ({
    ...g,
    items: g.items.map((it) => ({ ...it, status: 'PENDING' as MedCheckStatus })),
  }));
}

const rxOf = (rxId: string) => MOCK_PRESCRIPTIONS.find((r) => r.id === rxId);

/**
 * 한 행 = 한 처방전. 약 이름이 아니라 병원으로 묶는다.
 * 사용자는 약 이름을 모르고, 한 병원 약은 보통 한 번에 같이 먹는다.
 */
type Row = {
  rxId: string;
  hospital: string;
  reason: string;
  itemIds: string[];
  status: MedCheckStatus;
};

function toRows(group: MedCheckGroup): Row[] {
  const order: string[] = [];
  const byRx = new Map<string, typeof group.items>();

  for (const item of group.items) {
    if (!byRx.has(item.rxId)) { byRx.set(item.rxId, []); order.push(item.rxId); }
    byRx.get(item.rxId)!.push(item);
  }

  return order.map((rxId) => {
    const items = byRx.get(rxId)!;
    const rx = rxOf(rxId);
    // 한 처방전의 약은 함께 체크되므로 상태가 갈릴 일은 없지만, 갈리면 미선택으로 본다
    const first = items[0].status;
    const same = items.every((i) => i.status === first);
    return {
      rxId,
      hospital: rx?.hospital ?? '기타',
      reason: rx?.reason ?? '',
      itemIds: items.map((i) => i.id),
      status: same ? first : ('PENDING' as MedCheckStatus),
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

  const key = dateKey(current);
  const isToday = dayOffset === 0;

  // TODO: DB 연동 전까지 메모리에만 보관.
  //       나중에 doseApi.getByDate(key) / markTaken · markSkipped 로 교체한다.
  const [days, setDays] = useState<Record<string, MedCheckGroup[]>>(() => ({
    [dateKey(startOfToday())]: MOCK_MED_CHECK.map((g) => ({
      ...g,
      items: g.items.map((it) => ({ ...it })),
    })),
  }));

  const groups = days[key] ?? blankDay();

  /** 한 처방전에 속한 약들의 상태를 한꺼번에 바꾼다 */
  const setRowStatus = (itemIds: string[], status: MedCheckStatus, current: MedCheckStatus) => {
    // 이미 같은 걸 누르면 해제해서 미선택으로 되돌린다
    const next: MedCheckStatus = current === status ? 'PENDING' : status;
    setDays((prev) => {
      const base = prev[key] ?? blankDay();
      return {
        ...prev,
        [key]: base.map((g) => ({
          ...g,
          items: g.items.map((it) => (itemIds.includes(it.id) ? { ...it, status: next } : it)),
        })),
      };
    });
  };

  const allRows = groups.flatMap(toRows);
  const decided = allRows.filter((r) => r.status !== 'PENDING').length;
  const takenCount = allRows.filter((r) => r.status === 'TAKEN').length;

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

        {/* 진행 요약 */}
        <View style={styles.summary}>
          <Text style={styles.summaryMain}>
            <Text style={styles.summaryNum}>{takenCount}</Text>
            <Text style={styles.summaryUnit}> / {allRows.length}회 복용</Text>
          </Text>
          <Text style={styles.summarySub}>
            {decided === allRows.length ? '기록 완료' : `미기록 ${allRows.length - decided}건`}
          </Text>
        </View>

        {groups.map((group) => (
          <View key={group.period} style={styles.groupCard}>

            {/* 시간대 */}
            <View style={styles.groupHead}>
              <Text style={styles.groupPeriod}>{group.period}</Text>
              <Text style={styles.groupTime}>{group.items[0]?.time}</Text>
            </View>

            {/* 열 제목 — 표는 아니지만 표처럼 읽히도록 */}
            <View style={styles.matrixHead}>
              <View style={styles.medCol} />
              {CHOICES.map((c) => (
                <Text key={c.key} style={styles.colLabel}>{c.label}</Text>
              ))}
            </View>

            {/* 병원 하나 = 한 행 */}
            {toRows(group).map((row, idx) => (
              <View
                key={row.rxId}
                style={[styles.matrixRow, idx > 0 && styles.matrixRowDivider]}
              >
                <View style={styles.medCol}>
                  <Text style={styles.medName} numberOfLines={1}>
                    {row.hospital}
                  </Text>
                  <Text style={styles.medHospital} numberOfLines={1}>
                    {row.reason} · {row.itemIds.length}종
                  </Text>
                </View>

                {CHOICES.map((c) => {
                  const on = row.status === c.key;
                  return (
                    <TouchableOpacity
                      key={c.key}
                      style={styles.cell}
                      onPress={() => setRowStatus(row.itemIds, c.key, row.status)}
                      activeOpacity={0.6}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={`${row.hospital} ${c.label}`}
                    >
                      <View
                        style={[
                          styles.radio,
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
  radioMark: { fontSize: 12, color: COLORS.white, fontWeight: TYPOGRAPHY.bold },
});
