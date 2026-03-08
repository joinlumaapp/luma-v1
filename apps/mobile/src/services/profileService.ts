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
    try {
      const response = await api.get<ProfileStrengthResponse>('/profiles/strength');
      return response.data;
    } catch {
      // Fallback: compute locally from profile store
      return profileService.computeLocalStrength();
    }
  },

  // Local profile strength computation based on defined scoring weights
  computeLocalStrength: (): ProfileStrengthResponse => {
    // Import lazily to avoid circular dependency at module level
    const { useProfileStore } = require('../stores/profileStore');
    const { useAuthStore } = require('../stores/authStore');
    const { useActivityStore } = require('../stores/activityStore');
    const { useSocialFeedStore } = require('../stores/socialFeedStore');

    const profile = useProfileStore.getState().profile;
    const user = useAuthStore.getState().user;

    // Check activity participation
    let hasJoinedActivity = false;
    try {
      const activities = useActivityStore.getState().activities;
      const userId = user?.id;
      hasJoinedActivity = activities.some((a: { participants: Array<{ userId: string }> }) =>
        a.participants.some((p: { userId: string }) => p.userId === userId)
      );
    } catch { /* store may not be initialized */ }

    // Check if user has created a feed post
    let hasCreatedPost = false;
    try {
      const posts = useSocialFeedStore.getState().posts;
      hasCreatedPost = posts.some((p: { userId: string }) => p.userId === (user?.id ?? 'dev-user-001'));
    } catch { /* store may not be initialized */ }

    const hasPhotos = profile.photos.length > 0;
    const hasBio = profile.bio.length > 0;
    const hasInterests = profile.interestTags.length > 0;
    const isVerified = user?.isVerified ?? false;
    const hasAnswers = Object.keys(profile.answers).length >= 20;

    const breakdown: ProfileStrengthItem[] = [
      { key: 'photos', label: 'Fotoğraf ekle', weight: 10, completed: hasPhotos, tip: 'Profiline fotoğraf ekle (+10)' },
      { key: 'bio', label: 'Biyografi yaz', weight: 10, completed: hasBio, tip: 'Hakkında kısmını doldur (+10)' },
      { key: 'interests', label: 'İlgi alanları ekle', weight: 10, completed: hasInterests, tip: 'İlgi alanlarını seç (+10)' },
      { key: 'activity', label: 'Aktiviteye katıl', weight: 10, completed: hasJoinedActivity, tip: 'Bir aktiviteye katıl (+10)' },
      { key: 'feed_post', label: 'İlk paylaşımını yap', weight: 10, completed: hasCreatedPost, tip: 'Akışta bir şey paylaş (+10)' },
      { key: 'verified', label: 'Profili doğrula', weight: 20, completed: isVerified, tip: 'Yüz doğrulaması yap (+20)' },
      { key: 'questions', label: 'Uyum sorularını tamamla', weight: 30, completed: hasAnswers, tip: 'Tüm uyum sorularını cevapla (+30)' },
    ];

    const percentage = breakdown.reduce((sum, item) => sum + (item.completed ? item.weight : 0), 0);
    const level: 'low' | 'medium' | 'high' = percentage < 40 ? 'low' : percentage < 70 ? 'medium' : 'high';

    let message: string;
    if (percentage === 100) {
      message = '\u2728 Tam Profil';
    } else if (percentage >= 70) {
      message = 'Profilin güçlü! Birkaç adım daha.';
    } else if (percentage >= 40) {
      message = 'Profilini tamamla, daha çok görün.';
    } else {
      message = 'Profilini doldurarak keşfette öne çık.';
    }

    return { percentage, level, message, breakdown };
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
