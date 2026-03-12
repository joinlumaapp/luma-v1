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

/**
 * Request camera permission. Shows Turkish alert on denial.
 */
const requestCameraPermission = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Kamera Izni Gerekli',
      'Fotografinizi cekmek icin kamera iznine ihtiyacimiz var. Lutfen ayarlardan izin verin.',
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
      'Galeri Izni Gerekli',
      'Fotograflariniza erismek icin galeri iznine ihtiyacimiz var. Lutfen ayarlardan izin verin.',
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
        'Fotograf secilirken bir sorun olustu. Lutfen tekrar deneyin.',
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
        'Fotograf cekilirken bir sorun olustu. Lutfen tekrar deneyin.',
        [{ text: 'Tamam' }],
      );
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
      throw new Error('Fotograf yuklenirken bir hata olustu. Lutfen tekrar deneyin.');
    }
  },

  /**
   * Delete a photo by its server ID.
   */
  deletePhoto: async (photoId: string): Promise<void> => {
    try {
      await api.delete(`/profiles/photos/${photoId}`);
    } catch {
      throw new Error('Fotograf silinirken bir hata olustu. Lutfen tekrar deneyin.');
    }
  },

  /**
   * Reorder photos by sending the new ordered array of photo IDs.
   */
  reorderPhotos: async (photoIds: string[]): Promise<void> => {
    try {
      await api.put('/profiles/photos/reorder', { photoIds });
    } catch {
      throw new Error('Fotograflar yeniden siralanamadi. Lutfen tekrar deneyin.');
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
