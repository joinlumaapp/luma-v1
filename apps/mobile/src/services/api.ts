// Axios instance with JWT interceptor, refresh token logic, rate limit handling, and error handling

import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { API_ROUTES } from '@luma/shared';
import { APP_CONFIG } from '../constants/config';
import { useAuthStore } from '../stores/authStore';
import { useNetworkStore } from '../stores/networkStore';
import { requestQueue } from './requestQueue';
import { storage } from '../utils/storage';

// ── Turkish user-facing error messages ─────────────────────────────────

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Internet baglantisi bulunamadi. Lutfen baglantinizi kontrol edin.',
  SERVER_ERROR: 'Sunucu hatasi olustu. Lutfen daha sonra tekrar deneyin.',
  RATE_LIMITED: 'Cok fazla istek gonderdiniz. Lutfen biraz bekleyin.',
  SESSION_EXPIRED: 'Oturumunuz sona erdi. Lutfen tekrar giris yapin.',
  UNAUTHORIZED: 'Bu islemi gerceklestirmek icin giris yapmaniz gerekiyor.',
  NOT_FOUND: 'Aradiginiz icerik bulunamadi.',
  FORBIDDEN: 'Bu islemi gerceklestirme yetkiniz yok.',
  VALIDATION_ERROR: 'Girilen bilgilerde hata var. Lutfen kontrol edin.',
  UNKNOWN: 'Beklenmeyen bir hata olustu.',
  REQUEST_QUEUED: 'Cevrimdisi: Istek baglantiginiz geri geldiginde gonderilecek.',
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

// ── Request interceptor — auto-attach JWT token ────────────────────────

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
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
        requestQueue.add(
          method.toUpperCase() as 'POST' | 'PATCH' | 'PUT' | 'DELETE',
          config.url ?? '',
          config.data as unknown,
        );
        // Return a resolved promise so callers don't crash
        return Promise.resolve({ data: null, status: 0, statusText: 'queued', headers: {}, config });
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
