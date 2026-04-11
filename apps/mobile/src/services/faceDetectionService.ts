// Face detection service for profile photo validation
// Uses @infinitered/react-native-mlkit-face-detection for on-device ML Kit face detection
// Gracefully no-ops when the native module is unavailable (Expo Go, dev client
// without the native binary, or any environment where the module failed to link).

import { Alert } from 'react-native';

interface FaceDetectionResult {
  hasFace: boolean;
  faceCount: number;
  error?: string;
}

// ─── Native module bootstrap ────────────────────────────────────────────────
//
// Load the MLKit face detection native module via require() wrapped in try/catch
// so that Expo Go / unlinked builds don't crash at startup. In those environments
// `FaceDetection` stays null and the validators short-circuit to a "pass" result
// so the onboarding flow is not blocked. Production EAS builds include the
// native binary and get full detection.

interface FaceDetectionModule {
  detectFaces: (uri: string) => Promise<Array<unknown>>;
}

let FaceDetection: FaceDetectionModule | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@infinitered/react-native-mlkit-face-detection');
  const candidate = (mod?.default ?? mod) as FaceDetectionModule | undefined;
  if (candidate && typeof candidate.detectFaces === 'function') {
    FaceDetection = candidate;
  } else if (__DEV__) {
    console.log('[FaceDetection] MLKit module shape unexpected; skipping.');
  }
} catch (e: unknown) {
  if (__DEV__) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`[FaceDetection] MLKit native module not available: ${msg}`);
  }
}

/**
 * Detect faces in a static image URI using ML Kit.
 *
 * Returns { hasFace, faceCount } on success. If the native module is not
 * available (Expo Go, unlinked build), returns hasFace: true so the photo
 * upload flow is not blocked.
 */
const detectFaces = async (uri: string): Promise<FaceDetectionResult> => {
  if (!FaceDetection) {
    return {
      hasFace: true,
      faceCount: 0,
      error: 'native_module_unavailable',
    };
  }

  try {
    const faces = await FaceDetection.detectFaces(uri);
    return {
      hasFace: Array.isArray(faces) && faces.length > 0,
      faceCount: Array.isArray(faces) ? faces.length : 0,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unknown face detection error';

    if (__DEV__) {
      console.warn(`[FaceDetection] detectFaces failed: ${message}`);
    }

    // Graceful degradation: allow the photo when detection errors
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
