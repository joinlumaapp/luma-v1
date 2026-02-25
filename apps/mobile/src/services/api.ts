// Axios instance with JWT interceptor, refresh token logic, and error handling

import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { APP_CONFIG } from '../constants/config';
import { useAuthStore } from '../stores/authStore';
import { useNetworkStore } from '../stores/networkStore';
import { requestQueue } from './requestQueue';
import { storage } from '../utils/storage';

// Create axios instance
export const api = axios.create({
  baseURL: APP_CONFIG.API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — auto-attach JWT token
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

// Response interceptor — auto-refresh on 401
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
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If 401 and not a retry — attempt token refresh
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
          `${APP_CONFIG.API_BASE_URL}/auth/refresh-token`,
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

    // Offline detection — queue write requests when there is no network
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

export default api;
