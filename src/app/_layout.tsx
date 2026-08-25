import { COLORS } from '@/src/constants/theme';
import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="findaccount" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="prescription" />
        <Stack.Screen name="register-chat" />
        <Stack.Screen name="medcheck" />
        <Stack.Screen name="medcheckpage" />
        <Stack.Screen name="statuscheck" />
        <Stack.Screen name="medlog" />
        <Stack.Screen name="sideeffect" />
      </Stack>
    </SafeAreaProvider>
  );
}
