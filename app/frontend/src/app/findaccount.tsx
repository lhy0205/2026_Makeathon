import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '@/src/constants/theme';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView, Platform,
  ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type FindTab = 'id' | 'password';

export default function FindAccountPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FindTab>('id');

  // ID 찾기
  const [findIdName, setFindIdName]   = useState('');
  const [findIdPhone, setFindIdPhone] = useState('');

  // PW 찾기
  const [findPwEmail, setFindPwEmail] = useState('');
  const [findPwName, setFindPwName]   = useState('');

  const handleFindId = () => {
    if (!findIdName || !findIdPhone) {
      Alert.alert('입력 오류', '이름과 휴대폰 번호를 입력해주세요.');
      return;
    }
    // TODO: 실제 API 연동 시 교체
    Alert.alert('ID 찾기', '입력하신 정보로 등록된 이메일:\ntest@medi.com');
  };

  const handleFindPw = () => {
    if (!findPwEmail || !findPwName) {
      Alert.alert('입력 오류', '이메일과 이름을 입력해주세요.');
      return;
    }
    // TODO: 실제 API 연동 시 교체
    Alert.alert('비밀번호 재설정', '입력하신 이메일로 비밀번호 재설정 링크를 발송했습니다.');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* 헤더 */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backBtn}>{'< 이전'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ID / 비밀번호 찾기</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* 탭 */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'id' && styles.tabActive]}
            onPress={() => setActiveTab('id')}
          >
            <Text style={[styles.tabText, activeTab === 'id' && styles.tabTextActive]}>ID 찾기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'password' && styles.tabActive]}
            onPress={() => setActiveTab('password')}
          >
            <Text style={[styles.tabText, activeTab === 'password' && styles.tabTextActive]}>비밀번호 찾기</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* ID 찾기 탭 */}
          {activeTab === 'id' && (
            <View style={styles.form}>
              <Text style={styles.formDesc}>가입 시 등록한 이름과 휴대폰 번호를 입력해주세요.</Text>

              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="이름"
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={findIdName}
                  onChangeText={setFindIdName}
                />
              </View>

              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="휴대폰 번호 (- 없이 입력)"
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={findIdPhone}
                  onChangeText={setFindIdPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleFindId} activeOpacity={0.85}>
                <Text style={styles.submitBtnText}>ID 찾기</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 비밀번호 찾기 탭 */}
          {activeTab === 'password' && (
            <View style={styles.form}>
              <Text style={styles.formDesc}>가입 시 등록한 이메일과 이름을 입력해주세요.{'\n'}비밀번호 재설정 링크를 발송해드립니다.</Text>

              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="이메일"
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={findPwEmail}
                  onChangeText={setFindPwEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="이름"
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={findPwName}
                  onChangeText={setFindPwName}
                />
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleFindPw} activeOpacity={0.85}>
                <Text style={styles.submitBtnText}>재설정 링크 발송</Text>
              </TouchableOpacity>
            </View>
          )}

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
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tab: { flex: 1, paddingVertical: SPACING.md, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: TYPOGRAPHY.base, color: COLORS.textSecondary, fontWeight: TYPOGRAPHY.medium },
  tabTextActive: { color: COLORS.primary, fontWeight: TYPOGRAPHY.bold },
  content: { padding: SPACING.xl, paddingTop: SPACING.xxl },
  form: { gap: SPACING.md },
  formDesc: {
    fontSize: TYPOGRAPHY.sm, color: COLORS.textSecondary,
    lineHeight: 20, marginBottom: SPACING.sm,
  },
  inputRow: {
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md, backgroundColor: COLORS.inputBg,
  },
  input: { fontSize: TYPOGRAPHY.base, color: COLORS.textPrimary },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: SPACING.base, alignItems: 'center',
    marginTop: SPACING.sm, ...SHADOW.md,
  },
  submitBtnText: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.bold, color: COLORS.white, letterSpacing: 0.5 },
});
