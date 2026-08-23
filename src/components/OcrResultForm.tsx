import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "../constants/theme";
import type { OcrResult } from "../types";

interface Props {
  result: OcrResult;
  onChangeResult?: (updated: OcrResult) => void;
  editable?: boolean;
}

const FIELD_LABELS: Array<{ key: keyof OcrResult; label: string; multiline?: boolean }> = [
  { key: 'patientName', label: '이름' },
  { key: 'date', label: '날짜' },
  { key: 'hospital', label: '병원' },
  { key: 'medications', label: '약정보', multiline: true },
];

export default function OcrResultForm({ result, onChangeResult, editable = false }: Props) {
  const handleChange = (key: keyof OcrResult, value: string) => {
    onChangeResult?.({ ...result, [key]: value });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>OCR 인식 정보</Text>

      {FIELD_LABELS.map(({ key, label, multiline }) => (
        <View key={key} style={styles.fieldRow}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={[styles.valueInput, multiline && styles.multiline]}
            value={result[key]}
            onChangeText={(v) => handleChange(key, v)}
            editable={editable}
            multiline={multiline}
            numberOfLines={multiline ? 3 : 1}
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
  sectionTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBlockColor: COLORS.border,
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
