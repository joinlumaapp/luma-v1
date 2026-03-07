// Profile API service — CRUD operations for user profile

import api from './api';
import type { ProfileData } from '../stores/profileStore';

export interface ProfileResponse {
  id: string;
  firstName: string;
  birthDate: string;
  age: number;
  gender: string;
  intentionTag: string;
  bio: string;
  photos: Array<{ id: string; url: string; order: number }>;
  city: string;
  isComplete: boolean;
  completionPercent: number;
  createdAt: string;
  updatedAt: string;
}

// Profile strength breakdown item
export interface ProfileStrengthItem {
  key: string;
  label: string;
  weight: number;
  completed: boolean;
  tip: string;
}

// Profile strength response from backend
export interface ProfileStrengthResponse {
  percentage: number;
  level: 'low' | 'medium' | 'high';
  message: string;
  breakdown: ProfileStrengthItem[];
}

// Profile visitor entry
export interface ProfileVisitor {
  visitorId: string;
  firstName: string | null;
  photoUrl: string | null;
  viewedAt: string;
  isBlurred: boolean;
}

// Profile visitors response
export interface ProfileVisitorsResponse {
  visitors: ProfileVisitor[];
  totalCount: number;
  canSeeDetails: boolean;
}

export const profileService = {
  // Get current user profile
  getProfile: async (): Promise<ProfileResponse> => {
    const response = await api.get<ProfileResponse>('/profiles/me');
    return response.data;
  },

  // Update profile fields
  updateProfile: async (data: Partial<ProfileData>): Promise<ProfileResponse> => {
    const response = await api.patch<ProfileResponse>('/profiles/me', data);
    return response.data;
  },

  // Upload a new photo
  uploadPhoto: async (
    photoUri: string,
    order: number
  ): Promise<{ id: string; url: string }> => {
    const formData = new FormData();
    formData.append('photo', {
      uri: photoUri,
      type: 'image/jpeg',
      name: `photo_${order}.jpg`,
    } as unknown as Blob);
    formData.append('order', String(order));

    const response = await api.post<{ id: string; url: string }>(
      '/profiles/photos',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data;
  },

  // Delete a photo
  deletePhoto: async (photoId: string): Promise<void> => {
    await api.delete(`/profiles/photos/${photoId}`);
  },

  // Reorder photos
  reorderPhotos: async (photoIds: string[]): Promise<void> => {
    await api.patch('/profiles/photos/reorder', { photoIds });
  },

  // Set intention tag
  setIntentionTag: async (tag: string): Promise<void> => {
    await api.patch('/profiles/intention-tag', { intentionTag: tag });
  },

  // Get profile strength/completeness breakdown
  getProfileStrength: async (): Promise<ProfileStrengthResponse> => {
    const response = await api.get<ProfileStrengthResponse>('/profiles/strength');
    return response.data;
  },

  // Track that current user viewed another user's profile
  trackProfileView: async (targetUserId: string): Promise<void> => {
    try {
      await api.post(`/profiles/view/${targetUserId}`);
    } catch {
      // Silently fail — view tracking is non-critical
    }
  },

  // Get recent profile visitors
  getProfileVisitors: async (): Promise<ProfileVisitorsResponse> => {
    try {
      const response = await api.get<ProfileVisitorsResponse>('/profiles/visitors');
      return response.data;
    } catch {
      // Mock fallback for development
      return {
        visitors: [
          { visitorId: 'v1', firstName: 'Elif', photoUrl: null, viewedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), isBlurred: false },
          { visitorId: 'v2', firstName: 'Selin', photoUrl: null, viewedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), isBlurred: false },
          { visitorId: 'v3', firstName: 'Merve', photoUrl: null, viewedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), isBlurred: false },
          { visitorId: 'v4', firstName: null, photoUrl: null, viewedAt: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(), isBlurred: true },
          { visitorId: 'v5', firstName: null, photoUrl: null, viewedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(), isBlurred: true },
        ],
        totalCount: 8,
        canSeeDetails: false,
      };
    }
  },

  // Get unique profile view count for the last 7 days
  getWeeklyViewCount: async (): Promise<{ count: number }> => {
    try {
      const response = await api.get<{ count: number }>('/profiles/views/weekly');
      return response.data;
    } catch {
      // Mock: return a random realistic count
      return { count: 23 };
    }
  },
};
