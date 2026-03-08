// Auth store — Zustand store for authentication state

import { create } from 'zustand';
import { analyticsService, ANALYTICS_EVENTS } from '../services/analyticsService';

export type PackageTier = 'free' | 'gold' | 'pro' | 'reserved';

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
}

export const useAuthStore = create<AuthState>((set) => ({
  // Initial state
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  isOnboarded: false,
  hasStartedOnboarding: false,
  user: null,

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
    set({
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isOnboarded: false,
      hasStartedOnboarding: false,
      user: null,
      isLoading: false,
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
}));
