// Axios instance with JWT interceptor, refresh token logic, rate limit handling, and error handling

import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { Alert } from 'react-native';
import { API_ROUTES } from '@luma/shared';
import { APP_CONFIG } from '../constants/config';
import { useAuthStore } from '../stores/authStore';
import { useNetworkStore } from '../stores/networkStore';
import { requestQueue } from './requestQueue';
import { offlineQueue, type OfflineActionType } from './offlineQueue';
import { storage } from '../utils/storage';

// ── Queueable URL patterns → OfflineActionType mapping ──────────────
// When offline, write requests matching these patterns are queued
// with an optimistic response instead of failing.

const QUEUEABLE_PATTERNS: Array<{ pattern: RegExp; actionType: OfflineActionType }> = [
  { pattern: /\/discovery\/like/, actionType: 'like' },
  { pattern: /\/discovery\/pass/, actionType: 'pass' },
  { pattern: /\/discovery\/superlike/, actionType: 'superlike' },
  { pattern: /\/discovery\/undo/, actionType: 'undo_swipe' },
  { pattern: /\/chat\/.*\/messages/, actionType: 'send_message' },
  { pattern: /\/chat\/.*\/react/, actionType: 'react_message' },
  { pattern: /\/profiles\/me/, actionType: 'update_profile' },
  { pattern: /\/users\/.*\/report/, actionType: 'report_user' },
  { pattern: /\/users\/.*\/block/, actionType: 'block_user' },
];

/**
 * Check if a URL matches a queueable action pattern.
 * Returns the OfflineActionType if matched, undefined otherwise.
 */
function getQueueableActionType(url: string): OfflineActionType | undefined {
  for (const { pattern, actionType } of QUEUEABLE_PATTERNS) {
    if (pattern.test(url)) {
      return actionType;
    }
  }
  return undefined;
}

// ── Turkish user-facing error messages ─────────────────────────────────

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'İnternet bağlantısı bulunamadı. Lütfen bağlantınızı kontrol edin.',
  SERVER_ERROR: 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.',
  RATE_LIMITED: 'Çok fazla istek gönderdiniz. Lütfen biraz bekleyin.',
  SESSION_EXPIRED: 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.',
  UNAUTHORIZED: 'Bu işlemi gerçekleştirmek için giriş yapmanız gerekiyor.',
  NOT_FOUND: 'Aradığınız içerik bulunamadı.',
  FORBIDDEN: 'Bu işlemi gerçekleştirme yetkiniz yok.',
  VALIDATION_ERROR: 'Girilen bilgilerde hata var. Lütfen kontrol edin.',
  UNKNOWN: 'Beklenmeyen bir hata oluştu.',
  REQUEST_QUEUED: 'Çevrimdışı: İstek bağlantınız geri geldiğinde gönderilecek.',
} as const;

/** Max retry-after (in ms) for which we auto-retry GET requests on 429 */
const RATE_LIMIT_AUTO_RETRY_THRESHOLD_MS = 10_000;

/**
 * URL patterns for background/silent requests that should NOT show a user-facing
 * Alert when rate-limited. These are requests the app makes automatically
 * (session restore, token refresh, premium sync, version check, notification refresh)
 * — the user did not initiate them and showing a blocking dialog is confusing.
 */
const SILENT_RATE_LIMIT_PATTERNS: ReadonlyArray<RegExp> = [
  /\/auth\/refresh-token/,
  /\/auth\/logout/,
  /\/users\/me$/,
  /\/app\/info/,
  /\/app\/config/,
  /\/health/,
  /\/payments\/status/,
  /\/payments\/trial/,
  /\/notifications/,
];

/**
 * Format a retry-after duration (in ms) into a user-friendly Turkish message.
 * Uses seconds for short waits, minutes for longer ones.
 */
function formatRateLimitMessage(retryAfterMs: number | undefined): string {
  if (!retryAfterMs || retryAfterMs <= 0) {
    return ERROR_MESSAGES.RATE_LIMITED;
  }
  const totalSeconds = Math.ceil(retryAfterMs / 1000);
  if (totalSeconds < 60) {
    return `Çok fazla istek. Lütfen ${totalSeconds} saniye bekleyin.`;
  }
  const minutes = Math.ceil(totalSeconds / 60);
  return `Çok fazla istek. Lütfen ${minutes} dakika bekleyin.`;
}

