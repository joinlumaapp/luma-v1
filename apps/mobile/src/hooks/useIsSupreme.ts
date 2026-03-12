// Supreme status hook — single source of truth for Supreme tier checks
// Supreme = 'reserved' package tier

import { useAuthStore } from '../stores/authStore';

/** Returns true if the current user has Supreme (reserved) tier */
export const useIsSupreme = (): boolean => {
  return useAuthStore((s) => s.user?.packageTier === 'reserved');
};

/** Non-hook version for use outside React components */
export const getIsSupreme = (): boolean => {
  return useAuthStore.getState().user?.packageTier === 'reserved';
};
