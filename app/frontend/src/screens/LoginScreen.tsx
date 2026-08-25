import { useAuth } from "@/src/context/AuthContext";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "../constants/theme";
import type { ScreenNav } from "../types";

type Props = {
  navigation?: ScreenNav;
};

export default function LoginScreen({ navigation }: Props) {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (submitting) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await login(trimmedEmail, password);
      router.replace('/(tabs)');
    } catch (e: any) {
      // 401이면 서버가 내려주는 문구를, 그 밖에는 연결 실패 문구를 그대로 보여준다
      setError(e?.message ?? '로그인에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoSection}>
          <Image
            source={require('../../assets/images/first.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.card}>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}>👤</Text>
            <TextInput
              style={styles.input}
              placeholder="Email / ID"
              placeholderTextColor={COLORS.textPlaceholder}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={COLORS.textPlaceholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.linkRow}>
            <TouchableOpacity onPress={() => router.push('/findaccount')}>
              <Text style={styles.linkText}>Find ID / Password</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={styles.linkTextBold}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, submitting && styles.loginButtonOff]}
            onPress={handleLogin}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator size="small" color={COLORS.white} />
              : <Text style={styles.loginButtonText}>LOGIN</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxxl,
  },

  logoSection: {
    alignItems: 'center',
    marginBottom: SPACING.xxxl,
  },
  logo: {
    width: 140,
    height: 140,
  },

  card: {
    width: '100%',
    gap: SPACING.md,
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: TYPOGRAPHY.base,
    color: COLORS.textPrimary,
  },

  errorText: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.error,
    textAlign: 'center',
  },

  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xs,
  },
  linkText: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
  },
  linkTextBold: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.semibold,
  },

  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.base,
    alignItems: 'center',
    marginTop: SPACING.sm,
    ...SHADOW.md,
  },
  loginButtonOff: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: TYPOGRAPHY.md,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.white,
    letterSpacing: 1.5,
  },
});
