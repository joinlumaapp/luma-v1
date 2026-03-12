import { Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

// ────────────────────────────────────────────────────────────────────
// Centralized Firebase Admin SDK Initialization (Singleton)
// ────────────────────────────────────────────────────────────────────

const logger = new Logger('FirebaseProvider');

/** Singleton Firebase app instance. */
let firebaseApp: admin.app.App | null = null;

/** Whether initialization has been attempted. */
let initAttempted = false;

/** Whether Firebase is properly configured and ready. */
let configured = false;

/**
 * Firebase configuration read from environment variables.
 */
interface FirebaseConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

/**
 * Read Firebase configuration from environment variables.
 * Returns null if any required variable is missing.
 */
function readFirebaseConfig(): FirebaseConfig | null {
  const projectId = process.env.FIREBASE_PROJECT_ID ?? '';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL ?? '';
  const privateKey = process.env.FIREBASE_PRIVATE_KEY ?? '';

  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    };
  }

  return null;
}

/**
 * Initialize Firebase Admin SDK.
 *
 * This function is idempotent — calling it multiple times is safe.
 * The SDK is initialized once (singleton) on first call.
 *
 * Behavior:
 * - If credentials are present, initializes Firebase normally.
 * - In development/test without credentials: logs a warning, returns null.
 * - In production without credentials: throws an error.
 */
function initializeFirebase(): admin.app.App | null {
  if (initAttempted) {
    return firebaseApp;
  }

  initAttempted = true;
  const config = readFirebaseConfig();
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  if (config) {
    try {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.projectId,
          privateKey: config.privateKey,
          clientEmail: config.clientEmail,
        }),
      });
      configured = true;
      logger.log(`Firebase initialized (project: ${config.projectId})`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      // If already initialized (e.g., in tests), retrieve the default app
      if (message.includes('already exists')) {
        firebaseApp = admin.app();
        configured = true;
        logger.warn('Firebase app already initialized — reusing existing instance');
      } else {
        logger.error(`Firebase initialization failed: ${message}`);
        throw error;
      }
    }
  } else if (nodeEnv === 'production') {
    throw new Error(
      'Firebase credentials are required in production. ' +
        'Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.',
    );
  } else {
    configured = false;
    logger.warn(
      'Firebase not configured — push notifications will be mocked. ' +
        'Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY to enable.',
    );
  }

  return firebaseApp;
}

/**
 * Get the singleton Firebase app instance.
 * Initializes on first call if not yet initialized.
 *
 * Returns null when Firebase is not configured (development mode only).
 */
export function getFirebaseApp(): admin.app.App | null {
  if (!initAttempted) {
    initializeFirebase();
  }
  return firebaseApp;
}

/**
 * Get the Firebase Cloud Messaging service.
 * Returns null when Firebase is not configured.
 */
export function getFirebaseMessaging(): admin.messaging.Messaging | null {
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }
  return app.messaging();
}

/**
 * Get the Firebase Auth service.
 * Returns null when Firebase is not configured.
 */
export function getFirebaseAuth(): admin.auth.Auth | null {
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }
  return app.auth();
}

/**
 * Whether Firebase is properly configured and ready to use.
 */
export function isFirebaseConfigured(): boolean {
  if (!initAttempted) {
    initializeFirebase();
  }
  return configured;
}
