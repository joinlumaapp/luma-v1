// Environment configuration for LUMA mobile app
// Centralizes all environment-dependent values

import { API_VERSION } from '@luma/shared';

type Environment = 'development' | 'staging' | 'production';

/**
 * Detect current environment.
 * __DEV__ is set by React Native bundler (Metro).
 */
const detectEnvironment = (): Environment => {
  if (__DEV__) return 'development';
  // In production builds, check for staging indicator if needed
  // For now, non-dev builds are treated as production
  return 'production';
};

export const ENV = detectEnvironment();

/**
 * Base API URLs per environment.
 * All REST endpoints are prefixed with /api/{version}.
 */
const API_HOSTS: Record<Environment, string> = {
  development: 'http://localhost:3000',
  staging: 'https://api-staging.luma.dating',
  production: 'https://api.luma.dating',
};

const WS_HOSTS: Record<Environment, string> = {
  development: 'ws://localhost:3000',
  staging: 'wss://api-staging.luma.dating',
  production: 'wss://api.luma.dating',
};

/** Full base URL for REST API calls (e.g. http://localhost:3000/api/v1) */
export const API_BASE_URL = `${API_HOSTS[ENV]}/api/${API_VERSION}`;

/** WebSocket connection URL */
export const WS_URL = WS_HOSTS[ENV];

/** Raw host without path — useful for non-versioned endpoints like file uploads */
export const API_HOST = API_HOSTS[ENV];

/** Whether this is a development build */
export const IS_DEV = ENV === 'development';

/** Whether this is a production build */
export const IS_PROD = ENV === 'production';

/** Request timeout in milliseconds */
export const REQUEST_TIMEOUT_MS = 15_000;