// ── Typed API error ────────────────────────────────────────────────────

export interface ApiError {
  status: number;
  message: string;
  userMessage: string;
  retryAfterMs?: number;
}

/**
 * Extract a user-friendly Turkish error message from an Axios error.
 */
export function parseApiError(error: AxiosError): ApiError {
  const status = error.response?.status ?? 0;
  const serverMessage =
    (error.response?.data as { message?: string } | undefined)?.message ?? error.message;

  let userMessage: string;
  let retryAfterMs: number | undefined;

  switch (status) {
    case 400:
      userMessage = ERROR_MESSAGES.VALIDATION_ERROR;
      break;
    case 401:
      userMessage = ERROR_MESSAGES.SESSION_EXPIRED;
      break;
    case 403:
      userMessage = ERROR_MESSAGES.FORBIDDEN;
      break;
    case 404:
      userMessage = ERROR_MESSAGES.NOT_FOUND;
      break;
    case 429: {
      userMessage = ERROR_MESSAGES.RATE_LIMITED;
      const retryHeader = error.response?.headers?.['retry-after'];
      if (retryHeader) {
        retryAfterMs = parseInt(String(retryHeader), 10) * 1000;
      }
      break;
    }
    case 0:
      userMessage = ERROR_MESSAGES.NETWORK_ERROR;
      break;
    default:
      userMessage = status >= 500 ? ERROR_MESSAGES.SERVER_ERROR : ERROR_MESSAGES.UNKNOWN;
  }

  return { status, message: serverMessage, userMessage, retryAfterMs };
}

// ── Create axios instance ──────────────────────────────────────────────

