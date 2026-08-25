import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import type { OcrResult } from '../types';

interface Props {
  result: OcrResult | null;       // null이면 빈칸 표시
  scanning?: boolean;             // OCR 인식 중 로딩
  onChangeResult?: (updated: OcrResult) => void;
  editable?: boolean;
  /**
   * 손으로 고칠 수 있는 항목만 추린다. 지정하지 않으면 editable이 전부에 적용된다.
   */
  editableKeys?: (keyof OcrResult)[];
  /**
   * 보여줄 항목. 지정하지 않으면 전부 보여준다.
   * 약 목록은 MedicationEditor가 따로 다루므로 그때는 여기서 뺀다.
   */
  visibleKeys?: (keyof OcrResult)[];
}

const EMPTY_RESULT: OcrResult = {
  patientName: '',
  date: '',
  hospital: '',
  medications: '',
};

const FIELD_LABELS: { key: keyof OcrResult; label: string; multiline?: boolean; placeholder: string }[] = [
  { key: 'patientName', label: '이름',   placeholder: '인식된 이름이 표시됩니다' },
  { key: 'date',        label: '날짜',   placeholder: '인식된 날짜가 표시됩니다' },
  { key: 'hospital',    label: '병원',   placeholder: '인식된 병원명이 표시됩니다' },
  { key: 'medications', label: '약정보', placeholder: '인식된 약 정보가 표시됩니다', multiline: true },
];

export default function OcrResultForm({
  result,
  scanning = false,
  onChangeResult,
  editable = false,
  editableKeys,
  visibleKeys,
}: Props) {
  const data = result ?? EMPTY_RESULT;

  const canEdit = (key: keyof OcrResult) =>
    editable && !scanning && (editableKeys ? editableKeys.includes(key) : true);

  const handleChange = (key: keyof OcrResult, value: string) => {
    onChangeResult?.({ ...data, [key]: value });
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.sectionTitle}>OCR 인식 정보</Text>
        {scanning && (
          <View style={styles.scanningBadge}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.scanningText}>인식 중...</Text>
          </View>
        )}
      </View>

      {FIELD_LABELS
        .filter(({ key }) => !visibleKeys || visibleKeys.includes(key))
        .map(({ key, label, multiline, placeholder }) => (
        <View key={key} style={styles.fieldRow}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={[styles.valueInput, multiline && styles.multiline]}
            value={data[key]}
            onChangeText={(v) => handleChange(key, v)}
            editable={canEdit(key)}
            multiline={multiline}
            numberOfLines={multiline ? 3 : 1}
            placeholder={placeholder}
            placeholderTextColor={COLORS.textPlaceholder}
          />
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textPrimary,
  },
  scanningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.round,
  },
  scanningText: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.semibold,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.xs,
  },
  label: {
    width: 44,
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.ocrLabel,
    paddingTop: 8,
  },
  valueInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.ocrBorder,
    minHeight: 36,
  },
  multiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
});
