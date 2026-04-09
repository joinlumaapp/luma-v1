// Navigation entry point
// Deep link yapılandırması, bildirim yönlendirmesi ve in-app banner entegrasyonu

import React, { useMemo, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import type { NavigationContainerRef } from '@react-navigation/native';
import { RootNavigator } from './RootNavigator';
import type { RootStackParamList } from './types';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../stores/authStore';
import { linkingConfig } from '../services/deepLinkService';
import { useNotificationHandler } from '../hooks/useNotificationHandler';
import { InAppNotificationBanner } from '../components/common/InAppNotificationBanner';
import { NetworkProvider } from '../providers/NetworkProvider';

// ─── Navigation ref — dışarıdan erişim için (bildirim handler vb.) ────
export let navigationRef: NavigationContainerRef<RootStackParamList> | null = null;

export const Navigation: React.FC = () => {
  const { isDark, colors } = useTheme();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  // Bildirim handler — izin, token kaydı, yönlendirme
  useNotificationHandler({
    navigationRef: navRef.current,
    isAuthenticated,
  });

  const navigationTheme = useMemo(
    () => ({
      dark: true, // Always dark — ensures light-content status bar across all screens
      colors: {
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.secondary,
      },
      fonts: {
        regular: { fontFamily: 'Poppins_500Medium', fontWeight: '500' as const },
        medium: { fontFamily: 'Poppins_500Medium', fontWeight: '500' as const },
        bold: { fontFamily: 'Poppins_700Bold', fontWeight: '700' as const },
        heavy: { fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' as const },
      },
    }),
    [isDark, colors],
  );

  return (
    <NetworkProvider>
      <NavigationContainer
        ref={navRef}
        theme={navigationTheme}
        linking={linkingConfig}
        onReady={() => {
          // Global ref'i ayarla — hook dışı erişim için
          navigationRef = navRef.current;
        }}
      >
        <RootNavigator />
        {/* Ön plan bildirim banner'ı — tüm ekranların üzerinde */}
        {isAuthenticated && <InAppNotificationBanner />}
      </NavigationContainer>
    </NetworkProvider>
  );
};

export { RootNavigator } from './RootNavigator';
export { AuthNavigator } from './AuthNavigator';
export { OnboardingNavigator } from './OnboardingNavigator';
export { MainTabNavigator } from './MainTabNavigator';
export type * from './types';
