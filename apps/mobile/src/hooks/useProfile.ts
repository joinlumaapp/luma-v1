// Custom hook for profile operations with loading states

import { useCallback, useState } from 'react';
import { useProfileStore, type ProfileData } from '../stores/profileStore';
import { profileService } from '../services/profileService';

export interface UseProfileReturn {
  // State
  profile: ProfileData;
  isLoading: boolean;
  completionPercent: number;
  error: string | null;

  // Actions
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<ProfileData>) => Promise<boolean>;
  uploadPhoto: (uri: string, order: number) => Promise<boolean>;
  deletePhoto: (photoId: string) => Promise<boolean>;
  reorderPhotos: (photoIds: string[]) => Promise<boolean>;
  setIntentionTag: (tag: string) => Promise<boolean>;
}

export const useProfile = (): UseProfileReturn => {
  const profile = useProfileStore((state) => state.profile);
  const storeIsLoading = useProfileStore((state) => state.isLoading);
  const completionPercent = useProfileStore((state) => state.completionPercent);
  const storeSetField = useProfileStore((state) => state.setField);
  const storeUpdateProfile = useProfileStore((state) => state.updateProfile);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await profileService.getProfile();
      storeSetField('firstName', data.firstName);
      storeSetField('birthDate', data.birthDate);
      storeSetField('gender', data.gender);
      storeSetField('intentionTag', data.intentionTag);
      storeSetField('bio', data.bio);
      storeSetField('city', data.city);
      storeSetField('photos', data.photos.map((p) => p.url));
      storeSetField('isComplete', data.isComplete);
    } catch (err) {
      setError('Profil yuklenemedi. Tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  }, [storeSetField]);

  const updateProfile = useCallback(
    async (data: Partial<ProfileData>): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        await profileService.updateProfile(data);
        await storeUpdateProfile(data);
        return true;
      } catch {
        setError('Profil güncellenemedi. Tekrar deneyin.');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [storeUpdateProfile]
  );

  const uploadPhoto = useCallback(
    async (uri: string, order: number): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await profileService.uploadPhoto(uri, order);
        storeSetField('photos', [...profile.photos, result.url]);
        return true;
      } catch {
        setError('Fotograf yuklenemedi. Tekrar deneyin.');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [profile.photos, storeSetField]
  );

  const deletePhoto = useCallback(
    async (photoId: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        await profileService.deletePhoto(photoId);
        return true;
      } catch {
        setError('Fotograf silinemedi. Tekrar deneyin.');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const reorderPhotos = useCallback(
    async (photoIds: string[]): Promise<boolean> => {
      try {
        await profileService.reorderPhotos(photoIds);
        return true;
      } catch {
        setError('Fotograflar siralanamadi. Tekrar deneyin.');
        return false;
      }
    },
    []
  );

  const setIntentionTag = useCallback(
    async (tag: string): Promise<boolean> => {
      try {
        await profileService.setIntentionTag(tag);
        storeSetField('intentionTag', tag);
        return true;
      } catch {
        setError('Niyet etiketi degistirilemedi. Tekrar deneyin.');
        return false;
      }
    },
    [storeSetField]
  );

  return {
    profile,
    isLoading: isLoading || storeIsLoading,
    completionPercent,
    error,
    fetchProfile,
    updateProfile,
    uploadPhoto,
    deletePhoto,
    reorderPhotos,
    setIntentionTag,
  };
};
