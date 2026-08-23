/*
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { Text } from "react-native";

import { COLORS, TYPOGRAPHY } from "../constants/theme";
import type {
  HomeStackParamList,
  MainTabParamList,
  RootStackParamList,
} from '../types';

import HomeScreen from "../screens/HomeScreen";
import LoginScreen from '../screens/LoginScreen';
import PrescriptionScreen from "../screens/PrescriptionScreen";
import SplashScreen from "../screens/SplashScreen";

// Stacks
const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

// 홈 탭 내부 스택
function HomeNavigator() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.white },
        headerTintColor: COLORS.primary,
        headerTitleStyle: {
          fontWeight: TYPOGRAPHY.bold,
          fontSize: TYPOGRAPHY.md,
          color: COLORS.textPrimary,
        },
      }}
    >
      <HomeStack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ title: 'Medi-Self', headerShown: false }}
      />
      <HomeStack.Screen
        name="Prescription"
        component={PrescriptionScreen}
        options={{ title: '처방전 등록' }}
      />
    </HomeStack.Navigator>
  );
}

// 메인 하단 탭
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          borderTopColor: COLORS.border,
          backgroundColor: COLORS.white,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: TYPOGRAPHY.xs,
          fontWeight: TYPOGRAPHY.medium,
        },
        tabBarIcon: ({ focused }) => {
          const icons: Record<string, string> = {
            Home: '🏠',
            History: '📒',
            Profile: '👤',
          };
          return (
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>
              {icons[route.name] ?? '▪️'}
            </Text>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeNavigator} options={{ title: '홈' }} />
      <Tab.Screen
        name="History"
        component={PlaceholderScreen('복약 기록')}
        options={{ title: '기록' }}
      />
      <Tab.Screen
        name="Profile"
        component={PlaceholderScreen('마이페이지')}
        options={{ title: '마이' }}
      />
    </Tab.Navigator>
  );
}

// 임시 플레이스홀더 화면
function PlaceholderScreen(title: string) {
  return function PlaceholderComponent() {
    return (
      <Text
        style={{
          flex: 1,
          textAlign: 'center',
          textAlignVertical: 'center',
          fontSize: TYPOGRAPHY.md,
          color: COLORS.textSecondary,
          paddingTop: 200,
        }}
      >
        {title} 화면 (준비 중)
      </Text>
    );
  };
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Splash" component={SplashScreen} />
        <RootStack.Screen name="Login" component={LoginScreen} />
        <RootStack.Screen name="Main" component={MainTabs} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
*/