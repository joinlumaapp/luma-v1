/**
 * LUMA Design System — Typography
 *
 * Premium typographic system built on Poppins — a geometric sans-serif
 * that balances friendliness with sophistication. Chosen because:
 * - Geometric forms convey modernity (like Hinge's editorial feel)
 * - Rounded terminals feel approachable (like Bumble's warmth)
 * - Wide range of weights enables clear visual hierarchy
 *
 * Type scale follows a modular scale (1.25 ratio) for harmonious sizing.
 * Line heights use a minimum 1.4x ratio to prevent descender clipping.
 *
 * @module theme/typography
 */

import { Platform, TextStyle } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// Font Family — Poppins Weights
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Poppins font family mapping.
 * React Native requires explicit font names per weight (no numeric fontWeight
 * with custom fonts). Loaded via expo-font in App.tsx.
 */
export const poppinsFonts = {
  light: 'Poppins_300Light',
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_600SemiBold',
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
// Font Weights
// ─────────────────────────────────────────────────────────────────────────────

export const fontWeights = {
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '600' as const,
  extrabold: '700' as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// Font Size Scale
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Modular type scale (~1.25 ratio).
 * Provides clear hierarchy from tiny captions to hero display text.
 */
export const fontSizes = {
  /** 10px — Micro labels, badge counts */
  xs: 10,
  /** 12px — Captions, timestamps, helper text */
  sm: 12,
  /** 14px — Body small, secondary text */
  md: 14,
  /** 16px — Body default, primary readable text */
  base: 16,
  /** 18px — Body large, emphasized content */
  lg: 18,
  /** 20px — Subtitle, section headers */
  xl: 20,
  /** 24px — Title, screen headers */
  '2xl': 24,
  /** 30px — Large title, hero text */
  '3xl': 30,
  /** 36px — Display, splash headlines */
  '4xl': 36,
  /** 48px — Hero display, onboarding headlines */
  '5xl': 48,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Line Heights — Optimized for Readability
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Line heights paired with font sizes.
 * Minimum 1.4x ratio prevents descender/ascender clipping with Poppins.
 */
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

// ─────────────────────────────────────────────────────────────────────────────
// Letter Spacing — Fine-tuned per weight
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Letter spacing values for different use cases.
 * Tighter for large headlines, wider for small uppercase labels.
 */
export const letterSpacing = {
  /** -0.5px — Tight tracking for display/hero text */
  tight: -0.5,
  /** -0.25px — Slightly tight for headlines */
  snug: -0.25,
  /** 0px — Normal tracking for body text */
  normal: 0,
  /** 0.25px — Slightly wide for small text readability */
  wide: 0.25,
  /** 0.5px — Wide tracking for buttons and labels */
  wider: 0.5,
  /** 1.5px — Ultra-wide for uppercase subtitles */
  widest: 1.5,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Typography Presets — Complete text styles
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ready-to-use typography presets.
 * Spread these into StyleSheet definitions for consistent text styling.
 *
 * @example
 * ```ts
 * const styles = StyleSheet.create({
 *   title: { ...typography.h3, color: colors.text },
 *   body: { ...typography.body, color: colors.textSecondary },
 * });
 * ```
 */
export const typography = {
  // ── Display — Hero text for splash, onboarding ──
  /** 48px bold — Splash screen, onboarding hero text */
  display: {
    fontFamily: poppinsFonts.bold,
    fontSize: fontSizes['5xl'],
    lineHeight: lineHeights['5xl'],
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacing.normal,
    ...androidFix,
  },

  // ── Headlines — Bold, commanding, Poppins ──
  /** 36px bold — Primary screen title */
  h1: {
    fontFamily: poppinsFonts.bold,
    fontSize: fontSizes['4xl'],
    lineHeight: lineHeights['4xl'],
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacing.normal,
    ...androidFix,
  },
  /** 30px bold — Section title */
  h2: {
    fontFamily: poppinsFonts.bold,
    fontSize: fontSizes['3xl'],
    lineHeight: lineHeights['3xl'],
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacing.normal,
    ...androidFix,
  },
  /** 24px semibold — Card title, modal header */
  h3: {
    fontFamily: poppinsFonts.semibold,
    fontSize: fontSizes['2xl'],
    lineHeight: lineHeights['2xl'],
    fontWeight: fontWeights.semibold,
    ...androidFix,
  },
  /** 20px semibold — Subsection header */
  h4: {
    fontFamily: poppinsFonts.semibold,
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
    fontWeight: fontWeights.semibold,
    ...androidFix,
  },

  // ── Body — Clean, readable ──
  /** 18px medium — Emphasized body text, lead paragraphs */
  bodyLarge: {
    fontFamily: poppinsFonts.medium,
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    fontWeight: fontWeights.medium,
    ...androidFix,
  },
  /** 16px regular — Default body text */
  body: {
    fontFamily: poppinsFonts.regular,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    fontWeight: fontWeights.regular,
    ...androidFix,
  },
  /** 14px regular — Secondary body text, descriptions */
  bodySmall: {
    fontFamily: poppinsFonts.regular,
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.regular,
    ...androidFix,
  },

  // ── Captions — Supportive text ──
  /** 12px regular — Timestamps, helper text, metadata */
  caption: {
    fontFamily: poppinsFonts.regular,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    fontWeight: fontWeights.regular,
    ...androidFix,
  },
  /** 10px regular — Badge counts, micro labels */
  captionSmall: {
    fontFamily: poppinsFonts.regular,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontWeight: fontWeights.regular,
    ...androidFix,
  },

  // ── UI Elements — Interactive text ──
  /** 16px semibold — Primary button text */
  button: {
    fontFamily: poppinsFonts.semibold,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacing.wider,
    ...androidFix,
  },
  /** 14px semibold — Small button, chip text */
  buttonSmall: {
    fontFamily: poppinsFonts.semibold,
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacing.wide,
    ...androidFix,
  },
  /** 14px medium — Form labels, input labels */
  label: {
    fontFamily: poppinsFonts.medium,
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.medium,
    ...androidFix,
  },
  /** 10px medium — Tab bar labels */
  tabBar: {
    fontFamily: poppinsFonts.medium,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontWeight: fontWeights.medium,
    ...androidFix,
  },

  // ── Special — Premium/editorial text ──
  /** 10px semibold uppercase — Premium subtitles, section overlines */
  subtitle: {
    fontFamily: poppinsFonts.semibold,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacing.widest,
    ...androidFix,
  },
  /** 14px light — Elegant descriptions, quote text (Hinge-inspired) */
  elegant: {
    fontFamily: poppinsFonts.light,
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.light,
    letterSpacing: letterSpacing.wide,
    ...androidFix,
  },
  /** 18px bold — Numeric displays (compatibility %, coin counts) */
  numeric: {
    fontFamily: poppinsFonts.bold,
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    fontWeight: fontWeights.bold,
    ...androidFix,
  },
  /** 30px extrabold — Large numeric hero (match %, big stats) */
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
