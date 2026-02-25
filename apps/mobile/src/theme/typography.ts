// LUMA typography system — using system fonts

import { Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export const fontWeights = {
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

export const lineHeights = {
  xs: 14,
  sm: 16,
  md: 20,
  base: 24,
  lg: 28,
  xl: 28,
  '2xl': 32,
  '3xl': 36,
  '4xl': 44,
  '5xl': 56,
} as const;

export const typography = {
  h1: {
    fontFamily,
    fontSize: fontSizes['4xl'],
    lineHeight: lineHeights['4xl'],
    fontWeight: fontWeights.bold,
  },
  h2: {
    fontFamily,
    fontSize: fontSizes['3xl'],
    lineHeight: lineHeights['3xl'],
    fontWeight: fontWeights.bold,
  },
  h3: {
    fontFamily,
    fontSize: fontSizes['2xl'],
    lineHeight: lineHeights['2xl'],
    fontWeight: fontWeights.semibold,
  },
  h4: {
    fontFamily,
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
    fontWeight: fontWeights.semibold,
  },
  bodyLarge: {
    fontFamily,
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    fontWeight: fontWeights.regular,
  },
  body: {
    fontFamily,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    fontWeight: fontWeights.regular,
  },
  bodySmall: {
    fontFamily,
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.regular,
  },
  caption: {
    fontFamily,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.sm,
    fontWeight: fontWeights.regular,
  },
  captionSmall: {
    fontFamily,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontWeight: fontWeights.regular,
  },
  button: {
    fontFamily,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.base,
    fontWeight: fontWeights.semibold,
  },
  buttonSmall: {
    fontFamily,
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.semibold,
  },
  label: {
    fontFamily,
    fontSize: fontSizes.md,
    lineHeight: lineHeights.md,
    fontWeight: fontWeights.medium,
  },
  tabBar: {
    fontFamily,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.xs,
    fontWeight: fontWeights.medium,
  },
} as const;

export type TypographyVariant = keyof typeof typography;
