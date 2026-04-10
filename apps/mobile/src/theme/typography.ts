/**
 * LUMA Design System — Typography
 *
 * BOLD & THICK — premium feel. No thin text anywhere.
 * Minimum: fontWeight '500', fontSize 14.
 *
 * @module theme/typography
 */

import { Platform, TextStyle } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// Font Family — Poppins Weights
// ─────────────────────────────────────────────────────────────────────────────

export const poppinsFonts = {
  light: 'Poppins_500Medium',
  regular: 'Poppins_600SemiBold',
  medium: 'Poppins_600SemiBold',
  semibold: 'Poppins_700Bold',
  bold: 'Poppins_800ExtraBold',
  extrabold: 'Poppins_800ExtraBold',
  black: 'Poppins_900Black',
} as const;

/** Fallback system fonts (used before Poppins loads) */
const systemFont = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

/** Android text clipping fix — applied to every text preset */
const androidFix: TextStyle = Platform.select({
  android: { includeFontPadding: false },
  default: {},
}) as TextStyle;

// ─────────────────────────────────────────────────────────────────────────────
// Font Weights — BOLD system, no thin text
// ─────────────────────────────────────────────────────────────────────────────

export const fontWeights = {
  light: '500' as const,
  regular: '600' as const,
  medium: '600' as const,
  semibold: '700' as const,
  bold: '800' as const,
  extrabold: '800' as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// Font Size Scale — Larger, more readable
// ─────────────────────────────────────────────────────────────────────────────

export const fontSizes = {
  /** 14px — Micro labels, badge counts (minimum allowed) */
  xs: 14,
  /** 15px — Captions, timestamps, helper text */
  sm: 15,
  /** 16px — Body small, secondary text */
  md: 16,
  /** 17px — Body default, primary readable text */
  base: 17,
  /** 20px — Body large, emphasized content */
  lg: 20,
  /** 22px — Subtitle, section headers (h4) */
  xl: 22,
  /** 24px — Title h3, screen sub-headers */
  '2xl': 24,
  /** 28px — Title h2 */
  '3xl': 28,
  /** 34px — Display h1, screen headers */
  '4xl': 34,
  /** 42px — Hero display, onboarding headlines */
  '5xl': 42,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Line Heights
// ─────────────────────────────────────────────────────────────────────────────

export const lineHeights = {
  xs: 20,
  sm: 22,
  md: 24,
  base: 26,
  lg: 28,
  xl: 30,
  '2xl': 32,
  '3xl': 36,
  '4xl': 42,
  '5xl': 52,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Letter Spacing
// ─────────────────────────────────────────────────────────────────────────────

export const letterSpacing = {
  tight: -0.5,
  snug: -0.3,
  normal: 0,
  wide: 0.25,
  wider: 0.5,
  widest: 1.5,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Typography Presets
// ─────────────────────────────────────────────────────────────────────────────

export const typography = {
  // ── Display — Hero text ──
  display: {
    fontFamily: poppinsFonts.extrabold,
    fontSize: fontSizes['5xl'],
    lineHeight: lineHeights['5xl'],
    fontWeight: fontWeights.extrabold,
    letterSpacing: letterSpacing.tight,
    ...androidFix,
  },

  // ── Headlines — h1-h4 all use '800' weight, tight spacing ──
  h1: {
    fontFamily: poppinsFonts.bold,
    fontSize: fontSizes['4xl'],
    lineHeight: lineHeights['4xl'],
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacing.tight,
    ...androidFix,
  },
  h2: {
    fontFamily: poppinsFonts.bold,
    fontSize: fontSizes['3xl'],
    lineHeight: lineHeights['3xl'],
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacing.tight,
    ...androidFix,
  },
  h3: {
    fontFamily: poppinsFonts.bold,
    fontSize: fontSizes['2xl'],
    lineHeight: lineHeights['2xl'],
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacing.tight,
    ...androidFix,
  },
  h4: {
    fontFamily: poppinsFonts.semibold,
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacing.snug,
    ...androidFix,
  },

  // ── Body — '600' weight, 17px minimum ──
  bodyLarge: {
    fontFamily: poppinsFonts.medium,
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    fontWeight: fontWeights.medium,
    ...androidFix,
  },
  body: {
    fontFamily: poppinsFonts.medium,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    fontWeight: fontWeights.medium,
    ...androidFix,
  },
  bodySmall: {
    fontFamily: poppinsFonts.medium,
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.medium,
    ...androidFix,
  },

  // ── Captions — '500' weight, 15px minimum ──
  caption: {
    fontFamily: poppinsFonts.light,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    fontWeight: fontWeights.light,
    ...androidFix,
  },
  captionSmall: {
    fontFamily: poppinsFonts.light,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontWeight: fontWeights.light,
    ...androidFix,
  },

  // ── UI Elements ──
  button: {
    fontFamily: poppinsFonts.semibold,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacing.wider,
    ...androidFix,
  },
  buttonSmall: {
    fontFamily: poppinsFonts.medium,
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacing.wide,
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
    fontFamily: poppinsFonts.light,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontWeight: fontWeights.light,
    ...androidFix,
  },

  // ── Special ──
  subtitle: {
    fontFamily: poppinsFonts.medium,
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacing.snug,
    ...androidFix,
  },
  elegant: {
    fontFamily: poppinsFonts.light,
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.light,
    letterSpacing: letterSpacing.wide,
    ...androidFix,
  },
  numeric: {
    fontFamily: poppinsFonts.bold,
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    fontWeight: fontWeights.bold,
    ...androidFix,
  },
  numericLarge: {
    fontFamily: poppinsFonts.bold,
    fontSize: fontSizes['3xl'],
    lineHeight: lineHeights['3xl'],
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacing.normal,
    ...androidFix,
  },
} as const;

/** System font fallback (for use before fonts load) */
export const systemFontFamily = systemFont;

export type TypographyVariant = keyof typeof typography;
