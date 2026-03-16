/**
 * LUMA Design System — Elevation & Shadows
 *
 * A 5-level elevation system providing visual depth hierarchy.
 * Premium dating apps use subtle, warm shadows to create a sense
 * of layering without harshness.
 *
 * Platform differences:
 * - iOS: Uses shadowColor, shadowOffset, shadowOpacity, shadowRadius
 * - Android: Uses elevation (simpler but less customizable)
 *
 * Elevation levels:
 * - none: Flat, no shadow (inline elements)
 * - sm: Subtle lift (cards in lists, chips)
 * - md: Medium lift (standalone cards, dropdowns)
 * - lg: High lift (modals, bottom sheets)
 * - xl: Maximum lift (FABs, popovers, toasts)
 *
 * @module theme/shadows
 */

import { Platform } from 'react-native';
import { palette } from './colors';

// ─────────────────────────────────────────────────────────────────────────────
// Shadow Type
// ─────────────────────────────────────────────────────────────────────────────

export interface ShadowStyle {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Elevation Scale
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 5-level elevation system for consistent depth across the app.
 *
 * @example
 * ```ts
 * <View style={[styles.card, elevation.md]} />
 * <View style={[styles.modal, elevation.lg]} />
 * ```
 */
export const elevation = {
  /** No shadow — flat, flush with surface */
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  } satisfies ShadowStyle,

  /** Subtle lift — list cards, chips, tags */
  sm: Platform.select<ShadowStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
  })!,

  /** Medium lift — standalone cards, dropdowns */
  md: Platform.select<ShadowStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 4,
    },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 4,
    },
  })!,

  /** High lift — bottom sheets, modals, navigation bars */
  lg: Platform.select<ShadowStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 8,
    },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 8,
    },
  })!,

  /** Maximum lift — FABs, popovers, toasts, floating actions */
  xl: Platform.select<ShadowStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.22,
      shadowRadius: 20,
      elevation: 16,
    },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.22,
      shadowRadius: 20,
      elevation: 16,
    },
  })!,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Colored Glow Shadows — Brand-tinted elevation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Colored glow shadows for interactive and branded elements.
 * Creates a halo effect that reinforces the brand color system.
 */
export const glow = {
  /** Purple glow — primary buttons, active elements */
  primary: Platform.select<ShadowStyle>({
    ios: {
      shadowColor: palette.purple[500],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 8,
    },
    default: {
      shadowColor: palette.purple[500],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 8,
    },
  })!,

  /** Pink glow — match elements, romantic actions */
  secondary: Platform.select<ShadowStyle>({
    ios: {
      shadowColor: palette.pink[500],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    default: {
      shadowColor: palette.pink[500],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
  })!,

  /** Gold glow — premium/gold tier elements, coins, rewards */
  gold: Platform.select<ShadowStyle>({
    ios: {
      shadowColor: '#FFD700',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 6,
    },
    default: {
      shadowColor: '#FFD700',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 6,
    },
  })!,

  /** Success glow — compatibility badges, positive actions */
  success: Platform.select<ShadowStyle>({
    ios: {
      shadowColor: palette.success,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 6,
    },
    default: {
      shadowColor: palette.success,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 6,
    },
  })!,

  /** Spread glow — centerpoint glow without vertical offset (pulse effects) */
  spread: Platform.select<ShadowStyle>({
    ios: {
      shadowColor: palette.purple[500],
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 6,
    },
    default: {
      shadowColor: palette.purple[500],
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 6,
    },
  })!,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Contextual Shadow Presets — Ready for specific UI elements
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pre-configured shadows for common UI patterns.
 * Use these directly on specific element types for consistent depth.
 */
export const contextShadows = {
  /** Discovery/profile card shadow */
  card: elevation.md,

  /** Bottom sheet shadow (cast upward) */
  bottomSheet: Platform.select<ShadowStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 12,
    },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 12,
    },
  })!,

  /** Modal shadow */
  modal: elevation.lg,

  /** Floating action button shadow */
  fab: {
    ...elevation.xl,
    shadowColor: palette.purple[500],
    shadowOpacity: 0.3,
  } as ShadowStyle,

  /** Tab bar top shadow */
  tabBar: Platform.select<ShadowStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 4,
    },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 4,
    },
  })!,

  /** Toast/snackbar shadow */
  toast: elevation.xl,

  /** Input field focus shadow */
  inputFocus: Platform.select<ShadowStyle>({
    ios: {
      shadowColor: palette.purple[500],
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 2,
    },
    default: {
      shadowColor: palette.purple[500],
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 2,
    },
  })!,
} as const;
