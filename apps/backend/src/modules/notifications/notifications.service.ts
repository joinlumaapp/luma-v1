import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { FirebaseProvider } from "./firebase.provider";
import {
  RegisterDeviceDto,
  MarkReadDto,
  UpdatePreferencesDto,
  DEFAULT_PREFERENCES,
} from "./dto";
import type { NotificationPreferences } from "./dto";

const NOTIFICATIONS_PAGE_SIZE = 30;

/** Maximum push notifications per user per hour. */
const MAX_PUSH_PER_HOUR = 10;

export { NotificationType } from "@prisma/client";
import { NotificationType } from "@prisma/client";

// ────────────────────────────────────────────────────────────────────
// Turkish notification templates
// ────────────────────────────────────────────────────────────────────

interface NotificationTemplate {
  title: string;
  /** Body template — {placeholders} are replaced at runtime. */
  body: string;
}

const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  NEW_MATCH: {
    title: "Yeni bir eşleşmen var!",
    body: "Sen ve {name} birbirinizi beğendiniz!",
  },
  NEW_MESSAGE: {
    title: "{name}",
    body: "{name} sana mesaj gönderdi",
  },
  SUPER_LIKE: {
    title: "Süper Beğeni!",
    body: "{name} seni süper beğendi!",
  },
  MATCH_REMOVED: {
    title: "Eşleşme Kaldırıldı",
    body: "Bir eşleşmen sona erdi",
  },
  BADGE_EARNED: {
    title: "Yeni Rozet!",
    body: "Yeni rozet kazandın: {badge_name}",
  },
  SUBSCRIPTION_EXPIRING: {
    title: "Abonelik Hatırlatma",
    body: "{packageName} aboneliğiniz {daysLeft} gün içinde sona erecek",
  },
  CANLI_MATCH_FOUND: {
    title: "Canlı Eşleşme!",
    body: "Uyumlu biri bulundu. Hemen bağlan!",
  },
  DAILY_MATCH_READY: {
    title: "Günün Eşleşmesi",
    body: "Bugünkü önerimiz hazır!",
  },
  FRIENDSHIP_FORMED: {
    title: "Yeni Arkadaş!",
    body: "{name} ile artık arkadaşsınız",
  },
  SYSTEM: {
    title: "LUMA",
    body: "{message}",
  },
  POST_LIKE: {
    title: "Yeni Begeni!",
    body: "{name} gonderini begendi",
  },
  STORY_LIKE: {
    title: "Hikaye Begenisi!",
    body: "{name} hikayeni begendi",
  },
  NEW_FOLLOWER: {
    title: "Yeni Takipci!",
    body: "{name} seni takip etmeye basladi",
  },
  REFERRAL_REWARD: {
    title: "Davet Ödülü!",
    body: "Arkadaşın katıldı! 50 jeton kazandın",
  },
};

/** Maps notification types to preference keys. */
const TYPE_TO_PREF_KEY: Record<
  NotificationType,
  keyof NotificationPreferences | null
> = {
  NEW_MATCH: "newMatches",
  NEW_MESSAGE: "messages",
  SUPER_LIKE: "newMatches",
  MATCH_REMOVED: "newMatches",
  BADGE_EARNED: "badges",
  SUBSCRIPTION_EXPIRING: "system",
  CANLI_MATCH_FOUND: "newMatches",
  DAILY_MATCH_READY: "newMatches",
  FRIENDSHIP_FORMED: "newMatches",
  SYSTEM: "system",
  POST_LIKE: "system",
  STORY_LIKE: "system",
  NEW_FOLLOWER: "system",
  REFERRAL_REWARD: "system",
};

// ────────────────────────────────────────────────────────────────────
// In-memory rate limiter (per-user, per-hour)
// In production, replace with Redis for multi-instance support.
// ────────────────────────────────────────────────────────────────────

