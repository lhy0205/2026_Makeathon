export const COLORS = {
  // Brand
  primary: '#2A6FBF',
  primaryLight: '#4A8FDF',
  primaryDark: '#1A4F8F',
  secondary: '#5BA4E6',

  // UI Neutrals
  white: '#FFFFFF',
  background: '#f5F7FA',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  inputBg: '#F0F4F8',

  // Text
  textPrimary: '#1A2233',
  textSecondary: '#6B7A99',
  textPlaceholder: '#A0AABF',

  // Semantic
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#5BA4E6',

  // Calendar
  calToday: '#2A6FBF',
  calSelected: '#EBF3FF',
  calDot: '#FF6B6B',
  calSunday: '#FF3B30',
  calSaturday: '#2A6FBF',

  // OCR result
  ocrBorder: '#CBD5E0',
  ocrLabel: '#4A5568',
} as const;

export const TYPOGRAPHY = {
  // Font sizes
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

export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#2A6FBF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  lg: {
    shadowColor: '#2A6FBF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
} as const;
