import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as admin from "firebase-admin";
import {
  getFirebaseApp,
  isFirebaseConfigured,
} from "../../common/providers/firebase.provider";
import { PrismaService } from "../../prisma/prisma.service";

// ────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────

/**
 * Payload for sending a push notification via FCM.
 */
export interface FcmPayload {
  token: string;
  notification: {
    title: string;
    body: string;
  };
  data?: Record<string, string>;
  /** When provided, platform-specific formatting is applied. */
  platform?: "ios" | "android";
}

/**
 * Result of a push notification send attempt.
 */
export interface FcmSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Result of a multicast push notification send attempt.
 */
export interface FcmMulticastResult {
  successCount: number;
  failureCount: number;
}

/**
 * Firebase error info structure from FCM BatchResponse.
 */
interface FcmSendResponseError {
  code: string;
  message: string;
}

/**
 * Individual send response from FCM multicast.
 */
interface FcmSendResponse {
  success: boolean;
  messageId?: string;
  error?: FcmSendResponseError;
}

// ────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────

/** FCM error codes indicating a stale/invalid device token. */
const INVALID_TOKEN_ERRORS = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

/** Maximum retry attempts for transient FCM errors. */
const MAX_RETRIES = 3;

/** Base delay in ms for exponential backoff. */
const RETRY_BASE_DELAY_MS = 500;

/** FCM error codes that are eligible for retry. */
const RETRYABLE_ERRORS = new Set([
  "messaging/internal-error",
  "messaging/server-unavailable",
  "messaging/too-many-requests",
]);

// ────────────────────────────────────────────────────────────────────
// Provider
// ────────────────────────────────────────────────────────────────────

/**
 * Firebase Cloud Messaging provider.
 *
 * Uses the centralized Firebase Admin SDK from common/providers/firebase.provider.
 * When Firebase credentials are not configured:
 * - In development: logs the notification and returns a mock messageId.
 * - In production: throws an error on initialization.
 *
 * Features:
 * - iOS (APNs) and Android platform-specific formatting
 * - Silent/data-only notifications for background updates
 * - Topic-based notifications for system announcements
 * - Automatic invalid token cleanup
 * - Retry with exponential backoff for transient errors
 */
@Injectable()
export class FirebaseProvider implements OnModuleInit {
  private readonly logger = new Logger(FirebaseProvider.name);
  private isConfigured = false;
  private firebaseApp: admin.app.App | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    this.firebaseApp = getFirebaseApp();
    this.isConfigured = isFirebaseConfigured();

