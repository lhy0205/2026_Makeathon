import { chatApi, doseApi, prescriptionApi, visitApi } from '@/src/api/Client';
import ChatBubble from '@/src/components/ChatBubble';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '@/src/constants/theme';
import { useAuth } from '@/src/context/AuthContext';
import { clearDraft, getDraft } from '@/src/state/registrationDraft';
import type { ChatMessage } from '@/src/types';
import type { MedicationRequest } from '@/src/types/Api';
import { addDays, defaultDoseTimes, toLocalDate } from '@/src/utils/datetime';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

const BOT_NAME = 'Medi-Self';

const nowTime = () =>
  new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

/** 처방 기간이 가장 긴 약에 맞춰 복약 기간을 잡는다 */
function maxDuration(days: (number | null)[]): number {
  const valid = days.filter((d): d is number => d != null && d > 0);
  return valid.length ? Math.max(...valid) : 1;
}

export default function RegisterChatScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // 처방전 화면에서 넘겨준 인식 결과
  const draft = getDraft();

  const listRef = useRef<FlatList>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);

  // 첫 답변으로 받은 증상은 방문 사유로 저장한다
  const [visitReason, setVisitReason] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'greet',
      role: 'bot',
      text: [
        `안녕하세요! ${user?.nickname ?? ''}님의 복약을 돕는 ${BOT_NAME}입니다:)`,
        draft ? `${draft.visitedAt}에 ${draft.hospitalName}을 방문하셨네요.` : '',
        '어떤 증상으로 방문하셨나요?',
      ].filter(Boolean).join('\n'),
      time: nowTime(),
    },
  ]);

  // 처방전 화면을 거치지 않고 들어오면 이어갈 수 있는 게 없다
  useEffect(() => {
    if (!draft) {
      Alert.alert('처방전 정보 없음', '처방전 등록을 다시 시작해주세요.', [
        { text: '확인', onPress: () => router.replace('/(tabs)') },
      ]);
    }
  }, [draft, router]);

  const append = (items: ChatMessage[]) => {
    setMessages((prev) => [...prev, ...items]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !draft || sending) return;

    setInput('');
    const userMessage: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text,
      time: nowTime(),
    };
    append([userMessage]);

    // 첫 답변을 방문 사유로 삼는다
    if (visitReason == null) setVisitReason(text);

    setSending(true);
    try {
      const answer = await chatApi.send(draft.visitId, text);
      append([{
        id: `b_${answer.id}`,
        role: 'bot',
        text: answer.content,
        time: nowTime(),
      }]);
    } catch (e) {
      const message = e instanceof Error ? e.message : '답변을 받지 못했습니다.';
      append([{ id: `b_err_${Date.now()}`, role: 'bot', text: message, time: nowTime() }]);
    } finally {
      setSending(false);
    }
  };

  const handleSave = async () => {
    if (!draft || saving) return;

    setSaving(true);
    try {
      const days = maxDuration(draft.medications.map((m) => m.durationDays));
      const startDate = toLocalDate();
      const endDate = addDays(startDate, days - 1);

      // 1) OCR로 확인된 병원 정보와 증상으로 방문 기록을 채운다
      await visitApi.update(draft.visitId, {
        hospitalName: draft.hospitalName,
        departmentName: draft.departmentName,
        visitedAt: draft.visitedAt,
        visitReason,
        medicationStartDate: startDate,
        medicationEndDate: endDate,
      });

      // 2) 처방전과 약 목록을 확정한다
      const medications: MedicationRequest[] = draft.medications.map((m) => ({
        medicationName: m.medicationName,
        dosage: m.dosage,
        doseUnit: m.doseUnit,
        frequencyPerDay: m.frequencyPerDay,
        durationDays: m.durationDays,
        instructions: m.instructions,
        purpose: m.purpose,
        sideEffectSummary: m.sideEffectSummary,
      }));

      const prescription = await prescriptionApi.create(draft.visitId, {
        imageUrl: null,
        rawOcrText: draft.rawOcrText,
        medications,
      });

      // 3) 약마다 복약 일정을 만들어 둔다 — 복약 체크 화면이 이걸 읽는다
      await Promise.all(
        prescription.medications.map((med) => {
          const perDay = med.frequencyPerDay ?? 1;
          const duration = med.durationDays ?? days;
          return doseApi.createDoses(med.id, {
            startDate,
            endDate: addDays(startDate, Math.max(1, duration) - 1),
            times: defaultDoseTimes(perDay),
          });
        }),
      );

      clearDraft();
      router.replace('/(tabs)');
    } catch (e) {
      const message = e instanceof Error ? e.message : '저장에 실패했습니다.';
      Alert.alert('저장 실패', message);
    } finally {
      setSaving(false);
    }
  };

  const canSave = visitReason != null;

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
          renderItem={({ item }) => <ChatBubble message={item} botName={BOT_NAME} />}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListFooterComponent={sending ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={styles.typing} />
          ) : null}
        />

        {/* 대화가 끝나면 저장으로 이어진다 */}
        {canSave && (
          <View style={styles.saveWrap}>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnOff]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator size="small" color={COLORS.white} />
                : <Text style={styles.saveBtnText}>처방전 저장하기</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* 입력창 */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={visitReason == null ? '증상을 입력하세요...' : '메시지를 입력하세요...'}
            placeholderTextColor={COLORS.textPlaceholder}
            value={input}
            onChangeText={setInput}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnOff]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
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
  typing: { alignSelf: 'flex-start', marginTop: SPACING.xs },

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
  saveBtnOff: { opacity: 0.6 },
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
