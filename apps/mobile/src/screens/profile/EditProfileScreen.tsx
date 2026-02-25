// EditProfileScreen — full profile editing: photos, voice intro, name, bio, gender, intention, city

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ProfileStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout } from '../../theme/spacing';
import { PROFILE_CONFIG, INTENTION_TAGS } from '../../constants/config';
import { useProfileStore } from '../../stores/profileStore';
import { useAuthStore } from '../../stores/authStore';
import { VoiceIntroRecorder } from '../../components/profile/VoiceIntro';
import { voiceIntroService } from '../../services/voiceIntroService';
import type { VoiceIntroResponse } from '../../services/voiceIntroService';
import { photoService } from '../../services/photoService';

type EditProfileNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'EditProfile'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_GRID_GAP = spacing.sm;
const PHOTO_COLUMNS = 3;
const PHOTO_SIZE =
  (SCREEN_WIDTH - spacing.lg * 2 - PHOTO_GRID_GAP * (PHOTO_COLUMNS - 1)) / PHOTO_COLUMNS;

type GenderOption = 'male' | 'female' | 'other';

interface GenderChip {
  value: GenderOption;
  label: string;
}

const GENDER_CHIPS: GenderChip[] = [
  { value: 'male', label: 'Erkek' },
  { value: 'female', label: 'Kadın' },
  { value: 'other', label: 'Diğer' },
];

const formatBirthDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return dateStr;
  }
};

