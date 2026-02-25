// LUMA Theme Context — dark/light/system mode support with persistent storage

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors, type ThemeColors, type ThemeMode } from './colors';
import { storage } from '../utils/storage';

interface ThemeContextType {
  /** Whether the current resolved theme is dark */
  isDark: boolean;
  /** The user's selected theme mode (light | dark | system) */
  themeMode: ThemeMode;
  /** The resolved color tokens for the current theme */
  colors: ThemeColors;
  /** Update the theme mode and persist the selection */
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: true,
  themeMode: 'system',
  colors: darkColors,
  setThemeMode: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    // Load persisted preference synchronously from in-memory cache
    return storage.getTheme();
  });

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    storage.setTheme(mode);
  }, []);

  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark';
    }
    return themeMode === 'dark';
  }, [themeMode, systemColorScheme]);

  const currentColors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);

  const value = useMemo<ThemeContextType>(
    () => ({
      isDark,
      themeMode,
      colors: currentColors,
      setThemeMode,
    }),
    [isDark, themeMode, currentColors, setThemeMode],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Hook to access the current theme colors and mode.
 *
 * Usage:
 * ```tsx
 * const { colors, isDark, themeMode, setThemeMode } = useTheme();
 * ```
 *
 * Screens that adopt this hook get dynamic dark/light colors.
 * Screens that still use the static `colors` import keep working
 * with the default dark theme (backwards compatible).
 */
export const useTheme = (): ThemeContextType => useContext(ThemeContext);
