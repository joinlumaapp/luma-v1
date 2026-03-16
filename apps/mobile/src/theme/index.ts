/**
 * LUMA Design System — Unified Theme Export
 *
 * Central entry point for all design tokens. Import from here for
 * the complete theme system, or import individual modules for tree-shaking.
 *
 * @example
 * ```ts
 * // Full theme object
 * import { theme } from '../theme';
 *
 * // Individual tokens
 * import { colors, typography, spacing } from '../theme';
 *
 * // Specific modules
 * import { brandGradients } from '../theme/gradients';
 * import { elevation, glow } from '../theme/shadows';
 * import { spring, duration } from '../theme/animations';
 * ```
 *
 * @module theme
 */

// ─────────────────────────────────────────────────────────────────────────────
// Colors
// ─────────────────────────────────────────────────────────────────────────────

export {
  palette,
  colors,
  darkTheme,
  lightTheme,
  creamTheme,
  darkColors,
  lightColors,
  glassmorphism,
  semanticColors,
  tierColors,
  surfaces,
  opacity,
} from './colors';

export type { ThemeColors, ThemeMode } from './colors';

// ─────────────────────────────────────────────────────────────────────────────
// Theme Context
// ─────────────────────────────────────────────────────────────────────────────

export { ThemeProvider, useTheme } from './ThemeContext';

// ─────────────────────────────────────────────────────────────────────────────
// Typography
// ─────────────────────────────────────────────────────────────────────────────

export {
  typography,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacing,
  poppinsFonts,
  systemFontFamily,
} from './typography';

export type { TypographyVariant } from './typography';

// ─────────────────────────────────────────────────────────────────────────────
// Spacing & Layout
// ─────────────────────────────────────────────────────────────────────────────

export {
  spacing,
  borderRadius,
  screenPadding,
  layout,
  shadows,
} from './spacing';

export type { Spacing, BorderRadius } from './spacing';

// ─────────────────────────────────────────────────────────────────────────────
// Shadows & Elevation
// ─────────────────────────────────────────────────────────────────────────────

export {
  elevation,
  glow,
  contextShadows,
} from './shadows';

export type { ShadowStyle } from './shadows';

// ─────────────────────────────────────────────────────────────────────────────
// Gradients
// ─────────────────────────────────────────────────────────────────────────────

export {
  gradientDirections,
  brandGradients,
  cardOverlays,
  tierGradients,
  matchGradients,
  backgroundGradients,
  shimmerGradients,
} from './gradients';

// ─────────────────────────────────────────────────────────────────────────────
// Animations
// ─────────────────────────────────────────────────────────────────────────────

export {
  duration,
  spring,
  easing,
  haptics,
  motionPresets,
  stagger,
} from './animations';

// ─────────────────────────────────────────────────────────────────────────────
// Premium Theme
// ─────────────────────────────────────────────────────────────────────────────

export { PREMIUM_THEME } from './premiumTheme';

// ─────────────────────────────────────────────────────────────────────────────
// Composed Theme Objects
// ─────────────────────────────────────────────────────────────────────────────

import { darkTheme, lightTheme, type ThemeColors } from './colors';
import { typography } from './typography';
import { spacing, borderRadius, screenPadding, layout, shadows } from './spacing';
import { elevation, glow } from './shadows';
import { brandGradients, tierGradients, matchGradients } from './gradients';
import { spring, duration, easing } from './animations';

/**
 * Complete LUMA theme interface.
 * Contains all design tokens needed to render the app.
 */
export interface LumaTheme {
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  screenPadding: typeof screenPadding;
  layout: typeof layout;
  shadows: typeof shadows;
  elevation: typeof elevation;
  glow: typeof glow;
  gradients: {
    brand: typeof brandGradients;
    tier: typeof tierGradients;
    match: typeof matchGradients;
  };
  animation: {
    spring: typeof spring;
    duration: typeof duration;
    easing: typeof easing;
  };
}

/** Dark theme — default for LUMA */
export const theme: LumaTheme = {
  colors: darkTheme,
  typography,
  spacing,
  borderRadius,
  screenPadding,
  layout,
  shadows,
  elevation,
  glow,
  gradients: {
    brand: brandGradients,
    tier: tierGradients,
    match: matchGradients,
  },
  animation: {
    spring,
    duration,
    easing,
  },
};

/** Light theme variant */
export const lightLumaTheme: LumaTheme = {
  colors: lightTheme,
  typography,
  spacing,
  borderRadius,
  screenPadding,
  layout,
  shadows,
  elevation,
  glow,
  gradients: {
    brand: brandGradients,
    tier: tierGradients,
    match: matchGradients,
  },
  animation: {
    spring,
    duration,
    easing,
  },
};

export default theme;
