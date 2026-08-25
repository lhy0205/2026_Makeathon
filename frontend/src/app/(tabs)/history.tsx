import { doseApi } from '@/src/api/Client';
import PillHourglass from '@/src/components/PillHourglass';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/src/constants/theme';
import { useActiveVisit } from '@/src/hooks/useActiveVisit';
import { useAsync } from '@/src/hooks/useAsync';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** 기록이 쌓인 뒤에 보는 화면들 */
const LINKS = [
  { href: '/report' as const,     icon: '📋', label: '진료 리포트' },
  { href: '/trend' as const,      icon: '📈', label: '회복 추이' },
  { href: '/comparison' as const, icon: '⇄',  label: '치료 비교' },
];

export default function HistoryTab() {
  const router = useRouter();
  const { visit, loading: visitLoading } = useActiveVisit();

  // 이 치료의 복약 일정 전체 — 모래시계는 남은 알약 수를 보여준다
  const { data: doses, loading: dosesLoading } = useAsync(
    () => doseApi.getByVisit(visit!.id),
    [visit?.id],
    { enabled: visit != null },
  );

  const total = doses?.length ?? 0;
  const taken = doses?.filter((d) => d.doseStatus === 'TAKEN').length ?? 0;
  const loading = visitLoading || dosesLoading;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.body}>
        {/* 로고 배지 + 라벨 — 왼쪽 정렬 */}
        <View style={styles.labelRow}>
          <Text style={styles.logo}>💊</Text>
          <Text style={styles.label}>복약 완료 관리</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
        ) : total > 0 ? (
          <>
            <PillHourglass total={total} taken={taken} />
            <Text style={styles.caption}>
              {visit?.hospitalName} · {taken}/{total}회 복용
            </Text>
          </>
        ) : (
          <Text style={styles.emptyText}>
            처방전을 등록하면 복약 진행 상황을 볼 수 있어요.
          </Text>
        )}

        <View style={styles.actions}>
          {/* 복약 기록 */}
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
              <Text style={styles.primaryText}>복약 기록하기</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* 상태 기록 */}
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
              <Text style={styles.secondaryText}>상태 기록하기</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* 쌓인 기록으로 보는 것들 */}
          <View style={styles.linkRow}>
            {LINKS.map((link) => (
              <TouchableOpacity
                key={link.href}
                style={styles.link}
                onPress={() => router.push(link.href)}
                activeOpacity={0.75}
              >
                <Text style={styles.linkIcon}>{link.icon}</Text>
                <Text style={styles.linkText}>{link.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
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

  labelRow: {
    // 부모의 alignItems:'center'를 무시하고 전체 폭을 차지해야 왼쪽에 붙는다
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
  },
  logo: {
    fontSize: 20,
  },
  label: {
    fontSize: TYPOGRAPHY.md,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    letterSpacing: 0.2,
  },

  loader: { marginVertical: SPACING.xxxl },
  caption: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.semibold,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: SPACING.xxxl,
  },

  actions: {
    width: '100%',
    gap: SPACING.md,
    marginTop: SPACING.xl,
  },

  btn: {
    borderRadius: RADIUS.round,
    paddingVertical: SPACING.lg,
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
    fontSize: TYPOGRAPHY.md,
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
    fontSize: TYPOGRAPHY.md,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.primary,
    letterSpacing: 0.3,
  },

  linkRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  link: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  linkIcon: { fontSize: 18 },
  linkText: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textPrimary,
  },
});
