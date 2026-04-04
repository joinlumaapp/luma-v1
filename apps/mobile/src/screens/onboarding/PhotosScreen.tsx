// Onboarding step 13/14: Photo selection grid (cream/beige design)
// Local-only mode: photos are picked, compressed and stored as URIs, uploaded after registration
// Features: gallery + camera picker, compression with progress, fade-in animation,
// gold border on main photo, file size display, min 1 / max 6 validation

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useProfileStore } from '../../stores/profileStore';
import { photoService } from '../../services/photoService';
import type { CompressedImage } from '../../services/photoService';
import { validateProfilePhoto } from '../../services/faceDetectionService';
import { PROFILE_CONFIG } from '../../constants/config';
import {
  OnboardingLayout,
  FullWidthButton,
  onboardingColors,
} from '../../components/onboarding/OnboardingLayout';

type PhotosNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'Photos'>;

const { width } = Dimensions.get('window');
const GRID_GAP = 10;
const GRID_PADDING = 24;
const CELL_SIZE = (width - GRID_PADDING * 2 - GRID_GAP * 2) / 3;

// Onboarding shows 6 slots initially; users can add more later in EditProfile
const ONBOARDING_PHOTO_SLOTS = 6;

// Gold accent for main photo border
const GOLD_ACCENT = '#C4A882';
const GOLD_ACCENT_LIGHT = 'rgba(196, 168, 130, 0.15)';

interface PhotoSlot {
  uri: string;
  compressed: CompressedImage | null;
}

