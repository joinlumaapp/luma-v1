// Photo service — image picker, compression, upload/delete/reorder via expo-image-picker
// All user-facing messages in Turkish

import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Alert, Platform } from 'react-native';
import api from './api';

export interface PhotoUploadResponse {
  id: string;
  url: string;
  order: number;
}

export interface CompressedImage {
  uri: string;
  width: number;
  height: number;
  size: number;
}

export interface PhotoReorderResponse {
  success: boolean;
}

const MAX_DIMENSION = 1200;
const DEFAULT_QUALITY = 0.8;

const IMAGE_PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  aspect: [3, 4],
  quality: 1, // We compress manually for control
};

const VIDEO_PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ImagePicker.MediaTypeOptions.Videos,
  allowsEditing: true,
  videoMaxDuration: 30, // 30 seconds max for stories
  quality: 1,
};

const ALL_MEDIA_PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ImagePicker.MediaTypeOptions.All,
  allowsEditing: true,
  videoMaxDuration: 30,
  quality: 1,
};

// Story-specific: NO editing/cropping for fastest flow
const STORY_PHOTO_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: false,
  quality: 0.9,
};

const STORY_VIDEO_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ImagePicker.MediaTypeOptions.Videos,
  allowsEditing: false,
  videoMaxDuration: 30,
  quality: 1,
};

const STORY_GALLERY_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ImagePicker.MediaTypeOptions.All,
  allowsEditing: false,
  videoMaxDuration: 30,
  quality: 0.9,
};

/**
 * Request camera permission. Shows Turkish alert on denial.
 */
const requestCameraPermission = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Kamera İzni Gerekli',
      'Fotoğrafınızı çekmek için kamera iznine ihtiyacımız var. Lütfen ayarlardan izin verin.',
      [{ text: 'Tamam' }],
    );
    return false;
  }
  return true;
};

/**
 * Request media library permission. Shows Turkish alert on denial.
 */
const requestGalleryPermission = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Galeri İzni Gerekli',
      'Fotoğraflarınıza erişmek için galeri iznine ihtiyacımız var. Lütfen ayarlardan izin verin.',
      [{ text: 'Tamam' }],
    );
    return false;
  }
  return true;
};

/**
 * Get file size in bytes from a local URI.
 */
const getFileSize = async (uri: string): Promise<number> => {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && 'size' in info) {
      return (info as FileSystem.FileInfo & { size: number }).size;
    }
    return 0;
  } catch {
    return 0;
  }
};

