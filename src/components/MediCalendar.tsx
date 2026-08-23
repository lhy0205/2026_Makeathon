import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { DAY_NAMES, MOCK_CALENDAR_EVENTS, MONTH_NAMES } from "../constants/mockData";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "../constants/theme";
import type { CalendarDayInfo } from "../types";

interface Props {
  onDayPress?: (date: string, info: CalendarDayInfo | undefined) => void;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month+1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function toDateStr(year: number, month: number, day: number) {
  const mm = String(month+1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

export default function MediCalendar({ onDayPress }: Props) {
  const { width } = useWindowDimensions();
  const cellSize = Math.floor((width - 32 - 32) / 7);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i+1),
  ];

  const handlePrev = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y-1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m-1);
    }
  };

  const handleNext = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y+1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m+1);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handlePrev}
          style={styles.arrowBtn}
        >
          <Text style={styles.arrow}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{MONTH_NAMES[viewMonth]}</Text>
        <TouchableOpacity onPress={handleNext} style={styles.arrowBtn}>
          <Text style={styles.arrow}>{'>'}</Text>
        </TouchableOpacity>
      </View>

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

      <View style={styles.grid}>
        {cells.map((day, idx) => {
          if (day === null) {
            return <View key={`empty-${idx}`} style={[styles.cell, { width: cellSize, height: cellSize }]} />;
          }

          const dateStr = toDateStr(viewYear, viewMonth, day);
          const info = MOCK_CALENDAR_EVENTS[dateStr];
          const col = idx % 7;
          const isToday =
            day === today.getDate() &&
            viewMonth === today.getMonth() &&
            viewYear === today.getFullYear();
          
          return (
            <TouchableOpacity
              key={dateStr}
              style={[styles.cell, { width: cellSize, height: cellSize }]}
              onPress={() => onDayPress?.(dateStr, info)}
              activeOpacity={0.7}
            >
              <View style={[styles.dayCircle, isToday && styles.todayCircle]}>
                <Text
                  style={[
                    styles.dayText,
                    col === 0 && styles.sundayText,
                    col === 6 && styles.saturdayText,
                    isToday && styles.todayText,
                  ]}
                >
                  {day}
                </Text>
              </View>

              {info?.hasMed && (
                <View
                  style={[
                    styles.dot,
                    info.taken ? styles.dotTaken : styles.dotMissed,
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
  },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.xl,
  },
  arrowBtn: {
    padding: SPACING.sm,
  },
  arrow: {
    fontSize: TYPOGRAPHY.md,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.bold,
  },
  monthTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    minWidth: 48,
    textAlign: 'center',
  },

  // 요일
  dayRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  dayName: {
    textAlign: 'center',
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textSecondary,
    paddingVertical: SPACING.xs,
  },
  sunday: { color: COLORS.calSunday },
  saturday: { color: COLORS.calSaturday },

  // 날짜
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    aspectRatio: 0.9,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: SPACING.xs,
    gap: 2,
  },
  dayCircle: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.round,
  },
  todayCircle: {
    backgroundColor: COLORS.calToday,
  },
  dayText: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.medium,
  },
  sundayText: { color: COLORS.calSunday },
  saturdayText: { color: COLORS.calSaturday },
  todayText: { color: COLORS.white, fontWeight: TYPOGRAPHY.bold },

  // 점
  dot: {
    width: 5,
    height: 5,
    borderRadius: RADIUS.round,
  },
  dotTaken: { backgroundColor: COLORS.success },
  dotMissed: { backgroundColor: COLORS.calDot },
});
