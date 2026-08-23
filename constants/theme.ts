// ─────────────────────────────────────────────
//  Medi-Link Design Tokens
// ─────────────────────────────────────────────

export const COLORS = {
  // Brand — 원본 이미지 기준 밝은 코발트 블루
  primary: '#3D8EE8',       // 메인 블루 (버튼, 오늘 날짜 원, 로고)
  primaryLight: '#62A8F0',  // 연한 블루 (아이콘 상단)
  primaryDark: '#2070C8',   // 진한 블루 (아이콘 하단, 강조)
  secondary: '#7BBCF5',     // 더 연한 블루 (보조)

  // UI Neutrals
  white: '#FFFFFF',
  background: '#F2F4F7',    // 앱 배경 (약간 회색빛)
  surface: '#FFFFFF',       // 카드/시트 배경
  border: '#E0E5ED',        // 구분선
  inputBg: '#F5F7FA',       // 인풋 필드 배경

  // Text — 원본은 순수 검정에 가까운 텍스트
  textPrimary: '#111827',   // 본문 텍스트 (거의 검정)
  textSecondary: '#6B7280', // 보조 텍스트 (중간 회색)
  textPlaceholder: '#9CA3AF',

  // Semantic
  success: '#34C759',
  warning: '#FF9500',
  error: '#EF4444',
  info: '#3D8EE8',

  // Calendar — 원본 기준
  calToday: '#3D8EE8',      // 오늘 날짜 원 (밝은 블루)
  calSelected: '#EBF4FF',
  calDot: '#F87171',        // 복약 표시 점 (연한 빨강)
  calSunday: '#EF4444',     // 일요일 (선명한 빨강)
  calSaturday: '#3D8EE8',   // 토요일 (메인 블루)

  // OCR 결과 영역
  ocrBorder: '#D1D5DB',
  ocrLabel: '#374151',
} as const;

export const TYPOGRAPHY = {
  // Font sizes (sp)
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 36,

  // Line heights
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,

  // Font weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  round: 999,
} as const;

// 모든 화면 공통 SafeArea edges
export const SAFE_AREA_EDGES = {
  topOnly: ['top'] as const,
  topBottom: ['top', 'bottom'] as const,
} as const;

export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#3D8EE8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  lg: {
    shadowColor: '#3D8EE8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
} as const;