import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all active matches for the current user.
   * Sorted by most recent, includes partner profile summary.
   */
  async getAllMatches(userId: string) {
    const matches = await this.prisma.match.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        isActive: true,
      },
      include: {
        userA: {
          select: {
            id: true,
            isSelfieVerified: true,
            profile: {
              select: {
                firstName: true,
                birthDate: true,
                city: true,
                intentionTag: true,
              },
            },
            photos: {
              where: { isPrimary: true, isApproved: true },
              take: 1,
              select: { url: true, thumbnailUrl: true },
            },
          },
        },
        userB: {
          select: {
            id: true,
            isSelfieVerified: true,
            profile: {
              select: {
                firstName: true,
                birthDate: true,
                city: true,
                intentionTag: true,
              },
            },
            photos: {
              where: { isPrimary: true, isApproved: true },
              take: 1,
              select: { url: true, thumbnailUrl: true },
            },
          },
        },
        harmonySessions: {
          where: { status: { in: ['ACTIVE', 'EXTENDED'] } },
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { id: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform to client-friendly format
    const formatted = matches.map((match) => {
      // Determine partner (the other user)
      const isUserA = match.userAId === userId;
      const partner = isUserA ? match.userB : match.userA;
      const partnerAge = partner.profile
        ? this.calculateAge(partner.profile.birthDate)
        : null;

      return {
        matchId: match.id,
        createdAt: match.createdAt,
        compatibilityScore: match.compatibilityScore,
        compatibilityLevel: match.compatibilityLevel,
        animationType: match.animationType,
        hasActiveHarmony: match.harmonySessions.length > 0,
        harmonySessionId: match.harmonySessions[0]?.id ?? null,
        partner: {
          userId: partner.id,
          firstName: partner.profile?.firstName ?? 'Kullanıcı',
          age: partnerAge,
          city: partner.profile?.city,
          intentionTag: partner.profile?.intentionTag,
          isVerified: partner.isSelfieVerified,
          photo: partner.photos[0] ?? null,
        },
      };
    });

    return {
      matches: formatted,
      total: formatted.length,
    };
  }

  /**
   * Get a single match by ID with full details.
   */
  async getMatch(userId: string, matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        userA: {
          select: {
            id: true,
            isSelfieVerified: true,
            isFullyVerified: true,
            profile: {
              select: {
                firstName: true,
                birthDate: true,
                bio: true,
                city: true,
                country: true,
                intentionTag: true,
              },
            },
            photos: {
              where: { isApproved: true },
              orderBy: { order: 'asc' },
              select: { id: true, url: true, thumbnailUrl: true, order: true },
            },
            badges: {
              include: { badge: { select: { key: true, nameTr: true, iconUrl: true } } },
              take: 5,
            },
          },
        },
        userB: {
          select: {
            id: true,
            isSelfieVerified: true,
            isFullyVerified: true,
            profile: {
              select: {
                firstName: true,
                birthDate: true,
                bio: true,
                city: true,
                country: true,
                intentionTag: true,
              },
            },
            photos: {
              where: { isApproved: true },
              orderBy: { order: 'asc' },
              select: { id: true, url: true, thumbnailUrl: true, order: true },
            },
            badges: {
              include: { badge: { select: { key: true, nameTr: true, iconUrl: true } } },
              take: 5,
            },
          },
        },
        harmonySessions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            status: true,
            startedAt: true,
            actualEndedAt: true,
            hasVoiceChat: true,
            hasVideoChat: true,
          },
        },
      },
    });

    if (!match) {
      throw new NotFoundException('Eşleşme bulunamadı');
    }

    // Verify user is a participant
    if (match.userAId !== userId && match.userBId !== userId) {
      throw new ForbiddenException('Bu eşleşmeye erişim yetkiniz yok');
    }

    // Determine partner
    const isUserA = match.userAId === userId;
    const partner = isUserA ? match.userB : match.userA;
    const partnerAge = partner.profile
      ? this.calculateAge(partner.profile.birthDate)
      : null;

    // Get compatibility breakdown
    const { first, second } = this.orderIds(match.userAId, match.userBId);
    const compatScore = await this.prisma.compatibilityScore.findUnique({
      where: { userAId_userBId: { userAId: first, userBId: second } },
      select: {
        baseScore: true,
        deepScore: true,
        finalScore: true,
        level: true,
        dimensionScores: true,
      },
    });

    return {
      matchId: match.id,
      createdAt: match.createdAt,
      isActive: match.isActive,
      compatibility: {
        score: match.compatibilityScore,
        level: match.compatibilityLevel,
        animationType: match.animationType,
        breakdown: compatScore?.dimensionScores ?? {},
        baseScore: compatScore?.baseScore,
        deepScore: compatScore?.deepScore,
      },
      partner: {
        userId: partner.id,
        firstName: partner.profile?.firstName ?? 'Kullanıcı',
        age: partnerAge,
        bio: partner.profile?.bio,
        city: partner.profile?.city,
        country: partner.profile?.country,
        intentionTag: partner.profile?.intentionTag,
        isVerified: partner.isSelfieVerified,
        isFullyVerified: partner.isFullyVerified,
        photos: partner.photos,
        badges: partner.badges.map((ub) => ({
          key: ub.badge.key,
          name: ub.badge.nameTr,
          icon: ub.badge.iconUrl,
          earnedAt: ub.earnedAt,
        })),
      },
      harmonySessions: match.harmonySessions,
    };
  }

  /**
   * Unmatch — deactivate a match.
   * Records who initiated the unmatch, cancels harmony sessions,
   * and notifies the other user.
   */
  async unmatch(userId: string, matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        userA: { select: { id: true, profile: { select: { firstName: true } } } },
        userB: { select: { id: true, profile: { select: { firstName: true } } } },
      },
    });

    if (!match) {
      throw new NotFoundException('Eşleşme bulunamadı');
    }

    if (match.userAId !== userId && match.userBId !== userId) {
      throw new ForbiddenException('Bu eşleşmeye erişim yetkiniz yok');
    }

    // Determine the partner to notify
    const partnerId = match.userAId === userId ? match.userBId : match.userAId;

    await this.prisma.$transaction(async (tx) => {
      // Deactivate the match
      await tx.match.update({
        where: { id: matchId },
        data: {
          isActive: false,
          unmatchedAt: new Date(),
        },
      });

      // End any active harmony sessions
      await tx.harmonySession.updateMany({
        where: {
          matchId,
          status: { in: ['PENDING', 'ACTIVE', 'EXTENDED'] },
        },
        data: {
          status: 'CANCELLED',
          actualEndedAt: new Date(),
        },
      });

      // Notify the partner that the match was removed
      await tx.notification.create({
        data: {
          userId: partnerId,
          type: 'MATCH_REMOVED',
          title: 'Eşleşme Kaldırıldı',
          body: 'Bir eşleşmeniz kaldırıldı.',
          data: { matchId },
        },
      });
    });

    return { unmatched: true };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  private orderIds(a: string, b: string) {
    return a < b ? { first: a, second: b } : { first: b, second: a };
  }
}