export const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation<EditProfileNavigationProp>();
  const insets = useSafeAreaInsets();

  const profile = useProfileStore((state) => state.profile);
  const isLoading = useProfileStore((state) => state.isLoading);
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const uploadPhoto = useProfileStore((state) => state.uploadPhoto);
  const deletePhoto = useProfileStore((state) => state.deletePhoto);
  const user = useAuthStore((state) => state.user);

  const [firstName, setFirstName] = useState(profile.firstName);
  const [bio, setBio] = useState(profile.bio);
  const [gender, setGender] = useState<string>(profile.gender);
  const [selectedIntention, setSelectedIntention] = useState(profile.intentionTag);
  const [city, setCity] = useState(profile.city);
  const [isSaving, setIsSaving] = useState(false);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);

  // Voice intro state
  const [voiceIntroData, setVoiceIntroData] = useState<VoiceIntroResponse | null>(null);
  const [isVoiceIntroLoading, setIsVoiceIntroLoading] = useState(false);
  const [voiceIntroError, setVoiceIntroError] = useState<string | null>(null);

  // Sync from store when profile updates externally
  useEffect(() => {
    setFirstName(profile.firstName);
    setBio(profile.bio);
    setGender(profile.gender);
    setSelectedIntention(profile.intentionTag);
    setCity(profile.city);
  }, [profile.firstName, profile.bio, profile.gender, profile.intentionTag, profile.city]);

  // Fetch existing voice intro on mount
  useEffect(() => {
    const fetchVoiceIntro = async () => {
      if (!user?.id) return;
      setIsVoiceIntroLoading(true);
      setVoiceIntroError(null);
      try {
        const data = await voiceIntroService.getVoiceIntro(user.id);
        setVoiceIntroData(data);
      } catch {
        setVoiceIntroError('Sesli tanitim yuklenemedi.');
      } finally {
        setIsVoiceIntroLoading(false);
      }
    };
    fetchVoiceIntro();
  }, [user?.id]);

  // Build photo grid: fill to 6 slots
  const photos: Array<string | null> = [
    ...profile.photos,
    ...Array<null>(Math.max(0, PROFILE_CONFIG.MAX_PHOTOS - profile.photos.length)).fill(null),
  ];

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await updateProfile({
        firstName,
        bio,
        gender,
        intentionTag: selectedIntention,
        city,
      });
      navigation.goBack();
    } catch {
      Alert.alert('Hata', 'Profil güncellenemedi. Lütfen tekrar dene.');
    } finally {
      setIsSaving(false);
    }
  }, [firstName, bio, gender, selectedIntention, city, isSaving, updateProfile, navigation]);

  const handleAddPhoto = useCallback(
    (_index: number) => {
      if (isPhotoUploading) return;

      const processSelectedPhoto = async (uri: string | null) => {
        if (!uri) return;
        setIsPhotoUploading(true);
        try {
          await uploadPhoto(uri);
        } catch {
          Alert.alert('Hata', 'Fotoğraf yüklenemedi. Lütfen tekrar dene.');
        } finally {
          setIsPhotoUploading(false);
        }
      };

      Alert.alert(
        'Fotoğraf Ekle',
        'Fotoğraf kaynağını seç',
        [
          {
            text: 'Kamera',
            onPress: async () => {
              const uri = await photoService.takePhoto();
              await processSelectedPhoto(uri);
            },
          },
          {
            text: 'Galeriden Seç',
            onPress: async () => {
              const uri = await photoService.pickFromGallery();
              await processSelectedPhoto(uri);
            },
          },
          {
            text: 'İptal',
            style: 'cancel',
          },
        ],
        { cancelable: true },
      );
    },
    [isPhotoUploading, uploadPhoto],
  );

  const handleRemovePhoto = useCallback(
    async (index: number) => {
      Alert.alert('Fotoğrafı Sil', 'Bu fotoğrafı silmek istediğinden emin misin?', [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePhoto(index);
            } catch {
              Alert.alert('Hata', 'Fotoğraf silinemedi.');
            }
          },
        },
      ]);
    },
    [deletePhoto],
  );

  const handleVoiceRecord = useCallback(async (uri: string) => {
    setIsVoiceIntroLoading(true);
    setVoiceIntroError(null);
    try {
      const file = {
        uri,
        name: 'voice-intro.m4a',
        type: 'audio/m4a',
      };
      const response = await voiceIntroService.uploadVoiceIntro(file, 30);
      setVoiceIntroData(response);
    } catch {
      setVoiceIntroError('Sesli tanitim yuklenemedi. Lutfen tekrar dene.');
      Alert.alert('Hata', 'Sesli tanitim yuklenemedi. Lutfen tekrar dene.');
    } finally {
      setIsVoiceIntroLoading(false);
    }
  }, []);

  const handleVoiceDelete = useCallback(async () => {
    setIsVoiceIntroLoading(true);
    setVoiceIntroError(null);
    try {
      await voiceIntroService.deleteVoiceIntro();
      setVoiceIntroData(null);
    } catch {
      setVoiceIntroError('Sesli tanitim silinemedi.');
      Alert.alert('Hata', 'Sesli tanitim silinemedi. Lutfen tekrar dene.');
    } finally {
      setIsVoiceIntroLoading(false);
    }
  }, []);

  const hasChanges =
    firstName !== profile.firstName ||
    bio !== profile.bio ||
    gender !== profile.gender ||
    selectedIntention !== profile.intentionTag ||
    city !== profile.city;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.cancelText}>İptal</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profili Düzenle</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving || !hasChanges}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text
                style={[
                  styles.saveText,
                  (!hasChanges || isLoading) && styles.saveTextDisabled,
                ]}
              >
                Kaydet
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Photos Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Fotoğraflar</Text>
              <Text style={styles.photoCount}>
                {profile.photos.length}/{PROFILE_CONFIG.MAX_PHOTOS}
              </Text>
            </View>
            <Text style={styles.sectionHint}>
              İlk fotoğraf ana profil fotoğrafın olur.
            </Text>
            <View style={styles.photoGrid}>
              {photos.map((photo, index) => {
                // Show loading indicator on the first empty slot during upload
                const isUploadSlot =
                  isPhotoUploading && photo === null && index === profile.photos.length;

                return (
                  <TouchableOpacity
                    key={`photo-slot-${index}`}
                    style={[
                      styles.photoCell,
                      photo !== null && styles.photoCellFilled,
                      index === 0 && photo !== null && styles.photoCellPrimary,
                    ]}
                    onPress={() =>
                      photo !== null ? handleRemovePhoto(index) : handleAddPhoto(index)
                    }
                    activeOpacity={0.7}
                    disabled={isUploadSlot}
                  >
                    {photo !== null ? (
                      <View style={styles.photoContent}>
                        <Image
                          source={{ uri: photo }}
                          style={styles.photoImage}
                          resizeMode="cover"
                        />
                        {/* Primary badge on first photo */}
                        {index === 0 && (
                          <View style={styles.primaryBadge}>
                            <Text style={styles.primaryBadgeText}>Ana</Text>
                          </View>
                        )}
                        {/* Remove button */}
                        <View style={styles.removeButton}>
                          <Text style={styles.removeText}>X</Text>
                        </View>
                      </View>
                    ) : isUploadSlot ? (
                      <View style={styles.addPhotoContent}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={styles.addLabel}>Yükleniyor...</Text>
                      </View>
                    ) : (
                      <View style={styles.addPhotoContent}>
                        <Text style={styles.addIcon}>+</Text>
                        <Text style={styles.addLabel}>Ekle</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Sesli Tanitim */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sesli Tanitim</Text>
            <Text style={styles.sectionHint}>
              30 saniyeye kadar sesli tanitim kaydi olustur
            </Text>
            {isVoiceIntroLoading ? (
              <View style={styles.voiceIntroLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.voiceIntroLoadingText}>Yukleniyor...</Text>
              </View>
            ) : voiceIntroError ? (
              <View style={styles.voiceIntroError}>
                <Text style={styles.voiceIntroErrorText}>{voiceIntroError}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setVoiceIntroError(null);
                    if (user?.id) {
                      setIsVoiceIntroLoading(true);
                      voiceIntroService
                        .getVoiceIntro(user.id)
                        .then((data) => setVoiceIntroData(data))
                        .catch(() => setVoiceIntroError('Sesli tanitim yuklenemedi.'))
                        .finally(() => setIsVoiceIntroLoading(false));
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.voiceIntroRetryText}>Tekrar Dene</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <VoiceIntroRecorder
                existingVoiceIntro={
                  voiceIntroData
                    ? {
                        url: voiceIntroData.voiceIntroUrl,
                        durationSeconds: voiceIntroData.duration,
                        createdAt: new Date().toISOString(),
                      }
                    : null
                }
                onRecord={handleVoiceRecord}
                onDelete={handleVoiceDelete}
              />
            )}
          </View>

          {/* First Name */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>İsim</Text>
            <TextInput
              style={styles.textInput}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Adın"
              placeholderTextColor={colors.textTertiary}
              maxLength={50}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>

          {/* Bio Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Hakkında</Text>
              <Text
                style={[
                  styles.charCount,
                  bio.length >= PROFILE_CONFIG.MAX_BIO_LENGTH && styles.charCountLimit,
                ]}
              >
                {bio.length}/{PROFILE_CONFIG.MAX_BIO_LENGTH}
              </Text>
            </View>
            <TextInput
              style={styles.bioInput}
              value={bio}
              onChangeText={(text) => {
                if (text.length <= PROFILE_CONFIG.MAX_BIO_LENGTH) {
                  setBio(text);
                }
              }}
              placeholder="Kendinden bahset..."
              placeholderTextColor={colors.textTertiary}
              multiline
              textAlignVertical="top"
              maxLength={PROFILE_CONFIG.MAX_BIO_LENGTH}
            />
          </View>

          {/* Gender Chips */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cinsiyet</Text>
            <View style={styles.chipRow}>
              {GENDER_CHIPS.map((chip) => {
                const isSelected = gender === chip.value;
                return (
                  <TouchableOpacity
                    key={chip.value}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setGender(chip.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipLabel, isSelected && styles.chipLabelActive]}>
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Intention Tag Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ne Arıyorsun?</Text>
            <View style={styles.intentionOptions}>
              {INTENTION_TAGS.map((tag) => {
                const isSelected = selectedIntention === tag.id;
                return (
                  <TouchableOpacity
                    key={tag.id}
                    style={[styles.intentionOption, isSelected && styles.intentionOptionActive]}
                    onPress={() => setSelectedIntention(tag.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.intentionContent}>
                      <View
                        style={[
                          styles.intentionRadio,
                          isSelected && styles.intentionRadioActive,
                        ]}
                      >
                        {isSelected && <View style={styles.intentionRadioDot} />}
                      </View>
                      <Text
                        style={[
                          styles.intentionLabel,
                          isSelected && styles.intentionLabelActive,
                        ]}
                      >
                        {tag.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* City Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Şehir</Text>
            <TextInput
              style={styles.textInput}
              value={city}
              onChangeText={setCity}
              placeholder="Şehrini gir"
              placeholderTextColor={colors.textTertiary}
              maxLength={100}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>

          {/* Birth Date (non-editable) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Doğum Tarihi</Text>
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyText}>
                {formatBirthDate(profile.birthDate)}
              </Text>
              <Text style={styles.readOnlyHint}>Doğum tarihi değiştirilemez</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    height: layout.headerHeight,
  },
  cancelText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  headerTitle: {
    ...typography.bodyLarge,
    color: colors.text,
    fontWeight: '600',
  },
  saveText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  saveTextDisabled: {
    opacity: 0.4,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },

  // Sections
  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.bodyLarge,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  sectionHint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },
  photoCount: {
    ...typography.caption,
    color: colors.textTertiary,
  },

  // Voice Intro
  voiceIntroLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  voiceIntroLoadingText: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  voiceIntroError: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  voiceIntroErrorText: {
    ...typography.caption,
    color: colors.error,
  },
  voiceIntroRetryText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },

  // Photo Grid
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PHOTO_GRID_GAP,
  },
  photoCell: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE * 1.3,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.surfaceBorder,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  photoCellFilled: {
    borderStyle: 'solid',
    borderColor: colors.primary + '60',
  },
  photoCellPrimary: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  photoContent: {
    flex: 1,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  primaryBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.primary + 'CC',
    paddingVertical: 2,
    alignItems: 'center',
  },
  primaryBadgeText: {
    ...typography.captionSmall,
    color: colors.text,
    fontWeight: '700',
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
  removeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  addPhotoContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addIcon: {
    fontSize: 28,
    color: colors.textTertiary,
  },
  addLabel: {
    ...typography.captionSmall,
    color: colors.textTertiary,
  },

  // Text Input
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    height: layout.inputHeight,
  },

  // Bio
  charCount: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  charCountLimit: {
    color: colors.error,
  },
  bioInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },

  // Gender Chips
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surfaceBorder,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  chipLabel: {
    ...typography.body,
    color: colors.text,
  },
  chipLabelActive: {
    fontWeight: '600',
    color: colors.primary,
  },

  // Intention Tags
  intentionOptions: {
    gap: spacing.sm,
  },
  intentionOption: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.surfaceBorder,
  },
  intentionOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  intentionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  intentionRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intentionRadioActive: {
    borderColor: colors.primary,
  },
  intentionRadioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  intentionLabel: {
    ...typography.body,
    color: colors.text,
  },
  intentionLabelActive: {
    fontWeight: '600',
    color: colors.primary,
  },

  // Read-only field (birth date)
  readOnlyField: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    opacity: 0.7,
  },
  readOnlyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  readOnlyHint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
});
