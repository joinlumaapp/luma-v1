// Profile API service — CRUD operations for user profile

import { API_ROUTES } from '@luma/shared';
import api, { buildUrl } from './api';
import type { ProfileData } from '../stores/profileStore';

// Flat profile fields shared by both response shapes
export interface ProfileFields {
  id?: string;
  firstName: string;
  lastName?: string;
  birthDate: string;
  age?: number;
  gender: string;
  intentionTag: string;
  bio: string;
  city: string;
  isComplete: boolean;
  createdAt?: string;
  updatedAt?: string;
  // Extended fields the backend may include
  // Backend uses jobTitle/drinking/exercise; mobile uses job/alcohol/sports
  job?: string;
  jobTitle?: string;
  education?: string;
  height?: number | null;
  weight?: number | null;
  sexualOrientation?: string;
  zodiacSign?: string;
  educationLevel?: string;
  maritalStatus?: string;
  alcohol?: string;
  drinking?: string;
  smoking?: string;
  children?: string;
  pets?: string;
  religion?: string;
  lifeValues?: string;
  exercise?: string;
  // ── Hakkımda Daha Fazlası — new extended fields ──
  livingSituation?: string;
  languages?: string[];
  sleepSchedule?: string;
  diet?: string;
  workStyle?: string;
  travelFrequency?: string;
  distancePreference?: string;
  communicationStyle?: string;
  hookah?: string;
  personalityType?: string | null;
  interestTags?: string[];
  genderPreference?: string[];
  lookingFor?: string[];
  profileVideo?: { url: string; thumbnailUrl: string; duration: number } | null;
  prompts?: Array<{ id: string; question: string; answer: string; order: number }>;
  favoriteSpots?: Array<{ name: string; category: string }>;
  isIncognito?: boolean;
  incognitoExpiresAt?: number | null;
  isFrozen?: boolean;
  showOnlineStatus?: boolean;
  showDistance?: boolean;
  postCount?: number;
  followerCount?: number;
  followingCount?: number;
}

// Backend GET /profiles/me returns a NESTED structure.
// `profile` is null when the user has not yet created their profile (e.g. SMS-verified but
// onboarding incomplete). The rest of the envelope (userId, photos, profileCompletion) is
// always present.
export interface NestedProfileResponse {
  userId: string;
  profile: ProfileFields | null;
  photos: Array<{ id: string; url: string; order: number; moderationStatus?: string }>;
  profileCompletion: number;
}

// Backend PATCH /profiles returns a FLAT structure (Prisma upsert result).
// Note: the PATCH response may NOT include photos (only the profile record).
export interface FlatProfileResponse extends ProfileFields {
  photos?: Array<{ id: string; url: string; order: number }>;
  completionPercent?: number;
}

// Union type — the mobile app must handle both shapes
export type ProfileResponse = NestedProfileResponse | FlatProfileResponse;

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
    const response = await api.get<ProfileResponse>(API_ROUTES.PROFILE.GET);
    return response.data;
  },

  // Update profile fields — maps mobile field names to backend DTO field names
  updateProfile: async (data: Partial<ProfileData>): Promise<ProfileResponse> => {
    // Map mobile field names to backend expected names
    const { job, sports, alcohol, ...rest } = data as Record<string, unknown>;
    const payload: Record<string, unknown> = { ...rest };
    if (job !== undefined) payload.jobTitle = job;
    if (sports !== undefined) payload.exercise = sports;
    if (alcohol !== undefined) payload.drinking = alcohol;
    // Remove mobile-only fields that backend doesn't understand
    delete payload.genderPreference;
    delete payload.lookingFor;
    delete payload.photos;
    delete payload.answers;
    delete payload.personalityType;
    delete payload.isComplete;
    delete payload.profileVideo;
    delete payload.prompts;
    delete payload.favoriteSpots;
    delete payload.isIncognito;
    delete payload.incognitoExpiresAt;
    delete payload.isFrozen;
    delete payload.showOnlineStatus;
    delete payload.showDistance;
    delete payload.postCount;
    delete payload.followerCount;
    delete payload.followingCount;
    const response = await api.patch<ProfileResponse>(API_ROUTES.PROFILE.UPDATE, payload);
    return response.data;
  },

  // Upload a new photo
  uploadPhoto: async (
    photoUri: string,
    order: number
  ): Promise<{ id: string; url: string }> => {
    // Determine MIME type from file extension
    const extension = photoUri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };
    const mimeType = mimeTypes[extension] ?? 'image/jpeg';

    const formData = new FormData();
    formData.append('photo', {
      uri: photoUri,
      type: mimeType,
      name: `photo_${order}.${extension === 'jpeg' ? 'jpg' : extension}`,
    } as unknown as Blob);
    formData.append('order', String(order));

    const response = await api.post<{ id: string; url: string }>(
      API_ROUTES.PROFILE.UPLOAD_PHOTO,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data;
  },

  // Delete a photo
  deletePhoto: async (photoId: string): Promise<void> => {
    await api.delete(buildUrl(API_ROUTES.PROFILE.DELETE_PHOTO, { photoId }));
  },

  // Reorder photos
  reorderPhotos: async (photoIds: string[]): Promise<void> => {
    await api.patch(API_ROUTES.PROFILE.REORDER_PHOTOS, { photoIds });
  },

  // Set intention tag
  setIntentionTag: async (tag: string): Promise<void> => {
    await api.patch(API_ROUTES.PROFILE.SET_INTENTION, { intentionTag: tag });
  },

  // Get profile strength/completeness breakdown
  getProfileStrength: async (): Promise<ProfileStrengthResponse> => {
    try {
      const response = await api.get<ProfileStrengthResponse>(API_ROUTES.PROFILE.STRENGTH);
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
      await api.post(buildUrl(API_ROUTES.PROFILE.TRACK_VIEW, { targetUserId }));
    } catch {
      // Silently fail — view tracking is non-critical
    }
  },

  // Get recent profile visitors
  getProfileVisitors: async (): Promise<ProfileVisitorsResponse> => {
    try {
      const response = await api.get<ProfileVisitorsResponse>(API_ROUTES.PROFILE.VISITORS);
      return response.data;
    } catch {
      // Mock fallback for development
      return {
        visitors: [
          { visitorId: 'v1', firstName: 'Elif', photoUrl: 'https://i.pravatar.cc/200?img=5', viewedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), isBlurred: false },
          { visitorId: 'v2', firstName: 'Selin', photoUrl: 'https://i.pravatar.cc/200?img=9', viewedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), isBlurred: false },
          { visitorId: 'v3', firstName: 'Merve', photoUrl: 'https://i.pravatar.cc/200?img=16', viewedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), isBlurred: false },
          { visitorId: 'v4', firstName: null, photoUrl: null, viewedAt: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(), isBlurred: true },
          { visitorId: 'v5', firstName: null, photoUrl: null, viewedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(), isBlurred: true },
        ],
        totalCount: 8,
        canSeeDetails: false,
      };
    }
  },

  // Set or clear mood status (Anlık Ruh Hali)
  setMood: async (mood: string | null): Promise<{
    mood: string | null;
    moodSetAt: string | null;
    expiresAt: string | null;
  }> => {
    const response = await api.patch<{
      mood: string | null;
      moodSetAt: string | null;
      expiresAt: string | null;
    }>('/profiles/mood', { mood });
    return response.data;
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
