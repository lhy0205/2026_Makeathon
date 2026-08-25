import PillHourglass from '@/src/components/PillHourglass';
import { MOCK_MED_CHECK, MOCK_PRESCRIPTIONS } from '@/src/constants/mockData';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/src/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// 하루 복약 횟수 (아침 · 저녁 = 2회)
const DOSES_PER_DAY = MOCK_MED_CHECK.length;
// 처방 일수
const PRESCRIPTION_DAYS = MOCK_PRESCRIPTIONS[0].medications[0].days;
// 모래시계에 들어가는 전체 알약 수
const TOTAL_DOSES = DOSES_PER_DAY * PRESCRIPTION_DAYS;

// TODO: DB 연동 전 임시값. 지금은 2일차까지 복용한 상태로 고정.
//       나중에 복약 체크 상태를 공유하면 이 두 줄만 교체하면 된다.
const DAYS_DONE = 2;
const TAKEN_DOSES = DOSES_PER_DAY * DAYS_DONE;

export default function HistoryTab() {
  const router = useRouter();
  const percent = Math.round((TAKEN_DOSES / TOTAL_DOSES) * 100);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.body}>
        <Text style={styles.recoveryText}>
          <Text style={styles.recoveryPercent}>{percent}%</Text> 회복 중이에요!
        </Text>

        <PillHourglass total={TOTAL_DOSES} taken={TAKEN_DOSES} />

        <View style={styles.actions}>
          {/* 복약 체크 */}
          <TouchableOpacity
            style={styles.primaryShadow}
            onPress={() => router.push('/medcheckpage')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#4E93DB', '#2A6FBF', '#154C90']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.btn}
            >
              <Text style={styles.primaryText}>복약 체크하기</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* 상태 체크 */}
          <TouchableOpacity
            style={styles.secondaryShadow}
            onPress={() => router.push('/statuscheck')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#FFFFFF', '#EDF4FB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[styles.btn, styles.secondaryBorder]}
            >
              <Text style={styles.secondaryText}>상태 체크하기</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  body: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: SPACING.md, paddingHorizontal: SPACING.xl,
  },

  recoveryText: {
    fontSize: 26,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },
  recoveryPercent: {
    fontSize: 38,
    fontWeight: TYPOGRAPHY.extrabold,
    color: COLORS.textPrimary,
  },

  actions: {
    width: '100%',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },

  btn: {
    borderRadius: RADIUS.round,
    paddingVertical: SPACING.base,
    alignItems: 'center',
  },

  primaryShadow: {
    borderRadius: RADIUS.round,
    shadowColor: '#154C90',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.white,
    letterSpacing: 0.3,
  },

  secondaryShadow: {
    borderRadius: RADIUS.round,
    shadowColor: '#2A6FBF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 3,
  },
  secondaryBorder: {
    borderWidth: 1,
    borderColor: '#CFE0F2',
  },
  secondaryText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
});
