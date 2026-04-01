// EditProfileScreen — premium profile editing with photo grid, bio, basic info,
// interests, lifestyle, voice intro, and gold gradient save button.
// Cream theme (#F5F0E8 bg, #D4AF37 gold, #2C1810 text)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ProfileStackParamList } from '../../navigation/types';
import { colors, palette } from '../../theme/colors';
import { fontWeights, poppinsFonts } from '../../theme/typography';
import { spacing, borderRadius, shadows } from '../../theme/spacing';
import {
  INTEREST_OPTIONS,
  ZODIAC_SIGNS, EDUCATION_LEVELS, MARITAL_STATUS_OPTIONS,
  ALCOHOL_OPTIONS, SEXUAL_ORIENTATION_OPTIONS, PETS_OPTIONS,
  RELIGION_OPTIONS, EXERCISE_OPTIONS as CONFIG_EXERCISE_OPTIONS,
  SMOKING_OPTIONS as CONFIG_SMOKING_OPTIONS, CHILDREN_OPTIONS as CONFIG_CHILDREN_OPTIONS,
} from '../../constants/config';
import { useProfileStore } from '../../stores/profileStore';
import { photoService } from '../../services/photoService';
import { VideoRecorder } from '../../components/profile/VideoRecorder';
import { VideoProfile } from '../../components/profile/VideoProfile';
import { FavoriteSpotsEditor } from '../../components/profile/FavoriteSpotsEditor';
import { PromptPickerSheet } from '../../components/prompts/PromptPickerSheet';
import type { PromptOption } from '../../constants/promptBank';
import type { VideoMetadata } from '../../services/videoService';
import { BrandedBackground } from '../../components/common/BrandedBackground';
import { useScreenTracking } from '../../hooks/useAnalytics';

type EditProfileNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'EditProfile'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 24;
const GRID_GAP = 10;
const PHOTO_CELL_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * 2) / 3;
const PHOTO_CELL_HEIGHT = PHOTO_CELL_WIDTH * 1.3;
const PHOTO_SLOTS = 9;

const MAX_BIO_LENGTH = 500;
const MAX_INTERESTS = 10;

// ── Turkish city list ──────────────────────────────────────────────────────
const TURKISH_CITIES: string[] = [
  'İstanbul', 'Ankara', 'İzmir', 'Antalya', 'Bursa', 'Adana',
  'Konya', 'Gaziantep', 'Mersin', 'Diyarbakır', 'Kayseri',
  'Eskişehir', 'Samsun', 'Trabzon', 'Mugla', 'Denizli',
  'Sakarya', 'Malatya', 'Kahramanmaras', 'Erzurum',
];

// ── Option type for intention tags ────────────────────────────────────────
interface LifestyleOption {
  value: string;
  label: string;
}

// ── Age calculator ─────────────────────────────────────────────────────────
const calculateAge = (birthDate: string): number => {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

// ── Intention tag options ──────────────────────────────────────────────────
const INTENTION_OPTIONS: LifestyleOption[] = [
  { value: 'SERIOUS_RELATIONSHIP', label: 'Ciddi İlişki' },
  { value: 'EXPLORING', label: 'Keşfediyorum' },
  { value: 'NOT_SURE', label: 'Emin Değilim' },
];

// ── Height values ──────────────────────────────────────────────────────────
const HEIGHT_VALUES: number[] = [];
for (let i = 140; i <= 220; i++) {
  HEIGHT_VALUES.push(i);
}

// ─── Section Header (Bumpy-style) ──────────────────────────────

interface SectionHeaderProps {
  title: string;
  description?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, description }) => (
  <View style={sectionStyles.header}>
    <Text style={sectionStyles.headerTitle}>{title}</Text>
    {description && <Text style={sectionStyles.headerDesc}>{description}</Text>}
  </View>
);

// ─── Profile Field Row (Bumpy-style) ────────────────────────────

interface FieldRowProps {
  icon: string;
  label: string;
  value?: string;
  placeholder?: string;
  readOnly?: boolean;
  onPress?: () => void;
}

const FieldRow: React.FC<FieldRowProps> = ({
  icon, label, value, placeholder = 'Ekle', readOnly = false, onPress,
}) => (
  <TouchableOpacity
    style={sectionStyles.fieldRow}
    onPress={onPress}
    disabled={readOnly || !onPress}
    activeOpacity={readOnly ? 1 : 0.7}
  >
    <Text style={sectionStyles.fieldIcon}>{icon}</Text>
    <Text style={sectionStyles.fieldLabel}>{label}</Text>
    <View style={sectionStyles.fieldRight}>
      {value ? (
        <Text style={sectionStyles.fieldValue}>{value}</Text>
      ) : (
        <Text style={sectionStyles.fieldPlaceholder}>{placeholder}</Text>
      )}
      {readOnly ? (
        <Ionicons name="lock-closed" size={14} color={colors.textTertiary} />
      ) : (
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      )}
    </View>
  </TouchableOpacity>
);

// ─── Option Picker Bottom Sheet ─────────────────────────────────

interface OptionPickerProps {
  visible: boolean;
  title: string;
  options: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
  onDismiss: () => void;
}

