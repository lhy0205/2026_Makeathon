import { MOCK_RECOVERY_PERCENT } from '@/src/constants/mockData';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '@/src/constants/theme';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HistoryTab() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <Text style={styles.recoveryText}>{MOCK_RECOVERY_PERCENT}% 회복 중이에요!</Text>
        <Text style={styles.hourglassEmoji}>⏳</Text>

        {/* 복약 체크 */}
        <TouchableOpacity
          style={styles.checkBtn}
          onPress={() => router.push('/medcheckpage')}
          activeOpacity={0.85}
        >
          <Text style={styles.checkBtnText}>복약 체크하기</Text>
        </TouchableOpacity>

        {/* 상태 체크 */}
        <TouchableOpacity
          style={styles.statusBtn}
          onPress={() => router.push('/statuscheck')}
          activeOpacity={0.85}
        >
          <Text style={styles.statusBtnText}>상태 체크하기</Text>
        </TouchableOpacity>
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
  recoveryText: { fontSize: TYPOGRAPHY.xl, fontWeight: TYPOGRAPHY.bold, color: COLORS.textPrimary },
  hourglassEmoji: { fontSize: 140 },
  checkBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.round,
    paddingVertical: SPACING.md, width: '100%',
    alignItems: 'center', ...SHADOW.md,
  },
  checkBtnText: { fontSize: TYPOGRAPHY.base, fontWeight: TYPOGRAPHY.bold, color: COLORS.white },
  statusBtn: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.round,
    paddingVertical: SPACING.md, width: '100%',
    alignItems: 'center', borderWidth: 1.5,
    borderColor: COLORS.primary, ...SHADOW.sm,
  },
  statusBtnText: { fontSize: TYPOGRAPHY.base, fontWeight: TYPOGRAPHY.bold, color: COLORS.primary },
});
