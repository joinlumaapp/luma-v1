// Onboarding step 6/7: Photo upload grid (max 6, min 1)

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useProfileStore } from '../../stores/profileStore';
import { photoService } from '../../services/photoService';
import { OnboardingProgress } from '../../components/onboarding/OnboardingProgress';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout } from '../../theme/spacing';
import { PROFILE_CONFIG } from '../../constants/config';

type PhotosNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'Photos'>;

const CURRENT_STEP = 6;
const { width } = Dimensions.get('window');
const GRID_GAP = spacing.sm;
const GRID_PADDING = spacing.lg;
const CELL_SIZE = (width - GRID_PADDING * 2 - GRID_GAP * 2) / 3;

interface PhotoSlot {
  uri: string | null;
  serverUrl: string | null;
  serverId: string | null;
  isPrimary: boolean;
  isUploading: boolean;
}

export const PhotosScreen: React.FC = () => {
  const navigation = useNavigation<PhotosNavigationProp>();
  const [photos, setPhotos] = useState<PhotoSlot[]>(
    Array.from({ length: PROFILE_CONFIG.MAX_PHOTOS }, (_, i) => ({
      uri: null,
      serverUrl: null,
      serverId: null,
      isPrimary: i === 0,
      isUploading: false,
    }))
  );
  const setProfileField = useProfileStore((state) => state.setField);

  const uploadedCount = photos.filter((p) => p.uri !== null).length;
  const isValid = uploadedCount >= PROFILE_CONFIG.MIN_PHOTOS;
  const hasUploadInProgress = photos.some((p) => p.isUploading);

  const showPickerOptions = (index: number) => {
    Alert.alert(
      'Fotoğraf Ekle',
      'Fotoğraf kaynağını seçin',
      [
        {
          text: 'Galeri',
          onPress: () => handlePickFromGallery(index),
        },
        {
          text: 'Kamera',
          onPress: () => handleTakePhoto(index),
        },
        {
          text: 'İptal',
          style: 'cancel',
        },
      ],
    );
  };

  const handlePickFromGallery = async (index: number) => {
    const uri = await photoService.pickFromGallery();
    if (uri) {
      await uploadAndSetPhoto(index, uri);
    }
  };

  const handleTakePhoto = async (index: number) => {
    const uri = await photoService.takePhoto();
    if (uri) {
      await uploadAndSetPhoto(index, uri);
    }
  };

  const uploadAndSetPhoto = async (index: number, uri: string) => {
    // Set local URI and mark as uploading
    const updatedPhotos = [...photos];
    updatedPhotos[index] = {
      ...updatedPhotos[index],
      uri,
      isUploading: true,
    };
    setPhotos(updatedPhotos);

    try {
      const response = await photoService.uploadPhoto(uri, index);
      setPhotos((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          serverUrl: response.url,
          serverId: response.id,
          isUploading: false,
        };
        return next;
      });
    } catch {
      // Revert on failure
      setPhotos((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          uri: null,
          serverUrl: null,
          serverId: null,
          isUploading: false,
        };
        return next;
      });
      Alert.alert(
        'Yükleme Hatası',
        'Fotoğraf yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.',
        [{ text: 'Tamam' }],
      );
    }
  };

  const handleRemovePhoto = (index: number) => {
    const photo = photos[index];
    if (!photo.uri) return;

    Alert.alert(
      'Fotoğrafı Sil',
      'Bu fotoğrafı silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            if (photo.serverId) {
              try {
                await photoService.deletePhoto(photo.serverId);
              } catch {
                Alert.alert(
                  'Silme Hatası',
                  'Fotoğraf silinirken bir hata oluştu.',
                  [{ text: 'Tamam' }],
                );
                return;
              }
            }
            const newPhotos = [...photos];
            newPhotos[index] = {
              uri: null,
              serverUrl: null,
              serverId: null,
              isPrimary: index === 0,
              isUploading: false,
            };
            setPhotos(newPhotos);
          },
        },
      ],
    );
  };

  const handleContinue = () => {
    if (isValid && !hasUploadInProgress) {
      const photoUris = photos
        .filter((p) => p.serverUrl !== null)
        .map((p) => p.serverUrl as string);
      setProfileField('photos', photoUris);
      navigation.navigate('Bio');
    }
  };

  return (
    <View style={styles.container}>
      {/* Progress indicator */}
      <OnboardingProgress currentStep={CURRENT_STEP} />

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Fotoğrafların</Text>
        <Text style={styles.subtitle}>
          En az {PROFILE_CONFIG.MIN_PHOTOS} fotoğraf ekle. İlk fotoğraf ana profil fotoğrafın olacak.
        </Text>

        {/* Photo grid */}
        <View style={styles.photoGrid}>
          {photos.map((photo, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.photoCell,
                index === 0 && styles.photoCellPrimary,
                photo.uri !== null && styles.photoCellFilled,
              ]}
              onPress={() =>
                photo.uri ? handleRemovePhoto(index) : showPickerOptions(index)
              }
              activeOpacity={0.7}
              disabled={photo.isUploading}
            >
              {photo.isUploading ? (
                <View style={styles.uploadingContent}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.uploadingText}>Yükleniyor...</Text>
                </View>
              ) : photo.uri ? (
                <View style={styles.photoContent}>
                  <Image
                    source={{ uri: photo.uri }}
                    style={styles.photoImage}
                    resizeMode="cover"
                  />
                  {/* Remove button */}
                  <View style={styles.removeButton}>
                    <Text style={styles.removeButtonText}>X</Text>
                  </View>
                  {index === 0 && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>Ana</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.addPhotoContent}>
                  <Text style={styles.addPhotoIcon}>+</Text>
                  <Text style={styles.addPhotoText}>
                    {index === 0 ? 'Ana Foto' : 'Ekle'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.counterText}>
          {uploadedCount}/{PROFILE_CONFIG.MAX_PHOTOS} fotoğraf eklendi
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!isValid || hasUploadInProgress) && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!isValid || hasUploadInProgress}
          activeOpacity={0.85}
        >
          {hasUploadInProgress ? (
            <ActivityIndicator size="small" color={colors.textTertiary} />
          ) : (
            <Text
              style={[
                styles.continueButtonText,
                !isValid && styles.continueButtonTextDisabled,
              ]}
            >
              Devam
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: GRID_PADDING,
    paddingTop: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  photoCell: {
    width: CELL_SIZE,
    height: CELL_SIZE * 1.3,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.surfaceBorder,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  photoCellPrimary: {
    borderColor: colors.primary + '60',
  },
  photoCellFilled: {
    borderStyle: 'solid',
    borderColor: colors.primary,
  },
  photoContent: {
    flex: 1,
  },
  photoImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  uploadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  uploadingText: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  primaryBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.primary,
    paddingVertical: 2,
    alignItems: 'center',
  },
  primaryBadgeText: {
    ...typography.captionSmall,
    color: colors.text,
    fontWeight: '600',
  },
  addPhotoContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addPhotoIcon: {
    fontSize: 28,
    color: colors.textTertiary,
  },
  addPhotoText: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },
  counterText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  continueButton: {
    backgroundColor: colors.primary,
    height: layout.buttonHeight,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: colors.surfaceBorder,
  },
  continueButtonText: {
    ...typography.button,
    color: colors.text,
  },
  continueButtonTextDisabled: {
    color: colors.textTertiary,
  },
});
