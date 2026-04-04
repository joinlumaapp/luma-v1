// Face detection service for profile photo validation
// Uses @infinitered/react-native-mlkit-face-detection for on-device ML Kit face detection
// Falls back gracefully if the native module is not yet available (pre-build)

import { Alert } from 'react-native';

interface FaceDetectionResult {
  hasFace: boolean;
  faceCount: number;
  error?: string;
}

/**
 * Detect faces in a static image URI using ML Kit.
 *
 * Returns { hasFace, faceCount } on success. If the native module is not yet
 * linked (e.g. before the next EAS build), the function returns hasFace: true
 * so that the photo upload flow is not blocked.
 */
const detectFaces = async (uri: string): Promise<FaceDetectionResult> => {
  try {
    // Dynamic import so the app does not crash if the native module is missing
    const FaceDetection = await import(
      '@infinitered/react-native-mlkit-face-detection'
    );

    const detector = FaceDetection.default ?? FaceDetection;

    // Use the static image detection API
    const faces = await detector.detectFaces(uri);

    return {
      hasFace: Array.isArray(faces) && faces.length > 0,
      faceCount: Array.isArray(faces) ? faces.length : 0,
    };
  } catch (error: unknown) {
    // If the native module is not installed/linked yet, allow the photo through
    // and log a warning so developers know the module needs to be set up
    const message =
      error instanceof Error ? error.message : 'Unknown face detection error';

    if (__DEV__) {
      console.warn(
        '[FaceDetection] Native module not available. ' +
          'Install @infinitered/react-native-mlkit-face-detection and rebuild. ' +
          `Error: ${message}`,
      );
    }

    // Graceful degradation: allow the photo when the module is unavailable
    return {
      hasFace: true,
      faceCount: 0,
      error: message,
    };
  }
};

/**
 * Validate that the given image contains at least one visible face.
 * Intended for the profile photo (first slot) during onboarding.
 *
 * Returns true if a face is detected (or if detection is unavailable).
 * Shows a Turkish alert and returns false when no face is found.
 */
export const validateProfilePhoto = async (uri: string): Promise<boolean> => {
  const result = await detectFaces(uri);

  if (!result.hasFace) {
    Alert.alert(
      'Yüz Algılanamadı',
      'Profil fotoğrafında yüzün net görünmeli. Lütfen yüzünün göründüğü bir fotoğraf seç.',
      [{ text: 'Tamam' }],
    );
    return false;
  }

  return true;
};

/**
 * Validate that the selfie image contains exactly one visible face.
 * Used during selfie verification to ensure the photo is usable.
 *
 * Returns { valid: true } when a single face is detected.
 * Returns { valid: false, reason } when no face or multiple faces are found,
 * or { valid: true } with a dev warning when detection is unavailable.
 */
export const validateSelfieFace = async (
  uri: string,
): Promise<{ valid: boolean; reason?: string }> => {
  const result = await detectFaces(uri);

  // If the native module is unavailable, allow through (graceful degradation)
  if (result.error) {
    if (__DEV__) {
      console.warn(
        '[FaceDetection] Selfie validation skipped — native module unavailable.',
      );
    }
    return { valid: true };
  }

  if (!result.hasFace) {
    return {
      valid: false,
      reason: 'no_face',
    };
  }

  // Multiple faces detected — selfie should contain only the user
  if (result.faceCount > 1) {
    return {
      valid: false,
      reason: 'multiple_faces',
    };
  }

  return { valid: true };
};

export const faceDetectionService = {
  detectFaces,
  validateProfilePhoto,
  validateSelfieFace,
};
