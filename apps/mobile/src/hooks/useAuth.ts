// Custom hook wrapping authStore for auth operations

import { useCallback, useEffect, useState } from 'react';
import { useAuthStore, type AuthUser, type PackageTier } from '../stores/authStore';
import { authService } from '../services/authService';
import { storage } from '../utils/storage';

export interface UseAuthReturn {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnboarded: boolean;
  hasStartedOnboarding: boolean;
  user: AuthUser | null;
  accessToken: string | null;

  // Actions
  login: (phone: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (phone: string) => Promise<boolean>;
  verifySms: (phone: string, code: string) => Promise<boolean>;
  verifySelfie: (photoUri: string) => Promise<boolean>;
  refreshAuth: () => Promise<void>;
  isPackageTier: (tier: PackageTier) => boolean;
  isPremium: boolean;
  /** Session restore loading message — shown when safety timeout is approaching */
  sessionRestoreMessage: string | null;
}

export const useAuth = (): UseAuthReturn => {
  const {
    isAuthenticated,
    isLoading,
    isOnboarded,
    hasStartedOnboarding,
    user,
    accessToken,
    refreshToken,
  } = useAuthStore();

  const storeLogin = useAuthStore((state) => state.login);
  const storeLogout = useAuthStore((state) => state.logout);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setOnboarded = useAuthStore((state) => state.setOnboarded);

  const [sessionRestoreMessage, setSessionRestoreMessage] = useState<string | null>(null);

  // Check stored tokens on mount
  useEffect(() => {
    // Show loading indicator after 1.5s so user knows app is working
    const messageTimer = setTimeout(() => {
      if (useAuthStore.getState().isLoading) {
        setSessionRestoreMessage('Oturum geri yükleniyor...');
      }
    }, 1500);

    // Safety timeout — never stay on splash more than 5 seconds
    const safetyTimer = setTimeout(() => {
      if (useAuthStore.getState().isLoading) {
        if (__DEV__) console.warn('[Auth] Safety timeout — forcing loading=false');
        setLoading(false);
        setSessionRestoreMessage(null);
      }
    }, 5000);

    const initAuth = async () => {
      try {
        const tokens = await storage.getTokens();
        if (tokens.accessToken && tokens.refreshToken) {
          // Set tokens first so API calls work
          useAuthStore.getState().setTokens(tokens.accessToken, tokens.refreshToken);

          try {
            // Validate token by fetching current user
            const me = await authService.getMe();
            storeLogin(tokens.accessToken, tokens.refreshToken, {
              id: me.id,
              displayId: me.displayId,
              phone: me.phone,
              isVerified: me.isFullyVerified,
              packageTier: (me.packageTier as PackageTier) || 'FREE',
            });

            // Use API profile completeness as source of truth, fall back to local storage
            const onboarded = me.profile?.isComplete ?? (await storage.getOnboarded());
            setOnboarded(onboarded);
            if (onboarded) {
              await storage.setOnboarded(true);
            }
          } catch {
            // Token is invalid — try refreshing
            try {
              const refreshResponse = await authService.refreshToken(tokens.refreshToken);
              await storage.setTokens(refreshResponse.accessToken, refreshResponse.refreshToken);

              const me = await authService.getMe();
              storeLogin(refreshResponse.accessToken, refreshResponse.refreshToken, {
                id: me.id,
                displayId: me.displayId,
                phone: me.phone,
                isVerified: me.isFullyVerified,
                packageTier: (me.packageTier as PackageTier) || 'FREE',
              });

              // Use API profile completeness as source of truth, fall back to local storage
              const onboarded = me.profile?.isComplete ?? (await storage.getOnboarded());
              setOnboarded(onboarded);
              if (onboarded) {
                await storage.setOnboarded(true);
              }
            } catch {
              // Refresh also failed — user needs to re-login
              await storage.clearTokens();
              await storage.clearOnboarded();
              setLoading(false);
            }
          }
        } else {
          setLoading(false);
        }
      } catch {
        setLoading(false);
      }
    };
    initAuth();

    return () => {
      clearTimeout(messageTimer);
      clearTimeout(safetyTimer);
    };
  }, []);

  const register = useCallback(async (phone: string, countryCode = '+90'): Promise<boolean> => {
    const response = await authService.register(phone, countryCode);
    return response.isNewUser;
  }, []);

  const verifySms = useCallback(
    async (phone: string, code: string): Promise<boolean> => {
      try {
        const response = await authService.verifySms(phone, code);
        storeLogin(response.accessToken, response.refreshToken, {
          id: response.user.id,
          displayId: response.user.displayId,
          phone: response.user.phone,
          isVerified: response.user.isVerified,
          packageTier: 'FREE',
        });
        await storage.setTokens(response.accessToken, response.refreshToken);
        return true;
      } catch {
        return false;
      }
    },
    [storeLogin]
  );

  const verifySelfie = useCallback(async (photoUri: string): Promise<boolean> => {
    try {
      const response = await authService.verifySelfie(photoUri);
      return response.verified;
    } catch {
      return false;
    }
  }, []);

  const login = useCallback(
    async (phone: string, code: string): Promise<void> => {
      const response = await authService.login(phone, code);
      storeLogin(response.accessToken, response.refreshToken, {
        id: response.user.id,
        displayId: response.user.displayId,
        phone: response.user.phone,
        isVerified: response.user.isVerified,
        packageTier: 'FREE',
      });
      await storage.setTokens(response.accessToken, response.refreshToken);
    },
    [storeLogin]
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout();
    } catch {
      // Continue with local logout even if API call fails
    }
    storeLogout();
    await storage.clearTokens();
    await storage.clearOnboarded();
  }, [storeLogout]);

  const refreshAuth = useCallback(async (): Promise<void> => {
    if (!refreshToken) return;
    try {
      const response = await authService.refreshToken(refreshToken);
      useAuthStore.getState().setTokens(response.accessToken, response.refreshToken);
      await storage.setTokens(response.accessToken, response.refreshToken);
    } catch {
      storeLogout();
      await storage.clearTokens();
    }
  }, [refreshToken, storeLogout]);

  const isPackageTier = useCallback(
    (tier: PackageTier): boolean => {
      return user?.packageTier === tier;
    },
    [user]
  );

  const isPremium = user?.packageTier !== 'FREE';

  return {
    isAuthenticated,
    isLoading,
    isOnboarded,
    hasStartedOnboarding,
    user,
    accessToken,
    login,
    logout,
    register,
    verifySms,
    verifySelfie,
    refreshAuth,
    isPackageTier,
    isPremium,
    sessionRestoreMessage,
  };
};
