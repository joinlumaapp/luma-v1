// Profile store — Zustand store for user profile state

import { create } from 'zustand';
import { profileService } from '../services/profileService';
import type { ProfileResponse } from '../services/profileService';
import { PROFILE_CONFIG } from '../constants/config';
import { parseApiError } from '../services/api';
import { devMockOrThrow } from '../utils/mockGuard';
import type { AxiosError } from 'axios';
import { videoService } from '../services/videoService';

export interface ProfileVideoData {
  url: string;
  thumbnailUrl: string;
  duration: number;
}

export interface ProfileData {
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  genderPreference: string[];
  lookingFor: string[];
  height: number | null;
  sports: string;
  smoking: string;
  children: string;
  intentionTag: string;
  interestTags: string[];
  photos: string[];
  bio: string;
  answers: Record<string, string>;
  city: string;
  job: string;
  education: string;
  // Extended profile fields (Bumpy-inspired)
  weight: number | null;
  sexualOrientation: string;
  zodiacSign: string;
  educationLevel: string;
  maritalStatus: string;
  alcohol: string;
  pets: string;
  religion: string;
  lifeValues: string;
  isComplete: boolean;
  /** Profile video (10-30 seconds) */
  profileVideo: ProfileVideoData | null;
  /** Profile prompts — Hinge-style Q&A (max 3) */
  prompts: Array<{ id: string; question: string; answer: string; order: number }>;
  /** Favorite spots/places shown on profile */
  favoriteSpots: Array<{ name: string; category: string }>;
  /** Incognito mode — hides user from discovery feed */
  isIncognito: boolean;
  /** Timestamp (ms) when incognito expires, null = indefinite while active */
  incognitoExpiresAt: number | null;
  /** Whether the account is frozen (profile hidden, not discoverable) */
  isFrozen: boolean;
  /** Whether to show online status to other users */
  showOnlineStatus: boolean;
  /** Whether to show distance to other users */
  showDistance: boolean;
  /** Social stats — post, follower, following counts */
  postCount: number;
  followerCount: number;
  followingCount: number;
}

interface ProfileState {
  // State
  profile: ProfileData;
  isLoading: boolean;
  completionPercent: number;
  error: string | null;
  // Internal: photo IDs from backend for deletion/reorder operations
  _photoIds: string[];
  // Video upload state
  isVideoUploading: boolean;
  videoUploadProgress: number;

  // Actions
  setField: (key: string, value: unknown) => void;
  setIntentionTag: (tag: string) => void;
  setInterestTags: (tags: string[]) => void;
  setPrompts: (prompts: ProfileData['prompts']) => void;
  setFavoriteSpots: (spots: ProfileData['favoriteSpots']) => void;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<ProfileData>) => Promise<void>;
  uploadPhoto: (uri: string) => Promise<void>;
  deletePhoto: (index: number) => Promise<void>;
  reorderPhotos: (fromIndex: number, toIndex: number) => Promise<void>;
  setMainPhoto: (index: number) => Promise<void>;
  uploadVideo: (uri: string) => Promise<void>;
  deleteVideo: () => Promise<void>;
  calculateCompletion: () => number;
  reset: () => void;
  clearError: () => void;
}

const initialProfile: ProfileData = {
  firstName: '',
  lastName: '',
  birthDate: '',
  gender: '',
  genderPreference: [],
  lookingFor: [],
  height: null,
  sports: '',
  smoking: '',
  children: '',
  intentionTag: '',
  interestTags: [],
  photos: [],
  bio: '',
  answers: {},
  city: '',
  job: '',
  education: '',
  weight: null,
  sexualOrientation: '',
  zodiacSign: '',
  educationLevel: '',
  maritalStatus: '',
  alcohol: '',
  pets: '',
  religion: '',
  lifeValues: '',
  isComplete: false,
  profileVideo: null,
  prompts: [],
  favoriteSpots: [],
  isIncognito: false,
  incognitoExpiresAt: null,
  isFrozen: false,
  showOnlineStatus: true,
  showDistance: true,
  postCount: 0,
  followerCount: 0,
  followingCount: 0,
};

