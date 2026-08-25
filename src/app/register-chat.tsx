import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChatBubble from '@/src/components/ChatBubble';
import { MOCK_BOT_NAME, MOCK_USER } from '@/src/constants/mockData';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '@/src/constants/theme';
import type { ChatMessage } from '@/src/types';

// TODO: 백엔드 연동 시 chatApi.send(visitId, content) 응답으로 교체.
//       지금은 등록 흐름을 확인하기 위한 고정 문구다.
const nowTime = () =>
  new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

const MED_BRIEF = [
  `오늘 처방받으신 메디론정(스테로이드)과 항히스타민제는 ${MOCK_USER.name}님의 피부 염증과 가려움증을 빠르게 가라앉히는 데 최적화된 처방입니다.`,
  '스테로이드가 강력하게 염증을 줄여주는 동안 항히스타민제가 가려움을 잡아주어 서로 시너지를 내므로, 증상이 호전될 때까지 일정한 시간에 빠짐없이 복용해 주세요.',
  '추가적으로 궁금하신 사항이 있다면 질문해주세요!',
].join('\n\n');

const FALLBACK = '메시지를 잘 받았어요! 추가로 궁금한 점이 있으시면 언제든지 물어보세요.';

export default function RegisterChatScreen() {
  const router = useRouter();
  const { hospital = '', date = '' } = useLocalSearchParams<{
    hospital?: string;
    date?: string;
  }>();

  const listRef = useRef<FlatList>(null);
  const [input, setInput] = useState('');

  // 증상을 받기 전인지 — 첫 답변은 약 설명이 되어야 한다
  const [awaitingSymptom, setAwaitingSymptom] = useState(true);
  // 약 설명까지 마쳐야 저장 버튼이 나온다
  const [canSave, setCanSave] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'greet',
      role: 'bot',
      text: [
        `안녕하세요! ${MOCK_USER.name}님의 복약을 돕는 Medi-Self입니다:)`,
        `${date}에 ${hospital}을 방문하셨네요.`,
        '어떤 증상으로 방문하셨나요?',
      ].join('\n'),
      time: nowTime(),
    },
  ]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    const reply = awaitingSymptom ? MED_BRIEF : FALLBACK;

    setMessages((prev) => [
      ...prev,
      { id: `u_${Date.now()}`, role: 'user', text, time: nowTime() },
      { id: `b_${Date.now() + 1}`, role: 'bot', text: reply, time: nowTime() },
    ]);
    setInput('');

    if (awaitingSymptom) {
      setAwaitingSymptom(false);
      setCanSave(true);
    }

    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleSave = () => {
    // TODO: POST /visits → POST /visits/{id}/prescriptions 순서로 저장한다
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>

      {/* 헤더 */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>{'< 이전'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>증상 확인</Text>
          <Text style={styles.headerSub}>3 / 4 단계</Text>
        </View>
        <View style={{ width: 48 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <ChatBubble message={item} botName={MOCK_BOT_NAME} />}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        {/* 대화가 끝나면 저장으로 이어진다 */}
        {canSave && (
          <View style={styles.saveWrap}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>처방전 저장하기</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 입력창 */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={awaitingSymptom ? '증상을 입력하세요...' : '메시지를 입력하세요...'}
            placeholderTextColor={COLORS.textPlaceholder}
            value={input}
            onChangeText={setInput}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnOff]}
            onPress={handleSend}
            disabled={!input.trim()}
          >
            <Text style={styles.sendBtnText}>전송</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: COLORS.background },

  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { fontSize: TYPOGRAPHY.sm, color: COLORS.primary, fontWeight: TYPOGRAPHY.semibold, width: 48 },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.bold, color: COLORS.textPrimary },
  headerSub: { fontSize: 10, color: COLORS.textSecondary, marginTop: -1 },

  list: { padding: SPACING.base, gap: SPACING.md },

  // 저장 버튼
  saveWrap: {
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.sm,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.round,
    paddingVertical: SPACING.base,
    alignItems: 'center',
    ...SHADOW.md,
  },
  saveBtnText: {
    fontSize: TYPOGRAPHY.md, fontWeight: TYPOGRAPHY.bold,
    color: COLORS.white, letterSpacing: 0.3,
  },

  // 입력창
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 100,
    backgroundColor: COLORS.inputBg, borderRadius: RADIUS.round,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.sm, color: COLORS.textPrimary,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sendBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.round,
    paddingHorizontal: SPACING.base, height: 40,
    justifyContent: 'center', ...SHADOW.md,
  },
  sendBtnOff: { backgroundColor: COLORS.border, shadowOpacity: 0, elevation: 0 },
  sendBtnText: { fontSize: TYPOGRAPHY.sm, fontWeight: TYPOGRAPHY.semibold, color: COLORS.white },
});
