// Profile store — Zustand store for user profile state

import { create } from 'zustand';
import { profileService } from '../services/profileService';
import type { ProfileResponse, NestedProfileResponse, FlatProfileResponse, ProfileFields } from '../services/profileService';
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
  /** MBTI personality type from the personality quiz (e.g. "ENFP") */
  personalityType: string | null;
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
  personalityType: null,
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
// Migrate legacy English interest IDs to Turkish labels
const LEGACY_TAG_MIGRATION: Record<string, string> = {
  travel: 'Seyahat', music: 'Müzik', sports: 'Spor', cooking: 'Yemek pişirme',
  art: 'Sanat', technology: 'Teknoloji', nature: 'Doğa', books: 'Okuma',
  movies: 'Film', photography: 'Fotoğrafçılık', dance: 'Dans', yoga: 'Yoga',
  gaming: 'Video oyunları', animals: 'Kediler', fashion: 'Moda', football: 'Futbol',
  hiking: 'Yürüyüş', coffee: 'Kahve', reading: 'Okuma', meditation: 'Meditasyon',
  swimming: 'Yüzme', fitness: 'Vücut Geliştirme', beach: 'Denizler',
  architecture: 'Müzeler', design: 'Tasarım', guitar: 'Müzik',
  psychology: 'Akıl oyunları', food: 'Ev yemekleri', cats: 'Kediler',
};
const migrateInterestTags = (tags: string[]): string[] =>
  tags.map((tag) => LEGACY_TAG_MIGRATION[tag] ?? tag);

/**
 * Type guard: returns true when the backend response uses the nested envelope format.
 * GET /profiles/me returns { userId, profile: {...} | null, photos, profileCompletion }.
 *
 * NOTE: `profile` can be null when the user exists (SMS-verified) but has not yet
 * created their UserProfile record during onboarding. We detect the nested format
 * by checking for `userId` and `profileCompletion` keys — NOT by checking whether
 * `profile` is non-null.
 */
const isNestedResponse = (data: ProfileResponse): data is NestedProfileResponse =>
  'userId' in data && 'profileCompletion' in data;

/**
 * Extract photo array from either response shape.
 */
const extractPhotos = (data: ProfileResponse): Array<{ id: string; url: string; order: number }> => {
  if (isNestedResponse(data)) {
    return data.photos ?? [];
  }
  return data.photos ?? [];
};

/**
 * Transform backend ProfileResponse (nested OR flat) to store ProfileData.
 * The nested shape comes from GET /profiles/me; the flat shape comes from
 * PATCH /profiles (updateProfile).
 *
 * When the nested response has profile: null (user has no UserProfile record yet),
 * all profile fields fall back to their defaults via null-coalescing.
 */
