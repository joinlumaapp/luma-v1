// Incognito mode hook — manages invisible browsing for Pro+ users
// When active, user does not appear in discovery feed but existing matches remain visible

import { useCallback, useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useProfileStore } from '../stores/profileStore';
import { canAccess } from '../constants/packageAccess';

interface UseIncognitoResult {
  /** Whether incognito mode is currently active */
  isIncognito: boolean;
  /** Whether the current user's tier allows incognito */
  canUseIncognito: boolean;
  /** Toggle incognito mode on/off */
  toggleIncognito: () => Promise<void>;
  /** Timestamp when incognito expires (null if not set or indefinite) */
  incognitoExpiresAt: number | null;
}

export const useIncognito = (): UseIncognitoResult => {
  const packageTier = useAuthStore((s) => s.user?.packageTier ?? 'FREE');
  const isIncognito = useProfileStore((s) => s.profile.isIncognito);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const incognitoExpiresAt = useProfileStore((s) => s.profile.incognitoExpiresAt ?? null);

  const canUseIncognito = useMemo(
    () => canAccess(packageTier, 'incognito'),
    [packageTier],
  );

  const toggleIncognito = useCallback(async () => {
    if (!canUseIncognito) return;
    await updateProfile({ isIncognito: !isIncognito });
  }, [canUseIncognito, isIncognito, updateProfile]);

  return {
    isIncognito,
    canUseIncognito,
    toggleIncognito,
    incognitoExpiresAt,
  };
};

/** Non-hook version for use outside React components */
export const getIsIncognito = (): boolean => {
  return useProfileStore.getState().profile.isIncognito;
};
