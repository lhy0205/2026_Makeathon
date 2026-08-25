import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { chatApi } from '../api/Client';
import ChatBubble from '../components/ChatBubble';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useActiveVisit } from '../hooks/useActiveVisit';
import type { ChatMessage } from '../types';
import type { ChatMessageResponse } from '../types/Api';
import { toClockLabel } from '../utils/datetime';

const BOT_NAME = 'Medi-Self';

const nowTime = () =>
  new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

/** 서버 응답 → 말풍선이 아는 모양. 출처와 면책 문구는 답변 아래에 붙여 보여준다 */
function toBubble(res: ChatMessageResponse): ChatMessage {
  const sources = res.sources
    ?.map((s) => s.title)
    .filter(Boolean);

  const extra = [
    sources?.length ? `\n\n📎 ${sources.join(' · ')}` : '',
    res.disclaimer ? `\n\n${res.disclaimer}` : '',
  ].join('');

  return {
    id: String(res.id),
    role: res.role === 'ASSISTANT' ? 'bot' : 'user',
    text: res.content + extra,
    time: toClockLabel(res.createdAt),
  };
}

export default function ChatScreen() {
  const { visit, loading: visitLoading, error: visitError, refresh: refreshVisit } = useActiveVisit();
  const visitId = visit?.id ?? null;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  // 방문이 정해지면 지난 대화를 불러온다
  const loadHistory = useCallback(async (id: number) => {
    setLoadingHistory(true);
    try {
      const history = await chatApi.getMessages(id);
      setMessages(history.map(toBubble));
    } catch {
      setMessages([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (visitId == null) return;
    void loadHistory(visitId);
  }, [visitId, loadHistory]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || visitId == null || sending) return;

    setInputText('');
    // 보낸 말은 서버 왕복을 기다리지 않고 바로 붙인다
    setMessages((prev) => [
      ...prev,
      { id: `local_${Date.now()}`, role: 'user', text, time: nowTime() },
    ]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    setSending(true);
    try {
      const answer = await chatApi.send(visitId, text);
      setMessages((prev) => [...prev, toBubble(answer)]);
    } catch (e) {
      const message = e instanceof Error ? e.message : '답변을 받지 못했습니다.';
      setMessages((prev) => [
        ...prev,
        { id: `err_${Date.now()}`, role: 'bot', text: message, time: nowTime() },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  // ── 방문 기록이 아직 없을 때 ──────────────────
  if (visitLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (visitError || !visit) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>
            {visitError ? '불러오지 못했습니다' : '등록된 처방전이 없어요'}
          </Text>
          <Text style={styles.emptyText}>
            {visitError ?? '처방전을 먼저 등록하면 복용 중인 약에 대해 물어볼 수 있어요.'}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refreshVisit} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* 어느 치료에 대한 대화인지 */}
        <View style={styles.contextBar}>
          <Text style={styles.contextText} numberOfLines={1}>
            {visit.hospitalName}
            {visit.visitReason ? ` · ${visit.visitReason}` : ''}
          </Text>
        </View>

        {loadingHistory ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ChatBubble message={item} botName={BOT_NAME} />}
            contentContainerStyle={styles.msgList}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                복용 중인 약에 대해 무엇이든 물어보세요.
              </Text>
            }
            ListFooterComponent={sending ? (
              <ActivityIndicator size="small" color={COLORS.primary} style={styles.typing} />
            ) : null}
          />
        )}

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
            style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
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

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: SPACING.base,
  },
  retryBtn: {
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  retryBtnText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.primary,
  },

  contextBar: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  contextText: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.semibold,
  },

  msgList: { padding: SPACING.base, gap: SPACING.md },
  typing: { alignSelf: 'flex-start', marginTop: SPACING.xs },

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