    if (this.isConfigured) {
      this.logger.log(
        "Firebase Cloud Messaging ready (using centralized provider)",
      );
    } else {
      this.logger.warn(
        "Firebase not configured — push notifications will be mocked in development.",
      );
    }
  }

  /**
   * Whether Firebase is configured and ready to send.
   */
  get configured(): boolean {
    return this.isConfigured;
  }

  // ─── Platform-Specific Message Building ─────────────────────────────

  /**
   * Build a platform-specific FCM message object.
   * iOS: uses APNs headers for badge, sound, and content-available.
   * Android: uses high-priority channel with notification settings.
   */
  private buildMessage(
    payload: FcmPayload,
    badgeCount?: number,
  ): admin.messaging.Message {
    const message: admin.messaging.Message = {
      token: payload.token,
      notification: payload.notification,
      data: payload.data,
    };

    if (payload.platform === "ios") {
      message.apns = {
        headers: {
          "apns-priority": "10",
        },
        payload: {
          aps: {
            alert: {
              title: payload.notification.title,
              body: payload.notification.body,
            },
            sound: "default",
            badge: badgeCount ?? 0,
            "mutable-content": 1,
          },
        },
      };
    } else if (payload.platform === "android") {
      message.android = {
        priority: "high",
        notification: {
          title: payload.notification.title,
          body: payload.notification.body,
          channelId: "luma_default",
          sound: "default",
          defaultSound: true,
          notificationCount: badgeCount ?? 0,
        },
        ttl: 86400000, // 24 hours in ms
      };
    }

    return message;
  }

  // ─── Retry Logic ────────────────────────────────────────────────────

  /**
   * Execute a function with exponential backoff retry for transient errors.
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    context: string,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error: unknown) {
        lastError = error;
        const fcmError = error as { code?: string };
        const errorCode = fcmError.code ?? "";

        // Only retry for transient errors
        if (!RETRYABLE_ERRORS.has(errorCode)) {
          throw error;
        }

        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        this.logger.warn(
          `FCM gecici hata (${context}), yeniden denenecek ` +
            `(${attempt + 1}/${MAX_RETRIES}) — ${delay}ms bekleniyor: ${errorCode}`,
        );

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ─── Send Methods ──────────────────────────────────────────────────

  /**
   * Send a push notification to a specific device token.
   *
   * When Firebase is not configured, logs the notification instead of sending.
   * Includes retry logic for transient errors.
   */
  async send(payload: FcmPayload): Promise<FcmSendResult> {
    if (!this.isConfigured || !this.firebaseApp) {
      this.logger.debug(
        `[MOCK FCM] token=${payload.token.substring(0, 12)}... ` +
          `title="${payload.notification.title}" body="${payload.notification.body}"`,
      );
      return {
        success: true,
        messageId: `mock_${Date.now()}`,
      };
    }

    try {
      const messaging = this.firebaseApp.messaging();
      const message = this.buildMessage(payload);

      const messageId = await this.withRetry(
        () => messaging.send(message),
        `send:${payload.token.substring(0, 12)}`,
      );

      return { success: true, messageId };
    } catch (error: unknown) {
      const fcmError = error as { code?: string; message?: string };
      const errorMessage = fcmError.message ?? "Bilinmeyen hata";
      const errorCode = fcmError.code ?? "";

      this.logger.error(
        `FCM gonderme hatasi: ${errorMessage} (code: ${errorCode})`,
      );

      // Deactivate invalid tokens in the database
      if (INVALID_TOKEN_ERRORS.has(errorCode)) {
        await this.deactivateToken(payload.token);
      }

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send a push notification to a specific device token.
   *
   * Convenience method with a flat parameter signature.
   * Returns the FCM messageId on success.
   */
  async sendPush(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<string> {
    const result = await this.send({
      token,
      notification: { title, body },
      data,
    });

    if (!result.success) {
      throw new Error(result.error ?? "FCM send failed");
    }

    return result.messageId ?? "";
  }

  /**
   * Send a silent/data-only push notification (no visible alert).
   *
   * Used for background data sync, badge count updates, etc.
   * iOS: sets content-available=1 with no alert.
   * Android: uses data-only message with high priority.
   */
  async sendSilent(
    token: string,
    data: Record<string, string>,
    platform?: "ios" | "android",
  ): Promise<FcmSendResult> {
    if (!this.isConfigured || !this.firebaseApp) {
      this.logger.debug(
        `[MOCK FCM SILENT] token=${token.substring(0, 12)}... data=${JSON.stringify(data)}`,
      );
      return { success: true, messageId: `mock_silent_${Date.now()}` };
    }

    try {
      const messaging = this.firebaseApp.messaging();
      const message: admin.messaging.Message = {
        token,
        data,
      };

      if (platform === "ios") {
        message.apns = {
          headers: {
            "apns-priority": "5",
            "apns-push-type": "background",
          },
          payload: {
            aps: {
              "content-available": 1,
            },
          },
        };
      } else if (platform === "android") {
        message.android = {
          priority: "high",
          ttl: 3600000, // 1 hour
        };
      }

      const messageId = await this.withRetry(
        () => messaging.send(message),
        `silent:${token.substring(0, 12)}`,
      );

      return { success: true, messageId };
    } catch (error: unknown) {
      const fcmError = error as { code?: string; message?: string };
      const errorMessage = fcmError.message ?? "Bilinmeyen hata";
      const errorCode = fcmError.code ?? "";

      this.logger.error(
        `FCM silent gonderme hatasi: ${errorMessage} (code: ${errorCode})`,
      );

      if (INVALID_TOKEN_ERRORS.has(errorCode)) {
        await this.deactivateToken(token);
      }

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send a push notification to a Firebase Cloud Messaging topic.
   *
   * Topics are used for broadcast messages (e.g., system announcements).
   * Users subscribe to topics on the client side.
   */
  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<FcmSendResult> {
    if (!this.isConfigured || !this.firebaseApp) {
      this.logger.debug(
        `[MOCK FCM TOPIC] topic=${topic} title="${title}" body="${body}"`,
      );
      return { success: true, messageId: `mock_topic_${Date.now()}` };
    }

    try {
      const messaging = this.firebaseApp.messaging();
      const message: admin.messaging.Message = {
        topic,
        notification: { title, body },
        data,
        apns: {
          headers: { "apns-priority": "10" },
          payload: {
            aps: {
              sound: "default",
            },
          },
        },
        android: {
          priority: "high",
          notification: {
            channelId: "luma_announcements",
            sound: "default",
          },
        },
      };

      const messageId = await this.withRetry(
        () => messaging.send(message),
        `topic:${topic}`,
      );

      this.logger.log(
        `Topic bildirim gonderildi — topic: ${topic}, messageId: ${messageId}`,
      );
      return { success: true, messageId };
    } catch (error: unknown) {
      const fcmError = error as { message?: string };
      const errorMessage = fcmError.message ?? "Bilinmeyen hata";
      this.logger.error(`FCM topic gonderme hatasi: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send a push notification to multiple device tokens using FCM multicast.
   *
   * When Firebase is not configured, logs the notification and returns
   * all tokens as successful.
   *
   * Automatically deactivates tokens that return invalid token errors.
   */
  async sendMulticast(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<FcmMulticastResult> {
    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    if (!this.isConfigured || !this.firebaseApp) {
      this.logger.debug(
        `[MOCK FCM MULTICAST] tokens=${tokens.length} ` +
          `title="${title}" body="${body}"`,
      );
      return { successCount: tokens.length, failureCount: 0 };
    }

    try {
      const messaging = this.firebaseApp.messaging();
      const response = await messaging.sendEachForMulticast({
        tokens,
        notification: { title, body },
        data,
        android: {
          priority: "high",
          notification: {
            channelId: "luma_default",
            sound: "default",
          },
        },
        apns: {
          headers: { "apns-priority": "10" },
          payload: {
            aps: { sound: "default" },
          },
        },
      });

      // Process individual responses for token invalidation
      const invalidTokens: string[] = [];
      const responses = response.responses as FcmSendResponse[];

      for (let i = 0; i < responses.length; i++) {
        const sendResponse = responses[i];
        if (
          !sendResponse.success &&
          sendResponse.error?.code &&
          INVALID_TOKEN_ERRORS.has(sendResponse.error.code)
        ) {
          invalidTokens.push(tokens[i]);
        }
      }

      // Deactivate all invalid tokens in parallel
      if (invalidTokens.length > 0) {
        await Promise.all(
          invalidTokens.map((token) => this.deactivateToken(token)),
        );
        this.logger.warn(
          `${invalidTokens.length} gecersiz token devre disi birakildi (multicast).`,
        );
      }

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error: unknown) {
      const fcmError = error as { message?: string };
      const errorMessage = fcmError.message ?? "Bilinmeyen hata";
      this.logger.error(`FCM multicast hatasi: ${errorMessage}`);
      return { successCount: 0, failureCount: tokens.length };
    }
  }

  /**
   * Send a push notification to multiple device tokens in parallel.
   *
   * Legacy method — retained for backward compatibility with NotificationsService.
   */
  async sendMultiple(
    tokens: string[],
    notification: { title: string; body: string },
    data?: Record<string, string>,
  ): Promise<FcmSendResult[]> {
    const settled = await Promise.allSettled(
      tokens.map((token) => this.send({ token, notification, data })),
    );

    return settled.map((result) =>
      result.status === "fulfilled"
        ? result.value
        : { success: false, error: "Promise rejected" },
    );
  }

  // ─── Token Management ──────────────────────────────────────────────

  /**
   * Subscribe a device token to a Firebase topic.
   */
  async subscribeToTopic(token: string, topic: string): Promise<boolean> {
    if (!this.isConfigured || !this.firebaseApp) {
      this.logger.debug(
        `[MOCK FCM] subscribeToTopic — token=${token.substring(0, 12)}... topic=${topic}`,
      );
      return true;
    }

    try {
      const messaging = this.firebaseApp.messaging();
      const response = await messaging.subscribeToTopic([token], topic);
      return response.failureCount === 0;
    } catch (error: unknown) {
      const fcmError = error as { message?: string };
      this.logger.error(
        `Topic subscribe hatasi: ${fcmError.message ?? "Bilinmeyen hata"}`,
      );
      return false;
    }
  }

  /**
   * Unsubscribe a device token from a Firebase topic.
   */
  async unsubscribeFromTopic(token: string, topic: string): Promise<boolean> {
    if (!this.isConfigured || !this.firebaseApp) {
      this.logger.debug(
        `[MOCK FCM] unsubscribeFromTopic — token=${token.substring(0, 12)}... topic=${topic}`,
      );
      return true;
    }

    try {
      const messaging = this.firebaseApp.messaging();
      const response = await messaging.unsubscribeFromTopic([token], topic);
      return response.failureCount === 0;
    } catch (error: unknown) {
      const fcmError = error as { message?: string };
      this.logger.error(
        `Topic unsubscribe hatasi: ${fcmError.message ?? "Bilinmeyen hata"}`,
      );
      return false;
    }
  }

  /**
   * Deactivate a device token in the database.
   *
   * Called when FCM reports that a token is no longer registered,
   * indicating the user has uninstalled the app or the token has expired.
   */
  private async deactivateToken(token: string): Promise<void> {
    try {
      await this.prisma.deviceToken.updateMany({
        where: { token, isActive: true },
        data: { isActive: false },
      });
      this.logger.warn(
        `Gecersiz FCM token devre disi birakildi: ${token.substring(0, 12)}...`,
      );
    } catch (dbError: unknown) {
      const err = dbError as { message?: string };
      this.logger.error(
        `Token devre disi birakma hatasi: ${err.message ?? "Bilinmeyen hata"}`,
      );
    }
  }
}
