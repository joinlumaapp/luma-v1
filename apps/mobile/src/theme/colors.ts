// LUMA brand color palette

export const palette = {
  // Primary
  purple: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
  },
  // Secondary
  pink: {
    50: '#FDF2F8',
    100: '#FCE7F3',
    200: '#FBCFE8',
    300: '#F9A8D4',
    400: '#F472B6',
    500: '#EC4899',
    600: '#DB2777',
    700: '#BE185D',
    800: '#9D174D',
    900: '#831843',
  },
  // Accent
  gold: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },
  // Neutrals
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  // Functional
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  // Status
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
} as const;

export const darkTheme = {
  primary: palette.purple[500],
  primaryLight: palette.purple[400],
  primaryDark: palette.purple[700],
  secondary: palette.pink[500],
  secondaryLight: palette.pink[400],
  secondaryDark: palette.pink[700],
  accent: palette.gold[500],
  accentLight: palette.gold[400],
  accentDark: palette.gold[700],
  background: '#08080F',
  backgroundSecondary: '#0E0E1A',
  surface: '#141422',
  surfaceLight: '#1C1C32',
  surfaceBorder: '#252540',
  card: '#12121F',
  inputBg: '#1A1A2E',
  text: palette.white,
  textSecondary: palette.gray[400],
  textTertiary: palette.gray[500],
  textInverse: palette.gray[900],
  border: '#222238',
  divider: '#1A1A2E',
  overlay: 'rgba(0, 0, 0, 0.6)',
  statusBar: 'light-content' as const,
  success: palette.success,
  error: palette.error,
  warning: palette.warning,
  info: palette.info,
  tabBarBackground: '#08080F',
  tabBarBorder: '#0E0E1A',
  tabBarActive: palette.purple[500],
  tabBarInactive: palette.gray[500],
  gradientPrimary: ['#9B6BF8', '#EC4899'] as readonly string[],
  gradientSecondary: ['#8B5CF6', '#5B21B6'] as readonly string[],
  gradientGold: [palette.gold[400], palette.gold[600]] as readonly string[],
};

export const lightTheme = {
  primary: palette.purple[500],
  primaryLight: palette.purple[300],
  primaryDark: palette.purple[700],
  secondary: palette.pink[500],
  secondaryLight: palette.pink[300],
  secondaryDark: palette.pink[700],
  accent: palette.gold[500],
  accentLight: palette.gold[300],
  accentDark: palette.gold[700],
  background: palette.gray[50],
  backgroundSecondary: palette.white,
  surface: palette.white,
  surfaceLight: palette.gray[50],
  surfaceBorder: palette.gray[200],
  card: palette.white,
  inputBg: palette.gray[100],
  text: palette.gray[900],
  textSecondary: palette.gray[600],
  textTertiary: palette.gray[400],
  textInverse: palette.white,
  border: palette.gray[200],
  divider: palette.gray[100],
  overlay: 'rgba(0, 0, 0, 0.4)',
  statusBar: 'dark-content' as const,
  success: palette.success,
  error: palette.error,
  warning: palette.warning,
  info: palette.info,
  tabBarBackground: palette.white,
  tabBarBorder: palette.gray[200],
  tabBarActive: palette.purple[500],
  tabBarInactive: palette.gray[400],
  gradientPrimary: [palette.purple[500], palette.pink[400]] as readonly string[],
  gradientSecondary: [palette.purple[400], palette.purple[700]] as readonly string[],
  gradientGold: [palette.gold[300], palette.gold[500]] as readonly string[],
};

export type ThemeColors = {
  [K in keyof typeof darkTheme]: K extends 'statusBar'
    ? 'light-content' | 'dark-content'
    : (typeof darkTheme)[K] extends readonly string[]
      ? readonly string[]
      : string;
};

// Aliases for theme context usage
export const darkColors: ThemeColors = darkTheme;
export const lightColors: ThemeColors = lightTheme;

// Theme mode type
export type ThemeMode = 'light' | 'dark' | 'system';

// Glassmorphism design tokens
export const glassmorphism = {
  bg: 'rgba(20, 20, 34, 0.7)',
  bgLight: 'rgba(28, 28, 50, 0.5)',
  bgDark: 'rgba(8, 8, 15, 0.85)',
  border: 'rgba(139, 92, 246, 0.15)',
  borderActive: 'rgba(139, 92, 246, 0.35)',
  borderGold: 'rgba(251, 191, 36, 0.25)',
} as const;

// Default theme is dark (backwards compatible)
export const colors: ThemeColors = darkTheme;