// Transform backend ProfileResponse to store ProfileData
const mapResponseToProfile = (data: ProfileResponse): ProfileData => {
  const videoData = (data as { profileVideo?: { url: string; thumbnailUrl: string; duration: number } | null }).profileVideo ?? null;
  return {
    firstName: data.firstName,
    lastName: (data as { lastName?: string }).lastName ?? '',
    birthDate: data.birthDate,
    gender: data.gender,
    genderPreference: Array.isArray((data as { genderPreference?: string[] }).genderPreference) ? (data as { genderPreference?: string[] }).genderPreference! : [],
    lookingFor: Array.isArray((data as { lookingFor?: string[] }).lookingFor) ? (data as { lookingFor?: string[] }).lookingFor! : [],
    height: (data as { height?: number | null }).height ?? null,
    sports: (data as { sports?: string }).sports ?? '',
    smoking: (data as { smoking?: string }).smoking ?? '',
    children: (data as { children?: string }).children ?? '',
    intentionTag: data.intentionTag,
    interestTags: Array.isArray((data as { interestTags?: string[] }).interestTags) ? (data as { interestTags?: string[] }).interestTags! : [],
    photos: data.photos.map((p) => p.url),
    bio: data.bio,
    answers: {},
    city: data.city,
    job: (data as { job?: string }).job ?? '',
    education: (data as { education?: string }).education ?? '',
    weight: (data as { weight?: number | null }).weight ?? null,
    sexualOrientation: (data as { sexualOrientation?: string }).sexualOrientation ?? '',
    zodiacSign: (data as { zodiacSign?: string }).zodiacSign ?? '',
    educationLevel: (data as { educationLevel?: string }).educationLevel ?? '',
    maritalStatus: (data as { maritalStatus?: string }).maritalStatus ?? '',
    alcohol: (data as { alcohol?: string }).alcohol ?? '',
    pets: (data as { pets?: string }).pets ?? '',
    religion: (data as { religion?: string }).religion ?? '',
    lifeValues: (data as { lifeValues?: string }).lifeValues ?? '',
    isComplete: data.isComplete,
    profileVideo: videoData ? {
      url: videoData.url,
      thumbnailUrl: videoData.thumbnailUrl,
      duration: videoData.duration,
    } : null,
    prompts: Array.isArray((data as { prompts?: ProfileData['prompts'] }).prompts) ? (data as { prompts?: ProfileData['prompts'] }).prompts! : [],
    favoriteSpots: Array.isArray((data as { favoriteSpots?: ProfileData['favoriteSpots'] }).favoriteSpots) ? (data as { favoriteSpots?: ProfileData['favoriteSpots'] }).favoriteSpots! : [],
    isIncognito: (data as { isIncognito?: boolean }).isIncognito ?? false,
    incognitoExpiresAt: (data as { incognitoExpiresAt?: number | null }).incognitoExpiresAt ?? null,
    isFrozen: (data as { isFrozen?: boolean }).isFrozen ?? false,
    showOnlineStatus: (data as { showOnlineStatus?: boolean }).showOnlineStatus ?? true,
    showDistance: (data as { showDistance?: boolean }).showDistance ?? true,
    postCount: (data as { postCount?: number }).postCount ?? 0,
    followerCount: (data as { followerCount?: number }).followerCount ?? 0,
    followingCount: (data as { followingCount?: number }).followingCount ?? 0,
  };
};

