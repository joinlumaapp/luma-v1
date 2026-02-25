// Biometric authentication hook — Face ID / Fingerprint quick re-login
// Uses expo-local-authentication for biometric checks and expo-secure-store for secure token storage

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { storage } from '../utils/storage';

// ─── Constants ──────────────────────────────────────────────────────
const BACKGROUND_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const BIOMETRIC_ENABLED_KEY = 'auth.biometricEnabled';
const LAST_ACTIVE_KEY = 'auth.lastActiveTimestamp';

/** Supported biometric types */
type BiometricType = 'fingerprint' | 'facial' | 'iris' | 'none';

interface BiometricAuthState {
  /** Whether the device supports biometric authentication */
  isAvailable: boolean;
  /** Type of biometric available on the device */
  biometricType: BiometricType;
  /** Whether biometric login is enabled by the user */
  isEnabled: boolean;
  /** Whether biometric prompt is currently showing */
  isPrompting: boolean;
  /** Enable biometric authentication */
  enableBiometric: () => Promise<boolean>;
  /** Disable biometric authentication */
  disableBiometric: () => void;
  /** Manually trigger biometric authentication */
  authenticate: () => Promise<boolean>;
}

/**
 * Dynamically import expo-local-authentication.
 * Returns null if the module is not installed.
 */
async function getLocalAuthentication(): Promise<{
  hasHardwareAsync: () => Promise<boolean>;
  isEnrolledAsync: () => Promise<boolean>;
  authenticateAsync: (options?: {
    promptMessage?: string;
    cancelLabel?: string;
    disableDeviceFallback?: boolean;
    fallbackLabel?: string;
  }) => Promise<{ success: boolean }>;
  supportedAuthenticationTypesAsync: () => Promise<number[]>;
  AuthenticationType: { FINGERPRINT: number; FACIAL_RECOGNITION: number; IRIS: number };
} | null> {
  try {
    // Dynamic import for graceful handling if not installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const module = require('expo-local-authentication') as Awaited<ReturnType<typeof getLocalAuthentication>>;
    return module;
  } catch {
    return null;
  }
}

/**
 * Hook for biometric authentication (Face ID / fingerprint).
 * After first successful login, offers biometric auth for quick re-entry.
 * On app foreground after 5+ min background, prompts for biometric.
 */
export function useBiometricAuth(): BiometricAuthState {
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>('none');
  const [isEnabled, setIsEnabled] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);

  const { isAuthenticated } = useAuthStore();
  const backgroundTimestamp = useRef<number | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // Check biometric availability on mount
  useEffect(() => {
    const checkBiometricSupport = async () => {
      const LocalAuth = await getLocalAuthentication();
      if (!LocalAuth) {
        setIsAvailable(false);
        setBiometricType('none');
        return;
      }

      try {
        const hasHardware = await LocalAuth.hasHardwareAsync();
        const isEnrolled = await LocalAuth.isEnrolledAsync();

        setIsAvailable(hasHardware && isEnrolled);

        if (hasHardware && isEnrolled) {
          const types = await LocalAuth.supportedAuthenticationTypesAsync();
          if (types.includes(LocalAuth.AuthenticationType.FACIAL_RECOGNITION)) {
            setBiometricType('facial');
          } else if (types.includes(LocalAuth.AuthenticationType.FINGERPRINT)) {
            setBiometricType('fingerprint');
          } else if (types.includes(LocalAuth.AuthenticationType.IRIS)) {
            setBiometricType('iris');
          }
        }
      } catch {
        setIsAvailable(false);
        setBiometricType('none');
      }
    };

    checkBiometricSupport();
  }, []);

  // Load biometric preference from storage
  useEffect(() => {
    const loadPreference = () => {
      const enabled = storage.getBoolean(BIOMETRIC_ENABLED_KEY);
      setIsEnabled(enabled);
    };
    loadPreference();
  }, []);

  // Monitor app state changes for background -> foreground transitions
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current === 'active' &&
        (nextAppState === 'background' || nextAppState === 'inactive')
      ) {
        // App going to background — record timestamp
        backgroundTimestamp.current = Date.now();
        storage.setString(LAST_ACTIVE_KEY, String(Date.now()));
      }

      if (
        nextAppState === 'active' &&
        (appState.current === 'background' || appState.current === 'inactive')
      ) {
        // App coming to foreground — check if biometric prompt is needed
        const lastActive = backgroundTimestamp.current;
        if (
          lastActive &&
          Date.now() - lastActive > BACKGROUND_TIMEOUT_MS &&
          isEnabled &&
          isAuthenticated
        ) {
          promptBiometric();
        }
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isEnabled, isAuthenticated]);

  /** Show biometric prompt to the user */
  const promptBiometric = useCallback(async (): Promise<boolean> => {
    const LocalAuth = await getLocalAuthentication();
    if (!LocalAuth || !isAvailable || isPrompting) {
      return false;
    }

    setIsPrompting(true);

    try {
      const biometricLabel =
        biometricType === 'facial'
          ? Platform.OS === 'ios'
            ? 'Face ID'
            : 'Yuz Tanima'
          : 'Parmak Izi';

      const result = await LocalAuth.authenticateAsync({
        promptMessage: `LUMA'ya giris yapmak icin ${biometricLabel} kullanin`,
        cancelLabel: 'Iptal',
        disableDeviceFallback: false,
        fallbackLabel: 'Sifre Kullan',
      });

      if (!result.success) {
        // Biometric failed — user may need to re-authenticate manually
        return false;
      }

      return true;
    } catch {
      return false;
    } finally {
      setIsPrompting(false);
    }
  }, [isAvailable, isPrompting, biometricType]);

  /** Enable biometric authentication — prompts for verification first */
  const enableBiometric = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) return false;

    // Verify biometric works before enabling
    const success = await promptBiometric();
    if (success) {
      storage.setBoolean(BIOMETRIC_ENABLED_KEY, true);
      setIsEnabled(true);
      return true;
    }
    return false;
  }, [isAvailable, promptBiometric]);

  /** Disable biometric authentication */
  const disableBiometric = useCallback((): void => {
    storage.setBoolean(BIOMETRIC_ENABLED_KEY, false);
    setIsEnabled(false);
  }, []);

  /** Manually trigger biometric authentication */
  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!isEnabled || !isAvailable) return false;
    return promptBiometric();
  }, [isEnabled, isAvailable, promptBiometric]);

  return {
    isAvailable,
    biometricType,
    isEnabled,
    isPrompting,
    enableBiometric,
    disableBiometric,
    authenticate,
  };
}
