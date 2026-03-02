// Sentry error-tracking service for React Native.
// Uses lazy dynamic import to avoid crash when @sentry/react-native is not installed.
// All functions are safe no-ops until initSentry() succeeds.

import { APP_CONFIG } from '../constants/config';

let Sentry: typeof import('@sentry/react-native') | null = null;
let isInitialized = false;

/**
 * Initialize Sentry error tracking. Should be called once at app startup.
 * If the package is not installed or no DSN is configured, all functions become silent no-ops.
 */
export async function initSentry(): Promise<void> {
  try {
    Sentry = await import('@sentry/react-native');
  } catch {
    if (__DEV__) {
      console.log('[Sentry] @sentry/react-native not installed — error tracking disabled');
    }
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Constants = (require('expo-constants') as { default: { expoConfig?: { extra?: { sentryDsn?: string } } } }).default;
  const dsn = Constants.expoConfig?.extra?.sentryDsn ?? '';

  if (!dsn) {
    if (__DEV__) {
      console.log('[Sentry] DSN not configured — error tracking disabled');
    }
    Sentry = null;
    return;
  }

  Sentry.init({
    dsn,
    environment: __DEV__ ? 'development' : 'production',
    release: `luma-mobile@${APP_CONFIG.APP_VERSION}`,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    sendDefaultPii: false,
    enabled: !__DEV__,
  });

  isInitialized = true;

  if (__DEV__) {
    console.log('[Sentry] Initialized (disabled in dev — will activate in production)');
  }
}

/**
 * Capture an exception and send it to Sentry.
 * No-op if Sentry is not initialized.
 */
export function captureException(error: Error, context?: Record<string, string>): void {
  if (!isInitialized || !Sentry) {
    if (__DEV__) {
      console.error('[Sentry] captureException (not initialized):', error.message);
    }
    return;
  }

  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry!.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Set the current authenticated user for Sentry context.
 */
export function setUser(id: string): void {
  if (!isInitialized || !Sentry) return;
  Sentry.setUser({ id });
}

/**
 * Clear the current user context (e.g., on logout).
 */
export function clearUser(): void {
  if (!isInitialized || !Sentry) return;
  Sentry.setUser(null);
}

/**
 * Add a breadcrumb for debugging context in Sentry reports.
 */
export function addBreadcrumb(
  category: string,
  message: string,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info',
): void {
  if (!isInitialized || !Sentry) return;
  Sentry.addBreadcrumb({ category, message, level });
}

export const sentryService = {
  initSentry,
  captureException,
  setUser,
  clearUser,
  addBreadcrumb,
};
