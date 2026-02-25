import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReportDto, ReportReasonDto } from './dto/report.dto';
import { CreateBlockDto } from './dto/block.dto';

/**
 * Maps DTO report reasons to Prisma ReportCategory enum values.
 */
const REASON_TO_CATEGORY: Record<ReportReasonDto, string> = {
  [ReportReasonDto.SPAM]: 'SPAM',
  [ReportReasonDto.INAPPROPRIATE_PHOTOS]: 'INAPPROPRIATE_PHOTO',
  [ReportReasonDto.HARASSMENT]: 'HARASSMENT',
  [ReportReasonDto.UNDERAGE]: 'UNDERAGE',
  [ReportReasonDto.FAKE_PROFILE]: 'FAKE_PROFILE',
  [ReportReasonDto.SCAM]: 'SCAM',
  [ReportReasonDto.OTHER]: 'OTHER',
};

/**
 * Report count thresholds for automatic safety actions.
 * When a user accumulates this many PENDING reports, the system
 * automatically flags them for priority review.
 */
const REPORT_THRESHOLD_FLAG = 3;
const REPORT_THRESHOLD_SUSPEND = 10;

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Report ─────────────────────────────────────────────────

  /**
   * Report a user. Creates a report record for admin review.
   * Prevents duplicate reports for the same reporter+reported pair within 24 hours.
   */
  async reportUser(reporterId: string, dto: CreateReportDto) {
    // Cannot report yourself
    if (reporterId === dto.reportedUserId) {
      throw new BadRequestException('Kendinizi sikayet edemezsiniz');
    }

    // Verify reported user exists
    const reportedUser = await this.prisma.user.findUnique({
      where: { id: dto.reportedUserId },
      select: { id: true, isActive: true },
    });

    if (!reportedUser) {
      throw new NotFoundException('Sikayet edilen kullanici bulunamadi');
    }

    // Check for duplicate report within 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const existingReport = await this.prisma.report.findFirst({
      where: {
        reporterId,
        reportedId: dto.reportedUserId,
        createdAt: { gte: oneDayAgo },
      },
    });

    if (existingReport) {
      throw new ConflictException(
        'Bu kullaniciyi son 24 saat icinde zaten sikayet ettiniz',
      );
    }

    // Map the DTO reason to Prisma category
    const category = REASON_TO_CATEGORY[dto.reason];

    // Create the report
    const report = await this.prisma.report.create({
      data: {
        reporterId,
        reportedId: dto.reportedUserId,
        category: category as 'SPAM' | 'INAPPROPRIATE_PHOTO' | 'HARASSMENT' | 'UNDERAGE' | 'FAKE_PROFILE' | 'SCAM' | 'OTHER',
        details: dto.details ?? null,
        status: 'PENDING',
      },
      select: {
        id: true,
        reportedId: true,
        category: true,
        status: true,
        createdAt: true,
      },
    });

    // Check report threshold for auto-flagging
    await this.checkReportThreshold(dto.reportedUserId);

    return {
      id: report.id,
      reportedUserId: report.reportedId,
      reason: dto.reason,
      status: report.status.toLowerCase(),
      createdAt: report.createdAt.toISOString(),
    };
  }

  /**
   * Check if a reported user has exceeded safety thresholds.
   * - At REPORT_THRESHOLD_FLAG (3): marks all pending reports as REVIEWING
   * - At REPORT_THRESHOLD_SUSPEND (10): deactivates the user account
   */
  private async checkReportThreshold(reportedUserId: string) {
    const pendingCount = await this.prisma.report.count({
      where: {
        reportedId: reportedUserId,
        status: { in: ['PENDING', 'REVIEWING'] },
      },
    });

    if (pendingCount >= REPORT_THRESHOLD_SUSPEND) {
      // Auto-suspend: deactivate user
      await this.prisma.user.update({
        where: { id: reportedUserId },
        data: { isActive: false },
      });
    } else if (pendingCount >= REPORT_THRESHOLD_FLAG) {
      // Auto-escalate: move pending reports to REVIEWING
      await this.prisma.report.updateMany({
        where: {
          reportedId: reportedUserId,
          status: 'PENDING',
        },
        data: {
          status: 'REVIEWING',
        },
      });
    }
  }

  /**
   * Check if a block exists between two users (in either direction).
   * Used by other modules (e.g. chat) to enforce block boundaries.
   */
  async isBlocked(userIdA: string, userIdB: string): Promise<boolean> {
    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userIdA, blockedId: userIdB },
          { blockerId: userIdB, blockedId: userIdA },
        ],
      },
      select: { id: true },
    });
    return block !== null;
  }

  // ─── Block ──────────────────────────────────────────────────

  /**
   * Block a user. Also deactivates any existing match between the two users
   * and cancels any active Harmony sessions.
   */
  async blockUser(blockerId: string, dto: CreateBlockDto) {
    // Cannot block yourself
    if (blockerId === dto.blockedUserId) {
      throw new BadRequestException('Kendinizi engelleyemezsiniz');
    }

    // Verify the target user exists
    const blockedUser = await this.prisma.user.findUnique({
      where: { id: dto.blockedUserId },
      select: { id: true },
    });

    if (!blockedUser) {
      throw new NotFoundException('Engellenecek kullanici bulunamadi');
    }

    // Check if already blocked
    const existingBlock = await this.prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId: dto.blockedUserId,
        },
      },
    });

    if (existingBlock) {
      throw new ConflictException('Bu kullanici zaten engellenmis');
    }

    // Use a transaction: create block + deactivate matches + cancel harmony sessions
    const block = await this.prisma.$transaction(async (tx) => {
      // 1. Create the block record
      const newBlock = await tx.block.create({
        data: {
          blockerId,
          blockedId: dto.blockedUserId,
        },
        select: {
          id: true,
          blockedId: true,
          createdAt: true,
        },
      });

      // 2. Deactivate any matches between these users
      await tx.match.updateMany({
        where: {
          OR: [
            { userAId: blockerId, userBId: dto.blockedUserId },
            { userAId: dto.blockedUserId, userBId: blockerId },
          ],
          isActive: true,
        },
        data: {
          isActive: false,
          unmatchedAt: new Date(),
        },
      });

      // 3. Cancel any active Harmony sessions between these users
      await tx.harmonySession.updateMany({
        where: {
          OR: [
            { userAId: blockerId, userBId: dto.blockedUserId },
            { userAId: dto.blockedUserId, userBId: blockerId },
          ],
          status: { in: ['PENDING', 'ACTIVE', 'EXTENDED'] },
        },
        data: {
          status: 'CANCELLED',
          actualEndedAt: new Date(),
        },
      });

      return newBlock;
    });

    return {
      blocked: true,
      blockedUserId: block.blockedId,
      createdAt: block.createdAt.toISOString(),
    };
  }

  /**
   * Unblock a user. Removes the block record.
   * Note: Matches are NOT restored — users must re-discover each other.
   */
  async unblockUser(blockerId: string, blockedUserId: string) {
    const existingBlock = await this.prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId: blockedUserId,
        },
      },
    });

    if (!existingBlock) {
      throw new NotFoundException('Bu kullanici engellenmemis');
    }

    await this.prisma.block.delete({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId: blockedUserId,
        },
      },
    });

    return {
      unblocked: true,
      unblockedUserId: blockedUserId,
    };
  }

  /**
   * Get the list of blocked users for the current user.
   * Includes basic profile info for display.
   */
  async getBlockedUsers(userId: string) {
    const blocks = await this.prisma.block.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: {
            id: true,
            profile: {
              select: {
                firstName: true,
              },
            },
            photos: {
              where: { isPrimary: true, isApproved: true },
              take: 1,
              select: { thumbnailUrl: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const blockedUsers = blocks.map((block: typeof blocks[number]) => ({
      userId: block.blocked.id,
      firstName: block.blocked.profile?.firstName ?? 'Kullanici',
      photoUrl: block.blocked.photos[0]?.thumbnailUrl ?? null,
      blockedAt: block.createdAt.toISOString(),
    }));

    return {
      blockedUsers,
      total: blockedUsers.length,
    };
  }
}
