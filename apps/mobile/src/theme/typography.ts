// LUMA typography system — ultra-premium geometric sans-serif
// Uses native system fonts: SF Pro (iOS) / Roboto (Android)
// includeFontPadding: false globally to eliminate Android text clipping

import { Platform, TextStyle } from 'react-native';

const fontFamily = Platform.select({
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
  // ── Headlines — bold, tight, commanding ──
  h1: {
    fontFamily,
    fontSize: fontSizes['4xl'],
    lineHeight: lineHeights['4xl'],
    fontWeight: fontWeights.bold,
    ...androidFix,
  },
  h2: {
    fontFamily,
    fontSize: fontSizes['3xl'],
    lineHeight: lineHeights['3xl'],
    fontWeight: fontWeights.bold,
    ...androidFix,
  },
  h3: {
    fontFamily,
    fontSize: fontSizes['2xl'],
    lineHeight: lineHeights['2xl'],
    fontWeight: fontWeights.semibold,
    ...androidFix,
  },
  h4: {
    fontFamily,
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
    fontWeight: fontWeights.semibold,
    ...androidFix,
  },

  // ── Body — clean, readable ──
  bodyLarge: {
    fontFamily,
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    fontWeight: fontWeights.regular,
    ...androidFix,
  },
  body: {
    fontFamily,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    fontWeight: fontWeights.regular,
    ...androidFix,
  },
  bodySmall: {
    fontFamily,
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.regular,
    ...androidFix,
  },

  // ── Captions — light weight for minimalist contrast ──
  caption: {
    fontFamily,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    fontWeight: fontWeights.regular,
    ...androidFix,
  },
  captionSmall: {
    fontFamily,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontWeight: fontWeights.regular,
    ...androidFix,
  },

  // ── UI elements ──
  button: {
    fontFamily,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    fontWeight: fontWeights.semibold,
    ...androidFix,
  },
  buttonSmall: {
    fontFamily,
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.semibold,
    ...androidFix,
  },
  label: {
    fontFamily,
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.medium,
    ...androidFix,
  },
  tabBar: {
    fontFamily,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontWeight: fontWeights.medium,
    ...androidFix,
  },

  // ── Premium subtitle — uppercase, tracked, light ──
  subtitle: {
    fontFamily,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontWeight: fontWeights.semibold,
    letterSpacing: 1.5,
    ...androidFix,
  },
} as const;

export type TypographyVariant = keyof typeof typography;
