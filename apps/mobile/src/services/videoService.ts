// Video service — video picker, recording, compression, upload/delete via expo-image-picker + expo-av
// All user-facing messages in Turkish

import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system';
import { Alert, Platform } from 'react-native';
import api from './api';

// ─── Types ───────────────────────────────────────────────────

export interface VideoUploadResponse {
  url: string;
  thumbnailUrl: string;
  duration: number;
  key: string;
}

export interface VideoMetadata {
  uri: string;
  duration: number;
  width: number;
  height: number;
  size: number;
}

// ─── Constants ───────────────────────────────────────────────

const MAX_VIDEO_DURATION_SECONDS = 30;
const MIN_VIDEO_DURATION_SECONDS = 10;
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXTENSIONS = ['mp4', 'mov'];

// ─── Permission helpers ──────────────────────────────────────

const requestCameraPermission = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Kamera İzni Gerekli',
      'Video çekmek için kamera iznine ihtiyacımız var. Lütfen ayarlardan izin verin.',
      [{ text: 'Tamam' }],
    );
    return false;
  }
  return true;
};

const requestGalleryPermission = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Galeri İzni Gerekli',
      'Videolara erişmek için galeri iznine ihtiyacımız var. Lütfen ayarlardan izin verin.',
      [{ text: 'Tamam' }],
    );
    return false;
  }
  return true;
};

// ─── File helpers ────────────────────────────────────────────

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

const getFileExtension = (uri: string): string => {
  const parts = uri.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

const validateVideoFile = async (uri: string, duration: number): Promise<string | null> => {
  // Validate extension
  const ext = getFileExtension(uri);
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `Desteklenmeyen video formatı. Sadece ${ALLOWED_EXTENSIONS.join(', ').toUpperCase()} kabul edilir.`;
  }

  // Validate duration
  if (duration < MIN_VIDEO_DURATION_SECONDS) {
    return `Video en az ${MIN_VIDEO_DURATION_SECONDS} saniye olmalı.`;
  }
  if (duration > MAX_VIDEO_DURATION_SECONDS) {
    return `Video en fazla ${MAX_VIDEO_DURATION_SECONDS} saniye olmalı.`;
  }

  // Validate file size
  const size = await getFileSize(uri);
  if (size > MAX_FILE_SIZE_BYTES) {
    return `Video boyutu en fazla ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB olmalı.`;
  }

  return null;
};

// ─── Service ─────────────────────────────────────────────────

export const videoService = {
  /**
   * Pick a video from gallery. Returns URI or null if cancelled.
   * Duration is limited to 30 seconds via the picker.
   */
  pickVideoFromGallery: async (): Promise<VideoMetadata | null> => {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) return null;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        videoMaxDuration: MAX_VIDEO_DURATION_SECONDS,
        quality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      });

      if (result.canceled || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      const duration = (asset.duration ?? 0) / 1000; // ms to seconds
      const size = await getFileSize(asset.uri);

      // Validate
      const error = await validateVideoFile(asset.uri, duration);
      if (error) {
        Alert.alert('Video Hatası', error, [{ text: 'Tamam' }]);
        return null;
      }

      return {
        uri: asset.uri,
        duration,
        width: asset.width,
        height: asset.height,
        size,
      };
    } catch {
      Alert.alert(
        'Hata',
        'Video seçilirken bir sorun oluştu. Lütfen tekrar deneyin.',
        [{ text: 'Tamam' }],
      );
      return null;
    }
  },

  /**
   * Record a video using the camera. Returns URI or null if cancelled.
   */
  recordVideo: async (): Promise<VideoMetadata | null> => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return null;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        videoMaxDuration: MAX_VIDEO_DURATION_SECONDS,
        quality: ImagePicker.UIImagePickerControllerQualityType.Medium,
        videoQuality: 1, // Medium quality
      });

      if (result.canceled || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      const duration = (asset.duration ?? 0) / 1000;
      const size = await getFileSize(asset.uri);

      // Validate
      const error = await validateVideoFile(asset.uri, duration);
      if (error) {
        Alert.alert('Video Hatası', error, [{ text: 'Tamam' }]);
        return null;
      }

      return {
        uri: asset.uri,
        duration,
        width: asset.width,
        height: asset.height,
        size,
      };
    } catch {
      Alert.alert(
        'Hata',
        'Video çekilirken bir sorun oluştu. Lütfen tekrar deneyin.',
        [{ text: 'Tamam' }],
      );
      return null;
    }
  },

  /**
   * Generate a thumbnail from the first frame of a video.
   */
  generateThumbnail: async (videoUri: string): Promise<string | null> => {
    try {
      const result = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 500, // 0.5s into the video
        quality: 0.7,
      });
      return result.uri;
    } catch {
      if (__DEV__) {
        console.warn('Video thumbnail olusturulamadi');
      }
      return null;
    }
  },

  /**
   * Upload a profile video via multipart/form-data with progress tracking.
   * Returns the server response with URL, thumbnail, duration.
   */
  uploadProfileVideo: async (
    uri: string,
    onProgress?: (percent: number) => void,
  ): Promise<VideoUploadResponse> => {
    const fileName = uri.split('/').pop() ?? `video_${Date.now()}.mp4`;
    const ext = getFileExtension(uri);
    const mimeType = ext === 'mov' ? 'video/quicktime' : 'video/mp4';

    const formData = new FormData();
    formData.append('video', {
      uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
      type: mimeType,
      name: fileName,
    } as unknown as Blob);

    try {
      const response = await api.post<VideoUploadResponse>(
        '/profiles/video',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (event) => {
            if (event.total && onProgress) {
              const percent = Math.round((event.loaded / event.total) * 100);
              onProgress(percent);
            }
          },
        },
      );

      return response.data;
    } catch {
      throw new Error('Video yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  },

  /**
   * Delete the current profile video.
   */
  deleteProfileVideo: async (): Promise<void> => {
    try {
      await api.delete('/profiles/video');
    } catch {
      throw new Error('Video silinirken bir hata oluştu. Lütfen tekrar deneyin.');
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

  /** Max duration constant for UI display */
  MAX_DURATION: MAX_VIDEO_DURATION_SECONDS,
  MIN_DURATION: MIN_VIDEO_DURATION_SECONDS,
};
