// Auth store — Zustand store for authentication state
// Connected to authService for real API calls with graceful dev fallback

import { create } from 'zustand';
import { authService } from '../services/authService';
import type { VerifySmsResponse, MeResponse } from '../services/authService';
import { socketService } from '../services/socketService';
import { analyticsService, ANALYTICS_EVENTS } from '../services/analyticsService';
import { storage } from '../utils/storage';
import { parseApiError } from '../services/api';
import type { AxiosError } from 'axios';

export type PackageTier = 'free' | 'gold' | 'pro' | 'reserved';

/** Duration of the Gold trial for new phone-registered users (48 hours in ms) */
const TRIAL_DURATION_MS = 48 * 60 * 60 * 1000;

/** Storage key for persisting trial expiry timestamp */
const TRIAL_EXPIRY_KEY = 'auth.trialExpiresAt';

/** Interval for auto-refreshing access token (14 minutes — tokens typically expire in 15) */
const TOKEN_REFRESH_INTERVAL_MS = 14 * 60 * 1000;

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
  error: string | null;

  // OTP state
  otpCooldownSeconds: number;
  otpRemainingAttempts: number;

  // Token refresh
  _refreshTimerId: ReturnType<typeof setInterval> | null;

  // Actions
  sendOTP: (phone: string, countryCode: string) => Promise<boolean>;
  verifyOTP: (phone: string, code: string) => Promise<boolean>;
  login: (accessToken: string, refreshToken: string, user: AuthUser) => void;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
  restoreSession: () => Promise<boolean>;
  fetchMe: () => Promise<void>;
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
  clearError: () => void;
  _startTokenRefreshTimer: () => void;
  _stopTokenRefreshTimer: () => void;
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
  error: null,

  // OTP state
  otpCooldownSeconds: 0,
  otpRemainingAttempts: 5,

  // Token refresh timer
  _refreshTimerId: null,

  // ─── Send OTP ─────────────────────────────────────────────
  sendOTP: async (phone, countryCode) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.register(phone, countryCode);
      set({
        isLoading: false,
        otpCooldownSeconds: response.cooldownSeconds,
        otpRemainingAttempts: response.remainingAttempts,
      });
      return true;
    } catch (error: unknown) {
      if (__DEV__) {
        console.warn('OTP gonderme basarisiz, gelistirme modunda devam ediliyor:', error);
        set({ isLoading: false, otpCooldownSeconds: 0, otpRemainingAttempts: 5 });
        return true;
      }
      const apiError = parseApiError(error as AxiosError);
      set({ isLoading: false, error: apiError.userMessage });
      return false;
    }
  },

  // ─── Verify OTP ───────────────────────────────────────────
  verifyOTP: async (phone, code) => {
    set({ isLoading: true, error: null });
    try {
      const response: VerifySmsResponse = await authService.verifySms(phone, code);

      if (!response.verified) {
        set({ isLoading: false, error: 'Dogrulama kodu yanlis. Lutfen tekrar deneyin.' });
        return false;
      }

      const user: AuthUser = {
        id: response.user.id,
        phone: response.user.phone,
        isVerified: response.user.isVerified,
        packageTier: (response.user.packageTier as PackageTier) || 'free',
      };

      // Persist tokens
      await storage.setTokens(response.accessToken, response.refreshToken);

      // Identify user for analytics
      analyticsService.identify({
        userId: user.id,
        packageTier: user.packageTier,
        isVerified: user.isVerified,
      });

      // Connect WebSocket
      socketService.connect(response.accessToken);

      set({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        user,
        error: null,
      });

      // Start auto-refresh timer
      get()._startTokenRefreshTimer();

      return true;
    } catch (error: unknown) {
      if (__DEV__) {
        console.warn('OTP dogrulama basarisiz, gelistirme modunda mock kullanici olusturuluyor:', error);
        const mockUser: AuthUser = {
          id: 'dev-user-001',
          phone,
          isVerified: false,
          packageTier: 'free',
        };
        set({
          accessToken: 'dev-access-token',
          refreshToken: 'dev-refresh-token',
          isAuthenticated: true,
          isLoading: false,
          user: mockUser,
          error: null,
        });
        return true;
      }
      const apiError = parseApiError(error as AxiosError);
      set({ isLoading: false, error: apiError.userMessage });
      return false;
    }
  },

  // ─── Login (from internal state — e.g., after OTP or restore) ──
  login: (accessToken, refreshToken, user) => {
    analyticsService.identify({
      userId: user.id,
      packageTier: user.packageTier,
      isVerified: user.isVerified,
    });

    // Persist tokens
    storage.setTokens(accessToken, refreshToken);

    // Connect WebSocket
    socketService.connect(accessToken);

    set({
      accessToken,
      refreshToken,
      isAuthenticated: true,
      isLoading: false,
      user,
      error: null,
    });

    // Start auto-refresh timer
    get()._startTokenRefreshTimer();
  },

  // ─── Logout ───────────────────────────────────────────────
  logout: async () => {
    // Stop token refresh timer
    get()._stopTokenRefreshTimer();

    // Disconnect WebSocket
    socketService.disconnect();

    // Track analytics
    analyticsService.track(ANALYTICS_EVENTS.LOGOUT);
    analyticsService.reset();

    // Clear persisted data
    storage.delete(TRIAL_EXPIRY_KEY);
    await storage.clearTokens();

    // Call API to invalidate server-side session
    try {
      await authService.logout();
    } catch {
      // Non-critical — server token will expire naturally
      if (__DEV__) {
        console.warn('Cikis API cagrisi basarisiz, yerel temizlik tamamlandi');
      }
    }

    set({
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isOnboarded: false,
      hasStartedOnboarding: false,
      user: null,
      isLoading: false,
      trialExpiresAt: null,
      error: null,
      _refreshTimerId: null,
    });

    // Reset all other stores to prevent stale data leaking between sessions.
    // Lazy require pattern avoids circular dependency issues.
    try {
      const { useProfileStore } = require('./profileStore') as typeof import('./profileStore');
      useProfileStore.getState().reset();
    } catch { /* store may not be initialized */ }

    try {
      const { useCoinStore } = require('./coinStore') as typeof import('./coinStore');
      useCoinStore.setState({
        balance: 0,
        transactions: [],
        isLoading: false,
        error: null,
        adCooldownUntil: null,
        lastDailyCheckin: null,
        boostActiveUntil: null,
      });
    } catch { /* store may not be initialized */ }

    try {
      const { useBadgeStore } = require('./badgeStore') as typeof import('./badgeStore');
      useBadgeStore.setState({ badges: [], isLoading: false, error: null, earnedCount: 0, totalCount: 0 });
    } catch { /* store may not be initialized */ }

    try {
      const { useChatStore } = require('./chatStore') as typeof import('./chatStore');
      useChatStore.setState({
        conversations: [],
        messages: {},
        isLoadingConversations: false,
        isLoadingMessages: false,
        isSending: false,
        typingUsers: {},
        totalUnread: 0,
        error: null,
        dailyMessagesSent: 0,
        singleMessageCredits: 0,
      });
    } catch { /* store may not be initialized */ }

    try {
      const { useMatchStore } = require('./matchStore') as typeof import('./matchStore');
      useMatchStore.setState({
        matches: [],
        selectedMatch: null,
        isLoading: false,
        totalCount: 0,
        error: null,
      });
    } catch { /* store may not be initialized */ }

    try {
      const { useDiscoveryStore } = require('./discoveryStore') as typeof import('./discoveryStore');
      useDiscoveryStore.setState({
        cards: [],
        currentIndex: 0,
        dailyRemaining: 0,
        isLoading: false,
        showMatchAnimation: false,
        currentMatchId: null,
        matchAnimationType: null,
        error: null,
        canUndo: false,
        lastSwipedProfile: null,
        lastSwipeDirection: null,
        undosUsedToday: 0,
        showSuperLikeGlow: false,
        batchCooldownEnd: null,
        totalCandidates: 0,
        premiumImpressions: 0,
      });
    } catch { /* store may not be initialized */ }

    try {
      const { useEngagementStore } = require('./engagementStore') as typeof import('./engagementStore');
      useEngagementStore.setState({
        currentRewardDay: 1,
        dailyRewardStreak: 0,
        lastRewardClaimDate: null,
        collectedDays: [],
        showDailyRewardModal: false,
        currentChallenge: null,
        challengeProgress: 0,
        challengeCompleted: false,
        challengeRewardClaimed: false,
        challengeDate: null,
        likesTeaserCount: 0,
        likesTeaserProfiles: [],
        showFlashBoost: false,
        flashBoostShownToday: false,
        flashBoostExpiresAt: null,
        matchCountdowns: {},
        leaderboard: [],
        userRank: null,
        unlockedAchievements: [],
        pendingAchievementToast: null,
        isLoading: false,
      });
    } catch { /* store may not be initialized */ }

    try {
      const { useStoryStore } = require('./storyStore') as typeof import('./storyStore');
      useStoryStore.setState({
        storyUsers: [],
        myStories: [],
        isLoading: false,
        isCreating: false,
      });
    } catch { /* store may not be initialized */ }

    try {
      const { useNotificationStore } = require('./notificationStore') as typeof import('./notificationStore');
      useNotificationStore.setState({
        notifications: [],
        unreadCount: 0,
        isLoading: false,
      });
    } catch { /* store may not be initialized */ }

    try {
      const { useCallStore } = require('./callStore') as typeof import('./callStore');
      useCallStore.getState().reset();
    } catch { /* store may not be initialized */ }
  },

  // ─── Refresh Tokens ───────────────────────────────────────
  refreshTokens: async () => {
    const { refreshToken: currentRefreshToken } = get();
    if (!currentRefreshToken) return false;

    try {
      const response = await authService.refreshToken(currentRefreshToken);

      // Update tokens in store and storage
      set({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      await storage.setTokens(response.accessToken, response.refreshToken);

      // Reconnect WebSocket with new token
      socketService.reconnectWithToken(response.accessToken);

      return true;
    } catch {
      if (__DEV__) {
        console.warn('Token yenileme basarisiz, gelistirme modunda mevcut token korunuyor');
        return true;
      }
      // Refresh failed — force logout
      await get().logout();
      return false;
    }
  },

  // ─── Restore Session (app startup) ────────────────────────
  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const tokens = await storage.getTokens();
      if (!tokens.accessToken || !tokens.refreshToken) {
        set({ isLoading: false });
        return false;
      }

      // Set tokens first so API calls can use them
      set({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });

      // Attempt to fetch current user from API
      try {
        const me: MeResponse = await authService.getMe();
        const user: AuthUser = {
          id: me.id,
          phone: me.phone,
          isVerified: me.isFullyVerified,
          packageTier: (me.packageTier as PackageTier) || 'free',
        };

        const isOnboarded = me.profile?.isComplete ?? false;

        // Identify for analytics
        analyticsService.identify({
          userId: user.id,
          packageTier: user.packageTier,
          isVerified: user.isVerified,
        });

        // Connect WebSocket
        socketService.connect(tokens.accessToken);

        set({
          user,
          isAuthenticated: true,
          isOnboarded,
          isLoading: false,
          error: null,
        });

        // Start token refresh timer
        get()._startTokenRefreshTimer();

        return true;
      } catch {
        // API unreachable — try refreshing token
        const refreshed = await get().refreshTokens();
        if (refreshed) {
          // Retry getMe with new token
          try {
            const me: MeResponse = await authService.getMe();
            const user: AuthUser = {
              id: me.id,
              phone: me.phone,
              isVerified: me.isFullyVerified,
              packageTier: (me.packageTier as PackageTier) || 'free',
            };
            set({
              user,
              isAuthenticated: true,
              isOnboarded: me.profile?.isComplete ?? false,
              isLoading: false,
              error: null,
            });
            get()._startTokenRefreshTimer();
            return true;
          } catch {
            // Still failing — clear session
            set({ isLoading: false });
            await storage.clearTokens();
            return false;
          }
        }
        set({ isLoading: false });
        return false;
      }
    } catch {
      set({ isLoading: false });
      return false;
    }
  },

  // ─── Fetch Me (refresh user data from API) ────────────────
  fetchMe: async () => {
    try {
      const me: MeResponse = await authService.getMe();
      const user: AuthUser = {
        id: me.id,
        phone: me.phone,
        isVerified: me.isFullyVerified,
        packageTier: (me.packageTier as PackageTier) || 'free',
      };
      set({ user, isOnboarded: me.profile?.isComplete ?? false });
    } catch {
      if (__DEV__) {
        console.warn('Kullanici bilgileri cekilemedi');
      }
    }
  },

  setTokens: (accessToken, refreshToken) => {
    storage.setTokens(accessToken, refreshToken);
    set({ accessToken, refreshToken });
  },

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

  clearError: () => set({ error: null }),

  // ─── Token Refresh Timer ──────────────────────────────────
  _startTokenRefreshTimer: () => {
    const { _refreshTimerId } = get();
    if (_refreshTimerId) {
      clearInterval(_refreshTimerId);
    }
    const timerId = setInterval(() => {
      get().refreshTokens();
    }, TOKEN_REFRESH_INTERVAL_MS);
    set({ _refreshTimerId: timerId });
  },

  _stopTokenRefreshTimer: () => {
    const { _refreshTimerId } = get();
    if (_refreshTimerId) {
      clearInterval(_refreshTimerId);
      set({ _refreshTimerId: null });
    }
  },
}));
