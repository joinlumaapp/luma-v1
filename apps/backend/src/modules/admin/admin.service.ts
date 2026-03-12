import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  UserFilterDto,
  UserStatusFilter,
  ModerateUserDto,
  ModerateAction,
  ReviewReportDto,
  ReportDecision,
  ReportAction,
  AnnouncementDto,
  AnnouncementTargetTier,
  ReportFilterDto,
  PaymentFilterDto,
  AnalyticsFilterDto,
} from './dto';

/** Shape returned by getDashboardStats */
interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  matchesToday: number;
  pendingReports: number;
  totalRevenue: number;
  activeSubscriptions: number;
  verifiedUsers: number;
}

/** Shape for paginated results */
interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─── Dashboard ──────────────────────────────────────────────

  /**
   * Aggregate dashboard statistics for the admin overview panel.
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      matchesToday,
      pendingReports,
      activeSubscriptions,
      verifiedUsers,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { isActive: true, deletedAt: null } }),
      this.prisma.user.count({
        where: { createdAt: { gte: todayStart }, deletedAt: null },
      }),
      this.prisma.match.count({
        where: { createdAt: { gte: todayStart } },
      }),
      this.prisma.report.count({
        where: { status: { in: ['PENDING', 'REVIEWING'] } },
      }),
      this.prisma.subscription.count({ where: { isActive: true } }),
      this.prisma.user.count({
        where: { isFullyVerified: true, deletedAt: null },
      }),
    ]);

    // Calculate total revenue from gold transactions (purchase type only)
    const revenueAgg = await this.prisma.goldTransaction.aggregate({
      _sum: { amount: true },
      where: { type: 'PURCHASE', amount: { gt: 0 } },
    });

    return {
      totalUsers,
      activeUsers,
      newUsersToday,
      matchesToday,
      pendingReports,
      totalRevenue: revenueAgg._sum.amount ?? 0,
      activeSubscriptions,
      verifiedUsers,
    };
  }

  // ─── Users ──────────────────────────────────────────────────

  /**
   * List users with optional filters, search, and pagination.
   */
  async getUsers(filters: UserFilterDto): Promise<PaginatedResult<unknown>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    // Status filter
    if (filters.status === UserStatusFilter.ACTIVE) {
      where.isActive = true;
      where.deletedAt = null;
    } else if (filters.status === UserStatusFilter.INACTIVE) {
      where.isActive = false;
      where.deletedAt = null;
    } else if (filters.status === UserStatusFilter.DELETED) {
      where.deletedAt = { not: null };
    }

    // Tier filter
    if (filters.tier) {
      where.packageTier = filters.tier;
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      const createdAt: Record<string, Date> = {};
      if (filters.dateFrom) {
        createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        createdAt.lte = new Date(filters.dateTo);
      }
      where.createdAt = createdAt;
    }

    // Search filter (name, phone, or ID)
    if (filters.search) {
      const searchTerm = filters.search.trim();
      where.OR = [
        { phone: { contains: searchTerm } },
        { id: searchTerm.length === 36 ? searchTerm : undefined },
        {
          profile: {
            firstName: { contains: searchTerm, mode: 'insensitive' },
          },
        },
      ].filter(
        (condition) =>
          !Object.values(condition).some((v) => v === undefined),
      );
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          phone: true,
          isActive: true,
          isSmsVerified: true,
          isSelfieVerified: true,
          isFullyVerified: true,
          packageTier: true,
          goldBalance: true,
          createdAt: true,
          deletedAt: true,
          profile: {
            select: {
              firstName: true,
              birthDate: true,
              gender: true,
              city: true,
              intentionTag: true,
            },
          },
          photos: {
            where: { isPrimary: true, isApproved: true },
            take: 1,
            select: { thumbnailUrl: true },
          },
          _count: {
            select: {
              reportedBy: true,
              matchesAsA: true,
              matchesAsB: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const mappedItems = items.map((user) => ({
      id: user.id,
      phone: user.phone,
      firstName: user.profile?.firstName ?? null,
      gender: user.profile?.gender ?? null,
      city: user.profile?.city ?? null,
      birthDate: user.profile?.birthDate?.toISOString() ?? null,
      intentionTag: user.profile?.intentionTag ?? null,
      photoUrl: user.photos[0]?.thumbnailUrl ?? null,
      isActive: user.isActive,
      isVerified: user.isFullyVerified,
      packageTier: user.packageTier,
      goldBalance: user.goldBalance,
      reportCount: user._count.reportedBy,
      matchCount: user._count.matchesAsA + user._count.matchesAsB,
      createdAt: user.createdAt.toISOString(),
      deletedAt: user.deletedAt?.toISOString() ?? null,
    }));

    return {
      items: mappedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get full detail for a single user including profile, subscription,
   * reports received, and match stats.
   */
  async getUserDetail(userId: string): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        photos: { orderBy: { order: 'asc' } },
        subscriptions: {
          where: { isActive: true },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        reportedBy: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            category: true,
            status: true,
            details: true,
            createdAt: true,
            reporter: {
              select: {
                id: true,
                profile: { select: { firstName: true } },
              },
            },
          },
        },
        badges: {
          include: { badge: true },
          orderBy: { earnedAt: 'desc' },
        },
        _count: {
          select: {
            matchesAsA: true,
            matchesAsB: true,
            reports: true,
            reportedBy: true,
            blocksGiven: true,
            blocksReceived: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Kullanici bulunamadi');
    }

    return {
      id: user.id,
      phone: user.phone,
      isActive: user.isActive,
      isSmsVerified: user.isSmsVerified,
      isSelfieVerified: user.isSelfieVerified,
      isFullyVerified: user.isFullyVerified,
      packageTier: user.packageTier,
      goldBalance: user.goldBalance,
      createdAt: user.createdAt.toISOString(),
      deletedAt: user.deletedAt?.toISOString() ?? null,
      profile: user.profile
        ? {
            firstName: user.profile.firstName,
            birthDate: user.profile.birthDate.toISOString(),
            gender: user.profile.gender,
            bio: user.profile.bio,
            city: user.profile.city,
            country: user.profile.country,
            intentionTag: user.profile.intentionTag,
            lastActiveAt: user.profile.lastActiveAt?.toISOString() ?? null,
          }
        : null,
      photos: user.photos.map((p) => ({
        id: p.id,
        url: p.url,
        thumbnailUrl: p.thumbnailUrl,
        order: p.order,
        isPrimary: p.isPrimary,
        isApproved: p.isApproved,
      })),
      activeSubscription: user.subscriptions[0]
        ? {
            id: user.subscriptions[0].id,
            packageTier: user.subscriptions[0].packageTier,
            platform: user.subscriptions[0].platform,
            startDate: user.subscriptions[0].startDate.toISOString(),
            expiryDate: user.subscriptions[0].expiryDate.toISOString(),
            autoRenew: user.subscriptions[0].autoRenew,
          }
        : null,
      reports: user.reportedBy.map((r) => ({
        id: r.id,
        category: r.category,
        status: r.status,
        details: r.details,
        reporterName: r.reporter.profile?.firstName ?? 'Anonim',
        createdAt: r.createdAt.toISOString(),
      })),
      badges: user.badges.map((ub) => ({
        id: ub.badge.id,
        name: ub.badge.nameEn,
        nameTr: ub.badge.nameTr,
        earnedAt: ub.earnedAt.toISOString(),
      })),
      stats: {
        totalMatches: user._count.matchesAsA + user._count.matchesAsB,
        reportsMade: user._count.reports,
        reportsReceived: user._count.reportedBy,
        blocksGiven: user._count.blocksGiven,
        blocksReceived: user._count.blocksReceived,
      },
    };
  }

  // ─── Moderation ─────────────────────────────────────────────

  /**
   * Perform a moderation action on a user: ban, warn, verify, or unban.
   */
  async moderateUser(
    userId: string,
    dto: ModerateUserDto,
    adminId: string,
  ): Promise<{ success: boolean; action: string; userId: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true, isFullyVerified: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanici bulunamadi');
    }

    switch (dto.action) {
      case ModerateAction.BAN:
        if (!dto.reason) {
          throw new BadRequestException(
            'Ban islemi icin sebep belirtilmelidir',
          );
        }
        await this.prisma.user.update({
          where: { id: userId },
          data: { isActive: false },
        });
        this.logger.log(
          `User ${userId} banned by admin ${adminId}. Reason: ${dto.reason}`,
        );
        break;

      case ModerateAction.WARN:
        if (!dto.reason) {
          throw new BadRequestException(
            'Uyari islemi icin sebep belirtilmelidir',
          );
        }
        // Send warning notification to user
        await this.notificationsService.sendPushNotification(
          userId,
          'Hesap Uyarisi',
          dto.reason,
          { type: 'admin_warning' },
          'SYSTEM',
        );
        this.logger.log(
          `User ${userId} warned by admin ${adminId}. Reason: ${dto.reason}`,
        );
        break;

      case ModerateAction.VERIFY:
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            isFullyVerified: true,
            isSelfieVerified: true,
          },
        });
        this.logger.log(`User ${userId} verified by admin ${adminId}`);
        break;

      case ModerateAction.UNBAN:
        await this.prisma.user.update({
          where: { id: userId },
          data: { isActive: true },
        });
        this.logger.log(`User ${userId} unbanned by admin ${adminId}`);
        break;
    }

    return {
      success: true,
      action: dto.action,
      userId,
    };
  }

  /**
   * Soft delete a user (set deletedAt, deactivate).
   */
  async softDeleteUser(
    userId: string,
    adminId: string,
  ): Promise<{ success: boolean; userId: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, deletedAt: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanici bulunamadi');
    }

    if (user.deletedAt) {
      throw new BadRequestException('Kullanici zaten silinmis');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    this.logger.log(`User ${userId} soft-deleted by admin ${adminId}`);

    return { success: true, userId };
  }

  // ─── Reports ────────────────────────────────────────────────

  /**
   * List reports with filters and pagination.
   */
  async getReports(
    filters: ReportFilterDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.type) {
      where.category = filters.type;
    }

    const [items, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          category: true,
          status: true,
          details: true,
          reviewNote: true,
          reviewedAt: true,
          createdAt: true,
          reporter: {
            select: {
              id: true,
              profile: { select: { firstName: true } },
            },
          },
          reported: {
            select: {
              id: true,
              isActive: true,
              profile: { select: { firstName: true } },
              photos: {
                where: { isPrimary: true, isApproved: true },
                take: 1,
                select: { thumbnailUrl: true },
              },
            },
          },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    const mappedItems = items.map((report) => ({
      id: report.id,
      category: report.category,
      status: report.status,
      details: report.details,
      reviewNote: report.reviewNote,
      reviewedAt: report.reviewedAt?.toISOString() ?? null,
      createdAt: report.createdAt.toISOString(),
      reporter: {
        id: report.reporter.id,
        firstName: report.reporter.profile?.firstName ?? 'Anonim',
      },
      reported: {
        id: report.reported.id,
        firstName: report.reported.profile?.firstName ?? 'Anonim',
        isActive: report.reported.isActive,
        photoUrl: report.reported.photos[0]?.thumbnailUrl ?? null,
      },
    }));

    return {
      items: mappedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Review a report: approve or reject, with optional moderation action.
   */
  async reviewReport(
    reportId: string,
    dto: ReviewReportDto,
    adminId: string,
  ): Promise<{ success: boolean; reportId: string; decision: string }> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: { id: true, status: true, reportedId: true },
    });

    if (!report) {
      throw new NotFoundException('Rapor bulunamadi');
    }

    if (report.status === 'RESOLVED' || report.status === 'DISMISSED') {
      throw new BadRequestException('Bu rapor zaten incelenmis');
    }

    const newStatus =
      dto.decision === ReportDecision.APPROVE ? 'RESOLVED' : 'DISMISSED';

    await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: newStatus,
        reviewedAt: new Date(),
        reviewNote: dto.note ?? null,
      },
    });

    // If approved, apply the chosen action on the reported user
    if (dto.decision === ReportDecision.APPROVE && dto.action) {
      switch (dto.action) {
        case ReportAction.BAN:
          await this.prisma.user.update({
            where: { id: report.reportedId },
            data: { isActive: false },
          });
          this.logger.log(
            `User ${report.reportedId} banned via report ${reportId} by admin ${adminId}`,
          );
          break;

        case ReportAction.WARN:
          await this.notificationsService.sendPushNotification(
            report.reportedId,
            'Hesap Uyarisi',
            'Davranislariniz topluluk kurallarimiza aykiri bulunmustur. Lutfen kurallara uyunuz.',
            { type: 'admin_warning', reportId },
            'SYSTEM',
          );
          this.logger.log(
            `User ${report.reportedId} warned via report ${reportId} by admin ${adminId}`,
          );
          break;

        case ReportAction.DISMISS:
          // No action on user, report already dismissed
          break;
      }
    }

    this.logger.log(
      `Report ${reportId} reviewed by admin ${adminId}: ${dto.decision}`,
    );

    return {
      success: true,
      reportId,
      decision: dto.decision,
    };
  }

  // ─── Analytics ──────────────────────────────────────────────

  /**
   * Extended analytics: DAU/MAU chart data, retention, revenue breakdown.
   */
  async getAnalytics(
    filters: AnalyticsFilterDto,
  ): Promise<Record<string, unknown>> {
    const dateFrom = filters.dateFrom
      ? new Date(filters.dateFrom)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // default 30 days
    const dateTo = filters.dateTo ? new Date(filters.dateTo) : new Date();

    // Total users registered in period
    const newRegistrations = await this.prisma.user.count({
      where: {
        createdAt: { gte: dateFrom, lte: dateTo },
        deletedAt: null,
      },
    });

    // Active users (logged in within last 24h approximation)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [dau, wau, mau] = await Promise.all([
      this.prisma.userProfile.count({
        where: { lastActiveAt: { gte: oneDayAgo } },
      }),
      this.prisma.userProfile.count({
        where: { lastActiveAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.userProfile.count({
        where: { lastActiveAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    // Matches in period
    const matchesInPeriod = await this.prisma.match.count({
      where: { createdAt: { gte: dateFrom, lte: dateTo } },
    });

    // Revenue in period (gold purchases)
    const revenueInPeriod = await this.prisma.goldTransaction.aggregate({
      _sum: { amount: true },
      _count: true,
      where: {
        type: 'PURCHASE',
        amount: { gt: 0 },
        createdAt: { gte: dateFrom, lte: dateTo },
      },
    });

    // Tier distribution
    const tierDistribution = await this.prisma.user.groupBy({
      by: ['packageTier'],
      _count: true,
      where: { deletedAt: null, isActive: true },
    });

    // Verification stats
    const [totalUsers, verifiedUsers] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({
        where: { isFullyVerified: true, deletedAt: null },
      }),
    ]);

    const verificationRate =
      totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0;

    // Retention approximation (DAU/MAU ratio)
    const retentionRatio = mau > 0 ? Math.round((dau / mau) * 100) : 0;

    return {
      period: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
      },
      activeUsers: { dau, wau, mau },
      retentionRatio,
      newRegistrations,
      matchesInPeriod,
      revenue: {
        totalGoldPurchased: revenueInPeriod._sum.amount ?? 0,
        transactionCount: revenueInPeriod._count,
      },
      tierDistribution: tierDistribution.map((t) => ({
        tier: t.packageTier,
        count: t._count,
      })),
      verificationRate,
    };
  }

  // ─── Payments ───────────────────────────────────────────────

  /**
   * List gold transactions with filters and pagination.
   */
  async getPayments(
    filters: PaymentFilterDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.dateFrom || filters.dateTo) {
      const createdAt: Record<string, Date> = {};
      if (filters.dateFrom) {
        createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        createdAt.lte = new Date(filters.dateTo);
      }
      where.createdAt = createdAt;
    }

    const [items, total] = await Promise.all([
      this.prisma.goldTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          amount: true,
          balance: true,
          description: true,
          referenceId: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              phone: true,
              profile: { select: { firstName: true } },
            },
          },
        },
      }),
      this.prisma.goldTransaction.count({ where }),
    ]);

    const mappedItems = items.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      balance: tx.balance,
      description: tx.description,
      referenceId: tx.referenceId,
      createdAt: tx.createdAt.toISOString(),
      user: {
        id: tx.user.id,
        phone: tx.user.phone,
        firstName: tx.user.profile?.firstName ?? null,
      },
    }));

    return {
      items: mappedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── Announcements ─────────────────────────────────────────

  /**
   * Send a system announcement to all users (or a specific tier).
   * Uses the notification service to push to each user.
   */
  async sendAnnouncement(
    dto: AnnouncementDto,
    adminId: string,
  ): Promise<{ success: boolean; targetCount: number }> {
    // Build user filter based on target tier
    const where: Record<string, unknown> = {
      isActive: true,
      deletedAt: null,
    };

    if (dto.targetTier && dto.targetTier !== AnnouncementTargetTier.ALL) {
      where.packageTier = dto.targetTier;
    }

    // Get target user IDs
    const targetUsers = await this.prisma.user.findMany({
      where,
      select: { id: true },
    });

    // Send notifications in batches to avoid overwhelming the system
    const BATCH_SIZE = 100;
    let sent = 0;

    for (let i = 0; i < targetUsers.length; i += BATCH_SIZE) {
      const batch = targetUsers.slice(i, i + BATCH_SIZE);
      const promises = batch.map((user) =>
        this.notificationsService
          .sendPushNotification(
            user.id,
            dto.title,
            dto.body,
            { type: 'system_announcement', adminId },
            'SYSTEM',
          )
          .catch((err: Error) => {
            this.logger.warn(
              `Failed to send announcement to user ${user.id}: ${err.message}`,
            );
          }),
      );
      await Promise.all(promises);
      sent += batch.length;
    }

    this.logger.log(
      `Announcement sent by admin ${adminId} to ${sent} users. Title: "${dto.title}"`,
    );

    return {
      success: true,
      targetCount: sent,
    };
  }
}
