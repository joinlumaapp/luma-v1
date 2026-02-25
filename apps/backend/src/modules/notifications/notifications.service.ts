import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FirebaseProvider } from './firebase.provider';
import {
  RegisterDeviceDto,
  MarkReadDto,
  UpdatePreferencesDto,
  DEFAULT_PREFERENCES,
} from './dto';
import type { NotificationPreferences } from './dto';

const NOTIFICATIONS_PAGE_SIZE = 30;

export { NotificationType } from '@prisma/client';
import { NotificationType } from '@prisma/client';

/** Maps notification types to preference keys. */
const TYPE_TO_PREF_KEY: Record<NotificationType, keyof NotificationPreferences | null> = {
  NEW_MATCH: 'newMatches',
  NEW_MESSAGE: 'messages',
  SUPER_LIKE: 'newMatches',
  MATCH_REMOVED: 'newMatches',
  HARMONY_INVITE: 'harmonyInvites',
  HARMONY_REMINDER: 'harmonyInvites',
  BADGE_EARNED: 'badges',
  SUBSCRIPTION_EXPIRING: 'system',
  RELATIONSHIP_REQUEST: 'newMatches',
  SYSTEM: 'system',
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseProvider,
  ) {}

  // ─── Notification Queries ──────────────────────────────────────────

  /**
   * Get all notifications for the current user (paginated).
   */
  async getNotifications(userId: string, page = 1) {
    const skip = (page - 1) * NOTIFICATIONS_PAGE_SIZE;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: NOTIFICATIONS_PAGE_SIZE,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          data: true,
          isRead: true,
          createdAt: true,
        },
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page,
      totalPages: Math.ceil(total / NOTIFICATIONS_PAGE_SIZE),
    };
  }

  // ─── Read State ────────────────────────────────────────────────────

  /**
   * Mark notifications as read.
   */
  async markRead(userId: string, dto: MarkReadDto) {
    const result = await this.prisma.notification.updateMany({
      where: {
        id: { in: dto.notificationIds },
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return {
      markedRead: result.count,
      unreadCount,
    };
  }

  /**
   * Mark ALL notifications as read for a user.
   */
  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return {
      markedRead: result.count,
      unreadCount: 0,
    };
  }

  // ─── Device Registration ───────────────────────────────────────────

  /**
   * Register a device for push notifications.
   */
  async registerDevice(userId: string, dto: RegisterDeviceDto) {
    const device = await this.prisma.deviceToken.upsert({
      where: { token: dto.pushToken },
      create: {
        userId,
        token: dto.pushToken,
        platform: dto.platform,
        isActive: true,
      },
      update: {
        userId,
        platform: dto.platform,
        isActive: true,
      },
    });

    return {
      registered: true,
      deviceId: device.id,
      platform: dto.platform,
    };
  }

  /**
   * Unregister a device (e.g., on logout).
   */
  async unregisterDevice(userId: string, token: string) {
    await this.prisma.deviceToken.updateMany({
      where: { userId, token },
      data: { isActive: false },
    });

    return { unregistered: true };
  }

  // ─── Notification Preferences ──────────────────────────────────────

  /**
   * Get notification preferences for a user.
   * Creates default preferences in the database if none exist yet.
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const pref = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      return { ...DEFAULT_PREFERENCES };
    }

    return {
      newMatches: pref.newMatches,
      messages: pref.messages,
      harmonyInvites: pref.harmonyInvites,
      badges: pref.badges,
      system: pref.system,
      allDisabled: pref.allDisabled,
    };
  }

  /**
   * Update notification preferences for a user.
   * Uses upsert to create preferences on first update.
   */
  async updatePreferences(
    userId: string,
    dto: UpdatePreferencesDto,
  ): Promise<NotificationPreferences> {
    const updateData = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );

    const pref = await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...DEFAULT_PREFERENCES,
        ...updateData,
      },
      update: updateData,
    });

    this.logger.debug(`Bildirim tercihleri guncellendi — kullanici: ${userId}`);

    return {
      newMatches: pref.newMatches,
      messages: pref.messages,
      harmonyInvites: pref.harmonyInvites,
      badges: pref.badges,
      system: pref.system,
      allDisabled: pref.allDisabled,
    };
  }

  /**
   * Check if a notification type is enabled for a user.
   */
  private async isNotificationEnabled(userId: string, type: NotificationType): Promise<boolean> {
    const prefs = await this.getPreferences(userId);

    // Master toggle
    if (prefs.allDisabled) {
      return false;
    }

    const prefKey = TYPE_TO_PREF_KEY[type];
    if (prefKey === null) {
      return true;
    }

    return prefs[prefKey];
  }

  // ─── Push Notification Sending ─────────────────────────────────────

  /**
   * Send a push notification to a specific device token.
   */
  async sendToDevice(
    deviceToken: string,
    payload: { title: string; body: string; data?: Record<string, string> },
  ): Promise<{ sent: boolean; messageId?: string; error?: string }> {
    if (!this.firebase.configured) {
      this.logger.debug(
        `Firebase yapilandirilmadi — bildirim loglanacak: "${payload.title}"`,
      );
    }

    const result = await this.firebase.send({
      token: deviceToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
    });

    if (!result.success) {
      this.logger.warn(
        `FCM gonderme basarisiz — token: ${deviceToken.substring(0, 12)}... hata: ${result.error}`,
      );
    }

    return {
      sent: result.success,
      messageId: result.messageId,
      error: result.error,
    };
  }

  /**
   * Send a push notification to a user.
   * Stores notification in DB and sends to all active devices in parallel.
   * Respects user's notification preferences.
   */
  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
    type: NotificationType = 'SYSTEM',
  ) {
    // Check user preferences before sending
    if (!(await this.isNotificationEnabled(userId, type))) {
      this.logger.debug(
        `Bildirim devre disi — kullanici: ${userId}, tip: ${type}`,
      );
      return { sent: false, stored: false, reason: 'disabled_by_preference' };
    }

    // Store notification in database
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data: data as object ?? undefined,
      },
    });

    // Get user's active device tokens
    const devices = await this.prisma.deviceToken.findMany({
      where: { userId, isActive: true },
    });

    if (devices.length === 0) {
      this.logger.debug(
        `Aktif cihaz yok — kullanici: ${userId}, bildirim sadece veritabanina kaydedildi.`,
      );
      return { sent: false, stored: true, notificationId: notification.id };
    }

    // Convert data values to strings for FCM
    const stringData = data
      ? Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)]),
        )
      : undefined;

    // Send to all active devices in parallel
    const results = await Promise.allSettled(
      devices.map((device) =>
        this.sendToDevice(device.token, {
          title,
          body,
          data: stringData,
        }).then(async (result) => {
          if (!result.sent && result.error) {
            // Invalid token — mark as inactive
            this.logger.warn(
              `Gecersiz token tespit edildi — cihaz: ${device.id}, devre disi birakiliyor.`,
            );
            await this.prisma.deviceToken.update({
              where: { id: device.id },
              data: { isActive: false },
            });
          }
          return result;
        }),
      ),
    );

    const successCount = results.filter(
      (r) => r.status === 'fulfilled' && r.value.sent,
    ).length;

    this.logger.debug(
      `Push bildirim gonderildi — ` +
      `${successCount}/${devices.length} cihaz, kullanici: ${userId}: "${title}"`,
    );

    return {
      sent: successCount > 0,
      stored: true,
      notificationId: notification.id,
      deviceCount: successCount,
    };
  }

  // ─── Convenience Methods for Specific Notification Types ───────────

  /**
   * Notify user of a new match.
   */
  async notifyNewMatch(userId: string, matcherName: string) {
    return this.sendPushNotification(
      userId,
      'Yeni eslesmeler!',
      `${matcherName} seninle eslesti`,
      { type: 'NEW_MATCH', matcherName },
      'NEW_MATCH',
    );
  }

  /**
   * Notify user of a Harmony Room invite.
   */
  async notifyHarmonyInvite(userId: string, inviterName: string) {
    return this.sendPushNotification(
      userId,
      'Harmony Daveti',
      `${inviterName} seni Harmony'ye davet etti`,
      { type: 'HARMONY_INVITE', inviterName },
      'HARMONY_INVITE',
    );
  }

  /**
   * Notify user of a Harmony session reminder (about to expire).
   */
  async notifyHarmonyReminder(userId: string, partnerName: string, minutesLeft: number) {
    return this.sendPushNotification(
      userId,
      'Harmony Hatirlatma',
      `${partnerName} ile Harmony oturumunuz ${minutesLeft} dakika icinde sona erecek`,
      { type: 'HARMONY_REMINDER', partnerName, minutesLeft: String(minutesLeft) },
      'HARMONY_REMINDER',
    );
  }

  /**
   * Notify user of a new message.
   */
  async notifyNewMessage(userId: string, senderName: string, preview: string) {
    // Truncate preview to 100 characters
    const truncatedPreview =
      preview.length > 100 ? `${preview.substring(0, 97)}...` : preview;

    return this.sendPushNotification(
      userId,
      senderName,
      truncatedPreview,
      { type: 'NEW_MESSAGE', senderName },
      'NEW_MESSAGE',
    );
  }

  /**
   * Notify user of a newly earned badge.
   */
  async notifyBadgeEarned(userId: string, badgeName: string) {
    return this.sendPushNotification(
      userId,
      'Yeni Rozet!',
      `Yeni rozet kazandin: ${badgeName}`,
      { type: 'BADGE_EARNED', badgeName },
      'BADGE_EARNED',
    );
  }

  /**
   * Notify user of subscription expiring soon.
   */
  async notifySubscriptionExpiring(userId: string, daysLeft: number, packageName: string) {
    return this.sendPushNotification(
      userId,
      'Abonelik Hatirlatma',
      `${packageName} aboneliginiz ${daysLeft} gun icinde sona erecek`,
      { type: 'SUBSCRIPTION_EXPIRING', daysLeft: String(daysLeft), packageName },
      'SUBSCRIPTION_EXPIRING',
    );
  }

  /**
   * Notify user of a relationship request.
   */
  async notifyRelationshipRequest(userId: string, requesterName: string) {
    return this.sendPushNotification(
      userId,
      'Iliski Istegi',
      `${requesterName} sana iliski istegi gonderdi`,
      { type: 'RELATIONSHIP_REQUEST', requesterName },
      'RELATIONSHIP_REQUEST',
    );
  }
}