const OptionPicker: React.FC<OptionPickerProps> = ({
  visible, title, options, selected, onSelect, onDismiss,
}) => {
  if (!visible) return null;
  return (
    <View style={sectionStyles.pickerOverlay}>
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onDismiss} />
      <View style={sectionStyles.pickerSheet}>
        <View style={sectionStyles.pickerHandle} />
        <Text style={sectionStyles.pickerTitle}>{title}</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[sectionStyles.pickerOption, selected === opt && sectionStyles.pickerOptionSelected]}
              onPress={() => { onSelect(opt); onDismiss(); }}
            >
              <Text style={[
                sectionStyles.pickerOptionText,
                selected === opt && sectionStyles.pickerOptionTextSelected,
              ]}>{opt}</Text>
              {selected === opt && <Ionicons name="checkmark" size={20} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ── Main Component ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

export const EditProfileScreen: React.FC = () => {
  useScreenTracking('EditProfile');
  const navigation = useNavigation<EditProfileNavigationProp>();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  // Store
  const profile = useProfileStore((state) => state.profile);
  const completionPercent = useProfileStore((state) => state.completionPercent);
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const uploadPhoto = useProfileStore((state) => state.uploadPhoto);
  const deletePhoto = useProfileStore((state) => state.deletePhoto);
  const setMainPhoto = useProfileStore((state) => state.setMainPhoto);
  const uploadVideo = useProfileStore((state) => state.uploadVideo);
  const deleteVideoAction = useProfileStore((state) => state.deleteVideo);
  const setPrompts = useProfileStore((state) => state.setPrompts);
  const setFavoriteSpots = useProfileStore((state) => state.setFavoriteSpots);
  const isVideoUploading = useProfileStore((state) => state.isVideoUploading);
  const videoUploadProgress = useProfileStore((state) => state.videoUploadProgress);

  // Local state
  const [bio, setBio] = useState(profile.bio);
  const [city, setCity] = useState(profile.city);
  const [job, setJob] = useState(profile.job);
  const [education, setEducation] = useState(profile.education);
  const [intentionTag, setIntentionTag] = useState(profile.intentionTag);
  const [height, setHeight] = useState<number | null>(profile.height);
  const [smoking, setSmoking] = useState(profile.smoking);
  const [exercise, setExercise] = useState(profile.sports);
  const [children, setChildren] = useState(profile.children);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(profile.interestTags);
  const [isSaving, setIsSaving] = useState(false);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showHeightPicker, setShowHeightPicker] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [showPromptPicker, setShowPromptPicker] = useState(false);

  // Extended profile fields (Section 3)
  const [weight, setWeight] = useState<string>(profile.weight != null ? String(profile.weight) : '');
  const [sexualOrientation, setSexualOrientation] = useState<string>(profile.sexualOrientation ?? '');
  const [zodiacSign, setZodiacSign] = useState<string>(profile.zodiacSign ?? '');
  const [educationLevel, setEducationLevel] = useState<string>(profile.educationLevel ?? '');
  const [maritalStatus, setMaritalStatus] = useState<string>(profile.maritalStatus ?? '');
  const [alcohol, setAlcohol] = useState<string>(profile.alcohol ?? '');
  const [pets, setPets] = useState<string>(profile.pets ?? '');
  const [religion, setReligion] = useState<string>(profile.religion ?? '');
  const [lifeValues, setLifeValues] = useState<string>(profile.lifeValues ?? '');

  // Option picker state
  const [pickerConfig, setPickerConfig] = useState<{
    visible: boolean;
    title: string;
    options: readonly string[];
    field: string;
  } | null>(null);

  const extendedFieldSetters: Record<string, (value: string) => void> = {
    sexualOrientation: setSexualOrientation,
    zodiacSign: setZodiacSign,
    exercise: setExercise,
    educationLevel: setEducationLevel,
    maritalStatus: setMaritalStatus,
    children: setChildren,
    alcohol: setAlcohol,
    smoking: setSmoking,
    pets: setPets,
    religion: setReligion,
    weight: setWeight,
    lifeValues: setLifeValues,
  };

  const extendedFieldValues: Record<string, string> = {
    sexualOrientation,
    zodiacSign,
    exercise,
    educationLevel,
    maritalStatus,
    children,
    alcohol,
    smoking,
    pets,
    religion,
    weight,
    lifeValues,
  };

  const openPicker = useCallback((title: string, options: readonly string[], field: string) => {
    setPickerConfig({ visible: true, title, options, field });
  }, []);

  const handlePickerSelect = useCallback((value: string) => {
    if (!pickerConfig) return;
    const setter = extendedFieldSetters[pickerConfig.field];
    if (setter) setter(value);
    setPickerConfig(null);
  }, [pickerConfig]);

  // Sync from store on external changes
  useEffect(() => {
    setBio(profile.bio);
    setCity(profile.city);
    setJob(profile.job);
    setEducation(profile.education);
    setIntentionTag(profile.intentionTag);
    setHeight(profile.height);
    setSmoking(profile.smoking);
    setExercise(profile.sports);
    setChildren(profile.children);
    setSelectedInterests(profile.interestTags);
  }, [
    profile.bio, profile.city, profile.job, profile.education,
    profile.intentionTag, profile.height, profile.smoking,
    profile.sports, profile.children, profile.interestTags,
  ]);

  // ── Photo handlers ─────────────────────────────────────────────────────
  const handlePhotoSlotPress = useCallback(
    (index: number) => {
      // If there is a photo at this index
      if (index < profile.photos.length) {
        const options: Array<{
          text: string;
          onPress?: () => void;
          style?: 'cancel' | 'destructive';
        }> = [];

        if (index !== 0) {
          options.push({
            text: 'Ana Foto Yap',
            onPress: () => setMainPhoto(index),
          });
        }
        options.push({
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            if (profile.photos.length <= 2) {
              Alert.alert(
                'Silinemez',
                'En az 2 fotograf gereklidir. Silmek için once yeni fotograf ekleyin.',
              );
              return;
            }
            Alert.alert(
              'Fotoğrafı Sil',
              'Bu fotoğrafı silmek istediğinden emin misin?',
              [
                { text: 'İptal', style: 'cancel' },
                {
                  text: 'Sil',
                  style: 'destructive',
                  onPress: () => deletePhoto(index),
                },
              ],
            );
          },
        });
        options.push({ text: 'İptal', style: 'cancel' });
        Alert.alert('Fotoğraf Seçenekleri', undefined, options);
        return;
      }

      // Empty slot — add photo
      if (isPhotoUploading) return;

      Alert.alert('Fotoğraf Ekle', 'Fotoğraf kaynağını seç', [
        {
          text: 'Kamera',
          onPress: async () => {
            const uri = await photoService.takePhoto();
            if (uri) {
              setIsPhotoUploading(true);
              try {
                await uploadPhoto(uri);
              } catch {
                Alert.alert('Hata', 'Fotoğraf yüklenemedi.');
              } finally {
                setIsPhotoUploading(false);
              }
            }
          },
        },
        {
          text: 'Galeriden Seç',
          onPress: async () => {
            const uri = await photoService.pickFromGallery();
            if (uri) {
              setIsPhotoUploading(true);
              try {
                await uploadPhoto(uri);
              } catch {
                Alert.alert('Hata', 'Fotoğraf yüklenemedi.');
              } finally {
                setIsPhotoUploading(false);
              }
            }
          },
        },
        { text: 'İptal', style: 'cancel' },
      ]);
    },
    [profile.photos.length, isPhotoUploading, uploadPhoto, deletePhoto, setMainPhoto],
  );

  // ── Interest tag toggle ────────────────────────────────────────────────
  const toggleInterest = useCallback(
    (tagId: string) => {
      setSelectedInterests((prev) => {
        if (prev.includes(tagId)) {
          return prev.filter((t) => t !== tagId);
        }
        if (prev.length >= MAX_INTERESTS) {
          Alert.alert('Limit', `En fazla ${MAX_INTERESTS} ilgi alani secebilirsin.`);
          return prev;
        }
        return [...prev, tagId];
      });
    },
    [],
  );

  // ── Video handlers ────────────────────────────────────────────────────
  const handleVideoReady = useCallback(
    async (video: VideoMetadata) => {
      try {
        await uploadVideo(video.uri);
      } catch {
        Alert.alert('Hata', 'Video yüklenemedi. Lütfen tekrar deneyin.');
      }
    },
    [uploadVideo],
  );

  const handleDeleteVideo = useCallback(() => {
    Alert.alert(
      'Videoyu Sil',
      'Profil videosunu silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteVideoAction();
            } catch {
              Alert.alert('Hata', 'Video silinemedi. Lütfen tekrar deneyin.');
            }
          },
        },
      ],
    );
  }, [deleteVideoAction]);

  // ── Prompt handlers ───────────────────────────────────────────────────
  const updatePromptAnswer = useCallback(
    (index: number, text: string) => {
      const updated = [...profile.prompts];
      updated[index] = { ...updated[index], answer: text };
      setPrompts(updated);
    },
    [profile.prompts, setPrompts],
  );

  const removePrompt = useCallback(
    (index: number) => {
      const updated = profile.prompts.filter((_: unknown, i: number) => i !== index);
      setPrompts(updated);
    },
    [profile.prompts, setPrompts],
  );

  const handlePromptSelect = useCallback(
    (prompt: PromptOption) => {
      if (profile.prompts.length >= 3) return;
      const newPrompt = {
        id: prompt.id,
        question: prompt.textTr,
        answer: '',
        order: profile.prompts.length,
      };
      setPrompts([...profile.prompts, newPrompt]);
      setShowPromptPicker(false);
    },
    [profile.prompts, setPrompts],
  );

  // ── Save handler ───────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await updateProfile({
        bio,
        city,
        job,
        education,
        intentionTag,
        height,
        smoking,
        sports: exercise,
        children,
        interestTags: selectedInterests,
      });
      navigation.goBack();
    } catch {
      Alert.alert('Hata', 'Profil güncellenemedi. Lütfen tekrar dene.');
    } finally {
      setIsSaving(false);
    }
  }, [
    bio, city, job, education, intentionTag, height, smoking, exercise,
    children, selectedInterests, isSaving, updateProfile, navigation,
  ]);

  const hasChanges =
    bio !== profile.bio ||
    city !== profile.city ||
    job !== profile.job ||
    education !== profile.education ||
    intentionTag !== profile.intentionTag ||
    height !== profile.height ||
    smoking !== profile.smoking ||
    exercise !== profile.sports ||
    children !== profile.children ||
    JSON.stringify(selectedInterests) !== JSON.stringify(profile.interestTags);

  const age = calculateAge(profile.birthDate);
  const answeredCount = Object.keys(profile.answers ?? {}).length;

  // ── Build photo grid data (always 9 slots) ────────────────────────────
  const photoSlots: Array<string | null> = [];
  for (let i = 0; i < PHOTO_SLOTS; i++) {
    photoSlots.push(i < profile.photos.length ? profile.photos[i] : null);
  }

  // ═════════════════════════════════════════════════════════════════════════
  // ── Render ─────────────────────────────────────────────────────────────
  // ═════════════════════════════════════════════════════════════════════════

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <BrandedBackground />
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerBackButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Geri"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profili Duzenle</Text>
          <Text style={{
            fontSize: 13,
            fontFamily: 'Poppins_600SemiBold',
            fontWeight: '600',
            color: colors.primary,
          }}>%{completionPercent} doldurulmus</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* ─── Section 1: Medya ─── */}
          <SectionHeader title="Medya" description="Fotograflarin ve videon" />

          {/* ── Profil Videosu ─────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profil Videosu</Text>
            <Text style={styles.sectionHint}>
              10-30 saniyelik bir video ile profilini canlandir!
            </Text>

            {isVideoUploading ? (
              <View style={styles.videoUploadingContainer}>
                <ActivityIndicator size="small" color={palette.gold[500]} />
                <Text style={styles.videoUploadingText}>
                  Yukleniyor... %{videoUploadProgress}
                </Text>
                <View style={styles.videoProgressBarBg}>
                  <View
                    style={[
                      styles.videoProgressBarFill,
                      { width: `${videoUploadProgress}%` },
                    ]}
                  />
                </View>
              </View>
            ) : profile.profileVideo ? (
              <View style={styles.videoPreviewContainer}>
                <TouchableOpacity
                  style={styles.videoThumbnailWrap}
                  onPress={() => setShowVideoPreview(!showVideoPreview)}
                  activeOpacity={0.8}
                  accessibilityLabel="Profil videosunu oynat"
                  accessibilityRole="button"
                >
                  {showVideoPreview ? (
                    <VideoProfile
                      videoUrl={profile.profileVideo.url}
                      thumbnailUrl={profile.profileVideo.thumbnailUrl}
                      duration={profile.profileVideo.duration}
                      isVisible={showVideoPreview}
                      height={200}
                    />
                  ) : (
                    <View style={styles.videoThumbnailPlaceholder}>
                      {profile.profileVideo.thumbnailUrl ? (
                        <Image
                          source={{ uri: profile.profileVideo.thumbnailUrl }}
                          style={styles.videoThumbnailImage}
                          resizeMode="cover"
                        />
                      ) : null}
                      <View style={styles.videoPlayOverlay}>
                        <Ionicons name="play-circle" size={48} color={palette.white} />
                      </View>
                      <View style={styles.videoDurationTag}>
                        <Text style={styles.videoDurationText}>
                          {Math.round(profile.profileVideo.duration)}s
                        </Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.videoActionsRow}>
                  <TouchableOpacity
                    style={styles.videoActionButton}
                    onPress={() => setShowVideoRecorder(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="swap-horizontal" size={16} color={palette.gold[600]} />
                    <Text style={styles.videoActionText}>Degistir</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.videoActionButton, styles.videoActionDelete]}
                    onPress={handleDeleteVideo}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color={palette.error} />
                    <Text style={[styles.videoActionText, { color: palette.error }]}>Sil</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.videoAddButton}
                onPress={() => setShowVideoRecorder(true)}
                activeOpacity={0.7}
                accessibilityLabel="Profil videosu ekle"
                accessibilityRole="button"
              >
                <View style={styles.videoAddIconCircle}>
                  <Ionicons name="videocam-outline" size={26} color={palette.gold[600]} />
                </View>
                <Text style={styles.videoAddText}>Video Ekle</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Fotoğraflar (3x2 grid) ────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fotoğraflar</Text>
            <Text style={styles.sectionHint}>
              Ilk fotograf profil fotografin olacak. En az 2, en fazla 6 fotograf ekle.
            </Text>
            <View style={styles.photoGrid}>
              {photoSlots.map((uri, index) => {
                const isMain = index === 0 && uri !== null;
                const isUploading = isPhotoUploading && index === profile.photos.length;

                return (
                  <TouchableOpacity
                    key={`photo-slot-${index}`}
                    style={[
                      styles.photoCell,
                      isMain && styles.photoCellMain,
                    ]}
                    onPress={() => handlePhotoSlotPress(index)}
                    activeOpacity={0.7}
                    accessibilityLabel={
                      uri
                        ? `Fotoğraf ${index + 1}, düzenlemek için dokun`
                        : `Fotoğraf ekle, slot ${index + 1}`
                    }
                    accessibilityRole="button"
                  >
                    {uri ? (
                      <View style={styles.photoContent}>
                        <Image
                          source={{ uri }}
                          style={styles.photoImage}
                          resizeMode="cover"
                        />
                        {/* Remove button */}
                        <View style={styles.photoRemoveButton}>
                          <Ionicons name="close" size={12} color="#FFFFFF" />
                        </View>
                        {/* Main photo badge */}
                        {isMain && (
                          <View style={styles.photoMainBadge}>
                            <Ionicons name="star" size={10} color="#FFFFFF" />
                            <Text style={styles.photoMainBadgeText}>Ana</Text>
                          </View>
                        )}
                        {/* Order number */}
                        <View style={styles.photoOrderBadge}>
                          <Text style={styles.photoOrderText}>{index + 1}</Text>
                        </View>
                      </View>
                    ) : isUploading ? (
                      <View style={styles.photoEmptyContent}>
                        <ActivityIndicator size="small" color={palette.gold[500]} />
                        <Text style={styles.photoUploadingText}>Yukleniyor...</Text>
                      </View>
                    ) : (
                      <View style={styles.photoEmptyContent}>
                        <Ionicons
                          name="add"
                          size={28}
                          color={colors.textTertiary}
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Hakkımda (Bio) ────────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Hakkımda</Text>
              <Text
                style={[
                  styles.charCounter,
                  bio.length >= MAX_BIO_LENGTH && styles.charCounterLimit,
                ]}
              >
                {bio.length}/{MAX_BIO_LENGTH}
              </Text>
            </View>
            <TextInput
              style={styles.bioInput}
              value={bio}
              onChangeText={(text) => {
                if (text.length <= MAX_BIO_LENGTH) {
                  setBio(text);
                }
              }}
              placeholder="Kendinden bahset..."
              placeholderTextColor={colors.textTertiary}
              multiline
              textAlignVertical="top"
              maxLength={MAX_BIO_LENGTH}
            />
          </View>

          {/* ─── Section 2: Temel Bilgilerim ─── */}
          <SectionHeader title="Temel Bilgilerim" description="Kendiniz hakkinda genel bilgileri belirtin" />

          {/* ── Temel Bilgiler ────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Temel Bilgiler</Text>

            {/* Name (read-only) */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconCircle}>
                <Ionicons name="person-outline" size={18} color={colors.text} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Isim</Text>
                <Text style={styles.infoValue}>{profile.firstName || '-'}</Text>
              </View>
              <View style={styles.readOnlyTag}>
                <Text style={styles.readOnlyTagText}>Değiştirilemez</Text>
              </View>
            </View>

            {/* Age (read-only, from birthdate) */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconCircle}>
                <Ionicons name="calendar-outline" size={18} color={colors.text} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Yas</Text>
                <Text style={styles.infoValue}>{age > 0 ? `${age}` : '-'}</Text>
              </View>
              <View style={styles.readOnlyTag}>
                <Text style={styles.readOnlyTagText}>Değiştirilemez</Text>
              </View>
            </View>

            {/* City (editable picker) */}
            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => setShowCityPicker(!showCityPicker)}
              activeOpacity={0.7}
            >
              <View style={styles.infoIconCircle}>
                <Ionicons name="location-outline" size={18} color={colors.text} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Şehir</Text>
                <Text style={[styles.infoValue, !city && styles.infoValuePlaceholder]}>
                  {city || 'Şehir sec'}
                </Text>
              </View>
              <Ionicons
                name={showCityPicker ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textTertiary}
              />
            </TouchableOpacity>

            {/* City picker dropdown */}
            {showCityPicker && (
              <View style={styles.pickerDropdown}>
                <ScrollView
                  style={styles.pickerScroll}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                >
                  {TURKISH_CITIES.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.pickerItem,
                        city === c && styles.pickerItemSelected,
                      ]}
                      onPress={() => {
                        setCity(c);
                        setShowCityPicker(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          city === c && styles.pickerItemTextSelected,
                        ]}
                      >
                        {c}
                      </Text>
                      {city === c && (
                        <Ionicons name="checkmark" size={18} color={palette.gold[500]} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Height (editable) */}
            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => setShowHeightPicker(!showHeightPicker)}
              activeOpacity={0.7}
            >
              <View style={styles.infoIconCircle}>
                <Ionicons name="resize-outline" size={18} color={colors.text} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Boy</Text>
                <Text style={[styles.infoValue, !height && styles.infoValuePlaceholder]}>
                  {height ? `${height} cm` : 'Boy sec'}
                </Text>
              </View>
              <Ionicons
                name={showHeightPicker ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textTertiary}
              />
            </TouchableOpacity>

            {/* Height picker dropdown */}
            {showHeightPicker && (
              <View style={styles.pickerDropdown}>
                <ScrollView
                  style={styles.pickerScroll}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                >
                  {HEIGHT_VALUES.map((h) => (
                    <TouchableOpacity
                      key={h}
                      style={[
                        styles.pickerItem,
                        height === h && styles.pickerItemSelected,
                      ]}
                      onPress={() => {
                        setHeight(h);
                        setShowHeightPicker(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          height === h && styles.pickerItemTextSelected,
                        ]}
                      >
                        {h} cm
                      </Text>
                      {height === h && (
                        <Ionicons name="checkmark" size={18} color={palette.gold[500]} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* ── Meslek & Eğitim ──────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Meslek & Eğitim</Text>

            {/* Job */}
            <View style={styles.textFieldRow}>
              <View style={styles.infoIconCircle}>
                <Ionicons name="briefcase-outline" size={18} color={colors.text} />
              </View>
              <View style={styles.textFieldContent}>
                <Text style={styles.infoLabel}>Meslek</Text>
                <TextInput
                  style={styles.textFieldInput}
                  value={job}
                  onChangeText={setJob}
                  placeholder="Mesleğini yaz..."
                  placeholderTextColor={colors.textTertiary}
                  maxLength={60}
                  returnKeyType="done"
                />
              </View>
            </View>

            {/* Education */}
            <View style={[styles.textFieldRow, styles.lifestyleRowLast]}>
              <View style={styles.infoIconCircle}>
                <Ionicons name="school-outline" size={18} color={colors.text} />
              </View>
              <View style={styles.textFieldContent}>
                <Text style={styles.infoLabel}>Eğitim</Text>
                <TextInput
                  style={styles.textFieldInput}
                  value={education}
                  onChangeText={setEducation}
                  placeholder="Okulunu veya eğitimini yaz..."
                  placeholderTextColor={colors.textTertiary}
                  maxLength={80}
                  returnKeyType="done"
                />
              </View>
            </View>
          </View>

          <SectionHeader title="Hedefim" description="Baskalarina ne aradiginizi soyleyin" />

          {/* ── Niyet Etiketi ─────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ne Arıyorsun?</Text>
            <View style={styles.intentionGrid}>
              {INTENTION_OPTIONS.map((option) => {
                const isSelected = intentionTag === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.intentionChip,
                      isSelected && styles.intentionChipSelected,
                    ]}
                    onPress={() => setIntentionTag(option.value)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.intentionLabel,
                        isSelected && styles.intentionLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={16} color={palette.purple[500]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ─── Section 3: Hakkimda Daha Fazlasi ─── */}
          <SectionHeader
            title="Hakkimda Daha Fazlasi"
            description="Uygun kisileri bulmak icin kendiniz hakkinda daha fazla bilgi belirtin"
          />
          <FieldRow icon="⚖️" label="Kilo" value={weight ? `${weight} kg` : ''} onPress={() => {}} />
          <FieldRow icon="⚥" label="Cinsel Yonelim" value={sexualOrientation || ''} onPress={() => openPicker('Cinsel Yonelim', SEXUAL_ORIENTATION_OPTIONS, 'sexualOrientation')} />
          <FieldRow icon="♍" label="Burc" value={zodiacSign || ''} onPress={() => openPicker('Burc', ZODIAC_SIGNS, 'zodiacSign')} />
          <FieldRow icon="🏋️" label="Egzersiz" value={exercise || ''} onPress={() => openPicker('Egzersiz', CONFIG_EXERCISE_OPTIONS, 'exercise')} />
          <FieldRow icon="🎓" label="Egitim Seviyesi" value={educationLevel || ''} onPress={() => openPicker('Egitim Seviyesi', EDUCATION_LEVELS, 'educationLevel')} />
          <FieldRow icon="💕" label="Medeni Durum" value={maritalStatus || ''} onPress={() => openPicker('Medeni Durum', MARITAL_STATUS_OPTIONS, 'maritalStatus')} />
          <FieldRow icon="👶" label="Cocuklar" value={children || ''} onPress={() => openPicker('Cocuklar', CONFIG_CHILDREN_OPTIONS, 'children')} />
          <FieldRow icon="🍷" label="Icki" value={alcohol || ''} onPress={() => openPicker('Icki', ALCOHOL_OPTIONS, 'alcohol')} />
          <FieldRow icon="🚬" label="Sigara" value={smoking || ''} onPress={() => openPicker('Sigara', CONFIG_SMOKING_OPTIONS, 'smoking')} />
          <FieldRow icon="🐾" label="Evcil Hayvanlar" value={pets || ''} onPress={() => openPicker('Evcil Hayvanlar', PETS_OPTIONS, 'pets')} />
          <FieldRow icon="🕌" label="Din" value={religion || ''} onPress={() => openPicker('Din', RELIGION_OPTIONS, 'religion')} />
          <FieldRow icon="🌐" label="Degerler" value={lifeValues || ''} onPress={() => {}} />

          {/* ─── Section 4: Kisligimi Tanit ─── */}
          <SectionHeader title="Kisligimi Tanit" description="Kendini ifade et, insanlarin seni tanimasi icin" />

          {/* ── İlgi Alanları ─────────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>İlgi Alanları</Text>
              <Text style={styles.charCounter}>
                {selectedInterests.length}/{MAX_INTERESTS}
              </Text>
            </View>
            <View style={styles.interestGrid}>
              {INTEREST_OPTIONS.map((option) => {
                const isSelected = selectedInterests.includes(option.id);
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.interestChip,
                      isSelected && styles.interestChipSelected,
                    ]}
                    onPress={() => toggleInterest(option.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.interestEmoji}>{option.emoji}</Text>
                    <Text
                      style={[
                        styles.interestLabel,
                        isSelected && styles.interestLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="close-circle" size={16} color={palette.gold[600]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Prompt'larim ──────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prompt'larim</Text>
            <Text style={styles.sectionHint}>Profilinde görünecek sorular (max 3)</Text>

            {profile.prompts.map((prompt: { id: string; question: string; answer: string; order: number }, idx: number) => (
              <View key={prompt.id} style={styles.promptEditCard}>
                <Text style={styles.promptEditQuestion}>{prompt.question}</Text>
                <TextInput
                  style={styles.promptEditAnswer}
                  value={prompt.answer}
                  onChangeText={(text) => updatePromptAnswer(idx, text)}
                  placeholder="Cevabini yaz..."
                  placeholderTextColor={colors.textTertiary}
                  maxLength={200}
                  multiline
                  textAlignVertical="top"
                />
                <View style={styles.promptEditFooter}>
                  <Text style={styles.charCount}>{prompt.answer.length}/200</Text>
                  <TouchableOpacity
                    onPress={() => removePrompt(idx)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.6}
                    accessibilityLabel="Prompt'u kaldir"
                    accessibilityRole="button"
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {profile.prompts.length < 3 && (
              <TouchableOpacity
                style={styles.addPromptButton}
                onPress={() => setShowPromptPicker(true)}
                activeOpacity={0.7}
                accessibilityLabel="Soru ekle"
                accessibilityRole="button"
              >
                <Ionicons name="add-circle-outline" size={20} color={palette.purple[500]} />
                <Text style={styles.addPromptText}>Soru Ekle</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Sevdigin Mekanlar ──────────────────────────────────────── */}
          <View style={styles.section}>
            <FavoriteSpotsEditor
              spots={profile.favoriteSpots}
              onSpotsChange={(spots) => setFavoriteSpots(spots)}
            />
          </View>

          {/* ─── Section 5: Uyum Sorulari ─── */}
          <SectionHeader title="Uyum Sorulari" description="45 soru ile uyum puanini yukselt" />
          <View style={{
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.surfaceBorder,
            borderRadius: 12,
            marginHorizontal: 24,
            padding: 16,
            gap: 12,
            marginBottom: 16,
          }}>
            {/* Progress display */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontFamily: 'Poppins_600SemiBold', fontWeight: '600', color: colors.text }}>
                {answeredCount}/45 soru cevaplanmis
              </Text>
              <Text style={{ fontSize: 13, fontFamily: 'Poppins_500Medium', fontWeight: '500', color: colors.primary }}>
                %{Math.round((answeredCount / 45) * 100)}
              </Text>
            </View>
            {/* Progress bar */}
            <View style={{ height: 6, backgroundColor: colors.surfaceLight, borderRadius: 3, overflow: 'hidden' }}>
              <View style={{
                height: '100%',
                width: `${Math.min((answeredCount / 45) * 100, 100)}%`,
                backgroundColor: answeredCount >= 30 ? colors.success : answeredCount >= 15 ? '#F59E0B' : colors.error,
                borderRadius: 3,
              }} />
            </View>
            {/* CTA */}
            <TouchableOpacity
              onPress={() => navigation.navigate('CompatibilityQuestions' as never)}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
                marginTop: 4,
              }}
            >
              <Text style={{ fontSize: 15, fontFamily: 'Poppins_700Bold', fontWeight: '700', color: '#fff' }}>
                Sorulara Devam Et
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Ses Tanitimi ──────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ses Tanitimi</Text>
            <Text style={styles.sectionHint}>
              Sesini kaydet ve profilini daha kisisel hale getir.
            </Text>
            <TouchableOpacity
              style={styles.voiceButton}
              onPress={() => {
                Alert.alert(
                  'Yakin Zamanda',
                  'Ses tanitimi özelligi yakın zamanda aktif olacak.',
                );
              }}
              activeOpacity={0.7}
              accessibilityLabel="Ses tanitimi kaydet"
              accessibilityRole="button"
            >
              <View style={styles.voiceIconCircle}>
                <Ionicons name="mic-outline" size={22} color={palette.gold[600]} />
              </View>
              <View style={styles.voiceContent}>
                <Text style={styles.voiceTitle}>Ses Kaydi Ekle</Text>
                <Text style={styles.voiceSubtitle}>30 saniyeye kadar sesli tanitim</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* ── Save Button (Gold Gradient, fixed bottom) ───────────────── */}
        <View style={[styles.saveContainer, { paddingBottom: insets.bottom + spacing.md }]}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving || !hasChanges}
            activeOpacity={0.85}
            style={[
              styles.saveButtonOuter,
              (!hasChanges && !isSaving) && styles.saveButtonDisabled,
            ]}
            accessibilityLabel="Degisiklikleri kaydet"
            accessibilityRole="button"
          >
            <LinearGradient
              colors={
                hasChanges
                  ? [palette.gold[400], palette.gold[600]] as [string, string, ...string[]]
                  : [palette.gray[300], palette.gray[400]] as [string, string, ...string[]]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButtonGradient}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Kaydet</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
      {/* ── Video Recorder Modal ──────────────────────────────────── */}
      <VideoRecorder
        visible={showVideoRecorder}
        onDismiss={() => setShowVideoRecorder(false)}
        onVideoReady={handleVideoReady}
      />
      <PromptPickerSheet
        visible={showPromptPicker}
        onSelect={handlePromptSelect}
        onClose={() => setShowPromptPicker(false)}
        usedPromptIds={profile.prompts.map((p: { id: string }) => p.id)}
      />
      {/* Option Picker */}
      {pickerConfig && (
        <OptionPicker
          visible={pickerConfig.visible}
          title={pickerConfig.title}
          options={pickerConfig.options}
          selected={extendedFieldValues[pickerConfig.field] ?? ''}
          onSelect={handlePickerSelect}
          onDismiss={() => setPickerConfig(null)}
        />
      )}
    </KeyboardAvoidingView>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ── Styles ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: poppinsFonts.semibold,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    includeFontPadding: false,
  },
  headerSpacer: {
    width: 40,
  },

  // ── ScrollView ──
  scrollContent: {
    paddingTop: spacing.sm,
  },

  // ── Sections ──
  section: {
    paddingHorizontal: GRID_PADDING,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: poppinsFonts.bold,
    fontWeight: fontWeights.bold,
    color: colors.text,
    letterSpacing: 0,
    marginBottom: spacing.sm,
    includeFontPadding: false,
  },
  sectionHint: {
    fontSize: 13,
    fontFamily: poppinsFonts.regular,
    fontWeight: fontWeights.regular,
    color: colors.textTertiary,
    marginBottom: spacing.md,
    lineHeight: 18,
    includeFontPadding: false,
  },

  // ── Photo Grid (3x2) ──
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  photoCell: {
    width: PHOTO_CELL_WIDTH,
    height: PHOTO_CELL_HEIGHT,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  photoCellMain: {
    borderColor: palette.gold[500],
    borderWidth: 2.5,
    borderStyle: 'solid',
  },
  photoContent: {
    flex: 1,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoRemoveButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoMainBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: palette.gold[500] + 'DD',
    paddingVertical: 3,
  },
  photoMainBadgeText: {
    fontSize: 10,
    fontFamily: poppinsFonts.bold,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  photoOrderBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoOrderText: {
    fontSize: 10,
    fontFamily: poppinsFonts.bold,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  photoEmptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  photoUploadingText: {
    fontSize: 10,
    fontFamily: poppinsFonts.medium,
    fontWeight: fontWeights.medium,
    color: colors.textTertiary,
    includeFontPadding: false,
  },

  // ── Bio ──
  charCounter: {
    fontSize: 12,
    fontFamily: poppinsFonts.regular,
    fontWeight: fontWeights.regular,
    color: colors.textTertiary,
    includeFontPadding: false,
  },
  charCounterLimit: {
    color: palette.error,
  },
  bioInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 15,
    fontFamily: poppinsFonts.regular,
    fontWeight: fontWeights.regular,
    color: colors.text,
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    includeFontPadding: false,
    textAlignVertical: 'top',
  },

  // ── Info rows ──
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder + '80',
  },
  infoIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(139, 92, 246, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: poppinsFonts.medium,
    fontWeight: fontWeights.medium,
    color: colors.textTertiary,
    marginBottom: 2,
    includeFontPadding: false,
  },
  infoValue: {
    fontSize: 15,
    fontFamily: poppinsFonts.medium,
    fontWeight: fontWeights.medium,
    color: colors.text,
    includeFontPadding: false,
  },
  infoValuePlaceholder: {
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  readOnlyTag: {
    backgroundColor: colors.surfaceBorder,
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  readOnlyTagText: {
    fontSize: 10,
    fontFamily: poppinsFonts.medium,
    fontWeight: fontWeights.medium,
    color: colors.textTertiary,
    includeFontPadding: false,
  },

  // ── Picker dropdown ──
  pickerDropdown: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginTop: spacing.sm,
    overflow: 'hidden',
    ...shadows.small,
  },
  pickerScroll: {
    maxHeight: 200,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder + '60',
  },
  pickerItemSelected: {
    backgroundColor: palette.gold[500] + '10',
  },
  pickerItemText: {
    fontSize: 15,
    fontFamily: poppinsFonts.regular,
    fontWeight: fontWeights.regular,
    color: colors.text,
    includeFontPadding: false,
  },
  pickerItemTextSelected: {
    fontFamily: poppinsFonts.semibold,
    fontWeight: fontWeights.semibold,
    color: palette.gold[600],
  },

  // ── Text field rows (job, education) ──
  textFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder + '80',
  },
  textFieldContent: {
    flex: 1,
  },
  textFieldInput: {
    fontSize: 15,
    fontFamily: poppinsFonts.regular,
    fontWeight: fontWeights.regular,
    color: colors.text,
    paddingVertical: 2,
    paddingHorizontal: 0,
    includeFontPadding: false,
  },

  // ── Intention tag ──
  intentionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  intentionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
  },
  intentionChipSelected: {
    borderColor: palette.purple[500],
    backgroundColor: palette.purple[500] + '12',
  },
  intentionLabel: {
    fontSize: 14,
    fontFamily: poppinsFonts.medium,
    fontWeight: fontWeights.medium,
    color: colors.text,
    includeFontPadding: false,
  },
  intentionLabelSelected: {
    color: palette.purple[600],
    fontFamily: poppinsFonts.semibold,
    fontWeight: fontWeights.semibold,
  },

  // ── Interests ──
  interestGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
  },
  interestChipSelected: {
    borderColor: palette.gold[500],
    backgroundColor: palette.gold[500] + '10',
  },
  interestEmoji: {
    fontSize: 16,
    includeFontPadding: false,
  },
  interestLabel: {
    fontSize: 13,
    fontFamily: poppinsFonts.medium,
    fontWeight: fontWeights.medium,
    color: colors.text,
    includeFontPadding: false,
  },
  interestLabelSelected: {
    fontFamily: poppinsFonts.semibold,
    fontWeight: fontWeights.semibold,
    color: palette.gold[700],
  },

  // ── Prompts ──
  promptEditCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  promptEditQuestion: {
    fontSize: 13,
    fontFamily: poppinsFonts.medium,
    fontWeight: fontWeights.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 18,
    includeFontPadding: false,
  },
  promptEditAnswer: {
    fontSize: 15,
    fontFamily: poppinsFonts.regular,
    fontWeight: fontWeights.regular,
    color: colors.text,
    minHeight: 60,
    padding: 0,
    includeFontPadding: false,
    textAlignVertical: 'top',
  },
  promptEditFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder + '60',
  },
  charCount: {
    fontSize: 11,
    fontFamily: poppinsFonts.regular,
    fontWeight: fontWeights.regular,
    color: colors.textTertiary,
    includeFontPadding: false,
  },
  addPromptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: palette.purple[500] + '40',
    backgroundColor: palette.purple[500] + '05',
  },
  addPromptText: {
    fontSize: 14,
    fontFamily: poppinsFonts.semibold,
    fontWeight: fontWeights.semibold,
    color: palette.purple[500],
    includeFontPadding: false,
  },

  // ── Lifestyle rows ──
  lifestyleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder + '80',
  },
  lifestyleRowLast: {
    borderBottomWidth: 0,
  },

  // ── Voice intro ──
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    ...shadows.small,
  },
  voiceIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.gold[500] + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  voiceContent: {
    flex: 1,
  },
  voiceTitle: {
    fontSize: 15,
    fontFamily: poppinsFonts.semibold,
    fontWeight: fontWeights.semibold,
    color: colors.text,
    marginBottom: 2,
    includeFontPadding: false,
  },
  voiceSubtitle: {
    fontSize: 12,
    fontFamily: poppinsFonts.regular,
    fontWeight: fontWeights.regular,
    color: colors.textSecondary,
    includeFontPadding: false,
  },

  // ── Video section ──
  videoUploadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  videoUploadingText: {
    fontSize: 13,
    fontFamily: poppinsFonts.medium,
    fontWeight: fontWeights.medium,
    color: palette.gold[600],
    includeFontPadding: false,
  },
  videoProgressBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: colors.surfaceBorder,
    borderRadius: 2,
    overflow: 'hidden',
  },
  videoProgressBarFill: {
    height: '100%',
    backgroundColor: '#D4AF37',
    borderRadius: 2,
  },
  videoPreviewContainer: {
    gap: spacing.sm,
  },
  videoThumbnailWrap: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  videoThumbnailPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  videoThumbnailImage: {
    ...StyleSheet.absoluteFillObject,
  },
  videoPlayOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  videoDurationTag: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  videoDurationText: {
    fontSize: 11,
    fontFamily: poppinsFonts.semibold,
    fontWeight: fontWeights.semibold,
    color: '#FFFFFF',
    includeFontPadding: false,
  },
  videoActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  videoActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  videoActionDelete: {
    borderColor: palette.error + '30',
    backgroundColor: palette.error + '08',
  },
  videoActionText: {
    fontSize: 13,
    fontFamily: poppinsFonts.semibold,
    fontWeight: fontWeights.semibold,
    color: palette.gold[600],
    includeFontPadding: false,
  },
  videoAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: palette.gold[500] + '40',
    borderStyle: 'dashed',
  },
  videoAddIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.gold[500] + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoAddText: {
    fontSize: 16,
    fontFamily: poppinsFonts.semibold,
    fontWeight: fontWeights.semibold,
    color: palette.gold[600],
    includeFontPadding: false,
  },

  // ── Save button (fixed bottom) ──
  saveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: GRID_PADDING,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  saveButtonOuter: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.medium,
    shadowColor: palette.gold[500],
    shadowOpacity: 0.3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: poppinsFonts.bold,
    fontWeight: fontWeights.bold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
    includeFontPadding: false,
  },
});

const sectionStyles = StyleSheet.create({
  header: {
    marginTop: 28,
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  headerDesc: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: colors.textSecondary,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 24,
    marginBottom: 8,
  },
  fieldIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  fieldLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: colors.text,
  },
  fieldRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldValue: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: colors.textSecondary,
  },
  fieldPlaceholder: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    fontWeight: '400',
    color: colors.textTertiary,
  },
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  pickerSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  pickerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceBorder,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  pickerTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  pickerOptionSelected: {
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
  },
  pickerOptionText: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
    fontWeight: '500',
    color: colors.text,
  },
  pickerOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
});
