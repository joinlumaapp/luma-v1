// Photo service — image picker + upload/delete via expo-image-picker

import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';
import api from './api';

export interface PhotoUploadResponse {
  id: string;
  url: string;
  order: number;
}

const IMAGE_PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  aspect: [3, 4],
  quality: 0.8,
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

export const photoService = {
  /**
   * Launch gallery picker, return selected image URI or null if cancelled.
   */
  pickFromGallery: async (): Promise<string | null> => {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) return null;

    const result = await ImagePicker.launchImageLibraryAsync(IMAGE_PICKER_OPTIONS);

    if (result.canceled || result.assets.length === 0) {
      return null;
    }

    return result.assets[0].uri;
  },

  /**
   * Launch camera, return captured image URI or null if cancelled.
   */
  takePhoto: async (): Promise<string | null> => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return null;

    const result = await ImagePicker.launchCameraAsync(IMAGE_PICKER_OPTIONS);

    if (result.canceled || result.assets.length === 0) {
      return null;
    }

    return result.assets[0].uri;
  },

  /**
   * Upload a photo to /profiles/photos via multipart/form-data.
   */
  uploadPhoto: async (uri: string, order: number): Promise<PhotoUploadResponse> => {
    const fileName = uri.split('/').pop() ?? `photo_${order}.jpg`;
    const fileType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';

    const formData = new FormData();
    formData.append('photo', {
      uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
      type: fileType,
      name: fileName,
    } as unknown as Blob);
    formData.append('order', String(order));

    const response = await api.post<PhotoUploadResponse>(
      '/profiles/photos',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );

    return response.data;
  },

  /**
   * Delete a photo by its server ID.
   */
  deletePhoto: async (photoId: string): Promise<void> => {
    await api.delete(`/profiles/photos/${photoId}`);
  },
};
