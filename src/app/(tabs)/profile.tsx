import { MOCK_PRESCRIPTIONS, MOCK_USER } from '@/src/constants/mockData';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '@/src/constants/theme';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileTab() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>마이페이지</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* 유저 카드 */}
        <View style={styles.userCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{MOCK_USER.name[0]}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{MOCK_USER.name}</Text>
            <Text style={styles.userEmail}>{MOCK_USER.email}</Text>
          </View>
        </View>

        {/* 최근 처방전 */}
        <Text style={styles.sectionTitle}>최근 처방전</Text>

        {MOCK_PRESCRIPTIONS.map((rx) => (
          <View key={rx.id} style={styles.rxCard}>
            <View style={styles.rxHeader}>
              <Text style={styles.rxHospital}>{rx.hospital}</Text>
              <Text style={styles.rxDate}>{rx.date}</Text>
            </View>
            <View style={styles.rxDivider} />
            {rx.medications.map((med, idx) => (
              <View key={idx} style={styles.medRow}>
                <Text style={styles.medDot}>•</Text>
                <Text style={styles.medName}>{med.name} {med.dosage}</Text>
                <Text style={styles.medFreq}>{med.frequency} · {med.days}일</Text>
              </View>
            ))}
          </View>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },
  content: {
    padding: SPACING.base,
    gap: SPACING.base,
    paddingBottom: SPACING.base,
  },

  // 유저 카드
  userCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.base,
    ...SHADOW.sm,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.white,
  },
  userInfo: { gap: 4 },
  userName: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },
  userEmail: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
  },

  // 섹션 타이틀
  sectionTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
  },

  // 처방전 카드
  rxCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    gap: SPACING.sm,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    ...SHADOW.sm,
  },
  rxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rxHospital: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },
  rxDate: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
  },
  rxDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  medDot: {
    fontSize: TYPOGRAPHY.base,
    color: COLORS.primary,
  },
  medName: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.medium,
    color: COLORS.textPrimary,
    flex: 1,
  },
  medFreq: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textSecondary,
  },
});