export const photoService = {
  /**
   * Launch gallery picker, return selected image URI or null if cancelled.
   */
  pickFromGallery: async (): Promise<string | null> => {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) return null;

    try {
      const result = await ImagePicker.launchImageLibraryAsync(IMAGE_PICKER_OPTIONS);

      if (result.canceled || result.assets.length === 0) {
        return null;
      }

      return result.assets[0].uri;
    } catch {
      Alert.alert(
        'Hata',
        'Fotoğraf seçilirken bir sorun oluştu. Lütfen tekrar deneyin.',
        [{ text: 'Tamam' }],
      );
      return null;
    }
  },

  /**
   * Launch camera, return captured image URI or null if cancelled.
   */
  takePhoto: async (): Promise<string | null> => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return null;

    try {
      const result = await ImagePicker.launchCameraAsync(IMAGE_PICKER_OPTIONS);

      if (result.canceled || result.assets.length === 0) {
        return null;
      }

      return result.assets[0].uri;
    } catch {
      Alert.alert(
        'Hata',
        'Fotoğraf çekilirken bir sorun oluştu. Lütfen tekrar deneyin.',
        [{ text: 'Tamam' }],
      );
      return null;
    }
  },

  /**
   * Launch gallery picker for video, return URI or null.
   * Max duration: 30 seconds.
   */
  pickVideoFromGallery: async (): Promise<string | null> => {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) return null;

    try {
      const result = await ImagePicker.launchImageLibraryAsync(VIDEO_PICKER_OPTIONS);
      if (result.canceled || result.assets.length === 0) return null;
      return result.assets[0].uri;
    } catch {
      Alert.alert('Hata', 'Video secilirken bir sorun olustu.', [{ text: 'Tamam' }]);
      return null;
    }
  },

  /**
   * Launch camera for video recording, return URI or null.
   * Max duration: 30 seconds.
   */
  recordVideo: async (): Promise<string | null> => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return null;

    try {
      const result = await ImagePicker.launchCameraAsync(VIDEO_PICKER_OPTIONS);
      if (result.canceled || result.assets.length === 0) return null;
      return result.assets[0].uri;
    } catch {
      Alert.alert('Hata', 'Video cekilirken bir sorun olustu.', [{ text: 'Tamam' }]);
      return null;
    }
  },

  /**
   * Launch gallery for photo or video (story creation).
   * Returns { uri, type } or null.
   */
  pickMediaForStory: async (): Promise<{ uri: string; type: 'image' | 'video' } | null> => {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) return null;

    try {
      const result = await ImagePicker.launchImageLibraryAsync(ALL_MEDIA_PICKER_OPTIONS);
      if (result.canceled || result.assets.length === 0) return null;
      const asset = result.assets[0];
      const mediaType = asset.type === 'video' ? 'video' : 'image';
      return { uri: asset.uri, type: mediaType };
    } catch {
      Alert.alert('Hata', 'Medya secilirken bir sorun olustu.', [{ text: 'Tamam' }]);
      return null;
    }
  },

  /**
   * Launch camera for story creation.
   * Opens camera in photo mode (most reliable across all devices).
   * For video stories, use pickMediaForStory (gallery) or recordVideo.
   * Returns { uri, type } or null.
   */
  captureMediaForStory: async (): Promise<{ uri: string; type: 'image' | 'video' } | null> => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return null;

    try {
      // Use Images mode for camera — "All" mode causes "continuous capture not supported" on some devices
      const result = await ImagePicker.launchCameraAsync({
        ...IMAGE_PICKER_OPTIONS,
        allowsEditing: true,
      });
      if (result.canceled || result.assets.length === 0) return null;
      const asset = result.assets[0];
      const mediaType = asset.type === 'video' ? 'video' : 'image';
      return { uri: asset.uri, type: mediaType };
    } catch {
      Alert.alert('Hata', 'Fotograf cekilirken bir sorun olustu.', [{ text: 'Tamam' }]);
      return null;
    }
  },

  // ── Fast story methods (no cropping, no editing screen) ──

  /** Take photo for story — no crop, instant */
  storyTakePhoto: async (): Promise<string | null> => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return null;
    try {
      const result = await ImagePicker.launchCameraAsync(STORY_PHOTO_OPTIONS);
      if (result.canceled || result.assets.length === 0) return null;
      return result.assets[0].uri;
    } catch {
      return null;
    }
  },

  /** Record video for story — no crop, instant, max 30s */
  storyRecordVideo: async (): Promise<string | null> => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return null;
    try {
      const result = await ImagePicker.launchCameraAsync(STORY_VIDEO_OPTIONS);
      if (result.canceled || result.assets.length === 0) return null;
      return result.assets[0].uri;
    } catch {
      return null;
    }
  },

  /** Pick from gallery for story — no crop, instant */
  storyPickFromGallery: async (): Promise<{ uri: string; type: 'image' | 'video' } | null> => {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) return null;
    try {
      const result = await ImagePicker.launchImageLibraryAsync(STORY_GALLERY_OPTIONS);
      if (result.canceled || result.assets.length === 0) return null;
      const asset = result.assets[0];
      return { uri: asset.uri, type: asset.type === 'video' ? 'video' : 'image' };
    } catch {
      return null;
    }
  },

  /**
   * Compress and resize an image. Returns compressed URI + metadata.
   * Max dimension is 1200px on the longest side, quality defaults to 80%.
   */
  compressImage: async (
    uri: string,
    quality: number = DEFAULT_QUALITY,
  ): Promise<CompressedImage> => {
    try {
      // Determine resize actions: scale down to MAX_DIMENSION on longest side
      const actions: ImageManipulator.Action[] = [
        { resize: { width: MAX_DIMENSION } },
      ];

      const result = await ImageManipulator.manipulateAsync(
        uri,
        actions,
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
        },
      );

      const size = await getFileSize(result.uri);

      return {
        uri: result.uri,
        width: result.width,
        height: result.height,
        size,
      };
    } catch {
      // If compression fails, return original with estimated values
      const size = await getFileSize(uri);
      return {
        uri,
        width: MAX_DIMENSION,
        height: Math.round(MAX_DIMENSION * (4 / 3)),
        size,
      };
    }
  },

  /**
   * Upload a photo to /profiles/photos via multipart/form-data.
   * Compresses the image first, then uploads.
   */
  uploadPhoto: async (uri: string, position: number): Promise<PhotoUploadResponse> => {
    // Compress before upload
    const compressed = await photoService.compressImage(uri);

    const fileName = compressed.uri.split('/').pop() ?? `photo_${position}.jpg`;
    const fileType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';

    const formData = new FormData();
    formData.append('photo', {
      uri: Platform.OS === 'ios' ? compressed.uri.replace('file://', '') : compressed.uri,
      type: fileType,
      name: fileName,
    } as unknown as Blob);
    formData.append('order', String(position));

    try {
      const response = await api.post<PhotoUploadResponse>(
        '/profiles/photos',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );

      return response.data;
    } catch {
      throw new Error('Fotoğraf yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  },

  /**
   * Delete a photo by its server ID.
   */
  deletePhoto: async (photoId: string): Promise<void> => {
    try {
      await api.delete(`/profiles/photos/${photoId}`);
    } catch {
      throw new Error('Fotoğraf silinirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  },

  /**
   * Reorder photos by sending the new ordered array of photo IDs.
   */
  reorderPhotos: async (photoIds: string[]): Promise<void> => {
    try {
      await api.put('/profiles/photos/reorder', { photoIds });
    } catch {
      throw new Error('Fotoğraflar yeniden sıralanamadı. Lütfen tekrar deneyin.');
    }
  },

  /**
   * Format file size into human-readable Turkish string.
   */
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  },
};
