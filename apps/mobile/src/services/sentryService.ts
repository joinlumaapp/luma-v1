// Sentry error-tracking service for React Native.
// Wraps @sentry/react-native with graceful no-op behavior when SENTRY_DSN is not configured.

import * as Sentry from '@sentry/react-native';
import { APP_CONFIG } from '../constants/config';

/** Sentry DSN — set via app config or Expo extra. Empty string disables Sentry. */
const SENTRY_DSN = (
  (
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('expo-constants') as { default: { expoConfig?: { extra?: { sentryDsn?: string } } } }
  ).default.expoConfig?.extra?.sentryDsn ?? ''
);

let isInitialized = false;

/**
 * Initialize Sentry error tracking. Should be called once at app startup.
 * If no DSN is configured, all Sentry functions become silent no-ops.
 */
export function initSentry(): void {
  if (!SENTRY_DSN) {
    if (__DEV__) {
      console.log('[Sentry] DSN not configured — error tracking disabled');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    release: `luma-mobile@${APP_CONFIG.APP_VERSION}`,
    // Lower sample rate in production to reduce overhead
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    // Do not send PII by default — userId is attached explicitly via setUser
    sendDefaultPii: false,
    // Disable in development to avoid noise during debugging
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
  if (!isInitialized) {
    if (__DEV__) {
      console.error('[Sentry] captureException (not initialized):', error.message);
    }
    return;
  }

  if (context) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Sentry.withScope((scope: any) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Set the current authenticated user for Sentry context.
 * All subsequent error reports will include this user ID.
 */
export function setUser(id: string): void {
  if (!isInitialized) return;
  Sentry.setUser({ id });
}

/**
 * Clear the current user context (e.g., on logout).
 */
export function clearUser(): void {
  if (!isInitialized) return;
  Sentry.setUser(null);
}

/**
 * Add a breadcrumb for debugging context in Sentry reports.
 * No-op if Sentry is not initialized.
 */
export function addBreadcrumb(
  category: string,
  message: string,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info',
): void {
  if (!isInitialized) return;
  Sentry.addBreadcrumb({ category, message, level });
}

export const sentryService = {
  initSentry,
  captureException,
  setUser,
  clearUser,
  addBreadcrumb,
};
