import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { StoriesService } from "../stories/stories.service";
import { PaymentsService } from "../payments/payments.service";
import { NotificationsService } from "../notifications/notifications.service";

/**
 * Scheduled tasks (cron jobs) for LUMA V1.
 *
 * 1. Clean up expired OTP codes
 * 2. Reset daily swipe counters (midnight)
 * 3. Expire stale subscriptions
 * 4. Clean up revoked sessions older than 30 days
 * 5. Clean old notifications
 * 6. Clean old expired verifications
 * 7. Clean old daily swipe counts
 * 8. Clean up expired stories (24-hour TTL)
 * 9. Process expired subscriptions with grace period
 * 10. Clean up expired moods (24-hour TTL)
 */
@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storiesService: StoriesService,
    private readonly paymentsService: PaymentsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─── 1. Clean Up Expired OTP Codes ───────────────────────────
  // Runs every 10 minutes
  @Cron(CronExpression.EVERY_10_MINUTES)
  async cleanExpiredOtpCodes(): Promise<void> {
    const result = await this.prisma.userVerification.updateMany({
      where: {
        type: "SMS",
        status: "PENDING",
        otpExpiresAt: { lt: new Date() },
      },
      data: { status: "EXPIRED" },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} OTP code(s)`);
    }
  }

  // ─── 3. Reset Daily Swipe Counters ───────────────────────────
  // Runs at midnight (00:00) Turkey time (UTC+3)
  @Cron("0 21 * * *") // 21:00 UTC = 00:00 Turkey
  async resetDailySwipeCounters(): Promise<void> {
    const result = await this.prisma.dailySwipeCount.deleteMany({
      where: {
        date: { lt: new Date() },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleared ${result.count} daily swipe record(s)`);
    }
  }

  // ─── 4. Process Expired Subscriptions (with Grace Period) ────
  // Runs every hour — delegates to PaymentsService which handles
  // the 3-day grace period logic (Phase 1: assign grace, Phase 2: downgrade)
  @Cron(CronExpression.EVERY_HOUR)
  async processExpiredSubscriptions(): Promise<void> {
    const count = await this.paymentsService.processExpiredSubscriptions();

    if (count > 0) {
      this.logger.log(
        `Processed ${count} expired subscription(s) (with grace period)`,
      );
    }
  }

  // ─── 5. Clean Old Revoked Sessions ───────────────────────────
  // Runs daily at 03:00 UTC
  @Cron("0 3 * * *")
  async cleanOldSessions(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await this.prisma.userSession.deleteMany({
      where: {
        isRevoked: true,
        createdAt: { lt: thirtyDaysAgo },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned ${result.count} old revoked session(s)`);
    }
  }

  // ─── 6. Clean Old Notifications ──────────────────────────────
  // Runs daily at 04:00 UTC
  @Cron("0 4 * * *")
  async cleanOldNotifications(): Promise<void> {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const result = await this.prisma.notification.deleteMany({
      where: {
        isRead: true,
        createdAt: { lt: ninetyDaysAgo },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned ${result.count} old read notification(s)`);
    }
  }

  // ─── 7. Clean Old Expired Verifications ────────────────────────
  // Runs daily at 04:30 UTC — removes expired/rejected verification records older than 7 days
  @Cron("30 4 * * *")
  async cleanOldVerifications(): Promise<void> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const result = await this.prisma.userVerification.deleteMany({
      where: {
        status: { in: ["EXPIRED", "REJECTED"] },
        createdAt: { lt: sevenDaysAgo },
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `Cleaned ${result.count} old expired/rejected verification(s)`,
      );
    }
  }

  // ─── 8. Clean Old Daily Swipe Counts ───────────────────────────
  // Runs weekly on Sunday at 05:00 UTC — removes swipe tracking data older than 90 days
  @Cron("0 5 * * 0")
  async cleanOldSwipeCounts(): Promise<void> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const result = await this.prisma.dailySwipeCount.deleteMany({
      where: {
        date: { lt: ninetyDaysAgo },
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `Cleaned ${result.count} old daily swipe count record(s)`,
      );
    }
  }

  // ─── 9. Clean Up Expired Stories ──────────────────────────────
  // Runs every 30 minutes — soft-deletes stories older than 24 hours
  @Cron("*/30 * * * *")
  async cleanupExpiredStories(): Promise<void> {
    const cleanedCount = await this.storiesService.cleanupExpiredStories();

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} expired story/stories`);
    }
  }

  // ─── 12. Clean Up Expired Moods ─────────────────────────────
  // Runs every hour — clears moods older than 4 hours
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredMoods(): Promise<void> {
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

    const result = await this.prisma.userProfile.updateMany({
      where: {
        currentMood: { not: null },
        moodSetAt: { lt: fourHoursAgo },
      },
      data: {
        currentMood: null,
        moodSetAt: null,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleared ${result.count} expired mood(s)`);
    }
  }

  // ─── 13. Premium Expiration Campaign ─────────────────────────
  // Runs daily at 09:00 UTC — sends discount notifications to users
  // whose subscription expires in 3 days
  @Cron("0 9 * * *")
  async premiumExpirationCampaign(): Promise<void> {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Find active subscriptions expiring within 3 days that haven't been offered a discount
    const expiringSubs = await this.prisma.subscription.findMany({
      where: {
        isActive: true,
        autoRenew: false,
        expiryDate: {
          gt: now,
          lte: threeDaysFromNow,
        },
        discountOfferedAt: null,
      },
      select: {
        id: true,
        userId: true,
        packageTier: true,
        expiryDate: true,
      },
    });

    let notifiedCount = 0;

    for (const sub of expiringSubs) {
      try {
        const daysLeft = Math.ceil(
          (sub.expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
        );

        const packageName =
          sub.packageTier === "SUPREME" ? "Supreme" : "Premium";

        // Mark discount as offered
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { discountOfferedAt: now },
        });

        // Send push notification
        await this.notificationsService.notifySubscriptionExpiring(
          sub.userId,
          daysLeft,
          packageName,
        );

        notifiedCount++;
      } catch (err) {
        this.logger.error(
          `Failed to send expiration campaign for subscription ${sub.id}: ${err}`,
        );
      }
    }

    if (notifiedCount > 0) {
      this.logger.log(
        `Premium expiration campaign: notified ${notifiedCount} user(s)`,
      );
    }
  }
}
