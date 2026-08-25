import { useAuth } from '@/src/context/AuthContext';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '@/src/constants/theme';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView, Platform,
  ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// 서버 RegisterRequest가 8자 이상을 요구한다
const MIN_PASSWORD = 8;

export default function SignUpPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [nickname, setNickname] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [errors, setErrors]     = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!nickname.trim())       e.nickname = '닉네임을 입력해주세요.';
    if (!email.trim())          e.email    = '이메일을 입력해주세요.';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = '올바른 이메일 형식이 아닙니다.';
    if (!password)              e.password = '비밀번호를 입력해주세요.';
    else if (password.length < MIN_PASSWORD) e.password = `비밀번호는 ${MIN_PASSWORD}자 이상이어야 합니다.`;
    if (password !== confirmPw) e.confirmPw = '비밀번호가 일치하지 않습니다.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignUp = async () => {
    if (submitting || !validate()) return;

    setSubmitting(true);
    try {
      // 가입에 성공하면 토큰까지 함께 내려오므로 바로 로그인 상태가 된다
      await register(email.trim(), password, nickname.trim());
      router.replace('/(tabs)');
    } catch (e) {
      const message = e instanceof Error ? e.message : '잠시 후 다시 시도해주세요.';
      Alert.alert('회원가입 실패', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* 헤더 */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backBtn}>{'< 이전'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>회원가입</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>

            {/* 닉네임 */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>닉네임</Text>
              <View style={[styles.inputRow, errors.nickname && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  placeholder="닉네임을 입력해주세요"
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={nickname}
                  onChangeText={setNickname}
                />
              </View>
              {errors.nickname && <Text style={styles.errorText}>{errors.nickname}</Text>}
            </View>

            {/* 이메일 */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>이메일</Text>
              <View style={[styles.inputRow, errors.email && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  placeholder="이메일을 입력해주세요"
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* 비밀번호 */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>비밀번호</Text>
              <View style={[styles.inputRow, errors.password && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  placeholder={`${MIN_PASSWORD}자 이상 입력해주세요`}
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {/* 비밀번호 확인 */}
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>비밀번호 확인</Text>
              <View style={[styles.inputRow, errors.confirmPw && styles.inputError]}>
                <TextInput
                  style={styles.input}
                  placeholder="비밀번호를 다시 입력해주세요"
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={confirmPw}
                  onChangeText={setConfirmPw}
                  secureTextEntry
                />
              </View>
              {errors.confirmPw && <Text style={styles.errorText}>{errors.confirmPw}</Text>}
            </View>

            {/* 가입 버튼 */}
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnOff]}
              onPress={handleSignUp}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting
                ? <ActivityIndicator size="small" color={COLORS.white} />
                : <Text style={styles.submitBtnText}>회원가입</Text>}
            </TouchableOpacity>

            {/* 로그인으로 */}
            <TouchableOpacity style={styles.loginLink} onPress={() => router.back()}>
              <Text style={styles.loginLinkText}>이미 계정이 있으신가요? <Text style={styles.loginLinkBold}>로그인</Text></Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.md,
  },
  backBtn: { fontSize: TYPOGRAPHY.sm, color: COLORS.primary, fontWeight: TYPOGRAPHY.semibold },
  headerTitle: { fontSize: TYPOGRAPHY.lg, fontWeight: TYPOGRAPHY.bold, color: COLORS.textPrimary },
  content: { padding: SPACING.xl, paddingTop: SPACING.lg },
  form: { gap: SPACING.base },
  fieldWrap: { gap: SPACING.xs },
  fieldLabel: { fontSize: TYPOGRAPHY.sm, fontWeight: TYPOGRAPHY.semibold, color: COLORS.textPrimary },
  inputRow: {
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md, backgroundColor: COLORS.inputBg,
  },
  inputError: { borderColor: COLORS.error },
  input: { fontSize: TYPOGRAPHY.base, color: COLORS.textPrimary },
  errorText: { fontSize: TYPOGRAPHY.xs, color: COLORS.error, paddingLeft: SPACING.xs },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: SPACING.base, alignItems: 'center',
    marginTop: SPACING.sm, ...SHADOW.md,
  },
  submitBtnOff: { opacity: 0.6 },
  submitBtnText: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.bold, color: COLORS.white, letterSpacing: 0.5 },
  loginLink: { alignItems: 'center', paddingVertical: SPACING.sm },
  loginLinkText: { fontSize: TYPOGRAPHY.sm, color: COLORS.textSecondary },
  loginLinkBold: { color: COLORS.primary, fontWeight: TYPOGRAPHY.bold },
});
