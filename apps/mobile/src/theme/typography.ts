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
  light: '700' as const,
  regular: '700' as const,
  medium: '700' as const,
  semibold: '700' as const,
  bold: '800' as const,
  extrabold: '800' as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// Font Size Scale — Larger, more readable
// ─────────────────────────────────────────────────────────────────────────────

export const fontSizes = {
  /** 12px — Micro labels, badge counts */
  xs: 12,
  /** 13px — Captions, timestamps, helper text */
  sm: 13,
  /** 14px — Body small, secondary text */
  md: 14,
  /** 15px — Body default, primary readable text */
  base: 15,
  /** 17px — Body large, emphasized content */
  lg: 17,
  /** 20px — Subtitle, section headers (h4) */
  xl: 20,
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
  xs: 16,
  sm: 18,
  md: 20,
  base: 22,
  lg: 24,
  xl: 28,
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
    fontSize: fontSizes['5xl'],
    lineHeight: lineHeights['5xl'],
    fontFamily: 'Poppins_800ExtraBold',
    letterSpacing: letterSpacing.tight,
    ...androidFix,
  },

  // ── Headlines — h1-h4 all use '800' weight, tight spacing ──
  h1: {
    fontSize: fontSizes['4xl'],
    lineHeight: lineHeights['4xl'],
    fontFamily: 'Poppins_800ExtraBold',
    letterSpacing: letterSpacing.tight,
    ...androidFix,
  },
  h2: {
    fontSize: fontSizes['3xl'],
    lineHeight: lineHeights['3xl'],
    fontFamily: 'Poppins_800ExtraBold',
    letterSpacing: letterSpacing.tight,
    ...androidFix,
  },
  h3: {
    fontSize: fontSizes['2xl'],
    lineHeight: lineHeights['2xl'],
    fontFamily: 'Poppins_800ExtraBold',
    letterSpacing: letterSpacing.tight,
    ...androidFix,
  },
  h4: {
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: letterSpacing.snug,
    ...androidFix,
  },

  // ── Body — '600' weight, 17px minimum ──
  bodyLarge: {
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    fontFamily: 'Poppins_600SemiBold',
    ...androidFix,
  },
  body: {
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    fontFamily: 'Poppins_500Medium',
    ...androidFix,
  },
  bodySmall: {
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontFamily: 'Poppins_500Medium',
    ...androidFix,
  },

  // ── Captions ──
  caption: {
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    fontFamily: 'Poppins_500Medium',
    ...androidFix,
  },
  captionSmall: {
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontFamily: 'Poppins_500Medium',
    ...androidFix,
  },

  // ── UI Elements ──
  button: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: letterSpacing.wider,
    ...androidFix,
  },
  buttonSmall: {
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: letterSpacing.wide,
    ...androidFix,
  },
  label: {
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontFamily: 'Poppins_700Bold',
    ...androidFix,
  },
  tabBar: {
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontFamily: 'Poppins_700Bold',
    ...androidFix,
  },

  // ── Special ──
  subtitle: {
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: letterSpacing.snug,
    ...androidFix,
  },
  elegant: {
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: letterSpacing.wide,
    ...androidFix,
  },
  numeric: {
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    fontFamily: 'Poppins_800ExtraBold',
    ...androidFix,
  },
  numericLarge: {
    fontSize: fontSizes['3xl'],
    lineHeight: lineHeights['3xl'],
    fontFamily: 'Poppins_800ExtraBold',
    letterSpacing: letterSpacing.normal,
    ...androidFix,
  },
} as const;

/** System font fallback (for use before fonts load) */
export const systemFontFamily = systemFont;

export type TypographyVariant = keyof typeof typography;
