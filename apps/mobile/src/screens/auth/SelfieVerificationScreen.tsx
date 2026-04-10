// Selfie verification screen — real camera with face guide overlay

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';
import { useTestModeStore } from '../../stores/testModeStore';
import { validateSelfieFace } from '../../services/faceDetectionService';
import { storage } from '../../utils/storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout } from '../../theme/spacing';
import { BrandedBackground } from '../../components/common/BrandedBackground';

type SelfieNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'SelfieVerification'>;

const { width } = Dimensions.get('window');
const CAMERA_SIZE = width * 0.7;

export const SelfieVerificationScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<SelfieNavigationProp>();
  const [permission, requestPermission] = useCameraPermissions();
  const [isTakingSelfie, setIsTakingSelfie] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isValidatingFace, setIsValidatingFace] = useState(false);
  const [selfieComplete, setSelfieComplete] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const setVerified = useAuthStore((state) => state.setVerified);
  const verifySelfie = useAuthStore((state) => state.verifySelfie);
  const isTestMode = useTestModeStore((state) => state.isTestMode);
  const updateProfile = useProfileStore((state) => state.updateProfile);

  // Auto-request camera permission when the screen mounts
  useEffect(() => {
    if (permission && !permission.granted && permission.status !== 'denied') {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Get the first profile photo for the reference display
  const profilePhotos = useProfileStore((state) => state.profile.photos);
  const firstProfilePhoto = profilePhotos.length > 0 ? profilePhotos[0] : null;

  /**
   * Save collected onboarding profile fields to the backend before marking
   * onboarding as complete. Without this, firstName and other fields collected
   * during onboarding would remain only in the client-side Zustand store and
   * never reach the database, causing "Kullanici" fallback everywhere.
   *
   * This function:
   * 1. Sends text profile fields via PATCH /profiles/me
   * 2. Uploads each selected photo via POST /profiles/photos (multipart)
   * 3. Only sends non-empty fields to avoid backend DTO validation errors
   */
  const saveProfileAndComplete = useCallback(async () => {
    const { profile, uploadPhoto } = useProfileStore.getState();

    // Build payload with only non-empty fields to avoid DTO validation rejecting
    // empty strings (e.g. bio with @MinLength(10) would reject '')
    const profilePayload: Record<string, unknown> = {};
    if (profile.firstName && profile.firstName.trim().length > 0) {
      profilePayload.firstName = profile.firstName.trim();
    }
    if (profile.lastName && profile.lastName.trim().length > 0) {
      profilePayload.lastName = profile.lastName.trim();
    }
    if (profile.birthDate && profile.birthDate.length > 0) {
      profilePayload.birthDate = profile.birthDate;
    }
    if (profile.gender && profile.gender.length > 0) {
      profilePayload.gender = profile.gender;
    }
    if (profile.bio && profile.bio.trim().length >= 10) {
      profilePayload.bio = profile.bio.trim();
    }
    if (profile.city && profile.city.trim().length > 0) {
      profilePayload.city = profile.city.trim();
    }
    if (profile.intentionTag && profile.intentionTag.length > 0) {
      profilePayload.intentionTag = profile.intentionTag;
    }
    if (profile.interestTags && profile.interestTags.length > 0) {
      profilePayload.interestTags = profile.interestTags;
    }
    if (profile.height != null && profile.height > 0) {
      profilePayload.height = profile.height;
    }
    if (profile.smoking && profile.smoking.length > 0) {
      profilePayload.smoking = profile.smoking;
    }
    if (profile.sports && profile.sports.length > 0) {
      profilePayload.sports = profile.sports;
    }
    if (profile.children && profile.children.length > 0) {
      profilePayload.children = profile.children;
    }
    if (profile.job && profile.job.length > 0) {
      profilePayload.job = profile.job;
    }
    if (profile.education && profile.education.length > 0) {
      profilePayload.education = profile.education;
    }
    if (profile.alcohol && profile.alcohol.length > 0) {
      profilePayload.alcohol = profile.alcohol;
    }
    if (profile.zodiacSign && profile.zodiacSign.length > 0) {
      profilePayload.zodiacSign = profile.zodiacSign;
    }
    if (profile.religion && profile.religion.length > 0) {
      profilePayload.religion = profile.religion;
    }
    if (profile.weight != null && profile.weight > 0) {
      profilePayload.weight = profile.weight;
    }
    if (profile.sexualOrientation && profile.sexualOrientation.length > 0) {
      profilePayload.sexualOrientation = profile.sexualOrientation;
    }
    if (profile.educationLevel && profile.educationLevel.length > 0) {
      profilePayload.educationLevel = profile.educationLevel;
    }
    if (profile.maritalStatus && profile.maritalStatus.length > 0) {
      profilePayload.maritalStatus = profile.maritalStatus;
    }
    if (profile.pets && profile.pets.length > 0) {
      profilePayload.pets = profile.pets;
    }
    if (profile.lifeValues && profile.lifeValues.length > 0) {
      profilePayload.lifeValues = profile.lifeValues;
    }

    // Step 1: Save text profile fields
    try {
      if (__DEV__) {
        console.log('[Onboarding] Saving profile fields:', JSON.stringify(profilePayload));
      }
      await updateProfile(profilePayload);
      if (__DEV__) {
        console.log('[Onboarding] Profile fields saved successfully');
      }
    } catch (profileError) {
      if (__DEV__) {
        console.error('[Onboarding] Profile save failed:', profileError);
      }
      // Continue to photo upload even if profile save fails —
      // profile can be retried on next app launch
    }

    // Step 2: Upload photos one by one (multipart/form-data)
    const photoUris = profile.photos ?? [];
    if (photoUris.length > 0) {
      if (__DEV__) {
        console.log(`[Onboarding] Uploading ${photoUris.length} photos...`);
      }
      for (let i = 0; i < photoUris.length; i++) {
        try {
          await uploadPhoto(photoUris[i]);
          if (__DEV__) {
            console.log(`[Onboarding] Photo ${i + 1}/${photoUris.length} uploaded`);
          }
        } catch (photoError) {
          if (__DEV__) {
            console.error(`[Onboarding] Photo ${i + 1} upload failed:`, photoError);
          }
          // Continue uploading remaining photos even if one fails
        }
      }
    }

    useAuthStore.getState().setOnboarded(true);
    await storage.setOnboarded(true);
  }, [updateProfile]);

  // Founder test mode: auto-approve selfie after 2s
  useEffect(() => {
    if (__DEV__ && isTestMode) {
      const timer = setTimeout(async () => {
        setVerified(true);
        await saveProfileAndComplete();
      }, 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isTestMode, setVerified, saveProfileAndComplete]);

  const handleRequestPermission = useCallback(async () => {
    const result = await requestPermission();
    if (!result.granted) {
      Alert.alert(
        'Kamera İzni Gerekli',
        'Selfie doğrulama için kamera iznine ihtiyacımız var. Lütfen ayarlardan kamera iznini aktif edin.',
      );
    }
  }, [requestPermission]);

  const handleTakeSelfie = useCallback(async () => {
    if (!cameraRef.current || isTakingSelfie) return;

    setIsTakingSelfie(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });
      if (photo) {
        // Validate that the selfie contains a face before proceeding
        setIsValidatingFace(true);
        const faceResult = await validateSelfieFace(photo.uri);
        setIsValidatingFace(false);

        if (!faceResult.valid) {
          if (faceResult.reason === 'multiple_faces') {
            Alert.alert(
              'Birden Fazla Yüz Algılandı',
              'Selfie\'de yalnızca senin yüzün görünmeli. Lütfen tek başına tekrar dene.',
            );
          } else {
            Alert.alert(
              'Yüz Algılanamadı',
              'Selfie\'deki yüz, profil fotoğrafınla eşleşmiyor. Lütfen kendi fotoğrafını kullan.',
            );
          }
          return;
        }

        setCapturedUri(photo.uri);
        setCapturedBase64(photo.base64 ?? null);
        setSelfieComplete(true);
      }
    } catch {
      setIsValidatingFace(false);
      Alert.alert('Hata', 'Selfie çekilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsTakingSelfie(false);
    }
  }, [isTakingSelfie]);

  const handleRetake = useCallback(() => {
    setCapturedUri(null);
    setCapturedBase64(null);
    setSelfieComplete(false);
  }, []);

  const handleContinue = async () => {
    if (!capturedBase64 || isVerifying) return;

    setIsVerifying(true);
    try {
      // Send captured photo base64 to backend for verification
      const result = await verifySelfie(capturedBase64);

      if (result.verified) {
        Alert.alert('Başarılı', 'Kimliğin başarıyla doğrulandı!');
      } else {
        Alert.alert(
          'Doğrulama Başarısız',
          'Selfie doğrulaması başarısız oldu. Tekrar deneyebilir veya atlayabilirsin.',
        );
      }
      // Save profile fields to backend, then mark onboarding as complete
      await saveProfileAndComplete();
    } catch {
      Alert.alert('Hata', 'Selfie doğrulanırken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSkip = async () => {
    // User skips selfie verification — NOT marked as verified
    useAuthStore.getState().setVerified(false);
    // Save profile fields to backend, then mark onboarding as complete
    await saveProfileAndComplete();
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const permissionGranted = permission?.granted;

  return (
    <View style={styles.container}>
      <BrandedBackground />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Geri dön">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Everything in one scroll flow — no overlap possible */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentInner, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Selfie Doğrulama</Text>
        <Text style={styles.subtitle}>
          Profilinin gerçek olduğunu doğrulamak için bir selfie çek. Yüzün net görünmeli.
        </Text>

        {/* Profile photo reference — accountability reminder */}
        {firstProfilePhoto && (
          <View style={styles.referenceContainer}>
            <Image
              source={{ uri: firstProfilePhoto }}
              style={styles.referencePhoto}
              resizeMode="cover"
              accessibilityLabel="Profil fotoğrafın"
            />
            <Text style={styles.referenceText}>
              Profil fotoğrafınla aynı kişi olduğundan emin ol
            </Text>
          </View>
        )}

        {/* Camera preview area */}
        <View style={styles.cameraContainer}>
          <View style={styles.cameraPreview}>
            {selfieComplete && capturedUri ? (
              <Image
                source={{ uri: capturedUri }}
                style={styles.capturedImage}
                resizeMode="cover"
              />
            ) : permissionGranted ? (
              <>
                <CameraView
                  ref={cameraRef}
                  style={StyleSheet.absoluteFillObject}
                  facing="front"
                />
                {/* Face guide overlay */}
                <View style={styles.faceGuide} />
              </>
            ) : (
              <View style={styles.cameraPlaceholder}>
                <Text style={styles.cameraIcon}>{'[ ]'}</Text>
                <TouchableOpacity onPress={handleRequestPermission}>
                  <Text style={styles.permissionText}>Kamera iznini ver</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <View style={styles.instructionRow}>
            <Text style={styles.instructionBullet}>1</Text>
            <Text style={styles.instructionText}>
              Yüzünü çerçeve içine yerleştir
            </Text>
          </View>
          <View style={styles.instructionRow}>
            <Text style={styles.instructionBullet}>2</Text>
            <Text style={styles.instructionText}>
              İyi aydınlatılmış bir ortamda ol
            </Text>
          </View>
          <View style={styles.instructionRow}>
            <Text style={styles.instructionBullet}>3</Text>
            <Text style={styles.instructionText}>
              Güneş gözlüğü veya maske takma
            </Text>
          </View>
        </View>

        {/* Actions — inside scroll so they never overlap instructions */}
        <View style={styles.footer}>
          {selfieComplete ? (
            <>
              <TouchableOpacity
                style={[styles.continueButton, isVerifying && styles.selfieButtonDisabled]}
                onPress={handleContinue}
                disabled={isVerifying}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Onayla ve devam et"
              >
                {isVerifying ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <Text style={styles.continueButtonText}>Onayla ve Devam Et</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRetake} style={styles.skipButton} accessibilityRole="button" accessibilityLabel="Tekrar çek">
                <Text style={styles.retakeText}>Tekrar Çek</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.selfieButton, (isTakingSelfie || isValidatingFace || !permissionGranted) && styles.selfieButtonDisabled]}
              onPress={handleTakeSelfie}
              disabled={isTakingSelfie || isValidatingFace || !permissionGranted}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Selfie çek"
            >
              {isValidatingFace ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.selfieButtonText}>
                  {isTakingSelfie ? '\u00c7ekiliyor...' : 'Selfie \u00c7ek'}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {!selfieComplete && (
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton} accessibilityRole="button" accessibilityLabel="Şimdilik atla">
              <Text style={styles.skipText}>Şimdilik Atla</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  contentInner: {
    flexGrow: 1,
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
    lineHeight: 24,
  },
  referenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.smd,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.smd,
  },
  referencePhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  referenceText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  cameraContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cameraPreview: {
    width: CAMERA_SIZE,
    height: CAMERA_SIZE,
    borderRadius: CAMERA_SIZE / 2,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
    overflow: 'hidden',
  },
  capturedImage: {
    width: '100%',
    height: '100%',
  },
  cameraPlaceholder: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  cameraIcon: {
    fontSize: 48,
    color: colors.textTertiary,
  },
  permissionText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  faceGuide: {
    position: 'absolute',
    width: CAMERA_SIZE * 0.6,
    height: CAMERA_SIZE * 0.8,
    borderRadius: CAMERA_SIZE * 0.3,
    borderWidth: 2,
    borderColor: colors.primary + '40',
    borderStyle: 'dashed',
  },
  instructions: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  instructionBullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary + '20',
    color: colors.primary,
    textAlign: 'center',
    ...typography.bodySmall,
    lineHeight: 28,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
  instructionText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  footer: {
    marginTop: 24,
    gap: 12,
  },
  selfieButton: {
    backgroundColor: colors.primary,
    height: layout.buttonHeight,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selfieButtonDisabled: {
    opacity: 0.7,
  },
  selfieButtonText: {
    ...typography.button,
    color: colors.text,
  },
  continueButton: {
    backgroundColor: colors.success,
    height: layout.buttonHeight,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonText: {
    ...typography.button,
    color: colors.text,
  },
  skipButton: {
    height: layout.buttonSmallHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipText: {
    ...typography.bodySmall,
    color: colors.textTertiary,
  },
  retakeText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '600',
  },
});
