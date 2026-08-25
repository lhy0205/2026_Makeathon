import { prescriptionApi } from '@/src/api/Client';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '@/src/constants/theme';
import { useAuth } from '@/src/context/AuthContext';
import { useActiveVisit } from '@/src/hooks/useActiveVisit';
import { useAsync } from '@/src/hooks/useAsync';
import type { MedicationResponse, VisitResponse } from '@/src/types/Api';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** 마이페이지에 보여줄 최근 처방전 개수 */
const RECENT_LIMIT = 3;

interface RecentPrescription {
  visit: VisitResponse;
  medications: MedicationResponse[];
}

/** 1일 3회처럼 읽히게 */
function frequencyLabel(med: MedicationResponse): string {
  const parts: string[] = [];
  if (med.frequencyPerDay) parts.push(`1일 ${med.frequencyPerDay}회`);
  if (med.durationDays) parts.push(`${med.durationDays}일`);
  return parts.join(' · ');
}

function dosageLabel(med: MedicationResponse): string {
  if (med.dosage == null) return med.medicationName;
  return `${med.medicationName} ${med.dosage}${med.doseUnit ?? ''}`;
}

export default function ProfileTab() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { visits, loading: visitsLoading } = useActiveVisit();

  const recentVisits = visits.slice(0, RECENT_LIMIT);

  const { data: recent, loading: rxLoading } = useAsync<RecentPrescription[]>(
    async () => Promise.all(
      recentVisits.map(async (visit) => {
        try {
          const prescription = await prescriptionApi.getByVisit(visit.id);
          return { visit, medications: prescription.medications };
        } catch {
          // 처방전을 아직 올리지 않은 방문도 목록에는 남긴다
          return { visit, medications: [] };
        }
      }),
    ),
    [recentVisits.map((v) => v.id).join(',')],
    { enabled: recentVisits.length > 0 },
  );

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  const loading = visitsLoading || rxLoading;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* 타이틀 */}
        <Text style={styles.pageTitle}>마이페이지</Text>

        {/* 유저 카드 */}
        <View style={styles.userCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{user?.nickname?.[0] ?? '?'}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.nickname ?? ''}</Text>
            <Text style={styles.userEmail}>{user?.email ?? ''}</Text>
          </View>
        </View>

        {/* 최근 처방전 */}
        <Text style={styles.sectionTitle}>최근 처방전</Text>

        {loading && <ActivityIndicator size="small" color={COLORS.primary} />}

        {!loading && (recent?.length ?? 0) === 0 && (
          <Text style={styles.emptyText}>아직 등록한 처방전이 없습니다.</Text>
        )}

        {recent?.map(({ visit, medications }) => (
          <View key={visit.id} style={styles.rxCard}>
            <View style={styles.rxHeader}>
              <Text style={styles.rxHospital}>{visit.hospitalName}</Text>
              <Text style={styles.rxDate}>{visit.visitedAt}</Text>
            </View>
            <View style={styles.rxDivider} />
            {medications.length === 0 ? (
              <Text style={styles.rxEmpty}>등록된 약 정보가 없습니다.</Text>
            ) : (
              medications.map((med) => (
                <View key={med.id} style={styles.medRow}>
                  <Text style={styles.medDot}>•</Text>
                  <Text style={styles.medName}>{dosageLabel(med)}</Text>
                  <Text style={styles.medFreq}>{frequencyLabel(med)}</Text>
                </View>
              ))
            )}
          </View>
        ))}

        {/* 로그아웃 */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.base,
    gap: SPACING.base,
    paddingBottom: SPACING.base,
  },
  pageTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.xs,
    alignSelf: 'flex-start',
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
  emptyText: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: SPACING.base,
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
  rxEmpty: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textSecondary,
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

  // 로그아웃
  logoutBtn: {
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.error,
    marginTop: SPACING.sm,
  },
  logoutText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.error,
  },
});
