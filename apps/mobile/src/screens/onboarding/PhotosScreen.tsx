// Onboarding step 7/8: Photo selection grid (cream/beige design)
// Local-only mode: photos are picked and stored as URIs, uploaded after registration
// Reference: refs/6.jpeg — "Ilk 2 fotografini ekle"

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useProfileStore } from '../../stores/profileStore';
import { photoService } from '../../services/photoService';
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

export const PhotosScreen: React.FC = () => {
  const navigation = useNavigation<PhotosNavigationProp>();
  const [photoUris, setPhotoUris] = useState<(string | null)[]>(
    Array.from({ length: PROFILE_CONFIG.MAX_PHOTOS }, () => null)
  );
  const setProfileField = useProfileStore((state) => state.setField);

  const selectedCount = photoUris.filter((u) => u !== null).length;
  const isValid = photoUris[0] !== null && selectedCount >= PROFILE_CONFIG.MIN_PHOTOS;

  const showPickerOptions = (index: number) => {
    Alert.alert(
      index === 0 ? 'Profil Fotoğrafı' : 'Fotoğraf Ekle',
      index === 0
        ? 'Profil fotoğrafın için yüzünün net göründüğü bir fotoğraf seç.'
        : 'Fotoğraf kaynağını seçin',
      [
        { text: 'Galeri', onPress: () => handlePickFromGallery(index) },
        { text: 'Kamera', onPress: () => handleTakePhoto(index) },
        { text: 'İptal', style: 'cancel' },
      ],
    );
  };

  const handlePickFromGallery = async (index: number) => {
    const uri = await photoService.pickFromGallery();
    if (uri) {
      setPhotoUris((prev) => {
        const next = [...prev];
        next[index] = uri;
        return next;
      });
    }
  };

  const handleTakePhoto = async (index: number) => {
    const uri = await photoService.takePhoto();
    if (uri) {
      setPhotoUris((prev) => {
        const next = [...prev];
        next[index] = uri;
        return next;
      });
    }
  };

  const handleRemovePhoto = (index: number) => {
    if (!photoUris[index]) return;
    if (index === 0) {
      Alert.alert(
        'Profil Fotoğrafı',
        'Profil fotoğrafını değiştirmek ister misin?',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Değiştir', onPress: () => showPickerOptions(0) },
        ],
      );
      return;
    }
    setPhotoUris((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  };

  const handleContinue = () => {
    if (isValid) {
      const uris = photoUris.filter((u): u is string => u !== null);
      setProfileField('photos', uris);
      navigation.navigate('QuestionsIntro');
    }
  };

  return (
    <OnboardingLayout
      step={13}
      totalSteps={15}
      footer={
        <FullWidthButton
          label="Devam et"
          onPress={handleContinue}
          disabled={!isValid}
        />
      }
    >
      <Text style={styles.title}>
        İlk {PROFILE_CONFIG.MIN_PHOTOS} fotoğrafını ekle
      </Text>
      <Text style={styles.subtitle}>
        İlk fotoğrafın profil fotoğrafın olacak — yüzün net görünmeli. Diğerleri serbest!
      </Text>

      {/* Photo grid */}
      <View style={styles.photoGrid}>
        {photoUris.map((uri, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.photoCell, index === 0 && styles.photoCellProfile]}
            onPress={() =>
              uri ? handleRemovePhoto(index) : showPickerOptions(index)
            }
            activeOpacity={0.7}
          >
            {uri ? (
              <View style={styles.photoContent}>
                <Image
                  source={{ uri }}
                  style={styles.photoImage}
                  resizeMode="cover"
                />
                <View style={styles.removeButton}>
                  <Ionicons name="close" size={14} color="#FFFFFF" />
                </View>
                {index === 0 && (
                  <View style={styles.profileBadge}>
                    <Text style={styles.profileBadgeText}>Profil</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.addPhotoContent}>
                <Ionicons
                  name={index === 0 ? 'person-outline' : 'image-outline'}
                  size={index === 0 ? 32 : 28}
                  color={index === 0 ? onboardingColors.text : onboardingColors.textTertiary}
                />
                {index === 0 && (
                  <Text style={styles.profileSlotLabel}>Profil fotoğrafı</Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Photo tips */}
      <View style={styles.tipsRow}>
        <Ionicons
          name="sunny-outline"
          size={18}
          color={onboardingColors.text}
        />
        <Text style={styles.tipsText}>
          Fotoğraflarını seçmek için tavsiyelerimiz
        </Text>
      </View>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: onboardingColors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: onboardingColors.textSecondary,
    marginBottom: 24,
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
    borderWidth: 1,
    borderColor: onboardingColors.surfaceBorder,
    overflow: 'hidden',
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
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoCellProfile: {
    borderColor: onboardingColors.text,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  profileBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  profileBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileSlotLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: onboardingColors.text,
    marginTop: 4,
    textAlign: 'center',
  },
  addPhotoContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  tipsText: {
    fontSize: 15,
    fontWeight: '500',
    color: onboardingColors.text,
  },
});
