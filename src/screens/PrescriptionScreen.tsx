import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import OcrResultForm from '../components/OcrResultForm';
import { MOCK_OCR_RESULT } from "../constants/mockData";
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "../constants/theme";
import type { HomeStackParamList, OcrResult } from "../types";

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'Prescription'>;
};

type ScanState = 'idle' | 'scanning' | 'done';

export default function PrescriptionScreen({ navigation }: Props) {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);

  const handleScan = () => {
    setScanState('scanning');
    setTimeout(() => {
      setOcrResult(MOCK_OCR_RESULT);
      setScanState('done');
    }, 1000);
  };

  const handleRetake = () => {
    setScanState('idle');
    setOcrResult(null);
  };

  const handleConfirm = () => {
    Alert.alert(
      '처방전 등록 완료',
      `${ocrResult?.hospital} 처방전이 등록되었습니다.`,
      [
        {
          text: '확인',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <Text style={styles.pageTitle}>처방전 불러오기</Text>

      <TouchableOpacity
        style={[
          styles.scanArea,
          scanState === 'scanning' && styles.scanAreaActive,
          scanState === 'done' && styles.scanAreaDone,
        ]}
        onPress={handleScan}
        activeOpacity={0.8}
        disabled={scanState !== 'idle'}
      >
        {scanState === 'idle' && (
          <>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            <Text style={styles.scanPlusIcon}>+</Text>
            <Text style={styles.scanHint}>탭하여 사진 업로드</Text>
          </>
        )}
        {scanState === 'scanning' && (
          <Text style={styles.scanningText}>인식 중...</Text>
        )}
        {scanState === 'done' && (
          <Text style={styles.scanDoneText}>인식 완료</Text>
        )}
      </TouchableOpacity>

      {ocrResult && (
        <OcrResultForm
          result={ocrResult}
          onChangeResult={setOcrResult}
          editable={true}
        />
      )}

      {scanState === 'done' && (
        <View style={styles.bottunRow}>
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={handleRetake}
            activeOpacity={0.8}
          >
            <Text style={styles.retakeButtonText}>재촬영</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirm}
            activeOpacity={0.85}
          >
            <Text style={styles.confirmButtonText}>확인</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;
const CORNER_COLOR = COLORS.primary;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.base,
    gap: SPACING.base,
    paddingBottom: SPACING.xxxl,
  },

  pageTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    paddingTop: SPACING.sm,
  },

  scanArea: {
    height: 220,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    position: 'relative',
    ...SHADOW.sm,
  },
  scanAreaActive: {
    borderColor: COLORS.primary,
    borderStyle: 'solid',
  },
  scanAreaDone: {
    borderColor: COLORS.success,
    borderStyle: 'solid',
    backgroundColor: COLORS.success + '0A',
  },

  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: CORNER_COLOR,
  },
  cornerTL: {
    top: 16,
    left: 16,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 16,
    right: 16,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 16,
    left: 16,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 16,
    right: 16,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 4,
  },
  scanPlusIcon: {
    fontSize: 40,
    color: COLORS.textPlaceholder,
    marginBottom: SPACING.sm,
  },
  scanHint: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
  },
  scanningText: {
    fontSize: TYPOGRAPHY.md,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.semibold,
  },
  scanDoneText: {
    fontSize: TYPOGRAPHY.md,
    color: COLORS.success,
    fontWeight: TYPOGRAPHY.semibold,
  },

  bottunRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  retakeButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  retakeButtonText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.primary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    ...SHADOW.md,
  },
  confirmButtonText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.white,
  },
});
