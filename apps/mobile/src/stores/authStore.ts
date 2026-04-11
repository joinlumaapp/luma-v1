// Auth store — Zustand store for authentication state
// Connected to authService for real API calls with graceful dev fallback

import { create } from 'zustand';
import { authService } from '../services/authService';
import type { VerifySmsResponse, MeResponse } from '../services/authService';
import { socketService } from '../services/socketService';
import { analyticsService, ANALYTICS_EVENTS } from '../services/analyticsService';
import { storage } from '../utils/storage';
import { parseApiError } from '../services/api';
import { devMockOrThrow } from '../utils/mockGuard';
import { clearAllChatData } from '../services/chatPersistence';
import type { AxiosError } from 'axios';

export type PackageTier = 'FREE' | 'PREMIUM' | 'SUPREME';

/** Duration of the Premium trial for new phone-registered users (48 hours in ms) */
const TRIAL_DURATION_MS = 48 * 60 * 60 * 1000;

/** Storage key for persisting trial expiry timestamp */
const TRIAL_EXPIRY_KEY = 'auth.trialExpiresAt';

/** Interval for auto-refreshing access token (14 minutes — tokens typically expire in 15) */
const TOKEN_REFRESH_INTERVAL_MS = 14 * 60 * 1000;

export interface AuthUser {
  id: string;
  displayId: string;
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
  /** Shown once on first MainTabs landing after selfie success — celebratory popup */
  showWelcomeBonus: boolean;
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
  verifySelfie: (selfieBase64: string) => Promise<{ verified: boolean; status: string }>;
  login: (accessToken: string, refreshToken: string, user: AuthUser) => void;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
  restoreSession: () => Promise<boolean>;
  fetchMe: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setVerified: (isVerified: boolean) => void;
  setOnboarded: (isOnboarded: boolean) => void;
  setShowWelcomeBonus: (visible: boolean) => void;
  setStartedOnboarding: (started: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setUser: (user: AuthUser) => void;
  updatePackageTier: (tier: PackageTier) => void;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  activateTrial: () => Promise<void>;
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
  showWelcomeBonus: false,
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
      try {
        devMockOrThrow(error, true, 'authStore.sendOTP');
        set({ isLoading: false, otpCooldownSeconds: 0, otpRemainingAttempts: 5 });
        return true;
      } catch {
        const apiError = parseApiError(error as AxiosError);
        set({ isLoading: false, error: apiError.userMessage });
        return false;
      }
    }
  },

  // ─── Verify OTP ───────────────────────────────────────────
  verifyOTP: async (phone, code) => {
    set({ isLoading: true, error: null });
    try {
      const response: VerifySmsResponse = await authService.verifySms(phone, code);

      if (!response.verified) {
        set({ isLoading: false, error: 'Doğrulama kodu yanlış. Lütfen tekrar deneyin.' });
        return false;
      }

      const user: AuthUser = {
        id: response.user.id,
        displayId: response.user.displayId ?? '',
        phone: response.user.phone,
        isVerified: response.user.isVerified,
        packageTier: (response.user.packageTier as PackageTier) || 'FREE',
      };

      // Persist tokens
      await storage.setTokens(response.accessToken, response.refreshToken);

      // Identify user for analytics (non-blocking)
      try {
        analyticsService.identify({
          userId: user.id,
          packageTier: user.packageTier,
          isVerified: user.isVerified,
        });
      } catch {
        // Analytics failure should not block authentication
      }

      // Connect WebSocket (non-blocking — don't crash auth flow if socket fails)
      try {
        socketService.connect(response.accessToken);
      } catch {
        // Socket connection failure should not block authentication
      }

      // Determine onboarded status from API response:
      // - New user (isNew = true / no profile) => NOT onboarded, needs profile setup
      // - Returning user (isNew = false / has profile) => already onboarded
      const isNewUser = response.user.isNew;
      const isOnboarded = !isNewUser;

      // Persist onboarded state for returning users so session restore works
      if (isOnboarded) {
        await storage.setOnboarded(true);
      }

      set({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        isAuthenticated: true,
        isOnboarded,
        isLoading: false,
        user,
        error: null,
      });

      // Start auto-refresh timer
      get()._startTokenRefreshTimer();

      return true;
    } catch (error: unknown) {
      const mockUser: AuthUser = {
        id: 'dev-user-001',
        displayId: 'LM-00001',
        phone,
        isVerified: false,
        packageTier: 'FREE',
      };
      try {
        devMockOrThrow(error, mockUser, 'authStore.verifyOTP');
        // Dev mock: treat as new user (not onboarded) so onboarding flow is testable
        set({
          accessToken: 'dev-access-token',
          refreshToken: 'dev-refresh-token',
          isAuthenticated: true,
          isOnboarded: false,
          isLoading: false,
          user: mockUser,
          error: null,
        });
        return true;
      } catch {
        const apiError = parseApiError(error as AxiosError);
        set({ isLoading: false, error: apiError.userMessage });
        return false;
      }
    }
  },

  // ─── Verify Selfie ──────────────────────────────────────────
  verifySelfie: async (selfieBase64: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.verifySelfie(selfieBase64);
      set((state) => ({
        isLoading: false,
        user: state.user ? { ...state.user, isVerified: response.verified } : null,
        error: null,
      }));
      return response;
    } catch (error: unknown) {
      const mockResult = { verified: true, status: 'Dev mode: otomatik onaylandi' };
      try {
        devMockOrThrow(error, mockResult, 'authStore.verifySelfie');
        set((state) => ({
          isLoading: false,
          user: state.user ? { ...state.user, isVerified: true } : null,
          error: null,
        }));
        return mockResult;
      } catch {
        const apiError = parseApiError(error as AxiosError);
        set({ isLoading: false, error: apiError.userMessage });
        return { verified: false, status: apiError.userMessage };
      }
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
    // 1. Stop token refresh timer immediately — no more background API calls
    get()._stopTokenRefreshTimer();

    // 2. Disconnect socket and remove all chatStore event listeners.
    //    Order matters: disconnect socket FIRST so no incoming events race
    //    with the state reset below.
    try {
      const { useChatStore } = require('./chatStore') as typeof import('./chatStore');
      useChatStore.getState().disconnectSocketListeners();
    } catch { /* store may not be initialized */ }
    socketService.disconnect();

    // 3. Track analytics then reset identity — must happen before clearing tokens
    analyticsService.track(ANALYTICS_EVENTS.LOGOUT);
    analyticsService.reset();

    // 4. Clear all chat data: in-memory cache + AsyncStorage + resets hydration flag.
    //    Run concurrently with token/storage cleanup.
    const [_chatClear] = await Promise.allSettled([
      clearAllChatData(),
      storage.clearTokens(),
      storage.clearOnboarded(),
    ]);
    storage.delete(TRIAL_EXPIRY_KEY);

    // 5. Call API to invalidate server-side session (best-effort)
    try {
      await authService.logout();
    } catch {
      // Non-critical — server token expires naturally
      if (__DEV__) {
        console.warn('[auth] Logout API call failed — local cleanup complete');
      }
    }

    // 6. Reset own auth state first so navigation immediately sees unauthenticated
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

    // 7. Reset all feature stores — lazy require avoids circular deps.
    //    Every store that holds user-specific data must be listed here.
    const resetStore = <T>(
      loader: () => { getState: () => T & { reset?: () => void } } | { setState: (s: Partial<T>) => void },
      fallbackState?: Partial<T>,
    ) => {
      try {
        const store = loader() as ReturnType<typeof loader>;
        if ('getState' in store && typeof (store as { getState: () => { reset?: () => void } }).getState().reset === 'function') {
          (store as { getState: () => { reset: () => void } }).getState().reset();
        } else if (fallbackState && 'setState' in store) {
          (store as { setState: (s: Partial<T>) => void }).setState(fallbackState);
        }
      } catch { /* store may not be initialized */ }
    };

    // Chat store — isHydrated MUST be reset so hydrateFromStorage() re-runs for next user
    try {
      const { useChatStore } = require('./chatStore') as typeof import('./chatStore');
      useChatStore.setState({
        conversations: [],
        messages: {},
        isLoadingConversations: false,
        isLoadingMessages: false,
        isSending: false,
        typingUsers: {},
        hasMore: {},
        cursors: {},
        totalUnread: 0,
        isHydrated: false,   // ← critical: allows hydrateFromStorage to re-run for next user
        error: null,
        imageUploadProgress: null,
        dailyMessagesSent: 0,
        singleMessageCredits: 0,
        matchDailyMessageCounts: {},
        _socketCleanups: [],
      });
    } catch { /* store may not be initialized */ }

    resetStore(() => require('./profileStore').useProfileStore);
    resetStore(() => require('./callStore').useCallStore);
    resetStore(() => require('./instantConnectStore').useInstantConnectStore);

    try {
      const { useCoinStore } = require('./coinStore') as typeof import('./coinStore');
      useCoinStore.setState({ balance: 0, transactions: [], isLoading: false, error: null,
        adCooldownUntil: null, lastDailyCheckin: null, boostActiveUntil: null });
    } catch { /* store may not be initialized */ }

    try {
      const { useMatchStore } = require('./matchStore') as typeof import('./matchStore');
      useMatchStore.setState({ matches: [], selectedMatch: null, isLoading: false, totalCount: 0, error: null });
    } catch { /* store may not be initialized */ }

    try {
      const { useDiscoveryStore } = require('./discoveryStore') as typeof import('./discoveryStore');
      useDiscoveryStore.setState({
        cards: [], currentIndex: 0, dailyRemaining: 0, isLoading: false,
        showMatchAnimation: false, currentMatchId: null, matchAnimationType: null,
        error: null, canUndo: false, lastSwipedProfile: null, lastSwipeDirection: null,
        undosUsedToday: 0, batchCooldownEnd: null,
        totalCandidates: 0, premiumImpressions: 0,
        // Reset filters so next user does not inherit previous user's age/distance/gender prefs
        filters: {
          minAge: 18, maxAge: 40, maxDistance: 50, intentionTags: [], genderPreference: 'all',
          verifiedOnly: false, height: null, weight: null, education: [], smoking: [], drinking: [],
          exercise: [], zodiac: [], religion: [], children: [], pets: [], maritalStatus: [],
          languages: [], ethnicity: [], nationality: [], interests: [], sexualOrientation: [], values: [],
        },
      });
    } catch { /* store may not be initialized */ }

    try {
      const { useEngagementStore } = require('./engagementStore') as typeof import('./engagementStore');
      useEngagementStore.setState({
        currentRewardDay: 1, dailyRewardStreak: 0, lastRewardClaimDate: null,
        collectedDays: [], showDailyRewardModal: false, currentChallenge: null,
        challengeProgress: 0, challengeCompleted: false, challengeRewardClaimed: false,
        challengeDate: null, likesTeaserCount: 0, likesTeaserProfiles: [],
        showFlashBoost: false, flashBoostShownToday: false, flashBoostExpiresAt: null,
        matchCountdowns: {}, leaderboard: [], userRank: null,
        isLoading: false,
      });
    } catch { /* store may not be initialized */ }

    try {
      const { useStoryStore } = require('./storyStore') as typeof import('./storyStore');
      useStoryStore.setState({ storyUsers: [], myStories: [], isLoading: false, isCreating: false });
    } catch { /* store may not be initialized */ }

    try {
      const { useNotificationStore } = require('./notificationStore') as typeof import('./notificationStore');
      useNotificationStore.setState({ notifications: [], unreadCount: 0, isLoading: false });
    } catch { /* store may not be initialized */ }

    // Previously missing stores — now included
    try {
      const { useSocialFeedStore } = require('./socialFeedStore') as typeof import('./socialFeedStore');
      useSocialFeedStore.setState({ posts: [], isLoading: false, hasMore: false, cursor: null });
    } catch { /* store may not be initialized */ }

    try {
      const { useActivityStore } = require('./activityStore') as typeof import('./activityStore');
      useActivityStore.setState({ activities: [], isLoading: false, totalCount: 0, selectedCategory: null });
    } catch { /* store may not be initialized */ }

    try {
      const { useCrossedPathsStore } = require('./crossedPathsStore') as typeof import('./crossedPathsStore');
      useCrossedPathsStore.setState({ paths: [], isLoading: false, totalCount: 0 });
    } catch { /* store may not be initialized */ }

    try {
      const { useWaveStore } = require('./waveStore') as typeof import('./waveStore');
      useWaveStore.setState({ receivedWaves: [], sentWaves: [], quota: null, isLoading: false, pendingCount: 0 });
    } catch { /* store may not be initialized */ }

    // Reset premium store — critical: next user must not inherit stale tier/snapshot
    try {
      const { usePremiumStore } = require('./premiumStore') as typeof import('./premiumStore');
      usePremiumStore.getState().reset();
    } catch { /* store may not be initialized */ }

    // Reset remaining feature stores that hold user-specific data
    try {
      const { useViewersStore } = require('./viewersStore') as typeof import('./viewersStore');
      useViewersStore.setState({
        viewers: [], revealedIds: new Set<string>(), dailyRevealsUsed: 0,
        dailyRevealsLimit: 1, isLoading: false, error: null,
      });
    } catch { /* store may not be initialized */ }

    try {
      const { useLikesRevealStore } = require('./likesRevealStore') as typeof import('./likesRevealStore');
      useLikesRevealStore.setState({ revealedIds: new Set<string>(), dailyRevealsUsed: 0 });
    } catch { /* store may not be initialized */ }

    try {
      const { useSecretAdmirerStore } = require('./secretAdmirerStore') as typeof import('./secretAdmirerStore');
      useSecretAdmirerStore.setState({ receivedAdmirers: [], isLoading: false, error: null });
    } catch { /* store may not be initialized */ }

    try {
      const { useWeeklyTopStore } = require('./weeklyTopStore') as typeof import('./weeklyTopStore');
      useWeeklyTopStore.setState({ matches: [], generatedAt: null, nextRefreshAt: null, isLoading: false });
    } catch { /* store may not be initialized */ }

    try {
      const { useFeedInteractionStore } = require('./feedInteractionStore') as typeof import('./feedInteractionStore');
      useFeedInteractionStore.setState({
        interactionCounts: {}, promptUserId: null, dismissedUserIds: new Set<string>(),
      });
    } catch { /* store may not be initialized */ }

    try {
      const { useFlirtStore } = require('./flirtStore') as typeof import('./flirtStore');
      useFlirtStore.setState({
        dailyFlirtCount: 0, lastFlirtDate: null, flirtRequests: {},
        lifetimeFlirtsSent: 0, lifetimeFlirtsAccepted: 0, lifetimeFlirtsRejected: 0,
      });
    } catch { /* store may not be initialized */ }

    try {
      const { useMessageTrackingStore } = require('./messageTrackingStore') as typeof import('./messageTrackingStore');
      useMessageTrackingStore.setState({
        dailyMessageCount: 0, lastMessageDate: null, messagesPerUser: {},
        lifetimeMessagesSent: 0,
      });
    } catch { /* store may not be initialized */ }

    try {
      const { useCallHistoryStore } = require('./callHistoryStore') as typeof import('./callHistoryStore');
      useCallHistoryStore.getState().reset();
    } catch { /* store may not be initialized */ }

    try {
      const { useSwipeRateLimiterStore } = require('./swipeRateLimiterStore') as typeof import('./swipeRateLimiterStore');
      useSwipeRateLimiterStore.getState().resetSession();
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
    } catch (error) {
      try {
        return devMockOrThrow(error, true, 'authStore.refreshTokens');
      } catch {
        // Refresh failed — force logout
        await get().logout();
        return false;
      }
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
          displayId: me.displayId ?? '',
          phone: me.phone,
          isVerified: me.isFullyVerified,
          packageTier: (me.packageTier as PackageTier) || 'FREE',
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

        // Background-sync premium state from /payments/status.
        // Fire-and-forget: session restore succeeds regardless of premium sync result.
        // premiumStore will push the confirmed tier back to authStore.user.packageTier.
        import('./premiumStore').then(({ usePremiumStore }) => {
          usePremiumStore.getState().syncPremiumState();
        }).catch(() => {});

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
              displayId: me.displayId ?? '',
              phone: me.phone,
              isVerified: me.isFullyVerified,
              packageTier: (me.packageTier as PackageTier) || 'FREE',
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
        displayId: me.displayId ?? '',
        phone: me.phone,
        isVerified: me.isFullyVerified,
        packageTier: (me.packageTier as PackageTier) || 'FREE',
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

  setShowWelcomeBonus: (visible) =>
    set({ showWelcomeBonus: visible }),

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

  activateTrial: async () => {
    // Trial activation MUST be confirmed by the server before we grant GOLD access.
    // The server validates eligibility (first-time user, not previously trialed, etc.)
    // and returns the canonical expiresAt that we persist locally.
    try {
      const api = (await import('../services/api')).default;
      const res = await api.post<{ packageTier: string; expiresAt: string }>('/payments/trial/activate');
      const expiresAt = new Date(res.data.expiresAt).getTime();
      storage.setNumber(TRIAL_EXPIRY_KEY, expiresAt);
      set((state) => ({
        trialExpiresAt: expiresAt,
        user: state.user ? { ...state.user, packageTier: (res.data.packageTier as PackageTier) ?? 'PREMIUM' } : null,
      }));
      // Sync premiumStore so the new tier is immediately reflected everywhere
      const { usePremiumStore } = await import('./premiumStore');
      usePremiumStore.getState().syncPremiumState();
    } catch (error) {
      if (__DEV__) {
        // Dev fallback: allow local trial without server confirmation
        if (__DEV__) console.warn('[TRIAL] Server unavailable, using local trial for dev', error);
        const expiresAt = Date.now() + TRIAL_DURATION_MS;
        storage.setNumber(TRIAL_EXPIRY_KEY, expiresAt);
        set((state) => ({
          trialExpiresAt: expiresAt,
          user: state.user ? { ...state.user, packageTier: 'PREMIUM' as PackageTier } : null,
        }));
      } else {
        // In production, bubble the error so the UI can show a proper message
        throw error;
      }
    }
  },

  checkTrialExpiry: () => {
    const { trialExpiresAt, user } = get();
    if (!trialExpiresAt || !user) return false;

    if (Date.now() >= trialExpiresAt) {
      // Trial expired — revert to free tier
      storage.delete(TRIAL_EXPIRY_KEY);
      set({
        trialExpiresAt: null,
        user: { ...user, packageTier: 'FREE' },
      });
      return true; // expired
    }
    return false; // still active
  },

  loadTrialState: () => {
    // Restore the trial expiry timestamp for UI display (e.g. TrialBanner countdown).
    // We intentionally do NOT promote packageTier to PREMIUM here — the server-confirmed
    // tier comes from restoreSession → premiumStore.syncPremiumState which runs on
    // every app startup. Local storage is only used to show the remaining time, not
    // to grant access.
    const saved = storage.getNumber(TRIAL_EXPIRY_KEY);
    if (saved && saved > Date.now()) {
      set({ trialExpiresAt: saved });
    } else if (saved) {
      // Locally tracked trial has expired — clean up the timestamp
      storage.delete(TRIAL_EXPIRY_KEY);
      set({ trialExpiresAt: null });
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
