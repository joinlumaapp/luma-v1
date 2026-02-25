import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
      // Connection pool tuning for PostgreSQL
      datasourceUrl: process.env.DATABASE_URL,
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma connected to PostgreSQL');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma disconnected');
  }

  // Soft delete helper — used for GDPR-compliant account deletion
  async softDelete(model: string, id: string) {
    const delegate = (this as Record<string, unknown>)[model] as {
      update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
    };
    return delegate.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  /**
   * Clean up expired sessions older than the given number of days.
   * Should be called periodically (e.g., via a CRON task).
   */
  async cleanupExpiredSessions(olderThanDays = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    const result = await this.userSession.deleteMany({
      where: {
        isRevoked: true,
        expiresAt: { lt: cutoff },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} expired sessions`);
    }

    return result.count;
  }

  /**
   * Clean up old daily swipe counts older than the given number of days.
   * Keeps recent data for analytics, removes stale tracking data.
   */
  async cleanupOldSwipeCounts(olderThanDays = 90): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    const result = await this.dailySwipeCount.deleteMany({
      where: {
        date: { lt: cutoff },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} old daily swipe count records`);
    }

    return result.count;
  }

  /**
   * Clean up old read notifications older than the given number of days.
   * Unread notifications are preserved regardless of age.
   */
  async cleanupOldNotifications(olderThanDays = 90): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    const result = await this.notification.deleteMany({
      where: {
        isRead: true,
        createdAt: { lt: cutoff },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} old read notifications`);
    }

    return result.count;
  }
}
