// LUMA App entry point

import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, AppState, StatusBar as RNStatusBar, StyleSheet, View } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Navigation } from './src/navigation';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { ToastProvider, useToast } from './src/components/common/Toast';
import { OfflineBanner } from './src/components/common/OfflineBanner';
import { useNetworkStore } from './src/stores/networkStore';
import { useAuthStore } from './src/stores/authStore';
import { useNotificationStore } from './src/stores/notificationStore';
import { requestQueue } from './src/services/requestQueue';
import { api } from './src/services/api';
import { analyticsService, ANALYTICS_EVENTS } from './src/services/analyticsService';
import { storage } from './src/utils/storage';

function ThemedStatusBar(): React.JSX.Element {
  const { isDark, colors } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} translucent />
      <RNStatusBar
        barStyle={colors.statusBar}
        backgroundColor={colors.background}
        translucent
      />
    </>
  );
}

/** Starts network monitoring and handles reconnection logic */
function NetworkMonitor(): null {
  const { showToast } = useToast();
  const isConnected = useNetworkStore((s) => s.isConnected);
  const wasOfflineRef = useRef(false);

  // Start NetInfo listener on mount
  useEffect(() => {
    const unsub = useNetworkStore.getState().startMonitoring();
    return unsub;
  }, []);

  // Watch for offline -> online transition
  useEffect(() => {
    if (!isConnected) {
      wasOfflineRef.current = true;
      return;
    }

    // We just came back online
    if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      showToast('success', 'Ba\u011Flant\u0131 yeniden kuruldu');

      // Flush queued offline requests
      if (requestQueue.size() > 0) {
        requestQueue.flush(api).catch(() => {
          // Silently handle — individual failures are already re-queued
        });
      }
    }
  }, [isConnected, showToast]);

  return null;
}

/**
 * Initializes push notification permission, device registration, and
 * foreground listeners once the user is authenticated.
 * Runs as an invisible component inside the provider tree.
 */
function NotificationInitializer(): null {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    // Only initialize once, after auth loading completes and user is authenticated
    if (isLoading || !isAuthenticated || hasInitializedRef.current) {
      return;
    }

    hasInitializedRef.current = true;

    const { requestPermission, registerDevice, setupForegroundListener } =
      useNotificationStore.getState();

    let foregroundCleanup: (() => void) | undefined;

    const initNotifications = async (): Promise<void> => {
      try {
        await requestPermission();
        await registerDevice();
        foregroundCleanup = setupForegroundListener();
      } catch {
        if (__DEV__) {
          console.warn('[App] Notification initialization failed');
        }
      }
    };

    initNotifications();

    return () => {
      if (foregroundCleanup) {
        foregroundCleanup();
      }
    };
  }, [isAuthenticated, isLoading]);

  // Reset flag on logout so notifications re-initialize on next login
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      hasInitializedRef.current = false;
    }
  }, [isAuthenticated, isLoading]);

  return null;
}

export default function App(): React.JSX.Element {
  const [storageReady, setStorageReady] = useState(false);

  // Load persisted storage into memory before rendering the app
  useEffect(() => {
    storage.initialize().then(() => {
      setStorageReady(true);
    });
  }, []);

  // Initialize analytics and track app lifecycle events
  useEffect(() => {
    analyticsService.initialize().catch(() => {
      // Analytics initialization failure is non-critical
    });
    analyticsService.track(ANALYTICS_EVENTS.APP_OPENED);

    const handleAppStateChange = (nextState: AppStateStatus): void => {
      if (nextState === 'active') {
        analyticsService.track(ANALYTICS_EVENTS.APP_OPENED);
      } else if (nextState === 'background') {
        analyticsService.track(ANALYTICS_EVENTS.APP_BACKGROUNDED);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  // Wait for storage to load before rendering the app
  if (!storageReady) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ToastProvider>
            <ThemedStatusBar />
            <NetworkMonitor />
            <NotificationInitializer />
            <Navigation />
            <OfflineBanner />
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#08080F',
  },
});
