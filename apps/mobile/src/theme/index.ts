// LUMA theme — unified export

export { palette, colors, darkTheme, lightTheme, darkColors, lightColors } from './colors';
export type { ThemeColors, ThemeMode } from './colors';
export { ThemeProvider, useTheme } from './ThemeContext';
export { typography, fontSizes, fontWeights, lineHeights } from './typography';
export type { TypographyVariant } from './typography';
export { spacing, borderRadius, screenPadding, layout, shadows } from './spacing';
export type { Spacing, BorderRadius } from './spacing';

import { darkTheme, lightTheme, type ThemeColors } from './colors';
import { typography } from './typography';
import { spacing, borderRadius, screenPadding, layout, shadows } from './spacing';

export interface LumaTheme {
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  screenPadding: typeof screenPadding;
  layout: typeof layout;
  shadows: typeof shadows;
}

export const theme: LumaTheme = {
  colors: darkTheme,
  typography,
  spacing,
  borderRadius,
  screenPadding,
  layout,
  shadows,
};

export const lightLumaTheme: LumaTheme = {
  colors: lightTheme,
  typography,
  spacing,
  borderRadius,
  screenPadding,
  layout,
  shadows,
};

export default theme;
