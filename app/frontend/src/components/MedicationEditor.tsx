// ─────────────────────────────────────────────
//  MedicationEditor — 인식된 약 목록을 확인하고 고친다
//
//  OCR이 가장 자주 틀리는 게 약 이름이다. 여기서 못 고치면
//  틀린 이름이 그대로 저장되고, 복약 알림에도 틀린 이름이 뜬다.
//
//  지식베이스에 없는 약(unmatched)을 붉게 표시하던 것은 뺐다.
//  처방되는 약의 상당수가 전문의약품이라 우리 지식베이스에 없을 뿐인데,
//  이름이 맞는데도 경고가 뜨는 일이 잦아 도움이 되지 않았다.
//  이름은 언제든 고칠 수 있으므로 편집 자체는 그대로 둔다.
// ─────────────────────────────────────────────
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import type { AnalyzedMedication } from '../types/Api';

interface Props {
  medications: AnalyzedMedication[];
  onChange: (next: AnalyzedMedication[]) => void;
  editable?: boolean;
}

/** 빈 문자열은 값 없음으로 본다 — 서버는 null을 받는다 */
const toNumber = (text: string): number | null => {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
};

const toText = (value: number | null): string => (value == null ? '' : String(value));

/** 숫자 칸 하나 */
function NumberField({
  label, value, unit, editable, onChange,
}: {
  label: string;
  value: number | null;
  unit?: string;
  editable: boolean;
  onChange: (next: number | null) => void;
}) {
  return (
    <View style={styles.numberField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.numberRow}>
        <TextInput
          style={[styles.numberInput, !editable && styles.inputReadonly]}
          value={toText(value)}
          onChangeText={(text) => onChange(toNumber(text))}
          editable={editable}
          keyboardType="numeric"
          placeholder="—"
          placeholderTextColor={COLORS.textPlaceholder}
        />
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

export default function MedicationEditor({ medications, onChange, editable = true }: Props) {
  const patch = (index: number, changes: Partial<AnalyzedMedication>) => {
    onChange(medications.map((m, i) => (i === index ? { ...m, ...changes } : m)));
  };

  const remove = (index: number) => {
    onChange(medications.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      <View style={styles.head}>
        <Text style={styles.title}>약 정보</Text>
        <Text style={styles.count}>{medications.length}종</Text>
      </View>

      {medications.length === 0 && (
        <Text style={styles.empty}>인식된 약이 없습니다. 사진을 다시 올려주세요.</Text>
      )}

      {medications.map((med, index) => (
        // key에 약 이름을 넣으면 한 글자 칠 때마다 키가 바뀌어
        // 입력칸이 새로 마운트되고 포커스가 날아간다. 자리(index)만 쓴다.
        <View key={index} style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.fieldLabel}>약 이름</Text>
            {editable && medications.length > 1 && (
              <TouchableOpacity onPress={() => remove(index)} hitSlop={8}>
                <Text style={styles.remove}>삭제</Text>
              </TouchableOpacity>
            )}
          </View>

          <TextInput
            style={[styles.nameInput, !editable && styles.inputReadonly]}
            value={med.medicationName}
            onChangeText={(text) => patch(index, { medicationName: text })}
            editable={editable}
            placeholder="약 이름"
            placeholderTextColor={COLORS.textPlaceholder}
          />

          <View style={styles.numberRowWrap}>
            <NumberField
              label="1회 용량"
              value={med.dosage}
              unit={med.doseUnit ?? ''}
              editable={editable}
              onChange={(v) => patch(index, { dosage: v })}
            />
            <NumberField
              label="1일 횟수"
              value={med.frequencyPerDay}
              unit="회"
              editable={editable}
              onChange={(v) => patch(index, { frequencyPerDay: v })}
            />
            <NumberField
              label="복용 일수"
              value={med.durationDays}
              unit="일"
              editable={editable}
              onChange={(v) => patch(index, { durationDays: v })}
            />
          </View>

          {/* 서버가 찾아준 정보는 참고용으로만 보여준다 */}
          {med.purpose ? (
            <Text style={styles.info} numberOfLines={2}>💊 {med.purpose}</Text>
          ) : null}
          {med.instructions ? (
            <Text style={styles.info} numberOfLines={1}>🕐 {med.instructions}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    gap: SPACING.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textPrimary,
  },
  count: { fontSize: TYPOGRAPHY.xs, color: COLORS.textSecondary },

  empty: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: SPACING.base,
  },

  card: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    gap: SPACING.xs,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  remove: {
    marginLeft: 'auto',
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textSecondary,
  },

  fieldLabel: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.ocrLabel,
  },
  nameInput: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.medium,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.ocrBorder,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    minHeight: 38,
  },
  inputReadonly: { opacity: 0.6 },

  numberRowWrap: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  numberField: { flex: 1, gap: 2 },
  numberRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  numberInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.ocrBorder,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    minHeight: 34,
    textAlign: 'center',
  },
  unit: { fontSize: TYPOGRAPHY.xs, color: COLORS.textSecondary },

  info: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
});
