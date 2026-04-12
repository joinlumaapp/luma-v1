// LUMA App entry point

import './src/i18n/i18n'; // Initialize i18n before anything else
import React, { Component, useEffect, useRef } from 'react';
import {
  AppState,
  StyleSheet,
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
// expo-updates is only available in EAS builds, not in Expo Go dev client.
// We lazy-import it in the error boundary restart handler to avoid crashes.
// import * as Updates from 'expo-updates';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black,
} from '@expo-google-fonts/poppins';
import type { AppStateStatus } from 'react-native';
import type { ReactNode, ErrorInfo } from 'react';

// ─── Enable native screens for performance ───────────────────────────
import { enableScreens } from 'react-native-screens';
enableScreens(true);

// ─── Static imports (no lazy loading overhead) ────────────────────────
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Navigation } from './src/navigation';
import { ThemeProvider } from './src/theme/ThemeContext';
import { ToastProvider, useToast } from './src/components/common/Toast';
import { useNetworkStore } from './src/stores/networkStore';
import { useAuthStore } from './src/stores/authStore';
import { useNotificationStore } from './src/stores/notificationStore';
import { requestQueue } from './src/services/requestQueue';
import { api } from './src/services/api';
import { analyticsService, ANALYTICS_EVENTS } from './src/services/analyticsService';
import { initSentry } from './src/services/sentryService';
import { storage } from './src/utils/storage';
import { useAppVersion } from './src/hooks/useAppVersion';
import { ForceUpdateModal } from './src/components/common/ForceUpdateModal';

// Initialize storage eagerly (non-blocking)
storage.initialize().catch(() => {});

// Initialize Sentry error tracking in production
if (!__DEV__) {
  initSentry().catch(() => {});
}

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

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleRestart = async (): Promise<void> => {
    try {
      const Updates = await import('expo-updates');
      await Updates.reloadAsync();
    } catch {
      // expo-updates not available (Expo Go / dev) — fallback to retry
      this.setState({ hasError: false, error: null });
    }
  };

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
          <TouchableOpacity style={errorStyles.retryButton} onPress={this.handleRetry}>
            <Text style={errorStyles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
          <TouchableOpacity style={errorStyles.restartButton} onPress={this.handleRestart}>
            <Text style={errorStyles.restartButtonText}>Uygulamayı Yeniden Başlat</Text>
          </TouchableOpacity>
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
  retryButton: {
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3D1B5B',
  },
  restartButton: {
    marginTop: 12,
    backgroundColor: 'transparent',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0D0F0',
  },
  restartButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#E0D0F0',
  },
});

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

// ─── Font Loading Splash ──────────────────────────────────────────────
const splashLogo = require('./assets/splash-logo.png');

function FontLoadingSplash(): React.JSX.Element {
  return (
    <LinearGradient
      colors={['#E8959E', '#EDACB4', '#F2C0C6', '#F7D5D9', '#FFFFFF']}
      locations={[0, 0.3, 0.55, 0.8, 1]}
      style={splashStyles.container}
    >
      <Image source={splashLogo} style={splashStyles.logo} resizeMode="contain" />
      <ActivityIndicator size="small" color="#D4AF37" style={splashStyles.spinner} />
    </LinearGradient>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 180,
    height: 180,
  },
  spinner: {
    marginTop: 24,
  },
});

// ─── Status Bar Background (Android 15 edge-to-edge fix) ─────────────
// Expo SDK 54 + Android 15 enforce edge-to-edge, which means the Android
// theme's `android:statusBarColor` is ignored and the app draws behind the
// system status bar. We paint our own black strip over the status bar
// inset so the icons (set via expo-status-bar style="light") always sit
// on solid black, matching the permanent dark status bar the user wants.
function StatusBarBackground(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="none"
      style={[statusBarBgStyles.overlay, { height: insets.top }]}
    />
  );
}

const statusBarBgStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
    zIndex: 999,
    elevation: 999,
  },
});

// ─── App Version Gate ────────────────────────────────────────────────
function AppVersionGate(): React.JSX.Element | null {
  const {
    forceUpdateRequired,
    optionalUpdateAvailable,
    maintenanceMode,
    isChecking,
    error,
    dismissOptionalUpdate,
  } = useAppVersion();

  // Don't block app while checking or if check failed (no backend yet)
  if (isChecking || error) {
    return null;
  }

  if (forceUpdateRequired || maintenanceMode) {
    return <ForceUpdateModal visible />;
  }

  if (optionalUpdateAvailable) {
    return (
      <ForceUpdateModal
        visible
        isOptional
        onDismiss={dismissOptionalUpdate}
      />
    );
  }

  return null;
}

// ─── Global Poppins font default ──────────────────────────────────────
// On Android, fontWeight alone does NOT activate custom fonts — the
// explicit fontFamily mapping is required. This sets a baseline so every
// Text/TextInput uses Poppins even when a screen forgets to set fontFamily.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (!(Text as any).defaultProps) (Text as any).defaultProps = {};
(Text as any).defaultProps.style = { fontFamily: 'Poppins_500Medium' };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (!(TextInput as any).defaultProps) (TextInput as any).defaultProps = {};
(TextInput as any).defaultProps.style = { fontFamily: 'Poppins_500Medium' };

// ─── App Root ─────────────────────────────────────────────────────────
export default function App(): React.JSX.Element {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    Poppins_300Light,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    Poppins_900Black,
  });

  // Force black status bar immediately on app open + whenever the app
  // returns from background. Belt-and-suspenders with the native theme
  // plugin and the edge-to-edge overlay, so at least one layer always wins.
  useEffect(() => {
    const forceBlackStatusBar = (): void => {
      RNStatusBar.setBarStyle('light-content');
      if (Platform.OS === 'android') {
        RNStatusBar.setBackgroundColor('#000000');
        RNStatusBar.setTranslucent(false);
      }
    };

    forceBlackStatusBar();
    analyticsService.initialize().catch(() => {});
    analyticsService.track(ANALYTICS_EVENTS.APP_OPENED);

    const handleAppStateChange = (nextState: AppStateStatus): void => {
      if (nextState === 'active') {
        forceBlackStatusBar();
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

  if (!fontsLoaded) {
    return <FontLoadingSplash />;
  }

  return (
    <AppErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <ThemeProvider>
            <ToastProvider>
              <StatusBar style="light" translucent backgroundColor="#000000" />
              <AppVersionGate />
              <NetworkMonitor />
              <NotificationInitializer />
              <TrialExpiryChecker />
              <Navigation />
              {/* Must be LAST so it paints over every screen's top inset */}
              <StatusBarBackground />
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
    // Was pink (#E8959E) from the splash era — bled through during screen
    // transitions on every navigator. Cream matches the app's base theme
    // so back-swipes and stack pops no longer flash a pink strip.
    backgroundColor: '#F5F0E8',
  },
});