export const PhotosScreen: React.FC = () => {
  const navigation = useNavigation<PhotosNavigationProp>();
  const [photoSlots, setPhotoSlots] = useState<(PhotoSlot | null)[]>(
    Array.from({ length: ONBOARDING_PHOTO_SLOTS }, () => null)
  );
  const [compressingIndex, setCompressingIndex] = useState<number | null>(null);
  const [detectingFace, setDetectingFace] = useState(false);
  const setProfileField = useProfileStore((state) => state.setField);

  // Animation value for the continue button
  const buttonScale = useSharedValue(1);
  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const selectedCount = photoSlots.filter((s) => s !== null).length;
  const isValid = photoSlots[0] !== null && selectedCount >= PROFILE_CONFIG.MIN_PHOTOS;

  const processPhoto = useCallback(async (uri: string, index: number) => {
    // For the first slot (profile photo), validate that a face is visible
    if (index === 0) {
      setDetectingFace(true);
      setCompressingIndex(index);
      try {
        const hasFace = await validateProfilePhoto(uri);
        if (!hasFace) {
          // Face validation failed — reject the photo, alert already shown by service
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setDetectingFace(false);
          setCompressingIndex(null);
          return;
        }
      } catch {
        // If face detection itself throws, allow the photo through (graceful degradation)
        if (__DEV__) {
          console.warn('[PhotosScreen] Face detection threw unexpectedly, allowing photo');
        }
      } finally {
        setDetectingFace(false);
      }
    }

    setCompressingIndex(index);
    try {
      const compressed = await photoService.compressImage(uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPhotoSlots((prev) => {
        const next = [...prev];
        next[index] = { uri: compressed.uri, compressed };
        return next;
      });
    } catch {
      Alert.alert(
        'Hata',
        'Fotoğraf işlenemedi. Lütfen tekrar deneyin.',
        [{ text: 'Tamam' }],
      );
    } finally {
      setCompressingIndex(null);
    }
  }, []);

  const showPickerOptions = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      index === 0 ? 'Profil Fotoğrafı' : 'Fotoğraf Ekle',
      index === 0
        ? 'Profil fotoğrafın için yüzünün net göründüğü bir fotoğraf seç.'
        : 'Fotoğraf kaynağını seçin',
      [
        {
          text: 'Galeriden Seç',
          onPress: () => handlePickFromGallery(index),
        },
        {
          text: 'Kamera',
          onPress: () => handleTakePhoto(index),
        },
        { text: 'İptal', style: 'cancel' },
      ],
    );
  }, []);

  const handlePickFromGallery = useCallback(async (index: number) => {
    const uri = await photoService.pickFromGallery();
    if (uri) {
      await processPhoto(uri, index);
    }
  }, [processPhoto]);

  const handleTakePhoto = useCallback(async (index: number) => {
    const uri = await photoService.takePhoto();
    if (uri) {
      await processPhoto(uri, index);
    }
  }, [processPhoto]);

  const handleRemovePhoto = useCallback((index: number) => {
    if (!photoSlots[index]) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (index === 0) {
      Alert.alert(
        'Profil Fotoğrafı',
        'Profil fotoğrafını değiştirmek ister misin?',
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Değiştir',
            onPress: () => showPickerOptions(0),
          },
          {
            text: 'Kaldır',
            style: 'destructive',
            onPress: () => {
              setPhotoSlots((prev) => {
                const next = [...prev];
                next[0] = null;
                return next;
              });
            },
          },
        ],
      );
      return;
    }
    setPhotoSlots((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  }, [photoSlots, showPickerOptions]);

  const handleContinue = useCallback(() => {
    if (isValid) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      buttonScale.value = withSpring(0.95, { damping: 15 }, () => {
        buttonScale.value = withSpring(1, { damping: 12 });
      });
      const uris = photoSlots
        .filter((s): s is PhotoSlot => s !== null)
        .map((s) => s.uri);
      setProfileField('photos', uris);
      navigation.navigate('SelfieVerification');
    }
  }, [isValid, photoSlots, setProfileField, navigation, buttonScale]);

  const renderPhotoCell = (slot: PhotoSlot | null, index: number) => {
    const isMain = index === 0;
    const isCompressing = compressingIndex === index;

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.photoCell,
          isMain && styles.photoCellMain,
          isMain && slot && styles.photoCellMainFilled,
        ]}
        onPress={() =>
          slot ? handleRemovePhoto(index) : showPickerOptions(index)
        }
        activeOpacity={0.7}
        accessibilityLabel={
          slot
            ? `Fotoğraf ${index + 1}, kaldırmak için dokun`
            : isMain
              ? 'Profil fotoğrafı ekle'
              : `Fotoğraf ${index + 1} ekle`
        }
        accessibilityRole="button"
      >
        {isCompressing ? (
          <View style={styles.compressingContent}>
            <ActivityIndicator size="small" color={onboardingColors.text} />
            <Text style={styles.compressingText}>
              {isMain && detectingFace ? 'Y\u00fcz kontrol ediliyor...' : '\u0130\u015fleniyor...'}
            </Text>
          </View>
        ) : slot ? (
          <Animated.View
            entering={FadeIn.duration(400).easing(Easing.out(Easing.cubic))}
            style={styles.photoContent}
          >
            <Image
              source={{ uri: slot.uri }}
              style={styles.photoImage}
              resizeMode="cover"
            />
            {/* Remove button */}
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemovePhoto(index)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={14} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Main photo badge */}
            {isMain && (
              <View style={styles.mainBadge}>
                <Ionicons name="star" size={10} color={GOLD_ACCENT} />
                <Text style={styles.mainBadgeText}>Profil</Text>
              </View>
            )}

            {/* File size indicator */}
            {slot.compressed && slot.compressed.size > 0 && (
              <View style={styles.fileSizeBadge}>
                <Text style={styles.fileSizeText}>
                  {photoService.formatFileSize(slot.compressed.size)}
                </Text>
              </View>
            )}
          </Animated.View>
        ) : (
          <View style={styles.addPhotoContent}>
            <View style={[styles.addIconCircle, isMain && styles.addIconCircleMain]}>
              <Ionicons
                name={isMain ? 'person-outline' : 'add'}
                size={isMain ? 24 : 22}
                color={isMain ? GOLD_ACCENT : onboardingColors.textTertiary}
              />
            </View>
            {isMain && (
              <Text style={styles.profileSlotLabel}>Profil fotoğrafı</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <OnboardingLayout
      step={12}
      totalSteps={13}
      footer={
        <Animated.View style={buttonAnimStyle}>
          <FullWidthButton
            label={
              selectedCount === 0
                ? 'En az 1 fotoğraf ekle'
                : `Devam et (${selectedCount}/6)`
            }
            onPress={handleContinue}
            disabled={!isValid}
          />
        </Animated.View>
      }
    >
      <Text style={styles.title}>Fotoğrafını ekle</Text>
      <Text style={styles.subtitle}>
        İlk fotoğrafın profil fotoğrafın olacak — yüzün net görünmeli.{'\n'}
        Diğerleri isteğe bağlı!
      </Text>

      {/* Photo count indicator */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {selectedCount} / {ONBOARDING_PHOTO_SLOTS} fotoğraf
        </Text>
        {selectedCount >= PROFILE_CONFIG.MIN_PHOTOS && (
          <Animated.View entering={FadeIn.duration(300)}>
            <Ionicons name="checkmark-circle" size={18} color={onboardingColors.checkGreen} />
          </Animated.View>
        )}
      </View>

      {/* Photo grid */}
      <View style={styles.photoGrid}>
        {photoSlots.map((slot, index) => renderPhotoCell(slot, index))}
      </View>

      {/* Photo tips */}
      <View style={styles.tipsContainer}>
        <View style={styles.tipsHeader}>
          <Ionicons
            name="bulb-outline"
            size={18}
            color={onboardingColors.text}
          />
          <Text style={styles.tipsTitle}>Fotoğraf İpuçları</Text>
        </View>
        <View style={styles.tipsList}>
          <Text style={styles.tipItem}>{'\u2022'} Yüzün net görünmeli</Text>
          <Text style={styles.tipItem}>{'\u2022'} Güneş gözlüğünden kaçın</Text>
          <Text style={styles.tipItem}>{'\u2022'} Doğal ışık kullan</Text>
          <Text style={styles.tipItem}>{'\u2022'} Tek başına olduğun fotoğraflar en iyisi</Text>
        </View>
      </View>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: onboardingColors.text,
    marginBottom: 8,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: onboardingColors.textSecondary,
    marginBottom: 16,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  countText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: onboardingColors.textSecondary,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  photoCell: {
    width: CELL_SIZE,
    height: CELL_SIZE * 1.25,
    borderRadius: 16,
    backgroundColor: onboardingColors.surface,
    borderWidth: 1.5,
    borderColor: onboardingColors.surfaceBorder,
    overflow: 'hidden',
  },
  photoCellMain: {
    borderWidth: 2,
    borderColor: GOLD_ACCENT,
    borderStyle: 'dashed',
  },
  photoCellMainFilled: {
    borderStyle: 'solid',
    borderColor: GOLD_ACCENT,
    borderWidth: 2.5,
    ...Platform.select({
      ios: {
        shadowColor: GOLD_ACCENT,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
  },
  photoContent: {
    flex: 1,
  },
  photoImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 4,
  },
  mainBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: GOLD_ACCENT,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  fileSizeBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  fileSizeText: {
    fontSize: 9,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  addPhotoContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  addIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: onboardingColors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIconCircleMain: {
    backgroundColor: GOLD_ACCENT_LIGHT,
    borderWidth: 1.5,
    borderColor: GOLD_ACCENT,
    borderStyle: 'dashed',
  },
  profileSlotLabel: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: GOLD_ACCENT,
    textAlign: 'center',
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  compressingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  compressingText: {
    fontSize: 11,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: onboardingColors.textSecondary,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  tipsContainer: {
    marginTop: 24,
    backgroundColor: onboardingColors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: onboardingColors.surfaceBorder,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  tipsTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
    color: onboardingColors.text,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  tipsList: {
    gap: 6,
  },
  tipItem: {
    fontSize: 14,
    lineHeight: 20,
    color: onboardingColors.textSecondary,
    paddingLeft: 4,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
});
