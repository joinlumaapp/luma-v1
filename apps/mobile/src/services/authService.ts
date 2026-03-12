// Auth API service — register, verify, login, logout, refresh, delete

import { API_ROUTES } from '@luma/shared';
import api from './api';

export interface RegisterResponse {
  message: string;
  isNewUser: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
  cooldownSeconds: number;
}

export interface VerifySmsResponse {
  verified: boolean;
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    phone: string;
    isVerified: boolean;
    isNew: boolean;
    packageTier: string;
  };
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface MeResponse {
  id: string;
  phone: string;
  isActive: boolean;
  isSmsVerified: boolean;
  isSelfieVerified: boolean;
  isFullyVerified: boolean;
  packageTier: string;
  goldBalance: number;
  profile: {
    firstName: string;
    birthDate: string;
    gender: string;
    intentionTag: string;
    bio: string;
    city: string;
    isComplete: boolean;
  } | null;
}

export const authService = {
  // Send SMS verification code (register or re-send OTP)
  register: async (phone: string, countryCode: string): Promise<RegisterResponse> => {
    const response = await api.post<RegisterResponse>(API_ROUTES.AUTH.REGISTER, { phone, countryCode });
    return response.data;
  },

  // Verify SMS OTP code
  verifySms: async (phone: string, code: string): Promise<VerifySmsResponse> => {
    const response = await api.post<VerifySmsResponse>(API_ROUTES.AUTH.VERIFY_SMS, {
      phone,
      code,
    });
    return response.data;
  },

  // Upload selfie for verification
  verifySelfie: async (photoUri: string): Promise<{ isVerified: boolean }> => {
    const formData = new FormData();
    formData.append('selfie', {
      uri: photoUri,
      type: 'image/jpeg',
      name: 'selfie.jpg',
    } as unknown as Blob);

    const response = await api.post<{ isVerified: boolean }>(
      API_ROUTES.AUTH.VERIFY_SELFIE,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data;
  },

  // Login with existing credentials (phone + OTP)
  login: async (phone: string, code: string): Promise<VerifySmsResponse> => {
    const response = await api.post<VerifySmsResponse>(API_ROUTES.AUTH.LOGIN, { phone, code });
    return response.data;
  },

  // Logout (invalidate tokens)
  logout: async (): Promise<void> => {
    await api.post(API_ROUTES.AUTH.LOGOUT);
  },

  // Refresh access token
  refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    const response = await api.post<RefreshTokenResponse>(API_ROUTES.AUTH.REFRESH_TOKEN, {
      refreshToken,
    });
    return response.data;
  },

  // Get current authenticated user
  getMe: async (): Promise<MeResponse> => {
    const response = await api.get<MeResponse>('/users/me');
    return response.data;
  },

  // Delete account permanently
  deleteAccount: async (): Promise<void> => {
    await api.delete(API_ROUTES.AUTH.DELETE_ACCOUNT);
  },

  // Export user data (GDPR)
  exportData: async (): Promise<Record<string, unknown>> => {
    const response = await api.get<Record<string, unknown>>(API_ROUTES.AUTH.EXPORT_DATA);
    return response.data;
  },
};
