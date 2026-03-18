// AsyncStorage-backed storage with synchronous in-memory cache
// Drop-in replacement for MMKV — Expo Go compatible
// Tokens are stored in SecureStore (encrypted keychain/keystore) when available

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// In-memory cache for synchronous reads
const cache = new Map<string, string>();
let _initialized = false;

// Storage keys
const KEYS = {
  ACCESS_TOKEN: 'auth.accessToken',
  REFRESH_TOKEN: 'auth.refreshToken',
  ONBOARDED: 'auth.onboarded',
  THEME: 'prefs.theme',
  LANGUAGE: 'prefs.language',
  PUSH_ENABLED: 'prefs.pushEnabled',
  LOCATION_ENABLED: 'prefs.locationEnabled',
  LAST_FEED_REFRESH: 'discovery.lastFeedRefresh',
} as const;

/** Persist a string value: write to cache (sync) + AsyncStorage (async) */
function persistString(key: string, value: string): void {
  cache.set(key, value);
  AsyncStorage.setItem(key, value).catch(() => {});
}

/** Persist a boolean value */
function persistBoolean(key: string, value: boolean): void {
  persistString(key, value ? '1' : '0');
}

/** Persist a number value */
function persistNumber(key: string, value: number): void {
  persistString(key, String(value));
}

export const storage = {
  /**
   * Load all persisted data into the in-memory cache.
   * MUST be awaited before the app renders.
   */
  initialize: async (): Promise<void> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      if (keys.length > 0) {
        const pairs = await AsyncStorage.multiGet(keys);
        for (const [key, value] of pairs) {
          if (value !== null) {
            cache.set(key, value);
          }
        }
      }
    } catch {
      // Storage load failure is non-critical — app starts with defaults
    }
    _initialized = true;
  },

  get isInitialized(): boolean {
    return _initialized;
  },

  // Token management — stored in SecureStore (encrypted keychain/keystore)
  setTokens: async (accessToken: string, refreshToken: string): Promise<void> => {
    cache.set(KEYS.ACCESS_TOKEN, accessToken);
    cache.set(KEYS.REFRESH_TOKEN, refreshToken);
    try {
      await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, accessToken);
      await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken);
    } catch {
      // Fallback to AsyncStorage if SecureStore is unavailable (e.g. older Expo Go)
      AsyncStorage.setItem(KEYS.ACCESS_TOKEN, accessToken).catch(() => {});
      AsyncStorage.setItem(KEYS.REFRESH_TOKEN, refreshToken).catch(() => {});
    }
  },

  getTokens: async (): Promise<{
    accessToken: string | null;
    refreshToken: string | null;
  }> => {
    // Try in-memory cache first
    const cachedAccess = cache.get(KEYS.ACCESS_TOKEN) ?? null;
    const cachedRefresh = cache.get(KEYS.REFRESH_TOKEN) ?? null;
    if (cachedAccess && cachedRefresh) {
      return { accessToken: cachedAccess, refreshToken: cachedRefresh };
    }
    // Try SecureStore
    try {
      const accessToken = await SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
      const refreshToken = await SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
      if (accessToken) cache.set(KEYS.ACCESS_TOKEN, accessToken);
      if (refreshToken) cache.set(KEYS.REFRESH_TOKEN, refreshToken);
      return { accessToken, refreshToken };
    } catch {
      // Fallback to AsyncStorage
      return {
        accessToken: cache.get(KEYS.ACCESS_TOKEN) ?? null,
        refreshToken: cache.get(KEYS.REFRESH_TOKEN) ?? null,
      };
    }
  },

  clearTokens: async (): Promise<void> => {
    cache.delete(KEYS.ACCESS_TOKEN);
    cache.delete(KEYS.REFRESH_TOKEN);
    try {
      await SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN);
      await SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN);
    } catch {
      // Fallback
    }
    AsyncStorage.multiRemove([KEYS.ACCESS_TOKEN, KEYS.REFRESH_TOKEN]).catch(() => {});
  },

  // Onboarding state
  setOnboarded: async (value: boolean): Promise<void> => {
    persistBoolean(KEYS.ONBOARDED, value);
  },

  getOnboarded: async (): Promise<boolean> => {
    return cache.get(KEYS.ONBOARDED) === '1';
  },

  clearOnboarded: async (): Promise<void> => {
    cache.delete(KEYS.ONBOARDED);
    AsyncStorage.removeItem(KEYS.ONBOARDED).catch(() => {});
  },

  // Theme preference
  setTheme: (theme: 'dark' | 'light' | 'system'): void => {
    persistString(KEYS.THEME, theme);
  },

  getTheme: (): 'dark' | 'light' | 'system' => {
    const value = cache.get(KEYS.THEME);
    if (value === 'dark' || value === 'light' || value === 'system') return value;
    return 'dark';
  },

  // Push notification preference
  setPushEnabled: (enabled: boolean): void => {
    persistBoolean(KEYS.PUSH_ENABLED, enabled);
  },

  getPushEnabled: (): boolean => {
    return cache.get(KEYS.PUSH_ENABLED) !== '0';
  },

  // Location sharing preference (default: enabled)
  setLocationEnabled: (enabled: boolean): void => {
    persistBoolean(KEYS.LOCATION_ENABLED, enabled);
  },

  getLocationEnabled: (): boolean => {
    // Default to true if not set
    const value = cache.get(KEYS.LOCATION_ENABLED);
    if (value === undefined) return true;
    return value !== '0';
  },

  // Generic helpers
  setString: (key: string, value: string): void => {
    persistString(key, value);
  },

  getString: (key: string): string | null => {
    return cache.get(key) ?? null;
  },

  setNumber: (key: string, value: number): void => {
    persistNumber(key, value);
  },

  getNumber: (key: string): number | null => {
    const value = cache.get(key);
    if (value === undefined) return null;
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  },

  setBoolean: (key: string, value: boolean): void => {
    persistBoolean(key, value);
  },

  getBoolean: (key: string): boolean => {
    return cache.get(key) === '1';
  },

  delete: (key: string): void => {
    cache.delete(key);
    AsyncStorage.removeItem(key).catch(() => {});
  },

  clearAll: (): void => {
    cache.clear();
    AsyncStorage.clear().catch(() => {});
  },
};
