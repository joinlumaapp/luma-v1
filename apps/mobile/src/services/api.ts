// Axios instance with JWT interceptor, refresh token logic, rate limit handling, and error handling

import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
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
  { pattern: /\/profile\/me/, actionType: 'update_profile' },
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
      if (__DEV__) {
        console.warn(
          `[API] Rate limited: ${originalRequest.url}`,
          parsed.retryAfterMs ? `retry after ${parsed.retryAfterMs}ms` : ''
        );
      }
      // Attach parsed info to the error for callers
      (error as AxiosError & { apiError?: ApiError }).apiError = parsed;
      return Promise.reject(error);
    }

    // ── 401 Unauthorized — attempt token refresh ────────────────
    if (error.response?.status === 401 && !originalRequest._retry) {
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
        // Refresh failed — log user out
        useAuthStore.getState().logout();
        await storage.clearTokens();
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