interface RateLimitEntry {
  timestamps: number[];
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  /** In-memory rate limit buckets keyed by userId. */
  private readonly rateLimitMap = new Map<string, RateLimitEntry>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseProvider,
  ) {}

  // ─── Template Helpers ───────────────────────────────────────────────

  /**
   * Resolve a notification template by replacing {placeholders} with data values.
   */
  private resolveTemplate(
    type: NotificationType,
    data: Record<string, string>,
  ): { title: string; body: string } {
    const template = NOTIFICATION_TEMPLATES[type];

    const replace = (text: string): string =>
      text.replace(/\{(\w+)\}/g, (_, key: string) => data[key] ?? "");

    return {
      title: replace(template.title),
      body: replace(template.body),
    };
  }

  // ─── Rate Limiting ──────────────────────────────────────────────────

  /**
   * Check whether the user has exceeded the hourly push limit.
   * Returns true if allowed, false if throttled.
   */
  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const oneHourAgo = now - 3_600_000;

    let entry = this.rateLimitMap.get(userId);
    if (!entry) {
      entry = { timestamps: [] };
      this.rateLimitMap.set(userId, entry);
    }

    // Prune old entries
    entry.timestamps = entry.timestamps.filter((ts) => ts > oneHourAgo);

    // Remove empty entries to prevent memory leak from inactive users
    if (entry.timestamps.length === 0) {
      this.rateLimitMap.delete(userId);
    }

    // Periodic full sweep: when map grows too large, evict all empty buckets
    if (this.rateLimitMap.size > 10_000) {
      for (const [key, val] of this.rateLimitMap) {
        if (val.timestamps.length === 0) {
          this.rateLimitMap.delete(key);
        }
      }
    }

    if (entry.timestamps.length >= MAX_PUSH_PER_HOUR) {
      return false;
    }

    entry.timestamps.push(now);
    return true;
  }

  // ─── Quiet Hours ────────────────────────────────────────────────────

  /**
   * Check if the current time falls within the user's quiet hours.
   * Returns true if notifications should be suppressed.
   */
  private isInQuietHours(prefs: NotificationPreferences): boolean {
    const { quietHoursStart, quietHoursEnd, timezone } = prefs;

    // If quiet hours are not configured, never suppress
    if (!quietHoursStart || !quietHoursEnd) {
      return false;
    }

    try {
      const now = new Date();
      // Get current time in user's timezone
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone || "Europe/Istanbul",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const parts = formatter.formatToParts(now);
      const hourPart = parts.find((p) => p.type === "hour");
      const minutePart = parts.find((p) => p.type === "minute");
      if (!hourPart || !minutePart) return false;

      const currentMinutes =
        parseInt(hourPart.value, 10) * 60 + parseInt(minutePart.value, 10);
      const [startH, startM] = quietHoursStart.split(":").map(Number);
      const [endH, endM] = quietHoursEnd.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      // Quiet hours can span midnight (e.g. 23:00 - 08:00)
      if (startMinutes <= endMinutes) {
        // Same-day range (e.g. 01:00 - 06:00)
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
      }
      // Crosses midnight (e.g. 23:00 - 08:00)
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    } catch {
      // If timezone is invalid, don't suppress
      this.logger.warn(
        "Quiet hours timezone parse failed, skipping quiet hours check",
      );
      return false;
    }
  }

  // ─── WebSocket Event Emitter ───────────────────────────────────────

  /** Maps notification types to WebSocket event names. */
  private static readonly TYPE_TO_WS_EVENT: Partial<
    Record<NotificationType, string>
  > = {
    NEW_MATCH: "notification:new_match",
    BADGE_EARNED: "notification:badge_earned",
  };

  /**
   * Emit a real-time WebSocket event for a notification.
   * Only emits for notification types that have a mapped WS event.
   * TODO: Re-integrate with a WebSocket gateway when available.
   */
  private emitNotificationEvent(
    _userId: string,
    type: NotificationType,
    _notificationId: string,
    _title: string,
    _body: string,
    _data?: Record<string, unknown>,
  ): void {
    const wsEvent = NotificationsService.TYPE_TO_WS_EVENT[type];
    if (!wsEvent) {
      return;
    }

    this.logger.debug(
      `WS event hazir — kullanici: ${_userId}, event: ${wsEvent}`,
    );
  }

  // ─── Notification Queries ──────────────────────────────────────────

  /**
   * Get all notifications for the current user (paginated).
   */
  async getNotifications(userId: string, page = 1) {
    const skip = (page - 1) * NOTIFICATIONS_PAGE_SIZE;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
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

  /**
   * Get unread badge count for the user.
   */
  async getBadgeCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
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
      badges: pref.badges,
      system: pref.system,
      allDisabled: pref.allDisabled,
      quietHoursStart:
        pref.quietHoursStart ?? DEFAULT_PREFERENCES.quietHoursStart,
      quietHoursEnd: pref.quietHoursEnd ?? DEFAULT_PREFERENCES.quietHoursEnd,
      timezone: pref.timezone ?? DEFAULT_PREFERENCES.timezone,
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
      badges: pref.badges,
      system: pref.system,
      allDisabled: pref.allDisabled,
      quietHoursStart:
        pref.quietHoursStart ?? DEFAULT_PREFERENCES.quietHoursStart,
      quietHoursEnd: pref.quietHoursEnd ?? DEFAULT_PREFERENCES.quietHoursEnd,
      timezone: pref.timezone ?? DEFAULT_PREFERENCES.timezone,
    };
  }

  /**
   * Check if a notification type is enabled for a user.
   */
  private async isNotificationEnabled(
    userId: string,
    type: NotificationType,
  ): Promise<boolean> {
    const prefs = await this.getPreferences(userId);

    // Master toggle
    if (prefs.allDisabled) {
      return false;
    }

    const prefKey = TYPE_TO_PREF_KEY[type];
    if (prefKey === null) {
      return true;
    }

    // Preference value can be string (quiet hours) or boolean
    const value = prefs[prefKey];
    if (typeof value === "boolean") {
      return value;
    }

    return true;
  }

  // ─── Push Notification Sending ─────────────────────────────────────

  /**
   * Send a push notification to a specific device token.
   */
  async sendToDevice(
    deviceToken: string,
    payload: { title: string; body: string; data?: Record<string, string> },
    platform?: string,
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
      platform: platform as "ios" | "android" | undefined,
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
   * Core send method — stores notification in DB, checks preferences/quiet hours/rate limit,
   * sends to all active devices in parallel.
   */
  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
    type: NotificationType = "SYSTEM",
  ) {
    // Check user preferences before sending
    if (!(await this.isNotificationEnabled(userId, type))) {
      this.logger.debug(
        `Bildirim devre disi — kullanici: ${userId}, tip: ${type}`,
      );
      return { sent: false, stored: false, reason: "disabled_by_preference" };
    }

    // Check quiet hours
    const prefs = await this.getPreferences(userId);
    if (this.isInQuietHours(prefs)) {
      // Still store the notification but don't send push
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          type,
          title,
          body,
          data: (data as object) ?? undefined,
        },
      });

      // Emit real-time WS event even during quiet hours (push is suppressed, not WS)
      this.emitNotificationEvent(userId, type, notification.id, title, body, data);

      this.logger.debug(
        `Sessiz saatler aktif — bildirim sadece DB'ye kaydedildi: ${userId}, tip: ${type}`,
      );

      return {
        sent: false,
        stored: true,
        notificationId: notification.id,
        reason: "quiet_hours",
      };
    }

    // Check rate limit
    if (!this.checkRateLimit(userId)) {
      // Still store the notification but don't send push
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          type,
          title,
          body,
          data: (data as object) ?? undefined,
        },
      });

      // Emit real-time WS event even when rate-limited (push is suppressed, not WS)
      this.emitNotificationEvent(userId, type, notification.id, title, body, data);

      this.logger.warn(
        `Rate limit asildi — bildirim sadece DB'ye kaydedildi: ${userId} (max ${MAX_PUSH_PER_HOUR}/saat)`,
      );

      return {
        sent: false,
        stored: true,
        notificationId: notification.id,
        reason: "rate_limited",
      };
    }

    // Store notification in database
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data: (data as object) ?? undefined,
      },
    });

    // Emit real-time WS event for the notification
    this.emitNotificationEvent(userId, type, notification.id, title, body, data);

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
      ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))
      : undefined;

    // Get badge count for the user to include in the push payload
    const badgeCount = await this.getBadgeCount(userId);

    // Send to all active devices in parallel
    const results = await Promise.allSettled(
      devices.map((device) =>
        this.sendToDevice(
          device.token,
          {
            title,
            body,
            data: {
              ...stringData,
              notificationId: notification.id,
              badgeCount: String(badgeCount),
            },
          },
          device.platform,
        ).then(async (result) => {
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
      (r) => r.status === "fulfilled" && r.value.sent,
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

  /**
   * Send a templated push notification using the built-in Turkish templates.
   * Resolves title/body from the template + data, then delegates to sendPushNotification.
   */
  async sendTemplatedNotification(
    userId: string,
    type: NotificationType,
    data: Record<string, string> = {},
  ) {
    const { title, body } = this.resolveTemplate(type, data);
    return this.sendPushNotification(userId, title, body, data, type);
  }

  /**
   * Send batch notifications to multiple users with the same type and data.
   * Processes users in parallel with concurrency capped at 10.
   */
  async sendBatchNotifications(
    userIds: string[],
    type: NotificationType,
    data: Record<string, string> = {},
  ) {
    const BATCH_CONCURRENCY = 10;
    const results: Array<{
      userId: string;
      sent: boolean;
      reason?: string;
    }> = [];

    // Process in chunks to avoid overwhelming the system
    for (let i = 0; i < userIds.length; i += BATCH_CONCURRENCY) {
      const chunk = userIds.slice(i, i + BATCH_CONCURRENCY);

      const chunkResults = await Promise.allSettled(
        chunk.map(async (userId) => {
          const result = await this.sendTemplatedNotification(
            userId,
            type,
            data,
          );
          return {
            userId,
            sent: result.sent,
            reason: "reason" in result ? (result.reason as string) : undefined,
          };
        }),
      );

      for (const settled of chunkResults) {
        if (settled.status === "fulfilled") {
          results.push(settled.value);
        } else {
          results.push({
            userId: "unknown",
            sent: false,
            reason: "internal_error",
          });
        }
      }
    }

    const sentCount = results.filter((r) => r.sent).length;

    this.logger.log(
      `Toplu bildirim gonderildi — ${sentCount}/${userIds.length} kullanici, tip: ${type}`,
    );

    return {
      total: userIds.length,
      sent: sentCount,
      failed: userIds.length - sentCount,
      results,
    };
  }

  /**
   * Send a silent/data-only notification (no visible alert) for background data sync.
   */
  async sendSilentNotification(userId: string, data: Record<string, string>) {
    const devices = await this.prisma.deviceToken.findMany({
      where: { userId, isActive: true },
    });

    if (devices.length === 0) {
      return { sent: false, reason: "no_active_devices" };
    }

    const results = await Promise.allSettled(
      devices.map((device) =>
        this.firebase.sendSilent(
          device.token,
          data,
          device.platform as "ios" | "android",
        ),
      ),
    );

    const successCount = results.filter(
      (r) => r.status === "fulfilled" && r.value.success,
    ).length;

    return { sent: successCount > 0, deviceCount: successCount };
  }

  /**
   * Send a topic-based notification (e.g., system announcements to all users).
   */
  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    const result = await this.firebase.sendToTopic(topic, title, body, data);
    this.logger.log(
      `Topic bildirim gonderildi — topic: ${topic}, basarili: ${result.success}`,
    );
    return result;
  }

  // ─── Convenience Methods for Specific Notification Types ───────────

  /**
   * Notify user of a new match.
   */
  async notifyNewMatch(userId: string, matcherName: string) {
    return this.sendTemplatedNotification(userId, "NEW_MATCH", {
      name: matcherName,
    });
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
      { type: "NEW_MESSAGE", senderName },
      "NEW_MESSAGE",
    );
  }

  /**
   * Notify user of a super like.
   */
  async notifySuperLike(userId: string, likerName: string) {
    return this.sendTemplatedNotification(userId, "SUPER_LIKE", {
      name: likerName,
    });
  }

  /**
   * Notify user of a newly earned badge.
   */
  async notifyBadgeEarned(userId: string, badgeName: string) {
    return this.sendTemplatedNotification(userId, "BADGE_EARNED", {
      badge_name: badgeName,
    });
  }

  /**
   * Notify user of subscription expiring soon.
   */
  async notifySubscriptionExpiring(
    userId: string,
    daysLeft: number,
    packageName: string,
  ) {
    return this.sendTemplatedNotification(userId, "SUBSCRIPTION_EXPIRING", {
      daysLeft: String(daysLeft),
      packageName,
    });
  }

  /**
   * Notify user that a compatible Canli (live video) match was found.
   */
  async notifyCanliMatchFound(userId: string) {
    return this.sendTemplatedNotification(userId, "CANLI_MATCH_FOUND", {});
  }

  /**
   * Notify user that their daily match recommendation is ready.
   */
  async notifyDailyMatchReady(userId: string) {
    return this.sendTemplatedNotification(userId, "DAILY_MATCH_READY", {});
  }

  /**
   * Notify user that a friendship was formed (mutual follow).
   */
  async notifyFriendshipFormed(userId: string, friendName: string) {
    return this.sendTemplatedNotification(userId, "FRIENDSHIP_FORMED", {
      name: friendName,
    });
  }

  /**
   * Notify user of a new like (anonymous tease).
   */
  async notifyNewLike(userId: string) {
    return this.sendPushNotification(
      userId,
      "Yeni Begeni!",
      "Birisi seni begendi! Kim oldugunu gor",
      { type: "SYSTEM" },
      "SYSTEM",
    );
  }

  /**
   * Notify user that daily picks are ready.
   */
  async notifyDailyPicks(userId: string) {
    return this.sendPushNotification(
      userId,
      "Gunluk Secimler",
      "Gunluk secimlerin hazir! Hemen kesfet",
      { type: "SYSTEM", action: "daily_picks" },
      "SYSTEM",
    );
  }

  /**
   * Notify user that a boost is active.
   */
  async notifyBoostActive(userId: string, durationMinutes = 30) {
    return this.sendPushNotification(
      userId,
      "Boost Aktif!",
      `Boost'un aktif! ${durationMinutes} dakikan var`,
      {
        type: "SYSTEM",
        action: "boost_active",
        duration: String(durationMinutes),
      },
      "SYSTEM",
    );
  }

  /**
   * Notify an inactive user to return.
   */
  async notifyInactiveReminder(userId: string) {
    return this.sendPushNotification(
      userId,
      "Seni ozledik!",
      "Seni ozledik! Yeni profiller seni bekliyor",
      { type: "SYSTEM", action: "inactive_reminder" },
      "SYSTEM",
    );
  }

  /**
   * Notify user that a match is expiring.
   */
  async notifyMatchExpiring(userId: string, hoursLeft = 24) {
    return this.sendPushNotification(
      userId,
      "Eslesme Sona Eriyor",
      `Eslesmen ${hoursLeft} saat icinde sona erecek`,
      {
        type: "SYSTEM",
        action: "match_expiring",
        hoursLeft: String(hoursLeft),
      },
      "SYSTEM",
    );
  }

  /**
   * Notify user of a compatibility score update.
   */
  async notifyCompatibilityUpdate(userId: string) {
    return this.sendPushNotification(
      userId,
      "Uyum Skoru",
      "Uyum skorun guncellendi",
      { type: "SYSTEM", action: "compatibility_update" },
      "SYSTEM",
    );
  }

  /**
   * Send a system announcement to all users subscribed to a topic.
   */
  async sendSystemAnnouncement(title: string, body: string) {
    return this.sendToTopic("announcements", title, body, {
      type: "SYSTEM",
      action: "announcement",
    });
  }

  // ─── Social Engagement Notifications ──────────────────────

  async notifyPostLike(
    postOwnerId: string,
    likerName: string,
    postId: string,
  ) {
    return this.sendPushNotification(
      postOwnerId,
      "Yeni Begeni!",
      `${likerName} gonderini begendi`,
      { type: "POST_LIKE", name: likerName, postId },
      "POST_LIKE",
    );
  }

  async notifyStoryLike(
    storyOwnerId: string,
    likerName: string,
    storyId: string,
  ) {
    return this.sendPushNotification(
      storyOwnerId,
      "Hikaye Begenisi!",
      `${likerName} hikayeni begendi`,
      { type: "STORY_LIKE", name: likerName, storyId },
      "STORY_LIKE",
    );
  }

  async notifyNewFollower(
    userId: string,
    followerName: string,
    followerId: string,
  ) {
    return this.sendPushNotification(
      userId,
      "Yeni Takipci!",
      `${followerName} seni takip etmeye basladi`,
      { type: "NEW_FOLLOWER", name: followerName, followerId },
      "NEW_FOLLOWER",
    );
  }
}
