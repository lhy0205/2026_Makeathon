import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text, TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MediCalendar from '../components/MediCalendar';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { getHighlightColor } from '../hooks/useCalendar';
import type { ScreenNav } from '../types';
import type { VisitResponse } from '../types/Api';

type Props = {
  navigation: ScreenNav;
};

const STATUS_LABEL: Record<VisitResponse['treatmentStatus'], string> = {
  REGISTERED: '예약',
  IN_PROGRESS: '진행 중',
  COMPLETED: '완료',
};

export default function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedVisits, setSelectedVisits] = useState<VisitResponse[]>([]);

  const handleDayPress = (dateStr: string, visits: VisitResponse[]) => {
    setSelectedDate(dateStr);
    setSelectedVisits(visits);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 */}
        <View style={styles.headerRow}>
          <Text style={styles.greeting}>
            <Text style={styles.userName}>{user?.nickname ?? ''}</Text>님, 안녕하세요!
          </Text>
          <TouchableOpacity>
            <Text style={styles.menuIcon}>≡</Text>
          </TouchableOpacity>
        </View>

        {/* 캘린더 */}
        <MediCalendar onDayPress={handleDayPress} />

        {/* 선택 날짜 방문 목록 */}
        {selectedDate && (
          <View style={styles.scheduleCard}>
            <Text style={styles.scheduleTitle}>{selectedDate}</Text>
            {selectedVisits.length === 0 ? (
              <Text style={styles.emptyText}>등록된 일정이 없습니다.</Text>
            ) : (
              selectedVisits.map((v) => (
                <View key={v.id} style={styles.visitRow}>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getHighlightColor(v.treatmentStatus) },
                  ]}>
                    <Text style={styles.statusText}>{STATUS_LABEL[v.treatmentStatus]}</Text>
                  </View>
                  <View style={styles.visitInfo}>
                    <Text style={styles.hospitalName}>
                      {v.hospitalName}{v.departmentName ? ` · ${v.departmentName}` : ''}
                    </Text>
                    {v.visitReason && (
                      <Text style={styles.visitReason}>{v.visitReason}</Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* 병원 방문 등록 */}
        <View style={styles.registerSection}>
          <Text style={styles.registerQuestion}>오늘 병원에 방문하셨나요?</Text>
          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => navigation.navigate?.('Prescription')}
            activeOpacity={0.85}
          >
            <Text style={styles.registerBtnText}>등록하러 가기</Text>
            <Text style={styles.registerBtnArrow}>{'>'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: SPACING.base, gap: SPACING.base, paddingBottom: SPACING.base },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: SPACING.xs,
  },
  greeting: { fontSize: TYPOGRAPHY.lg, color: COLORS.textPrimary, fontWeight: TYPOGRAPHY.regular },
  userName: { fontWeight: TYPOGRAPHY.bold, color: COLORS.textPrimary },
  menuIcon: { fontSize: 22, color: COLORS.textSecondary },

  // 선택 날짜 카드
  scheduleCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.base, gap: SPACING.sm, ...SHADOW.sm,
  },
  scheduleTitle: {
    fontSize: TYPOGRAPHY.sm, fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary, marginBottom: SPACING.xs,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.sm, color: COLORS.textSecondary,
    textAlign: 'center', paddingVertical: SPACING.sm,
  },
  visitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  statusBadge: {
    borderRadius: RADIUS.round, paddingHorizontal: SPACING.sm,
    paddingVertical: 3, alignSelf: 'flex-start', marginTop: 2,
  },
  statusText: { fontSize: TYPOGRAPHY.xs, fontWeight: TYPOGRAPHY.bold, color: COLORS.textPrimary },
  visitInfo: { flex: 1, gap: 2 },
  hospitalName: { fontSize: TYPOGRAPHY.sm, fontWeight: TYPOGRAPHY.semibold, color: COLORS.textPrimary },
  visitReason: { fontSize: TYPOGRAPHY.xs, color: COLORS.textSecondary },

  // 등록 섹션
  registerSection: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.base, alignItems: 'center', gap: SPACING.md, ...SHADOW.sm,
  },
  registerQuestion: { fontSize: TYPOGRAPHY.base, color: COLORS.textSecondary },
  registerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.round,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.xxl,
    width: '100%', borderWidth: 1, borderColor: COLORS.border,
    gap: SPACING.sm, ...SHADOW.sm,
  },
  registerBtnText: { fontSize: TYPOGRAPHY.base, fontWeight: TYPOGRAPHY.semibold, color: COLORS.textPrimary },
  registerBtnArrow: { fontSize: TYPOGRAPHY.lg, color: COLORS.textSecondary },
});
