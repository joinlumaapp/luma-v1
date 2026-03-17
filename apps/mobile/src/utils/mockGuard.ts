// Mock data guard — ensures mock fallbacks are ONLY used in development.
// In production, API errors propagate to the caller so the UI can show
// proper error states instead of silently displaying fake data.

import { Platform } from 'react-native';

/**
 * Whether mock fallback data is allowed in the current environment.
 * - true in __DEV__ (local development, Expo Go)
 * - false in production builds
 */
export const ALLOW_MOCK_FALLBACK: boolean = __DEV__;

/**
 * Returns mock data in development, re-throws in production.
 *
 * Usage in service catch blocks:
 * ```ts
 * } catch (error) {
 *   return devMockOrThrow(error, MOCK_DATA, 'discoveryService.getFeed');
 * }
 * ```
 */
export function devMockOrThrow<T>(error: unknown, mockData: T, context: string): T {
  if (ALLOW_MOCK_FALLBACK) {
    if (__DEV__) {
      console.warn(`[MOCK] ${context}: API failed, using mock data`, error);
    }
    return mockData;
  }
  throw error;
}

/**
 * Logs a warning in dev when mock data is used. Does NOT catch errors.
 * Use for services that explicitly return mock without trying the API.
 */
export function logMockUsage(context: string): void {
  if (__DEV__) {
    console.warn(`[MOCK] ${context}: Using mock data (no API call)`);
  }
}

/**
 * Guard that prevents mock-only code paths from running in production.
 * Throws immediately if called in a production build.
 */
export function assertDevOnly(context: string): void {
  if (!ALLOW_MOCK_FALLBACK) {
    throw new Error(
      `[PRODUCTION] Mock fallback blocked in ${context}. ` +
      `This code path should not be reached in production. ` +
      `Platform: ${Platform.OS}, Version: ${Platform.Version}`,
    );
  }
}
