// Auth store — Zustand store for authentication state

import { create } from 'zustand';
import { analyticsService, ANALYTICS_EVENTS } from '../services/analyticsService';
import { storage } from '../utils/storage';

export type PackageTier = 'free' | 'gold' | 'pro' | 'reserved';

/** Duration of the Gold trial for new phone-registered users (48 hours in ms) */
const TRIAL_DURATION_MS = 48 * 60 * 60 * 1000;

/** Storage key for persisting trial expiry timestamp */
const TRIAL_EXPIRY_KEY = 'auth.trialExpiresAt';

export interface AuthUser {
  id: string;
  phone: string;
  email?: string;
  isVerified: boolean;
  packageTier: PackageTier;
}

interface AuthState {
  // State
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnboarded: boolean;
  hasStartedOnboarding: boolean;
  user: AuthUser | null;
  trialExpiresAt: number | null;

  // Actions
  login: (accessToken: string, refreshToken: string, user: AuthUser) => void;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setVerified: (isVerified: boolean) => void;
  setOnboarded: (isOnboarded: boolean) => void;
  setStartedOnboarding: (started: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setUser: (user: AuthUser) => void;
  updatePackageTier: (tier: PackageTier) => void;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  activateTrial: () => void;
  checkTrialExpiry: () => boolean;
  loadTrialState: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  isOnboarded: false,
  hasStartedOnboarding: false,
  user: null,
  trialExpiresAt: null,

  // Actions
  login: (accessToken, refreshToken, user) => {
    // Identify user for analytics segmentation
    analyticsService.identify({
      userId: user.id,
      packageTier: user.packageTier,
      isVerified: user.isVerified,
    });
    set({
      accessToken,
      refreshToken,
      isAuthenticated: true,
      isLoading: false,
      user,
    });
  },

  logout: () => {
    analyticsService.track(ANALYTICS_EVENTS.AUTH_LOGOUT);
    analyticsService.reset();
    storage.delete(TRIAL_EXPIRY_KEY);
    set({
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isOnboarded: false,
      hasStartedOnboarding: false,
      user: null,
      isLoading: false,
      trialExpiresAt: null,
    });
  },

  setTokens: (accessToken, refreshToken) =>
    set({ accessToken, refreshToken }),

  setVerified: (isVerified) =>
    set((state) => ({
      user: state.user ? { ...state.user, isVerified } : null,
    })),

  setOnboarded: (isOnboarded) =>
    set({ isOnboarded }),

  setStartedOnboarding: (started) =>
    set({ hasStartedOnboarding: started }),

  setLoading: (isLoading) =>
    set({ isLoading }),

  setUser: (user) =>
    set({ user }),

  updatePackageTier: (tier) =>
    set((state) => ({
      user: state.user ? { ...state.user, packageTier: tier } : null,
    })),

  setEmail: (email) =>
    set((state) => ({
      user: state.user ? { ...state.user, email } : null,
    })),

  setPassword: (_password) => {
    // Password is sent to the API during account creation
    // Not stored locally for security — handled by backend
  },

  activateTrial: () => {
    const expiresAt = Date.now() + TRIAL_DURATION_MS;
    storage.setNumber(TRIAL_EXPIRY_KEY, expiresAt);
    set((state) => ({
      trialExpiresAt: expiresAt,
      user: state.user ? { ...state.user, packageTier: 'gold' as PackageTier } : null,
    }));
  },

  checkTrialExpiry: () => {
    const { trialExpiresAt, user } = get();
    if (!trialExpiresAt || !user) return false;

    if (Date.now() >= trialExpiresAt) {
      // Trial expired — revert to free tier
      storage.delete(TRIAL_EXPIRY_KEY);
      set({
        trialExpiresAt: null,
        user: { ...user, packageTier: 'free' },
      });
      return true; // expired
    }
    return false; // still active
  },

  loadTrialState: () => {
    const saved = storage.getNumber(TRIAL_EXPIRY_KEY);
    if (saved && saved > Date.now()) {
      set((state) => ({
        trialExpiresAt: saved,
        user: state.user ? { ...state.user, packageTier: 'gold' as PackageTier } : null,
      }));
    } else if (saved) {
      // Persisted trial has expired — clean up
      storage.delete(TRIAL_EXPIRY_KEY);
      set((state) => ({
        trialExpiresAt: null,
        user: state.user ? { ...state.user, packageTier: 'free' as PackageTier } : null,
      }));
    }
  },
}));
