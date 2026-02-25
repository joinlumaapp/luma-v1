// Navigation entry point

import React, { useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './RootNavigator';
import { useTheme } from '../theme/ThemeContext';

export const Navigation: React.FC = () => {
  const { isDark, colors } = useTheme();

  const navigationTheme = useMemo(
    () => ({
      dark: isDark,
      colors: {
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.secondary,
      },
      fonts: {
        regular: { fontFamily: 'System', fontWeight: '400' as const },
        medium: { fontFamily: 'System', fontWeight: '500' as const },
        bold: { fontFamily: 'System', fontWeight: '700' as const },
        heavy: { fontFamily: 'System', fontWeight: '800' as const },
      },
    }),
    [isDark, colors],
  );

  return (
    <NavigationContainer theme={navigationTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
};

export { RootNavigator } from './RootNavigator';
export { AuthNavigator } from './AuthNavigator';
export { OnboardingNavigator } from './OnboardingNavigator';
export { MainTabNavigator } from './MainTabNavigator';
export type * from './types';
