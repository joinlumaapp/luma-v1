// LUMA App entry point

import React, { Component, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  AppState,
  StatusBar as RNStatusBar,
  StyleSheet,
  View,
  Text,
} from 'react-native';
import type { AppStateStatus } from 'react-native';
import type { ReactNode, ErrorInfo } from 'react';

// ─── Static imports (no lazy loading overhead) ────────────────────────
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Navigation } from './src/navigation';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { ToastProvider, useToast } from './src/components/common/Toast';
import { useNetworkStore } from './src/stores/networkStore';
import { useAuthStore } from './src/stores/authStore';
import { useNotificationStore } from './src/stores/notificationStore';
import { requestQueue } from './src/services/requestQueue';
import { api } from './src/services/api';
import { analyticsService, ANALYTICS_EVENTS } from './src/services/analyticsService';
import { storage } from './src/utils/storage';

// Initialize storage eagerly (non-blocking)
storage.initialize().catch(() => {});

// ─── Error Boundary ───────────────────────────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (__DEV__) {
      console.error('[AppErrorBoundary] Caught error:', error, info);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.title}>LUMA</Text>
          <Text style={errorStyles.subtitle}>
            Uygulama yüklenirken bir hata oluştu
          </Text>
          <Text style={errorStyles.detail}>
            {this.state.error?.message ?? 'Bilinmeyen hata'}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3D1B5B',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#E0D0F0',
    textAlign: 'center',
    marginBottom: 12,
  },
  detail: {
    fontSize: 12,
    color: '#B090D0',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});

// ─── Themed Status Bar ────────────────────────────────────────────────
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

// ─── Network Monitor ──────────────────────────────────────────────────
function NetworkMonitor(): null {
  const { showToast } = useToast();
  const isConnected = useNetworkStore((s) => s.isConnected);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    const unsub = useNetworkStore.getState().startMonitoring();
    return unsub;
  }, []);

  useEffect(() => {
    if (!isConnected) {
      wasOfflineRef.current = true;
      return;
    }
    if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      showToast('success', 'Bağlantı yeniden kuruldu');
      if (requestQueue.size() > 0) {
        requestQueue.flush(api).catch(() => {});
      }
    }
  }, [isConnected, showToast]);

  return null;
}

// ─── Notification Initializer ─────────────────────────────────────────
function NotificationInitializer(): null {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (isLoading || !isAuthenticated || hasInitializedRef.current) return;
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
      if (foregroundCleanup) foregroundCleanup();
    };
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      hasInitializedRef.current = false;
    }
  }, [isAuthenticated, isLoading]);

  return null;
}

// ─── Trial Expiry Checker ─────────────────────────────────────────────
function TrialExpiryChecker(): null {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const trialExpiresAt = useAuthStore((s) => s.trialExpiresAt);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Restore persisted trial state on app launch
    useAuthStore.getState().loadTrialState();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!trialExpiresAt) return;

    // Check immediately
    const expired = useAuthStore.getState().checkTrialExpiry();
    if (expired) return;

    // Schedule a check when the trial should expire
    const timeUntilExpiry = trialExpiresAt - Date.now();
    if (timeUntilExpiry <= 0) return;

    const timer = setTimeout(() => {
      useAuthStore.getState().checkTrialExpiry();
    }, timeUntilExpiry);

    return () => clearTimeout(timer);
  }, [trialExpiresAt]);

  return null;
}

// ─── App Root ─────────────────────────────────────────────────────────
export default function App(): React.JSX.Element {
  useEffect(() => {
    analyticsService.initialize().catch(() => {});
    analyticsService.track(ANALYTICS_EVENTS.APP_OPENED);

    const handleAppStateChange = (nextState: AppStateStatus): void => {
      if (nextState === 'active') {
        analyticsService.track(ANALYTICS_EVENTS.APP_OPENED);
        // Check trial expiry whenever app comes to foreground
        useAuthStore.getState().checkTrialExpiry();
      } else if (nextState === 'background') {
        analyticsService.track(ANALYTICS_EVENTS.APP_BACKGROUNDED);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <AppErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <ThemeProvider>
            <ToastProvider>
              <ThemedStatusBar />
              <NetworkMonitor />
              <NotificationInitializer />
              <TrialExpiryChecker />
              <Navigation />
            </ToastProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#3D1B5B',
  },
});
