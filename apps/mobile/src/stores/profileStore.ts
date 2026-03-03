// Profile store — Zustand store for user profile state

import { create } from 'zustand';
import { profileService } from '../services/profileService';
import type { ProfileResponse } from '../services/profileService';
import { PROFILE_CONFIG } from '../constants/config';

export interface ProfileData {
  firstName: string;
  birthDate: string;
  gender: string;
  intentionTag: string;
  interestTags: string[];
  photos: string[];
  bio: string;
  answers: Record<number, number>;
  city: string;
  isComplete: boolean;
}

interface ProfileState {
  // State
  profile: ProfileData;
  isLoading: boolean;
  completionPercent: number;
  // Internal: photo IDs from backend for deletion/reorder operations
  _photoIds: string[];

  // Actions
  setField: (key: string, value: unknown) => void;
  setIntentionTag: (tag: string) => void;
  setInterestTags: (tags: string[]) => void;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<ProfileData>) => Promise<void>;
  uploadPhoto: (uri: string) => Promise<void>;
  deletePhoto: (index: number) => Promise<void>;
  calculateCompletion: () => number;
  reset: () => void;
}

const initialProfile: ProfileData = {
  firstName: '',
  birthDate: '',
  gender: '',
  intentionTag: '',
  interestTags: [],
  photos: [],
  bio: '',
  answers: {},
  city: '',
  isComplete: false,
};

// Transform backend ProfileResponse to store ProfileData
const mapResponseToProfile = (data: ProfileResponse): ProfileData => ({
  firstName: data.firstName,
  birthDate: data.birthDate,
  gender: data.gender,
  intentionTag: data.intentionTag,
  interestTags: Array.isArray((data as { interestTags?: string[] }).interestTags) ? (data as { interestTags?: string[] }).interestTags! : [],
  photos: data.photos.map((p) => p.url),
  bio: data.bio,
  answers: {},
  city: data.city,
  isComplete: data.isComplete,
});

export const useProfileStore = create<ProfileState>((set, get) => ({
  // Initial state
  profile: { ...initialProfile },
  isLoading: false,
  completionPercent: 0,
  _photoIds: [],

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

  fetchProfile: async () => {
    set({ isLoading: true });
    try {
      const data = await profileService.getProfile();
      const profile = mapResponseToProfile(data);
      const photoIds = data.photos.map((p) => p.id);
      set({
        profile,
        _photoIds: photoIds,
        completionPercent: data.completionPercent,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  updateProfile: async (data) => {
    set({ isLoading: true });
    try {
      const response = await profileService.updateProfile(data);
      const profile = mapResponseToProfile(response);
      const photoIds = response.photos.map((p) => p.id);
      set({
        profile,
        _photoIds: photoIds,
        completionPercent: response.completionPercent,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  uploadPhoto: async (uri) => {
    set({ isLoading: true });
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
      }));
    } catch {
      set({ isLoading: false });
    }
  },

  deletePhoto: async (index) => {
    set({ isLoading: true });
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
    } catch {
      set({ isLoading: false });
    }
  },

  calculateCompletion: () => {
    const { profile } = get();
    let filled = 0;
    const totalFields = 7;

    if (profile.firstName.length > 0) filled++;
    if (profile.birthDate.length > 0) filled++;
    if (profile.gender.length > 0) filled++;
    if (profile.intentionTag.length > 0) filled++;
    if (profile.photos.length >= PROFILE_CONFIG.MIN_PHOTOS) filled++;
    if (profile.bio.length >= PROFILE_CONFIG.MIN_BIO_LENGTH) filled++;
    if (Object.keys(profile.answers).length > 0) filled++;

    return Math.round((filled / totalFields) * 100);
  },

  reset: () =>
    set({
      profile: { ...initialProfile },
      isLoading: false,
      completionPercent: 0,
      _photoIds: [],
    }),
}));
