import { COLORS, TYPOGRAPHY } from '@/src/constants/theme';
import { useAuth } from '@/src/context/AuthContext';
import { usePushRegistration } from '@/src/hooks/usePushRegistration';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Android 호환 텍스트 아이콘
const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  index:   { active: '⌂', inactive: '⌂' },
  history: { active: '≡', inactive: '≡' },
  chat:    { active: '◎', inactive: '◎' },
  profile: { active: '○', inactive: '○' },
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // 로그인한 뒤에 복약 알림 토큰을 등록한다
  usePushRegistration(user != null);

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          borderTopColor: COLORS.border,
          backgroundColor: COLORS.white,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: TYPOGRAPHY.xs,
          fontWeight: TYPOGRAPHY.medium,
        },
        tabBarIcon: ({ focused }) => (
          <Text style={{
            fontSize: 22,
            color: focused ? COLORS.primary : COLORS.textSecondary,
          }}>
            {TAB_ICONS[route.name]?.active ?? '●'}
          </Text>
        ),
      })}
    >
      <Tabs.Screen name="index"   options={{ title: '홈' }} />
      <Tabs.Screen name="history" options={{ title: '기록' }} />
      <Tabs.Screen name="chat"    options={{ title: '채팅' }} />
      <Tabs.Screen name="profile" options={{ title: '마이' }} />
    </Tabs>
  );
}
