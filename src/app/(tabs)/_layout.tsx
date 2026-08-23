import { COLORS, TYPOGRAPHY } from "@/src/constants/theme";
import { Tabs } from "expo-router";
import { Text } from "react-native";

const TAB_ICONS: Record<string, string> = {
  index: '🏠',
  History: '📒',
  Profile: '👤',
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          borderTopColor: COLORS.border,
          backgroundColor: COLORS.white,
          height: 100,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: TYPOGRAPHY.xs,
          fontWeight: TYPOGRAPHY.medium,
        },
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>
            {TAB_ICONS[route.name] ?? '▪️'}
          </Text>
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: '홈'}} />
      <Tabs.Screen name="history" options={{ title: '기록'}} />
      <Tabs.Screen name="profile" options={{ title: '마이'}} />
    </Tabs>
  );
}
