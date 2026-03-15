// LUMA typography system — Poppins premium geometric sans-serif
// Custom Google Font: Poppins (loaded via expo-font in App.tsx)
// Fallback to system fonts until fonts are loaded
// includeFontPadding: false globally to eliminate Android text clipping

import { Platform, TextStyle } from 'react-native';

// Poppins font family mapping — each weight has its own font name
// React Native doesn't support numeric fontWeight with custom fonts,
// so we use explicit font names per weight.
export const poppinsFonts = {
  light: 'Poppins_300Light',
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  extrabold: 'Poppins_800ExtraBold',
  black: 'Poppins_900Black',
} as const;

// Fallback system fonts (used before Poppins loads)
const systemFont = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

// Android clipping fix — applied to every text preset
const androidFix: TextStyle = Platform.select({
  android: { includeFontPadding: false },
  default: {},
}) as TextStyle;

export const fontWeights = {
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const fontSizes = {
  xs: 10,
  sm: 12,
  md: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const;

// Line heights: minimum 1.4x ratio to prevent descender clipping
export const lineHeights = {
  xs: 16,
  sm: 18,
  md: 22,
  base: 24,
  lg: 28,
  xl: 30,
  '2xl': 34,
  '3xl': 42,
  '4xl': 50,
  '5xl': 64,
} as const;

export const typography = {
  // ── Headlines — bold, commanding, Poppins ──
  h1: {
    fontFamily: poppinsFonts.bold,
    fontSize: fontSizes['4xl'],
    lineHeight: lineHeights['4xl'],
    fontWeight: fontWeights.bold,
    ...androidFix,
  },
  h2: {
    fontFamily: poppinsFonts.bold,
    fontSize: fontSizes['3xl'],
    lineHeight: lineHeights['3xl'],
    fontWeight: fontWeights.bold,
    ...androidFix,
  },
  h3: {
    fontFamily: poppinsFonts.semibold,
    fontSize: fontSizes['2xl'],
    lineHeight: lineHeights['2xl'],
    fontWeight: fontWeights.semibold,
    ...androidFix,
  },
  h4: {
    fontFamily: poppinsFonts.semibold,
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
    fontWeight: fontWeights.semibold,
    ...androidFix,
  },

  // ── Body — clean, readable, medium weight for better presence ──
  bodyLarge: {
    fontFamily: poppinsFonts.medium,
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    fontWeight: fontWeights.medium,
    ...androidFix,
  },
  body: {
    fontFamily: poppinsFonts.regular,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    fontWeight: fontWeights.regular,
    ...androidFix,
  },
  bodySmall: {
    fontFamily: poppinsFonts.regular,
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.regular,
    ...androidFix,
  },

  // ── Captions — light weight for minimalist contrast ──
  caption: {
    fontFamily: poppinsFonts.regular,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    fontWeight: fontWeights.regular,
    ...androidFix,
  },
  captionSmall: {
    fontFamily: poppinsFonts.regular,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontWeight: fontWeights.regular,
    ...androidFix,
  },

  // ── UI elements — semibold for strong tap targets ──
  button: {
    fontFamily: poppinsFonts.semibold,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    fontWeight: fontWeights.semibold,
    ...androidFix,
  },
  buttonSmall: {
    fontFamily: poppinsFonts.semibold,
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.semibold,
    ...androidFix,
  },
  label: {
    fontFamily: poppinsFonts.medium,
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.medium,
    ...androidFix,
  },
  tabBar: {
    fontFamily: poppinsFonts.medium,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontWeight: fontWeights.medium,
    ...androidFix,
  },

  // ── Premium subtitle — uppercase, tracked, semibold ──
  subtitle: {
    fontFamily: poppinsFonts.semibold,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontWeight: fontWeights.semibold,
    letterSpacing: 1.5,
    ...androidFix,
  },
} as const;

/** System font fallback (for use before fonts load) */
export const systemFontFamily = systemFont;

export type TypographyVariant = keyof typeof typography;