const mapResponseToProfile = (data: ProfileResponse): ProfileData => {
  // Resolve the profile fields object — nested responses wrap them in `data.profile`.
  // When profile is null (no UserProfile record), use an empty object so every field
  // falls through to its ?? default below.
  const fields: Partial<ProfileFields> = isNestedResponse(data)
    ? (data.profile ?? {})
    : data;

  const photos = extractPhotos(data);
  const videoData = fields.profileVideo ?? null;

  return {
    firstName: fields.firstName ?? '',
    lastName: fields.lastName ?? '',
    birthDate: fields.birthDate ? String(fields.birthDate) : '',
    gender: fields.gender ?? '',
    genderPreference: Array.isArray(fields.genderPreference) ? fields.genderPreference : [],
    lookingFor: Array.isArray(fields.lookingFor) ? fields.lookingFor : [],
    height: fields.height ?? null,
    sports: (fields as { sports?: string }).sports ?? '',
    smoking: fields.smoking ?? '',
    children: fields.children ?? '',
    intentionTag: fields.intentionTag ?? '',
    interestTags: migrateInterestTags(Array.isArray(fields.interestTags) ? fields.interestTags : []),
    photos: photos.map((p) => p.url),
    bio: fields.bio ?? '',
    answers: {},
    city: fields.city ?? '',
    job: fields.job ?? '',
    education: fields.education ?? '',
    weight: fields.weight ?? null,
    sexualOrientation: fields.sexualOrientation ?? '',
    zodiacSign: fields.zodiacSign ?? '',
    educationLevel: fields.educationLevel ?? '',
    maritalStatus: fields.maritalStatus ?? '',
    alcohol: fields.alcohol ?? '',
    pets: fields.pets ?? '',
    religion: fields.religion ?? '',
    lifeValues: fields.lifeValues ?? '',
    personalityType: fields.personalityType ?? null,
    isComplete: fields.isComplete ?? false,
    profileVideo: videoData ? {
      url: videoData.url,
      thumbnailUrl: videoData.thumbnailUrl,
      duration: videoData.duration,
    } : null,
    prompts: Array.isArray(fields.prompts) ? fields.prompts : [],
    favoriteSpots: Array.isArray(fields.favoriteSpots) ? fields.favoriteSpots : [],
    isIncognito: fields.isIncognito ?? false,
    incognitoExpiresAt: fields.incognitoExpiresAt ?? null,
    isFrozen: fields.isFrozen ?? false,
    showOnlineStatus: fields.showOnlineStatus ?? true,
    showDistance: fields.showDistance ?? true,
    postCount: fields.postCount ?? 0,
    followerCount: fields.followerCount ?? 0,
    followingCount: fields.followingCount ?? 0,
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
  setField: (key, value) => {
    set((state) => ({
      profile: { ...state.profile, [key]: value },
    }));
    // Recalculate after state is written
    set({ completionPercent: get().calculateCompletion() });
  },

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

      if (__DEV__) {
        const nested = isNestedResponse(data);
        const profileObj = nested ? (data as NestedProfileResponse).profile : null;
        console.log('[ProfileStore] fetchProfile response:', {
          isNested: nested,
          hasProfile: profileObj !== null && profileObj !== undefined,
          firstName: nested ? profileObj?.firstName : (data as FlatProfileResponse).firstName,
          photoCount: (nested ? (data as NestedProfileResponse).photos : (data as FlatProfileResponse).photos)?.length ?? 0,
        });
      }

      const profile = mapResponseToProfile(data);
      const photos = extractPhotos(data);
      const photoIds = photos.map((p) => p.id);
      set({
        profile,
        _photoIds: photoIds,
        isLoading: false,
        error: null,
      });
      // Always use local calculation (22 fields) — backend may have old formula
      set({ completionPercent: get().calculateCompletion() });
    } catch (error: unknown) {
      if (__DEV__) {
        console.warn('Profil yükleme başarısız:', error);
      }
      const apiError = parseApiError(error as AxiosError);
      set({ isLoading: false, error: apiError.userMessage });
    }
  },

  updateProfile: async (data) => {
    // Apply changes optimistically so they persist even if API fails
    set((state) => ({
      profile: { ...state.profile, ...data },
      isLoading: true,
      error: null,
    }));
    // Recalculate completion immediately with the new data
    set({ completionPercent: get().calculateCompletion() });

    try {
      const response = await profileService.updateProfile(data);
      const profile = mapResponseToProfile(response);
      const photos = extractPhotos(response);
      // PATCH /profiles may not return photos — preserve existing IDs when absent
      const photoIds = photos.length > 0 ? photos.map((p) => p.id) : get()._photoIds;
      // Preserve existing photo URLs in the profile when backend omits them
      const mergedProfile = profile.photos.length === 0 && get().profile.photos.length > 0
        ? { ...profile, photos: get().profile.photos }
        : profile;
      set({
        profile: mergedProfile,
        _photoIds: photoIds,
        isLoading: false,
        error: null,
      });
      // Use local calculation — backend may have old formula
      set({ completionPercent: get().calculateCompletion() });
    } catch (error: unknown) {
      try {
        devMockOrThrow(error, data, 'profileStore.updateProfile');
        // In dev, keep the optimistic changes (already applied above)
        set({ isLoading: false });
      } catch {
        const apiError = parseApiError(error as AxiosError);
        // Keep the optimistic changes — will sync on next successful save
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

    // Sync with backend (non-blocking — keep local change even if API fails)
    try {
      await profileService.reorderPhotos(newIds);
    } catch {
      // Keep local reorder — will sync on next save
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
    if ((profile.firstName ?? '').length > 0) filled++;
    if ((profile.birthDate ?? '').length > 0) filled++;
    if ((profile.gender ?? '').length > 0) filled++;
    if ((profile.intentionTag ?? '').length > 0) filled++;
    if ((profile.photos ?? []).length >= PROFILE_CONFIG.MIN_PHOTOS) filled++;
    if ((profile.bio ?? '').length >= PROFILE_CONFIG.MIN_BIO_LENGTH) filled++;

    // Basic info
    if ((profile.job ?? '').length > 0) filled++;
    if ((profile.education ?? '').length > 0) filled++;
    if ((profile.city ?? '').length > 0) filled++;
    if (profile.height != null && profile.height > 0) filled++;

    // Extended info
    if ((profile.sexualOrientation ?? '').length > 0) filled++;
    if ((profile.zodiacSign ?? '').length > 0) filled++;
    if ((profile.educationLevel ?? '').length > 0) filled++;
    if ((profile.maritalStatus ?? '').length > 0) filled++;
    if ((profile.alcohol ?? '').length > 0) filled++;
    if ((profile.smoking ?? '').length > 0) filled++;
    if ((profile.children ?? '').length > 0) filled++;
    if ((profile.pets ?? '').length > 0) filled++;
    if ((profile.religion ?? '').length > 0) filled++;

    // Personality
    if ((profile.interestTags ?? []).length > 0) filled++;
    if ((profile.prompts ?? []).length > 0) filled++;

    // Compatibility
    if (Object.keys(profile.answers ?? {}).length > 0) filled++;

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
