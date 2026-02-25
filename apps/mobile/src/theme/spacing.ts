// LUMA spacing system

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

export const screenPadding = {
  horizontal: spacing.md,
  vertical: spacing.md,
} as const;

export const layout = {
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  cardWidth: SCREEN_WIDTH - spacing.md * 2,
  cardHeight: SCREEN_HEIGHT * 0.65,
  avatarSmall: 40,
  avatarMedium: 56,
  avatarLarge: 80,
  avatarXLarge: 120,
  iconSmall: 20,
  iconMedium: 24,
  iconLarge: 32,
  buttonHeight: 52,
  buttonSmallHeight: 40,
  inputHeight: 52,
  tabBarHeight: 64,
  headerHeight: 56,
  photoGridItem: (SCREEN_WIDTH - spacing.md * 2 - spacing.sm * 2) / 3,
} as const;

export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  glow: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

export type Spacing = keyof typeof spacing;
export type BorderRadius = keyof typeof borderRadius;
