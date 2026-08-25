import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect } from "react";
import {
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from "../constants/theme";
import type { RootStackParamList } from "../types";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Splash'>;
};

export default function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 2000);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.iconWrapper}>
        <Text style={styles.iconEmoji}>🔗</Text>
      </View>

      <Text style={styles.logoText}>Medi-Self</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 72,
  },
  logoText: {
    fontSize: TYPOGRAPHY.xxl,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
});
