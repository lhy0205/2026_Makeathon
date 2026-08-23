import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MediCalendar from "../components/MediCalendar";
import { MOCK_SCHEDULES, MOCK_USER } from "../constants/mockData";
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "../constants/theme";
import type { CalendarDayInfo, HomeStackParamList } from "../types";

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>;
};

export default function HomeScreen({ navigation }: Props) {
  const [selectedDateSchedules, setSelectedDateSchedules] = useState<typeof MOCK_SCHEDULES>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const handleDayPress = (dateStr: string, _info: CalendarDayInfo | undefined) => {
    setSelectedDate(dateStr);
    const matched = MOCK_SCHEDULES.filter((s) => s.date === dateStr);
    setSelectedDateSchedules(matched);
  };

  const handleRegisterPress = () => {
    navigation.navigate('Prescription');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

        <View style={styles.headerRow}>
          <Text style={styles.greeting}>
            <Text style={styles.userName}>{MOCK_USER.name}</Text>님, 안녕하세요!
          </Text>
          <TouchableOpacity>
            <Text style={styles.menuIcon}>⋯</Text>
          </TouchableOpacity>
        </View>

        <MediCalendar onDayPress={handleDayPress} />

        {selectedDate && (
          <View style={styles.scheduleCard}>
            <Text style={styles.scheduleDate}>{selectedDate} 복약 일정</Text>
            {selectedDateSchedules.length === 0 ? (
              <Text style={styles.noSchedule}>등록된 복약 일정이 없습니다.</Text>
            ) : (
              selectedDateSchedules.map((sch) => (
                <View key={sch.id} style={styles.scheduleRow}>
                  <View
                    style={[
                      styles.statusBadge,
                      sch.taken ? styles.badgeTaken : styles.badgeMissed,
                    ]}
                  >
                    <Text style={styles.badgeText}>
                      {sch.taken ? '복약 완료' : '미복약'}
                    </Text>
                  </View>
                  <View style={styles.scheduleInfo}>
                    <Text style={styles.scheduleLabel}>{sch.label}</Text>
                    <Text style={styles.scheduleMeds}>
                      {sch.medications.join(', ')}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        <View style={styles.registerSection}>
          <Text style={styles.registerQuestion}>오늘 병원에 방문하셨나요?</Text>
          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegisterPress}
            activeOpacity={0.85}
          >
            <Text style={styles.registerButtonArrow}>등록하러 가기{'>'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.base,
    gap: SPACING.base,
    paddingBottom: SPACING.base,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  greeting: {
    fontSize: TYPOGRAPHY.md,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.regular,
  },
  userName: {
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.primary,
  },
  menuIcon: {
    fontSize: TYPOGRAPHY.lg,
    color: COLORS.textSecondary,
  },

  scheduleCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    gap: SPACING.sm,
    ...SHADOW.sm,
  },
  scheduleDate: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  noSchedule: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: SPACING.sm,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  statusBadge: {
    borderRadius: RADIUS.round,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  badgeTaken: {
    backgroundColor: COLORS.success + '22',
  },
  badgeMissed: {
    backgroundColor: COLORS.error + '22',
  },
  badgeText: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textPrimary,
  },
  scheduleInfo: {
    flex: 1,
    gap: 2,
  },
  scheduleLabel: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textPrimary,
  },
  scheduleMeds: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textSecondary,
  },

  registerSection: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    alignItems: 'center',
    gap: SPACING.md,
    ...SHADOW.sm,
  },
  registerQuestion: {
    fontSize: TYPOGRAPHY.base,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.medium,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.round,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
    gap: SPACING.sm,
    width: '100%',
    ...SHADOW.md,
  },
  registerButtonText: {
    fontSize: TYPOGRAPHY.md,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.white,
  },
  registerButtonArrow: {
    fontSize: TYPOGRAPHY.xl,
    color: COLORS.white,
    lineHeight: TYPOGRAPHY.xl,
  },
});
