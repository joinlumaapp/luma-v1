// Selfie verification screen — real camera with face guide overlay

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout } from '../../theme/spacing';

type SelfieNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'SelfieVerification'>;

const { width } = Dimensions.get('window');
const CAMERA_SIZE = width * 0.7;

export const SelfieVerificationScreen: React.FC = () => {
  const navigation = useNavigation<SelfieNavigationProp>();
  const [permission, requestPermission] = useCameraPermissions();
  const [isTakingSelfie, setIsTakingSelfie] = useState(false);
  const [selfieComplete, setSelfieComplete] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const setVerified = useAuthStore((state) => state.setVerified);

  const handleRequestPermission = useCallback(async () => {
    const result = await requestPermission();
    if (!result.granted) {
      Alert.alert(
        'Kamera Izni Gerekli',
        'Selfie dogrulama icin kamera iznine ihtiyacimiz var. Lutfen ayarlardan kamera iznini aktif edin.',
      );
    }
  }, [requestPermission]);

  const handleTakeSelfie = useCallback(async () => {
    if (!cameraRef.current || isTakingSelfie) return;

    setIsTakingSelfie(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      if (photo) {
        setCapturedUri(photo.uri);
        setSelfieComplete(true);
      }
    } catch {
      Alert.alert('Hata', 'Selfie cekilemedi. Lutfen tekrar deneyin.');
    } finally {
      setIsTakingSelfie(false);
    }
  }, [isTakingSelfie]);

  const handleRetake = useCallback(() => {
    setCapturedUri(null);
    setSelfieComplete(false);
  }, []);

  const handleContinue = () => {
    setVerified(true);
  };

  const handleSkip = () => {
    useAuthStore.getState().setVerified(true);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const permissionGranted = permission?.granted;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Selfie Dogrulama</Text>
        <Text style={styles.subtitle}>
          Profilinin gercek oldugunu dogrulamak icin bir selfie cek. Yuzun net gorunmeli.
        </Text>

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
              Yuzunu cerceve icine yerlestir
            </Text>
          </View>
          <View style={styles.instructionRow}>
            <Text style={styles.instructionBullet}>2</Text>
            <Text style={styles.instructionText}>
              Iyi aydinlatilmis bir ortamda ol
            </Text>
          </View>
          <View style={styles.instructionRow}>
            <Text style={styles.instructionBullet}>3</Text>
            <Text style={styles.instructionText}>
              Gunes gozlugu veya maske takma
            </Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.footer}>
        {selfieComplete ? (
          <>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
              activeOpacity={0.85}
            >
              <Text style={styles.continueButtonText}>Onayla ve Devam Et</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleRetake} style={styles.skipButton}>
              <Text style={styles.retakeText}>Tekrar Cek</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.selfieButton, (isTakingSelfie || !permissionGranted) && styles.selfieButtonDisabled]}
            onPress={handleTakeSelfie}
            disabled={isTakingSelfie || !permissionGranted}
            activeOpacity={0.85}
          >
            <Text style={styles.selfieButtonText}>
              {isTakingSelfie ? 'Cekiliyor...' : 'Selfie Cek'}
            </Text>
          </TouchableOpacity>
        )}

        {!selfieComplete && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Simdilik Atla</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    ...typography.h4,
    color: colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
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
    fontWeight: '600',
  },
  instructionText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
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
    fontWeight: '600',
  },
});
