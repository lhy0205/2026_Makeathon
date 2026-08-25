import { prescriptionApi, visitApi } from '@/src/api/Client';
import { useAuth } from '@/src/context/AuthContext';
import { setDraft } from '@/src/state/registrationDraft';
import { toLocalDate } from '@/src/utils/datetime';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OcrResultForm from '../components/OcrResultForm';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../constants/theme';
import type { AnalyzedMedication } from '../types/Api';
import type { OcrResult, ScreenNav } from '../types';

type Props = {
  navigation: ScreenNav;
};

type ScanState = 'idle' | 'scanning' | 'done';

/** 서버는 방문 기록이 있어야 처방전을 스캔해준다. 병원명은 인식 후 실제 값으로 덮어쓴다 */
const PLACEHOLDER_HOSPITAL = '처방전 분석 중';

/** 구조화된 약 목록 → 화면에 보여줄 한 줄 요약 */
function toMedicationText(medications: AnalyzedMedication[]): string {
  return medications
    .map((m) => [m.medicationName, m.dosage != null ? `${m.dosage}${m.doseUnit ?? ''}` : null]
      .filter(Boolean)
      .join(' '))
    .join(', ');
}

export default function PrescriptionScreen({ navigation }: Props) {
  const router = useRouter();
  const { user } = useAuth();

  const [scanState, setScanState] = useState<ScanState>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);

  // 스캔을 위해 미리 만들어 둔 방문 기록. 저장하지 않고 나가면 지운다
  const [visitId, setVisitId] = useState<number | null>(null);
  const [medications, setMedications] = useState<AnalyzedMedication[]>([]);
  const [rawOcrText, setRawOcrText] = useState<string | null>(null);
  const [storedImageUrl, setStoredImageUrl] = useState<string | null>(null);
  const [departmentName, setDepartmentName] = useState<string | null>(null);

  /** 스캔 대상 방문 기록을 확보한다. 재시도할 때는 이미 만든 것을 다시 쓴다 */
  const ensureVisit = async (): Promise<number> => {
    if (visitId != null) return visitId;
    const visit = await visitApi.create({
      hospitalName: PLACEHOLDER_HOSPITAL,
      departmentName: null,
      visitedAt: toLocalDate(),
      visitReason: null,
      medicationStartDate: null,
      medicationEndDate: null,
    });
    setVisitId(visit.id);
    return visit.id;
  };

  // 갤러리에서 사진 선택 → 서버 OCR 분석
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진 접근 권한이 필요합니다.\n설정에서 허용해주세요.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) return;

    const uri = result.assets[0].uri;
    setImageUri(uri);
    setScanState('scanning');
    setOcrResult(null);

    try {
      const id = await ensureVisit();
      const analysis = await prescriptionApi.scan(id, uri);

      setMedications(analysis.medications);
      setRawOcrText(analysis.rawOcrText);
      setStoredImageUrl(analysis.imageUrl);
      setDepartmentName(analysis.departmentName);
      setOcrResult({
        patientName: user?.nickname ?? '',
        date: toLocalDate(),
        hospital: analysis.hospitalName ?? '',
        medications: toMedicationText(analysis.medications),
      });
      setScanState('done');
    } catch (e) {
      setScanState('idle');
      const message = e instanceof Error ? e.message : '처방전을 인식하지 못했습니다.';
      Alert.alert('인식 실패', `${message}\n다시 시도해주세요.`);
    }
  };

  const handleRetake = () => {
    setScanState('idle');
    setImageUri(null);
    setOcrResult(null);
    setMedications([]);
    setRawOcrText(null);
    setStoredImageUrl(null);
    setDepartmentName(null);
    // visitId는 그대로 둔다 — 다음 사진도 같은 방문 기록에 붙인다
  };

  /** 저장하지 않고 나가면 임시로 만든 방문 기록을 정리한다 */
  const handleBack = async () => {
    if (visitId != null) {
      try {
        await visitApi.delete(visitId);
      } catch {
        // 지우지 못해도 사용자를 붙잡아 둘 이유는 없다
      }
    }
    navigation.goBack?.();
  };

  // 저장은 대화 뒤에 한다. 여기서는 인식 결과만 들고 다음 단계로 넘긴다
  const handleConfirm = () => {
    if (visitId == null || !ocrResult) return;

    setDraft({
      visitId,
      hospitalName: ocrResult.hospital.trim() || PLACEHOLDER_HOSPITAL,
      departmentName,
      visitedAt: ocrResult.date || toLocalDate(),
      rawOcrText,
      imageUrl: storedImageUrl,
      medications,
      imageUri,
    });

    router.push('/register-chat');
  };

  const ready = scanState === 'done';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 — 홈과 동일한 스타일 */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleBack}>
            <Text style={styles.backBtnText}>{'< 이전'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>처방전 불러오기</Text>
          <View style={{ width: 48 }} />
        </View>

        {/* 이미지 업로드 영역 */}
        <TouchableOpacity
          style={[
            styles.uploadArea,
            scanState === 'scanning' && styles.uploadAreaScanning,
            scanState === 'done' && styles.uploadAreaDone,
          ]}
          onPress={handlePickImage}
          activeOpacity={0.8}
          disabled={scanState === 'scanning'}
        >
          {/* 선택된 이미지 미리보기 */}
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
          ) : (
            <>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              <Text style={styles.uploadIcon}>+</Text>
              <Text style={styles.uploadHint}>탭하여 갤러리에서 사진 선택</Text>
            </>
          )}
        </TouchableOpacity>

        {/* 갤러리 재선택 버튼 (이미지 선택 후) */}
        {imageUri && scanState !== 'scanning' && (
          <TouchableOpacity style={styles.rePickBtn} onPress={handlePickImage}>
            <Text style={styles.rePickBtnText}>다른 사진 선택</Text>
          </TouchableOpacity>
        )}

        {/* OCR 인식 정보 — 항상 표시, 인식 완료 시 자동 채워짐 */}
        {/* 약 정보는 서버가 구조화해 내려주므로 자유 입력으로 덮어쓰지 않는다 */}
        <OcrResultForm
          result={ocrResult}
          scanning={scanState === 'scanning'}
          onChangeResult={setOcrResult}
          editable={scanState === 'done'}
          editableKeys={['date', 'hospital']}
        />

        {ready && medications.length === 0 && (
          <Text style={styles.warnText}>
            약 정보를 읽지 못했습니다. 사진을 다시 찍어 올려주세요.
          </Text>
        )}

        {/* 다시 선택 */}
        {ready && (
          <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake} activeOpacity={0.8}>
            <Text style={styles.retakeBtnText}>다시 선택</Text>
          </TouchableOpacity>
        )}

        {/* 완료 — 사진을 올려 인식이 끝나야 눌린다 */}
        <TouchableOpacity
          style={[styles.confirmBtn, !ready && styles.confirmBtnOff]}
          onPress={handleConfirm}
          disabled={!ready}
          activeOpacity={0.85}
        >
          <Text style={[styles.confirmBtnText, !ready && styles.confirmBtnTextOff]}>다음</Text>
        </TouchableOpacity>
        {!ready && (
          <Text style={styles.confirmHint}>처방전 사진을 올리면 다음으로 넘어갈 수 있어요</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  content: {
    padding: SPACING.base,
    gap: SPACING.base,
    paddingBottom: SPACING.xxxl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  backBtnText: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.semibold,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },

  // 업로드 영역
  uploadArea: {
    height: 220,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    position: 'relative',
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  uploadAreaScanning: {
    borderColor: COLORS.primary,
    borderStyle: 'solid',
  },
  uploadAreaDone: {
    borderColor: COLORS.success,
    borderStyle: 'solid',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },

  // 모서리 프레임
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: COLORS.primary,
  },
  cornerTL: { top: 16, left: 16, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderTopLeftRadius: 4 },
  cornerTR: { top: 16, right: 16, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderTopRightRadius: 4 },
  cornerBL: { bottom: 16, left: 16, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 16, right: 16, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS, borderBottomRightRadius: 4 },
  uploadIcon: {
    fontSize: 40,
    color: COLORS.textPlaceholder,
    marginBottom: SPACING.sm,
  },
  uploadHint: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
  },

  // 다른 사진 선택 버튼
  rePickBtn: {
    alignSelf: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.base,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rePickBtnText: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
  },

  warnText: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.error,
    textAlign: 'center',
  },

  // 하단 버튼
  retakeBtn: {
    alignSelf: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  retakeBtnText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.primary,
  },
  confirmBtn: {
    paddingVertical: SPACING.base,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    ...SHADOW.md,
  },
  confirmBtnOff: {
    backgroundColor: COLORS.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmBtnText: {
    fontSize: TYPOGRAPHY.md,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  confirmBtnTextOff: { color: COLORS.textPlaceholder },
  confirmHint: {
    textAlign: 'center',
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textSecondary,
    marginTop: -SPACING.sm,
  },
});
