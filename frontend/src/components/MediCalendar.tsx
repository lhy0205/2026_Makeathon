import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text, TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { DAY_NAMES, MONTH_NAMES } from '../constants/mockData';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { getHighlightColor, groupVisitsByDate, useCalendar } from '../hooks/useCalendar';
import type { VisitResponse } from '../types/Api';

interface Props {
  onDayPress?: (dateStr: string, visits: VisitResponse[]) => void;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// 해당 주에 방문 이벤트가 있으면 → 형광펜 색 + 라벨 반환
function getWeekHighlight(
  week: (number | null)[],
  year: number,
  month: number,
  visitMap: Record<string, VisitResponse[]>,
): { color: string; label: string } | null {
  for (const day of week) {
    if (!day) continue;
    const visits = visitMap[toDateStr(year, month, day)];
    if (visits?.length) {
      const v = visits[0];
      return {
        color: getHighlightColor(v.treatmentStatus),
        label: v.hospitalName + (v.departmentName ? ` ${v.departmentName}` : ''),
      };
    }
  }
  return null;
}

export default function MediCalendar({ onDayPress }: Props) {
  const { width } = useWindowDimensions();
  const cellSize = Math.floor((width - 32 - 32 - 8) / 7);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // API 연동
  const { visits, loading, error, refresh } = useCalendar(viewYear, viewMonth + 1);
  const visitMap = groupVisitsByDate(visits);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // 7개씩 주 단위로
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const handlePrev = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const handleNext = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  return (
    <View style={styles.container}>
      {/* 월 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePrev} style={styles.arrowBtn}>
          <Text style={styles.arrow}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{MONTH_NAMES[viewMonth]}</Text>
        <TouchableOpacity onPress={handleNext} style={styles.arrowBtn}>
          <Text style={styles.arrow}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      {/* 로딩 / 에러 */}
      {loading && (
        <ActivityIndicator
          size="small"
          color={COLORS.primary}
          style={{ marginVertical: SPACING.sm }}
        />
      )}
      {error && !loading && (
        <TouchableOpacity onPress={refresh} style={styles.errorRow}>
          <Text style={styles.errorText}>{error}  다시 시도</Text>
        </TouchableOpacity>
      )}

      {/* 요일 헤더 */}
      <View style={styles.dayRow}>
        {DAY_NAMES.map((day, idx) => (
          <Text
            key={day}
            style={[
              styles.dayName,
              { width: cellSize },
              idx === 0 && styles.sunday,
              idx === 6 && styles.saturday,
            ]}
          >
            {day}
          </Text>
        ))}
      </View>

      {/* 주 단위 렌더링 */}
      {!loading && weeks.map((week, wi) => {
        const highlight = getWeekHighlight(week, viewYear, viewMonth, visitMap);

        return (
          <View key={`week-${wi}`} style={styles.weekRow}>
            {/* 형광펜 배경 */}
            {highlight && (
              <View style={[styles.highlightBg, { backgroundColor: highlight.color }]} />
            )}

            {week.map((day, di) => {
              if (!day) {
                return <View key={`empty-${wi}-${di}`} style={[styles.cell, { width: cellSize, height: cellSize }]} />;
              }

              const dateStr = toDateStr(viewYear, viewMonth, day);
              const dayVisits = visitMap[dateStr] ?? [];
              const isToday =
                day === today.getDate() &&
                viewMonth === today.getMonth() &&
                viewYear === today.getFullYear();

              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[styles.cell, { width: cellSize, height: cellSize }]}
                  onPress={() => onDayPress?.(dateStr, dayVisits)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.dayCircle, isToday && styles.todayCircle]}>
                    <Text
                      style={[
                        styles.dayText,
                        di === 0 && styles.sundayText,
                        di === 6 && styles.saturdayText,
                        isToday && styles.todayText,
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                  {/* 방문 상태 점 */}
                  {dayVisits.length > 0 && (
                    <View style={[
                      styles.dot,
                      dayVisits[0].treatmentStatus === 'COMPLETED'
                        ? styles.dotDone
                        : styles.dotPending,
                    ]} />
                  )}
                </TouchableOpacity>
              );
            })}

            {/* 형광펜 라벨 */}
            {highlight && (
              <View style={styles.highlightLabelWrap}>
                <Text style={styles.highlightLabel} numberOfLines={1}>
                  {highlight.label}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.xl,
  },
  arrowBtn: { padding: SPACING.sm },
  arrow: { fontSize: TYPOGRAPHY.md, color: COLORS.textSecondary, fontWeight: TYPOGRAPHY.bold },
  monthTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    minWidth: 48,
    textAlign: 'center',
  },
  errorRow: { alignItems: 'center', paddingVertical: SPACING.xs },
  errorText: { fontSize: TYPOGRAPHY.xs, color: COLORS.error },
  dayRow: { flexDirection: 'row', marginBottom: SPACING.xs },
  dayName: {
    textAlign: 'center',
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textSecondary,
    paddingVertical: SPACING.xs,
  },
  sunday: { color: COLORS.calSunday },
  saturday: { color: COLORS.calSaturday },
  weekRow: { flexDirection: 'row', flexWrap: 'wrap', position: 'relative' },
  highlightBg: {
    position: 'absolute',
    left: 0, right: 0,
    top: 4, bottom: 14,
    borderRadius: RADIUS.sm,
    zIndex: 0,
  },
  highlightLabelWrap: {
    position: 'absolute',
    bottom: 0, left: 4, right: 4,
    zIndex: 2,
  },
  highlightLabel: {
    fontSize: 8,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.semibold,
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: SPACING.xs,
    gap: 2,
    zIndex: 1,
  },
  dayCircle: {
    width: 28, height: 28,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: RADIUS.round,
  },
  todayCircle: { backgroundColor: COLORS.calToday },
  dayText: { fontSize: TYPOGRAPHY.sm, color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.medium },
  sundayText: { color: COLORS.calSunday },
  saturdayText: { color: COLORS.calSaturday },
  todayText: { color: COLORS.white, fontWeight: TYPOGRAPHY.bold },
  dot: { width: 5, height: 5, borderRadius: RADIUS.round },
  dotDone: { backgroundColor: COLORS.success },
  dotPending: { backgroundColor: COLORS.calDot },
});
