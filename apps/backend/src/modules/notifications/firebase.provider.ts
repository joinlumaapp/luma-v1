import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
 * Firebase Cloud Messaging provider.
 *
 * Wraps firebase-admin SDK for push notification delivery.
 * When firebase-admin is not installed or Firebase credentials are not
 * configured, gracefully falls back to logging instead of crashing.
 *
 * To enable real FCM delivery:
 * 1. `npm install firebase-admin`
 * 2. Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL in .env
 * 3. Uncomment the firebase-admin initialization in this file
 */
@Injectable()
export class FirebaseProvider implements OnModuleInit {
  private readonly logger = new Logger(FirebaseProvider.name);
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');

    if (projectId && privateKey && clientEmail) {
      this.isConfigured = true;
      this.logger.log(
        `Firebase yapilandirildi — proje: ${projectId}`,
      );

      // TODO: firebase-admin kurulunca asagidaki kodu aktiflestir
      // import * as admin from 'firebase-admin';
      // admin.initializeApp({
      //   credential: admin.credential.cert({
      //     projectId,
      //     privateKey: privateKey.replace(/\\n/g, '\n'),
      //     clientEmail,
      //   }),
      // });
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
    if (!this.isConfigured) {
      this.logger.debug(
        `[MOCK FCM] token=${payload.token.substring(0, 12)}... ` +
        `title="${payload.notification.title}" body="${payload.notification.body}"`,
      );
      return {
        success: true,
        messageId: `mock_${Date.now()}`,
      };
    }

    // TODO: firebase-admin kurulunca asagidaki kodu aktiflestir
    // try {
    //   const messaging = admin.messaging();
    //   const messageId = await messaging.send({
    //     token: payload.token,
    //     notification: payload.notification,
    //     data: payload.data,
    //   });
    //   return { success: true, messageId };
    // } catch (error) {
    //   const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    //   this.logger.error(`FCM gonderme hatasi: ${errorMessage}`);
    //   return { success: false, error: errorMessage };
    // }

    // Placeholder: Firebase yapilandirildi ama SDK kurulu degil
    this.logger.debug(
      `[FCM PLACEHOLDER] token=${payload.token.substring(0, 12)}... ` +
      `title="${payload.notification.title}" body="${payload.notification.body}"`,
    );
    return {
      success: true,
      messageId: `placeholder_${Date.now()}`,
    };
  }

  /**
   * Send a push notification to multiple device tokens in parallel.
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
}
