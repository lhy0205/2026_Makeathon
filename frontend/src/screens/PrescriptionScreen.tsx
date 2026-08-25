import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
import { MOCK_USER } from '../constants/mockData';
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from '../constants/theme';
import type { HomeStackParamList, OcrResult } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'Prescription'>;
};

type ScanState = 'idle' | 'scanning' | 'done';

const pad = (n: number) => String(n).padStart(2, '0');
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// TODO: prescriptionApi.scan() 으로 교체.
//       병원명·진료과·날짜까지 OCR이 인식하므로 사용자가 손으로 넣을 값은 없다.
async function mockOcrAnalyze(imageUri: string): Promise<OcrResult> {
  await new Promise((r) => setTimeout(r, 1500)); // 1.5초 딜레이 시뮬레이션
  return {
    patientName: MOCK_USER.name,
    date: todayStr(),
    hospital: '서울피부과의원',
    medications: '메디론정 4mg, 세티리진정 10mg',
  };
}

export default function PrescriptionScreen({ navigation }: Props) {
  const router = useRouter();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);

  // 갤러리에서 사진 선택
  const handlePickImage = async () => {
    // 갤러리 접근 권한 요청
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진 접근 권한이 필요합니다.\n설정에서 허용해주세요.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) return;

    const uri = result.assets[0].uri;
    setImageUri(uri);
    setScanState('scanning');
    setOcrResult(null);

    try {
      // OCR 분석 (현재는 mock, 실제 API 연동 시 prescriptionApi.scan() 호출)
      const ocr = await mockOcrAnalyze(uri);
      setOcrResult(ocr);
      setScanState('done');
    } catch {
      setScanState('idle');
      Alert.alert('인식 실패', '처방전을 인식하지 못했습니다. 다시 시도해주세요.');
    }
  };

  const handleRetake = () => {
    setScanState('idle');
    setImageUri(null);
    setOcrResult(null);
  };

  // 저장은 대화 뒤에 한다. 여기서는 인식 결과만 들고 다음 단계로 넘긴다
  const handleConfirm = () => {
    router.push({
      pathname: '/register-chat',
      params: {
        hospital: ocrResult?.hospital ?? '',
        date: ocrResult?.date ?? '',
      },
    });
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
          <TouchableOpacity onPress={() => navigation.goBack()}>
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
        <OcrResultForm
          result={ocrResult}
          scanning={scanState === 'scanning'}
          onChangeResult={setOcrResult}
          editable={scanState === 'done'}
        />

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
