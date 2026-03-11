// LUMA App entry point

import React, { Component, useEffect, useRef, useState } from 'react';
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

// ─── Error Boundary ───────────────────────────────────────────────────
// Catches JS errors in the component tree and shows a fallback instead of
// a white screen. This is CRITICAL for debugging — without it a single
// import / render error silently kills the entire app.

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

// ─── Lazy-loaded heavy modules ────────────────────────────────────────
// These are loaded after the splash screen is visible, preventing
// module-level crashes from causing a white screen.

let _heavyModulesLoaded = false;
let SafeAreaProvider: typeof import('react-native-safe-area-context').SafeAreaProvider;
let GestureHandlerRootView: typeof import('react-native-gesture-handler').GestureHandlerRootView;
let Navigation: typeof import('./src/navigation').Navigation;
let ThemeProvider: typeof import('./src/theme/ThemeContext').ThemeProvider;
let useTheme: typeof import('./src/theme/ThemeContext').useTheme;
let ToastProvider: typeof import('./src/components/common/Toast').ToastProvider;
let useToast: typeof import('./src/components/common/Toast').useToast;
let OfflineBanner: typeof import('./src/components/common/OfflineBanner').OfflineBanner;
let useNetworkStore: typeof import('./src/stores/networkStore').useNetworkStore;
let useAuthStore: typeof import('./src/stores/authStore').useAuthStore;
let useNotificationStore: typeof import('./src/stores/notificationStore').useNotificationStore;
let requestQueue: typeof import('./src/services/requestQueue').requestQueue;
let api: typeof import('./src/services/api').api;
let analyticsService: typeof import('./src/services/analyticsService').analyticsService;
let ANALYTICS_EVENTS: typeof import('./src/services/analyticsService').ANALYTICS_EVENTS;

async function loadHeavyModules(): Promise<void> {
  if (_heavyModulesLoaded) return;

  const [
    safeAreaMod,
    gestureMod,
    navMod,
    themeMod,
    toastMod,
    offlineMod,
    networkStoreMod,
    authStoreMod,
    notifStoreMod,
    reqQueueMod,
    apiMod,
    analyticsMod,
  ] = await Promise.all([
    import('react-native-safe-area-context'),
    import('react-native-gesture-handler'),
    import('./src/navigation'),
    import('./src/theme/ThemeContext'),
    import('./src/components/common/Toast'),
    import('./src/components/common/OfflineBanner'),
    import('./src/stores/networkStore'),
    import('./src/stores/authStore'),
    import('./src/stores/notificationStore'),
    import('./src/services/requestQueue'),
    import('./src/services/api'),
    import('./src/services/analyticsService'),
  ]);

  SafeAreaProvider = safeAreaMod.SafeAreaProvider;
  GestureHandlerRootView = gestureMod.GestureHandlerRootView;
  Navigation = navMod.Navigation;
  ThemeProvider = themeMod.ThemeProvider;
  useTheme = themeMod.useTheme;
  ToastProvider = toastMod.ToastProvider;
  useToast = toastMod.useToast;
  OfflineBanner = offlineMod.OfflineBanner;
  useNetworkStore = networkStoreMod.useNetworkStore;
  useAuthStore = authStoreMod.useAuthStore;
  useNotificationStore = notifStoreMod.useNotificationStore;
  requestQueue = reqQueueMod.requestQueue;
  api = apiMod.api;
  analyticsService = analyticsMod.analyticsService;
  ANALYTICS_EVENTS = analyticsMod.ANALYTICS_EVENTS;

  _heavyModulesLoaded = true;
}

// ─── Storage (lightweight, safe to import eagerly) ────────────────────
import { storage } from './src/utils/storage';

// ─── Loading Screen (lightweight, safe to import eagerly) ─────────────
import { LoadingScreen } from './src/components/common/LoadingScreen';

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
      showToast('success', 'Ba\u011Flant\u0131 yeniden kuruldu');
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

// ─── Main App Content (rendered after modules are loaded) ─────────────
function AppContent(): React.JSX.Element {
  // Initialize analytics and track app lifecycle events
  useEffect(() => {
    analyticsService.initialize().catch(() => {});
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

// ─── App Root ─────────────────────────────────────────────────────────
// Phase 1: Show LoadingScreen immediately (no heavy imports needed)
// Phase 2: Load storage + heavy modules in parallel
// Phase 3: Render full app

const INIT_TIMEOUT_MS = 8000; // Safety net — never stay on splash >8s

export default function App(): React.JSX.Element {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Safety timeout — force-proceed even if initialization hangs
    const timer = setTimeout(() => {
      if (!cancelled && !ready) {
        if (__DEV__) {
          console.warn('[App] Init timeout reached — forcing app render');
        }
        setReady(true);
      }
    }, INIT_TIMEOUT_MS);

    const init = async (): Promise<void> => {
      try {
        // Run storage init and heavy module loading in parallel
        await Promise.all([
          storage.initialize().catch(() => {
            // Storage failure is non-critical
          }),
          loadHeavyModules(),
        ]);
      } catch (error) {
        if (__DEV__) {
          console.error('[App] Initialization error:', error);
        }
        // Even on error, try to load heavy modules if not done
        if (!_heavyModulesLoaded) {
          try {
            await loadHeavyModules();
          } catch {
            // Fatal — error boundary will catch render failure
          }
        }
      }

      if (!cancelled) {
        setReady(true);
      }
    };

    init();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // Phase 1: Show branded splash immediately — no heavy dependencies
  if (!ready || !_heavyModulesLoaded) {
    return <LoadingScreen />;
  }

  // Phase 2: Full app with error boundary
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#3D1B5B',
  },
});