export const useProfileStore = create<ProfileState>((set, get) => ({
  // Initial state
  profile: { ...initialProfile },
  isLoading: false,
  completionPercent: 0,
  error: null,
  _photoIds: [],
  isVideoUploading: false,
  videoUploadProgress: 0,

  // Actions
  setField: (key, value) =>
    set((state) => ({
      profile: { ...state.profile, [key]: value },
      completionPercent: get().calculateCompletion(),
    })),

  setIntentionTag: (tag) =>
    set((state) => ({
      profile: { ...state.profile, intentionTag: tag },
    })),

  setInterestTags: (tags) =>
    set((state) => ({
      profile: { ...state.profile, interestTags: tags },
    })),

  setPrompts: (prompts) => {
    set((state) => ({
      profile: { ...state.profile, prompts },
      _hasChanges: true,
    }));
  },

  setFavoriteSpots: (spots) => {
    set((state) => ({
      profile: { ...state.profile, favoriteSpots: spots },
      _hasChanges: true,
    }));
  },

  fetchProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await profileService.getProfile();
      const profile = mapResponseToProfile(data);
      const photoIds = data.photos.map((p) => p.id);
      set({
        profile,
        _photoIds: photoIds,
        completionPercent: data.completionPercent,
        isLoading: false,
        error: null,
      });
    } catch (error: unknown) {
      if (__DEV__) {
        console.warn('Profil yukleme basarisiz:', error);
      }
      const apiError = parseApiError(error as AxiosError);
      set({ isLoading: false, error: apiError.userMessage });
    }
  },

  updateProfile: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await profileService.updateProfile(data);
      const profile = mapResponseToProfile(response);
      const photoIds = response.photos.map((p) => p.id);
      set({
        profile,
        _photoIds: photoIds,
        completionPercent: response.completionPercent,
        isLoading: false,
        error: null,
      });
    } catch (error: unknown) {
      try {
        devMockOrThrow(error, data, 'profileStore.updateProfile');
        // In dev, apply changes locally anyway
        set((state) => ({
          profile: { ...state.profile, ...data },
          isLoading: false,
        }));
      } catch {
        const apiError = parseApiError(error as AxiosError);
        set({ isLoading: false, error: apiError.userMessage });
      }
    }
  },

  uploadPhoto: async (uri) => {
    set({ isLoading: true, error: null });
    try {
      const order = get().profile.photos.length;
      const response = await profileService.uploadPhoto(uri, order);
      set((state) => ({
        profile: {
          ...state.profile,
          photos: [...state.profile.photos, response.url],
        },
        _photoIds: [...state._photoIds, response.id],
        isLoading: false,
        error: null,
      }));
    } catch (error: unknown) {
      try {
        devMockOrThrow(error, uri, 'profileStore.uploadPhoto');
        // In dev, add the local URI directly
        set((state) => ({
          profile: {
            ...state.profile,
            photos: [...state.profile.photos, uri],
          },
          _photoIds: [...state._photoIds, `local-${Date.now()}`],
          isLoading: false,
        }));
      } catch {
        const apiError = parseApiError(error as AxiosError);
        set({ isLoading: false, error: apiError.userMessage });
      }
    }
  },

  deletePhoto: async (index) => {
    set({ isLoading: true, error: null });
    try {
      const photoId = get()._photoIds[index];
      if (photoId) {
        await profileService.deletePhoto(photoId);
      }
      set((state) => ({
        profile: {
          ...state.profile,
          photos: state.profile.photos.filter((_, i) => i !== index),
        },
        _photoIds: state._photoIds.filter((_, i) => i !== index),
        isLoading: false,
      }));
    } catch (error: unknown) {
      try {
        devMockOrThrow(error, true, 'profileStore.deletePhoto');
        // In dev, remove locally anyway
        set((state) => ({
          profile: {
            ...state.profile,
            photos: state.profile.photos.filter((_, i) => i !== index),
          },
          _photoIds: state._photoIds.filter((_, i) => i !== index),
          isLoading: false,
        }));
      } catch {
        const apiError = parseApiError(error as AxiosError);
        set({ isLoading: false, error: apiError.userMessage });
      }
    }
  },

  reorderPhotos: async (fromIndex, toIndex) => {
    const { profile, _photoIds } = get();
    const newPhotos = [...profile.photos];
    const newIds = [..._photoIds];

    // Move item from fromIndex to toIndex
    const [movedPhoto] = newPhotos.splice(fromIndex, 1);
    newPhotos.splice(toIndex, 0, movedPhoto);
    const [movedId] = newIds.splice(fromIndex, 1);
    newIds.splice(toIndex, 0, movedId);

    set({
      profile: { ...profile, photos: newPhotos },
      _photoIds: newIds,
    });

    // Sync with backend
    try {
      await profileService.reorderPhotos(newIds);
    } catch {
      // Revert on failure
      set({ profile: { ...get().profile, photos: profile.photos }, _photoIds });
    }
  },

  setMainPhoto: async (index) => {
    if (index === 0) return; // Already main
    // Move the selected photo to position 0
    await get().reorderPhotos(index, 0);
  },

  uploadVideo: async (uri) => {
    set({ isVideoUploading: true, videoUploadProgress: 0, error: null });
    try {
      const response = await videoService.uploadProfileVideo(uri, (percent) => {
        set({ videoUploadProgress: percent });
      });
      set((state) => ({
        profile: {
          ...state.profile,
          profileVideo: {
            url: response.url,
            thumbnailUrl: response.thumbnailUrl,
            duration: response.duration,
          },
        },
        isVideoUploading: false,
        videoUploadProgress: 100,
      }));
    } catch (error: unknown) {
      try {
        devMockOrThrow(error, uri, 'profileStore.uploadVideo');
        // In dev, save local URI as fallback
        set((state) => ({
          profile: {
            ...state.profile,
            profileVideo: {
              url: uri,
              thumbnailUrl: '',
              duration: 0,
            },
          },
          isVideoUploading: false,
          videoUploadProgress: 0,
        }));
      } catch {
        const apiError = parseApiError(error as AxiosError);
        set({ isVideoUploading: false, videoUploadProgress: 0, error: apiError.userMessage });
      }
    }
  },

  deleteVideo: async () => {
    set({ isLoading: true, error: null });
    try {
      await videoService.deleteProfileVideo();
      set((state) => ({
        profile: {
          ...state.profile,
          profileVideo: null,
        },
        isLoading: false,
      }));
    } catch (error: unknown) {
      try {
        devMockOrThrow(error, true, 'profileStore.deleteVideo');
        set((state) => ({
          profile: {
            ...state.profile,
            profileVideo: null,
          },
          isLoading: false,
        }));
      } catch {
        const apiError = parseApiError(error as AxiosError);
        set({ isLoading: false, error: apiError.userMessage });
      }
    }
  },

  calculateCompletion: () => {
    const { profile } = get();
    let filled = 0;
    const total = 22; // all possible fields

    // Core fields (required-ish)
    if (profile.firstName.length > 0) filled++;
    if (profile.birthDate.length > 0) filled++;
    if (profile.gender.length > 0) filled++;
    if (profile.intentionTag.length > 0) filled++;
    if (profile.photos.length >= PROFILE_CONFIG.MIN_PHOTOS) filled++;
    if (profile.bio.length >= PROFILE_CONFIG.MIN_BIO_LENGTH) filled++;

    // Basic info
    if (profile.job.length > 0) filled++;
    if (profile.education.length > 0) filled++;
    if (profile.city.length > 0) filled++;
    if (profile.height != null && profile.height > 0) filled++;

    // Extended info
    if (profile.sexualOrientation.length > 0) filled++;
    if (profile.zodiacSign.length > 0) filled++;
    if (profile.educationLevel.length > 0) filled++;
    if (profile.maritalStatus.length > 0) filled++;
    if (profile.alcohol.length > 0) filled++;
    if (profile.smoking.length > 0) filled++;
    if (profile.children.length > 0) filled++;
    if (profile.pets.length > 0) filled++;
    if (profile.religion.length > 0) filled++;

    // Personality
    if (profile.interestTags.length > 0) filled++;
    if (profile.prompts.length > 0) filled++;

    // Compatibility
    if (Object.keys(profile.answers).length > 0) filled++;

    return Math.round((filled / total) * 100);
  },

  reset: () =>
    set({
      profile: { ...initialProfile },
      isLoading: false,
      completionPercent: 0,
      error: null,
      _photoIds: [],
      isVideoUploading: false,
      videoUploadProgress: 0,
    }),

  clearError: () => set({ error: null }),
}));
