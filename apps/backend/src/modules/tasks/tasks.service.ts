import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { RelationshipsService } from '../relationships/relationships.service';
import { StoriesService } from '../stories/stories.service';

/**
 * Scheduled tasks (cron jobs) for LUMA V1.
 *
 * 1. Expire old Harmony sessions
 * 2. Clean up expired OTP codes
 * 3. Reset daily swipe counters (midnight)
 * 4. Expire stale subscriptions
 * 5. Clean up revoked sessions older than 30 days
 * 6. Clean old notifications
 * 7. Clean old expired verifications
 * 8. Clean old daily swipe counts
 * 9. Auto-end expired relationship deactivations (48-hour deadline)
 * 10. Clean up expired stories (24-hour TTL)
 */
@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly relationshipsService: RelationshipsService,
    private readonly storiesService: StoriesService,
  ) {}

  // ─── 1. End Expired Harmony Sessions ─────────────────────────
  // Runs every minute
  @Cron(CronExpression.EVERY_MINUTE)
  async endExpiredHarmonySessions(): Promise<void> {
    const now = new Date();

    const result = await this.prisma.harmonySession.updateMany({
      where: {
        status: { in: ['ACTIVE', 'EXTENDED'] },
        endsAt: { lt: now },
      },
      data: {
        status: 'ENDED',
        actualEndedAt: now,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Ended ${result.count} expired Harmony session(s)`);
    }
  }

  // ─── 2. Clean Up Expired OTP Codes ───────────────────────────
  // Runs every 10 minutes
  @Cron(CronExpression.EVERY_10_MINUTES)
  async cleanExpiredOtpCodes(): Promise<void> {
    const result = await this.prisma.userVerification.updateMany({
      where: {
        type: 'SMS',
        status: 'PENDING',
        otpExpiresAt: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} OTP code(s)`);
    }
  }

  // ─── 3. Reset Daily Swipe Counters ───────────────────────────
  // Runs at midnight (00:00) Turkey time (UTC+3)
  @Cron('0 21 * * *') // 21:00 UTC = 00:00 Turkey
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

  // ─── 4. Expire Stale Subscriptions ───────────────────────────
  // Runs every hour
  @Cron(CronExpression.EVERY_HOUR)
  async expireSubscriptions(): Promise<void> {
    const now = new Date();

    const result = await this.prisma.subscription.updateMany({
      where: {
        isActive: true,
        autoRenew: false,
        expiryDate: { lt: now },
      },
      data: { isActive: false },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} subscription(s)`);

      // Downgrade expired users to FREE tier
      const expiredSubs = await this.prisma.subscription.findMany({
        where: {
          isActive: false,
          expiryDate: {
            gte: new Date(now.getTime() - 60 * 60 * 1000), // last hour
            lt: now,
          },
        },
        select: { userId: true },
      });

      if (expiredSubs.length > 0) {
        const userIds = expiredSubs.map((s: { userId: string }) => s.userId);
        await this.prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { packageTier: 'FREE' },
        });
        this.logger.log(`Downgraded ${userIds.length} user(s) to FREE tier`);
      }
    }
  }

  // ─── 5. Clean Old Revoked Sessions ───────────────────────────
  // Runs daily at 03:00 UTC
  @Cron('0 3 * * *')
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
  @Cron('0 4 * * *')
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
  @Cron('30 4 * * *')
  async cleanOldVerifications(): Promise<void> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const result = await this.prisma.userVerification.deleteMany({
      where: {
        status: { in: ['EXPIRED', 'REJECTED'] },
        createdAt: { lt: sevenDaysAgo },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned ${result.count} old expired/rejected verification(s)`);
    }
  }

  // ─── 8. Clean Old Daily Swipe Counts ───────────────────────────
  // Runs weekly on Sunday at 05:00 UTC — removes swipe tracking data older than 90 days
  @Cron('0 5 * * 0')
  async cleanOldSwipeCounts(): Promise<void> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const result = await this.prisma.dailySwipeCount.deleteMany({
      where: {
        date: { lt: ninetyDaysAgo },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned ${result.count} old daily swipe count record(s)`);
    }
  }

  // ─── 9. Auto-End Expired Relationship Deactivations ────────────
  // Runs every 15 minutes — ends relationships past the 48-hour deadline
  @Cron(CronExpression.EVERY_10_MINUTES)
  async autoEndExpiredRelationships(): Promise<void> {
    const endedCount = await this.relationshipsService.autoEndExpiredRelationships();

    if (endedCount > 0) {
      this.logger.log(`Auto-ended ${endedCount} expired relationship deactivation(s)`);
    }
  }

  // ─── 10. Clean Up Expired Stories ──────────────────────────────
  // Runs every 30 minutes — soft-deletes stories older than 24 hours
  @Cron('*/30 * * * *')
  async cleanupExpiredStories(): Promise<void> {
    const cleanedCount = await this.storiesService.cleanupExpiredStories();

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} expired story/stories`);
    }
  }
}
