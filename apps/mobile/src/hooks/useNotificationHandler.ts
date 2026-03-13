// Push bildirim handler hook'u
// - Bildirim izni ister ve cihaz token'i kaydeder
// - On plan / arka plan bildirim dinleyicilerini kurar
// - Bildirim tiklamasini yakalar ve dogru ekrana yonlendirir
// - Unmount'ta temizlik yapar

import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import type { NavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';
import { notificationService } from '../services/notificationService';
import { useNotificationStore } from '../stores/notificationStore';
import {
  handleForegroundNotification,
  handleNotificationTap,
} from '../services/notificationHandlerService';
import { isExpoGo } from '../utils/runtime';

interface UseNotificationHandlerOptions {
  /** NavigationContainerRef — bildirim tiklamasinda ekran yonlendirmesi icin */
  navigationRef: NavigationContainerRef<RootStackParamList> | null;
  /** Kullanici oturum acmis mi? Oturum acmadan bildirim kaydedilmez */
  isAuthenticated: boolean;
}

interface UseNotificationHandlerReturn {
  /** Manuel olarak bildirim iznini yeniden iste */
  requestPermission: () => Promise<boolean>;
  /** Bildirim izni durumu */
  hasPermission: boolean;
}

/**
 * Push bildirim yonetim hook'u.
 *
 * Gorevler:
 * 1. Bildirim izni ister (ilk kullanımda)
 * 2. Device token'i backend'e kaydeder
 * 3. On planda alinan bildirimler icin InAppNotificationBanner'a iletir
 * 4. Arka planda/kapalıyken tiklanilan bildirimleri dogru ekrana yonlendirir
 * 5. Uygulama on plana geldiginde bildirim listesini yeniler
 *
 * Kullanım:
 * ```tsx
 * useNotificationHandler({
 *   navigationRef: navigationRef,
 *   isAuthenticated: isLoggedIn,
 * });
 * ```
 */
export function useNotificationHandler(
  options: UseNotificationHandlerOptions,
): UseNotificationHandlerReturn {
  const { navigationRef, isAuthenticated } = options;
  const hasPermission = useNotificationStore((s) => s.hasPermission);
  const requestPermissionFromStore = useNotificationStore((s) => s.requestPermission);
  const registerDevice = useNotificationStore((s) => s.registerDevice);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const refresh = useNotificationStore((s) => s.refresh);

  // Cold start bildirim verisi icin ref
  const pendingNotificationData = useRef<Record<string, unknown> | null>(null);
  const isSetupDone = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Bildirim izni iste ve cihaz kaydet ─────────────────────────────

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const granted = await requestPermissionFromStore();
    if (granted) {
      await registerDevice();
    }
    return granted;
  }, [requestPermissionFromStore, registerDevice]);

  // ─── İlk kurulum: izin + token kaydı ───────────────────────────────

  useEffect(() => {
    if (!isAuthenticated || isSetupDone.current) return;
    if (isExpoGo()) {
      isSetupDone.current = true;
      return;
    }

    const setup = async (): Promise<void> => {
      try {
        // İzin iste
        const granted = await requestPermission();

        if (__DEV__) {
          console.log(`[BildirimHandler] İzin durumu: ${granted ? 'verildi' : 'reddedildi'}`);
        }

        isSetupDone.current = true;
      } catch (error) {
        if (__DEV__) {
          console.error('[BildirimHandler] Kurulum hatasi:', error);
        }
      }
    };

    setup();
  }, [isAuthenticated, requestPermission]);

  // ─── Ön plan bildirim dinleyicisi ───────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated) return;
    if (isExpoGo()) return;

    const cleanup = notificationService.onNotificationReceived((notification) => {
      // Store'a ekle
      const notifType = (notification.data?.type as string) || 'SYSTEM';
      addNotification({
        id: `push_${Date.now()}`,
        type: notifType,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      // In-app banner'a gonder
      handleForegroundNotification(notification);
    });

    return cleanup;
  }, [isAuthenticated, addNotification]);

  // ─── Bildirim tiklamasi dinleyicisi ─────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated) return;
    if (isExpoGo()) return;

    const cleanup = notificationService.onNotificationTapped((data) => {
      if (navigationRef?.isReady()) {
        handleNotificationTap(navigationRef, data);
      } else {
        // Navigator henuz hazir degil — cold start durumu
        // Store and retry after a short delay in case navigation becomes ready soon
        pendingNotificationData.current = data;

        const retryTimer = setTimeout(() => {
          if (pendingNotificationData.current && navigationRef?.isReady()) {
            handleNotificationTap(navigationRef, pendingNotificationData.current);
            pendingNotificationData.current = null;
          }
        }, 500);

        retryTimerRef.current = retryTimer;
      }
    });

    return cleanup;
  }, [isAuthenticated, navigationRef]);

  // ─── Cold start: bekleyen bildirim yönlendirmesi ────────────────────

  useEffect(() => {
    if (!navigationRef?.isReady()) return;
    if (!pendingNotificationData.current) return;

    handleNotificationTap(navigationRef, pendingNotificationData.current);
    pendingNotificationData.current = null;
  }, [navigationRef]);

  // ─── App state degisikliginde bildirim yenile ───────────────────────

  useEffect(() => {
    if (!isAuthenticated) return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refresh();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, refresh]);

  // ─── Cleanup ────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      isSetupDone.current = false;
      pendingNotificationData.current = null;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, []);

  return {
    requestPermission,
    hasPermission,
  };
}
