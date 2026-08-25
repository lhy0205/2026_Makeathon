import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../constants/theme';
import type { ChatMessage } from '../types';

/** 채팅 말풍선 한 개. 채팅 탭과 처방전 등록 대화가 함께 쓴다 */
export default function ChatBubble({
  message,
  botName,
}: {
  message: ChatMessage;
  botName: string;
}) {
  const isBot = message.role === 'bot';

  return (
    <View style={[styles.row, isBot ? styles.rowBot : styles.rowUser]}>
      {isBot && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>M</Text>
        </View>
      )}

      <View style={[styles.bubble, isBot ? styles.bubbleBot : styles.bubbleUser]}>
        {isBot && <Text style={styles.botName}>{botName}</Text>}
        <Text style={[styles.text, isBot ? styles.textBot : styles.textUser]}>
          {message.text}
        </Text>
        <Text style={[styles.time, isBot ? styles.timeBot : styles.timeUser]}>
          {message.time}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm },
  rowBot: { justifyContent: 'flex-start' },
  rowUser: { justifyContent: 'flex-end' },

  avatar: {
    width: 32, height: 32, borderRadius: RADIUS.round,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  avatarText: { fontSize: TYPOGRAPHY.sm, fontWeight: TYPOGRAPHY.bold, color: COLORS.white },

  bubble: { maxWidth: '75%', borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.xs },
  bubbleBot: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: RADIUS.sm,
    ...SHADOW.sm,
  },
  bubbleUser: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: RADIUS.sm,
  },
  botName: {
    fontSize: TYPOGRAPHY.xs, fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.primary, marginBottom: 2,
  },
  text: { fontSize: TYPOGRAPHY.sm, lineHeight: 20 },
  textBot: { color: COLORS.textPrimary },
  textUser: { color: COLORS.white },
  time: { fontSize: 10, marginTop: 2 },
  timeBot: { color: COLORS.textPlaceholder, textAlign: 'left' },
  timeUser: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
});
