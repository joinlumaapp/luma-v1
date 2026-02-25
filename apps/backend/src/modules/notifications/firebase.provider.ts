import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { PrismaService } from '../../prisma/prisma.service';

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

/** FCM error code indicating a stale/invalid device token. */
const INVALID_TOKEN_ERROR = 'messaging/registration-token-not-registered';

/**
 * Firebase Cloud Messaging provider.
 *
 * Wraps firebase-admin SDK for push notification delivery.
 * When Firebase credentials are not configured:
 * - In development: logs the notification and returns a mock messageId.
 * - In production: throws an error on initialization.
 *
 * Handles token invalidation: when FCM returns
 * `messaging/registration-token-not-registered`, the device token is
 * automatically deactivated in the database.
 */
@Injectable()
export class FirebaseProvider implements OnModuleInit {
  private readonly logger = new Logger(FirebaseProvider.name);
  private isConfigured = false;
  private firebaseApp: admin.app.App | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const nodeEnv = this.configService.get<string>('NODE_ENV');

    if (projectId && privateKey && clientEmail) {
      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          privateKey: privateKey.replace(/\\n/g, '\n'),
          clientEmail,
        }),
      });
      this.isConfigured = true;
      this.logger.log(
        `Firebase yapilandirildi — proje: ${projectId}`,
      );
    } else if (nodeEnv === 'production') {
      throw new Error(
        'Firebase credentials are required in production. ' +
        'Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL environment variables.',
      );
    } else {
      this.isConfigured = false;
      this.logger.warn(
        'Firebase yapilandirilmadi — push bildirimler sadece loglanacak. ' +
        'FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY ve FIREBASE_CLIENT_EMAIL ortam degiskenlerini ayarlayin.',
      );
    }
  }

  /**
   * Whether Firebase is configured and ready to send.
   */
  get configured(): boolean {
    return this.isConfigured;
  }

  /**
   * Send a push notification to a specific device token.
   *
   * When Firebase is not configured, logs the notification instead of sending.
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
      const messageId = await messaging.send({
        token: payload.token,
        notification: payload.notification,
        data: payload.data,
      });
      return { success: true, messageId };
    } catch (error: unknown) {
      const fcmError = error as { code?: string; message?: string };
      const errorMessage = fcmError.message ?? 'Bilinmeyen hata';
      const errorCode = fcmError.code ?? '';

      this.logger.error(`FCM gonderme hatasi: ${errorMessage} (code: ${errorCode})`);

      // Deactivate invalid tokens in the database
      if (errorCode === INVALID_TOKEN_ERROR) {
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
      throw new Error(result.error ?? 'FCM send failed');
    }

    return result.messageId ?? '';
  }

  /**
   * Send a push notification to multiple device tokens using FCM multicast.
   *
   * When Firebase is not configured, logs the notification and returns
   * all tokens as successful.
   *
   * Automatically deactivates tokens that return
   * `messaging/registration-token-not-registered`.
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
      });

      // Process individual responses for token invalidation
      const invalidTokens: string[] = [];
      const responses = response.responses as FcmSendResponse[];

      for (let i = 0; i < responses.length; i++) {
        const sendResponse = responses[i];
        if (!sendResponse.success && sendResponse.error?.code === INVALID_TOKEN_ERROR) {
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
      const errorMessage = fcmError.message ?? 'Bilinmeyen hata';
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
      result.status === 'fulfilled'
        ? result.value
        : { success: false, error: 'Promise rejected' },
    );
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
        `Token devre disi birakma hatasi: ${err.message ?? 'Bilinmeyen hata'}`,
      );
    }
  }
}
