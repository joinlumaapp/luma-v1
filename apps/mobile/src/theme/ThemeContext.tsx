// LUMA Theme Context — always dark theme (2026-04-11)

import React, { createContext, useContext, useMemo } from 'react';
import { darkTheme, type ThemeColors, type ThemeMode } from './colors';

interface ThemeContextType {
  /** Whether the current resolved theme is dark */
  isDark: boolean;
  /** The user's selected theme mode (light | dark | system) */
  themeMode: ThemeMode;
  /** The resolved color tokens for the current theme */
  colors: ThemeColors;
  /** No-op: theme is always dark */
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: true,
  themeMode: 'dark',
  colors: darkTheme,
  setThemeMode: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always dark — LUMA is a dark-first app
  const value = useMemo<ThemeContextType>(
    () => ({
      isDark: true,
      themeMode: 'dark',
      colors: darkTheme,
      setThemeMode: () => {},
    }),
    [],
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
