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
import ChatBubble from '../components/ChatBubble';
import { MOCK_BOT_NAME, MOCK_CHAT_MESSAGES } from '../constants/mockData';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../constants/theme';
import type { ChatMessage } from '../types';

const nowTime = () =>
  new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_CHAT_MESSAGES);
  const [inputText, setInputText] = useState('');
  const listRef = useRef<FlatList>(null);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;

    // TODO: chatApi.send(visitId, text) 응답으로 교체
    setMessages((prev) => [
      ...prev,
      { id: `u_${Date.now()}`, role: 'user', text, time: nowTime() },
      {
        id: `b_${Date.now() + 1}`,
        role: 'bot',
        text: '메시지를 잘 받았어요! 추가로 궁금한 점이 있으시면 언제든지 물어보세요.',
        time: nowTime(),
      },
    ]);
    setInputText('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatBubble message={item} botName={MOCK_BOT_NAME} />}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        {/* 입력창 */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="메시지를 입력하세요..."
            placeholderTextColor={COLORS.textPlaceholder}
            value={inputText}
            onChangeText={setInputText}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim()}
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

  msgList: { padding: SPACING.base, gap: SPACING.md },

  // 입력창
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.round,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.round,
    paddingHorizontal: SPACING.base,
    height: 40,
    justifyContent: 'center',
    ...SHADOW.md,
  },
  sendBtnDisabled: { backgroundColor: COLORS.border, shadowOpacity: 0, elevation: 0 },
  sendBtnText: { fontSize: TYPOGRAPHY.sm, fontWeight: TYPOGRAPHY.semibold, color: COLORS.white },
});
