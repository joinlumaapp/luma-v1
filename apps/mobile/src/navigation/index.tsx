// Navigation entry point
// Deep link yapılandırması, bildirim yönlendirmesi ve in-app banner entegrasyonu

import React, { useCallback, useMemo, useRef } from 'react';
import { Platform, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import type { NavigationContainerRef } from '@react-navigation/native';
import { RootNavigator } from './RootNavigator';
import type { RootStackParamList } from './types';
import { useAuthStore } from '../stores/authStore';
import { linkingConfig } from '../services/deepLinkService';
import { useNotificationHandler } from '../hooks/useNotificationHandler';
import { InAppNotificationBanner } from '../components/common/InAppNotificationBanner';
import { NetworkProvider } from '../providers/NetworkProvider';

// ─── Navigation ref — dışarıdan erişim için (bildirim handler vb.) ────
export let navigationRef: NavigationContainerRef<RootStackParamList> | null = null;

export const Navigation: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  // Bildirim handler — izin, token kaydı, yönlendirme
  useNotificationHandler({
    navigationRef: navRef.current,
    isAuthenticated,
  });

  // Transparent navigation theme — app-owned backgrounds render through,
  // while dark=true forces light-content status bar across every screen.
  const navigationTheme = useMemo(
    () => ({
      dark: true,
      colors: {
        primary: '#8B5CF6',
        background: 'transparent',
        card: 'transparent',
        text: '#000000',
        border: 'transparent',
        notification: '#EC4899',
      },
      fonts: {
        regular: { fontFamily: 'Poppins_600SemiBold', fontWeight: '600' as const },
        medium: { fontFamily: 'Poppins_600SemiBold', fontWeight: '600' as const },
        bold: { fontFamily: 'Poppins_700Bold', fontWeight: '700' as const },
        heavy: { fontFamily: 'Poppins_800ExtraBold', fontWeight: '800' as const },
      },
    }),
    [],
  );

  // Re-force the black status bar after every navigation transition so that
  // react-native-screens can't silently flip it back to the system default.
  const forceBlackStatusBar = useCallback(() => {
    StatusBar.setBarStyle('light-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#000000');
    }
  }, []);

  return (
    <NetworkProvider>
      <NavigationContainer
        ref={navRef}
        theme={navigationTheme}
        linking={linkingConfig}
        onReady={() => {
          // Global ref'i ayarla — hook dışı erişim için
          navigationRef = navRef.current;
          forceBlackStatusBar();
        }}
        onStateChange={forceBlackStatusBar}
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