export const api = axios.create({
  baseURL: APP_CONFIG.API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor — auto-attach JWT token & pre-flight offline check ──

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Pre-flight offline check for queueable write actions
    // Queue immediately instead of waiting for the network timeout
    const isOffline = !useNetworkStore.getState().isConnected;
    const method = config.method?.toLowerCase();
    if (isOffline && method && ['post', 'patch', 'put', 'delete'].includes(method)) {
      const url = config.url ?? '';
      const actionType = getQueueableActionType(url);
      if (actionType) {
        const upperMethod = method.toUpperCase() as 'POST' | 'PATCH' | 'PUT' | 'DELETE';
        const payload = config.data as Record<string, unknown> | undefined;
        await offlineQueue.enqueue(actionType, upperMethod, url, payload);

        // Cancel the request by returning a custom adapter response
        // This prevents the network call from being attempted at all
        return {
          ...config,
          adapter: () =>
            Promise.resolve({
              data: { _queued: true, _actionType: actionType },
              status: 0,
              statusText: 'queued-preflight',
              headers: {},
              config,
            }),
        } as InternalAxiosRequestConfig;
      }
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// ── Retry interceptor — retry GET requests on network/5xx errors ──────

/** Max number of retry attempts for idempotent GET requests */
const MAX_GET_RETRIES = 2;
/** Backoff delays in milliseconds for each retry attempt */
const RETRY_DELAYS_MS = [1000, 3000];

/** Network error codes that warrant a retry */
const RETRYABLE_CODES = new Set(['ECONNREFUSED', 'ETIMEDOUT', 'ECONNABORTED', 'ERR_NETWORK']);

function isRetryableError(error: AxiosError): boolean {
  // Only retry network errors (no response) or 5xx server errors
  if (!error.response) {
    const code = error.code ?? '';
    return RETRYABLE_CODES.has(code) || error.message === 'Network Error';
  }
  return error.response.status >= 500;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

api.interceptors.response.use(
  undefined,
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig & { _retryCount?: number };
    if (!config) return Promise.reject(error);

    const method = config.method?.toLowerCase();

    // Only retry idempotent GET requests to avoid duplicate mutations
    if (method !== 'get') return Promise.reject(error);

    const retryCount = config._retryCount ?? 0;
    if (retryCount >= MAX_GET_RETRIES) return Promise.reject(error);

    if (!isRetryableError(error)) return Promise.reject(error);

    config._retryCount = retryCount + 1;
    const backoff = RETRY_DELAYS_MS[retryCount] ?? 3000;

    if (__DEV__) {
      console.log(
        `[API] Retry ${config._retryCount}/${MAX_GET_RETRIES} for GET ${config.url} in ${backoff}ms`
      );
    }

    await delay(backoff);
    return api(config);
  }
);

// ── Response interceptor — auto-refresh on 401, handle 429 ────────────

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // ── 429 Rate Limit ──────────────────────────────────────────
    if (error.response?.status === 429) {
      const parsed = parseApiError(error);
      const userMsg = formatRateLimitMessage(parsed.retryAfterMs);
      parsed.userMessage = userMsg;

      if (__DEV__) {
        console.warn(
          `[API] Rate limited: ${originalRequest.url}`,
          parsed.retryAfterMs ? `retry after ${parsed.retryAfterMs}ms` : ''
        );
      }

      // Auto-retry GET requests when the wait is short enough
      const method = originalRequest.method?.toLowerCase();
      if (
        method === 'get' &&
        parsed.retryAfterMs &&
        parsed.retryAfterMs <= RATE_LIMIT_AUTO_RETRY_THRESHOLD_MS
      ) {
        if (__DEV__) {
          console.log(
            `[API] Auto-retrying GET ${originalRequest.url} after ${parsed.retryAfterMs}ms`
          );
        }
        await delay(parsed.retryAfterMs);
        return api(originalRequest);
      }

      // Only show a user-facing alert for requests the user initiated.
      // Background/silent requests (token refresh, session restore, premium sync,
      // version check, etc.) should fail quietly — the caller handles the error.
      const requestUrl = originalRequest.url ?? '';
      const isSilentRequest = SILENT_RATE_LIMIT_PATTERNS.some((p) => p.test(requestUrl));

      if (!isSilentRequest) {
        Alert.alert('Hız Sınırı', userMsg);
      } else if (__DEV__) {
        console.log(`[API] Suppressed rate limit alert for background request: ${requestUrl}`);
      }

      // Attach parsed info to the error for callers
      (error as AxiosError & { apiError?: ApiError }).apiError = parsed;
      return Promise.reject(error);
    }

    // ── 401 Unauthorized — attempt token refresh ────────────────
    // Skip refresh for auth endpoints (logout, refresh-token) to prevent infinite loops
    const requestUrl = originalRequest.url ?? '';
    const isAuthEndpoint = requestUrl.includes('/auth/logout') || requestUrl.includes('/auth/refresh-token');
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(
          `${APP_CONFIG.API_BASE_URL}${API_ROUTES.AUTH.REFRESH_TOKEN}`,
          { refreshToken }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        useAuthStore.getState().setTokens(accessToken, newRefreshToken);
        await storage.setTokens(accessToken, newRefreshToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Refresh failed — log user out (only if currently authenticated)
        if (useAuthStore.getState().isAuthenticated) {
          await useAuthStore.getState().logout();
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ── Offline detection — queue write requests when there is no network ──
    if (!error.response && !useNetworkStore.getState().isConnected) {
      const config = error.config;
      const method = config?.method?.toLowerCase();
      if (config && method && ['post', 'patch', 'put', 'delete'].includes(method)) {
        const url = config.url ?? '';
        const upperMethod = method.toUpperCase() as 'POST' | 'PATCH' | 'PUT' | 'DELETE';
        const payload = config.data as Record<string, unknown> | undefined;

        // Try to enqueue to the persistent offlineQueue if it matches a known action type
        const actionType = getQueueableActionType(url);
        if (actionType) {
          offlineQueue.enqueue(actionType, upperMethod, url, payload);
        } else {
          // Fallback to the legacy requestQueue for non-categorized writes
          requestQueue.add(upperMethod, url, payload);
        }

        // Return an optimistic resolved promise so callers don't crash
        return Promise.resolve({
          data: { _queued: true, _actionType: actionType ?? 'unknown' },
          status: 0,
          statusText: 'queued',
          headers: {},
          config,
        });
      }
    }

    return Promise.reject(error);
  }
);

// ── Type-safe request helpers ──────────────────────────────────────────

/**
 * Build a URL by replacing :param placeholders with actual values.
 * Example: buildUrl('/matches/:id', { id: '123' }) => '/matches/123'
 */
export function buildUrl(route: string, params?: Record<string, string>): string {
  if (!params) return route;
  let url = route;
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(`:${key}`, encodeURIComponent(value));
  }
  return url;
}

export default api;
