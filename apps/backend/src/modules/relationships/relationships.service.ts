import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BadgesService } from '../badges/badges.service';
import { ActivateRelationshipDto, ToggleVisibilityDto, CreateEventDto } from './dto';

export interface CoupleMatch {
  coupleId: string;
  partnerNames: string[];
  sharedInterests: string[];
  compatibilityScore: number;
}

@Injectable()
export class RelationshipsService {
  private readonly logger = new Logger(RelationshipsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly badgesService: BadgesService,
  ) {}

  /**
   * Propose a relationship from a match.
   * Creates a PROPOSED relationship; partner must confirm to activate.
   */
  async activate(userId: string, dto: ActivateRelationshipDto) {
    // Verify match exists
    const match = await this.prisma.match.findUnique({
      where: { id: dto.matchId },
    });

    if (!match || !match.isActive) {
      throw new NotFoundException('Eşleşme bulunamadı veya aktif değil');
    }

    if (match.userAId !== userId && match.userBId !== userId) {
      throw new ForbiddenException('Bu eşleşmenin katılımcısı değilsiniz');
    }

    const partnerId = match.userAId === userId ? match.userBId : match.userAId;

    // Check if there's already an active relationship for either user
    const existingRelationship = await this.prisma.relationship.findFirst({
      where: {
        OR: [
          { userAId: userId, status: { in: ['PROPOSED', 'ACTIVE'] } },
          { userBId: userId, status: { in: ['PROPOSED', 'ACTIVE'] } },
          { userAId: partnerId, status: { in: ['PROPOSED', 'ACTIVE'] } },
          { userBId: partnerId, status: { in: ['PROPOSED', 'ACTIVE'] } },
        ],
      },
    });

    if (existingRelationship) {
      if (existingRelationship.status === 'PROPOSED') {
        // Check if the existing proposal was initiated by the partner (not by us).
        // We determine who proposed by comparing with the ordered pair:
        // The proposer is the one who first called activate(), creating the row.
        // Since orderIds always puts smaller ID first, we check who the "other" user is
        // relative to the current user — if the proposal involves BOTH users and
        // the current user didn't already create it, the partner must have proposed.
        const proposalInvolvesPartner =
          (existingRelationship.userAId === partnerId || existingRelationship.userBId === partnerId);
        const proposalInvolvesCurrentUser =
          (existingRelationship.userAId === userId || existingRelationship.userBId === userId);
        const isMutualProposal = proposalInvolvesPartner && proposalInvolvesCurrentUser;

        if (isMutualProposal) {
          // Both confirmed — activate relationship
          const relationship = await this.prisma.relationship.update({
            where: { id: existingRelationship.id },
            data: {
              status: 'ACTIVE',
              activatedAt: new Date(),
            },
          });

          // Notify partner
          await this.prisma.notification.create({
            data: {
              userId: partnerId,
              type: 'SYSTEM',
              title: 'İlişki Modu Aktif!',
              body: 'Tebrikler! İlişki modunuz aktif edildi. Artık Çiftler Kulübü özelliklerine erişebilirsiniz.',
              data: { relationshipId: relationship.id },
            },
          });

          // Award couple_goal badge to both users (non-blocking)
          this.badgesService.checkAndAwardBadges(userId, 'relationship').catch((err) => this.logger.warn('Badge check failed', err.message));
          this.badgesService.checkAndAwardBadges(partnerId, 'relationship').catch((err) => this.logger.warn('Badge check failed', err.message));

          return {
            relationshipId: relationship.id,
            status: 'ACTIVE',
            message: 'İlişki modu aktif edildi!',
          };
        }
      }
      throw new BadRequestException('Zaten aktif bir ilişkiniz veya bekleyen bir teklifiniz var');
    }

    // Create new relationship proposal
    const { first, second } = this.orderIds(userId, partnerId);
    const relationship = await this.prisma.relationship.create({
      data: {
        userAId: first,
        userBId: second,
        status: 'PROPOSED',
      },
    });

    // Notify partner
    await this.prisma.notification.create({
      data: {
        userId: partnerId,
        type: 'SYSTEM',
        title: 'İlişki Modu Teklifi!',
        body: 'Eşleşmeniz size İlişki Modu teklif ediyor. Kabul ederseniz birlikte Çiftler Kulübüne katılabilirsiniz.',
        data: { relationshipId: relationship.id, matchId: dto.matchId },
      },
    });

    return {
      relationshipId: relationship.id,
      status: 'PROPOSED',
      message: 'İlişki modu teklifi gönderildi. Partnerinizin onayı bekleniyor.',
    };
  }

  /**
   * Initiate a 48-hour exit confirmation for an active relationship.
   * Sets status to ENDING and gives the partner 48 hours to confirm or wait.
   */
  async deactivate(userId: string) {
    const relationship = await this.findActiveRelationship(userId);

    if (!relationship) {
      throw new NotFoundException('Aktif bir ilişkiniz bulunmuyor');
    }

    const partnerId = relationship.userAId === userId
      ? relationship.userBId
      : relationship.userAId;

    const now = new Date();
    const deadline = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    await this.prisma.relationship.update({
      where: { id: relationship.id },
      data: {
        status: 'ENDING',
        deactivationInitiatedAt: now,
        deactivationInitiatedBy: userId,
        deactivationDeadline: deadline,
      },
    });

    // Notify partner about the deactivation request
    await this.prisma.notification.create({
      data: {
        userId: partnerId,
        type: 'SYSTEM',
        title: 'İlişki Sonlandırma Talebi',
        body: 'Partneriniz ilişkiyi sonlandırmak istiyor. 48 saat içinde onaylayabilir veya bekleyebilirsiniz.',
        data: { relationshipId: relationship.id },
      },
    });

    return {
      deactivated: false,
      status: 'ENDING',
      deactivationDeadline: deadline,
      message: 'İlişki sonlandırma talebi gönderildi. 48 saat bekleme süresi başladı.',
    };
  }

  /**
   * Confirm the deactivation of a relationship (partner only, not the initiator).
   * Immediately ends the relationship.
   */
  async confirmDeactivation(userId: string) {
    const relationship = await this.prisma.relationship.findFirst({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        status: 'ENDING',
        NOT: { deactivationInitiatedBy: userId },
      },
    });

    if (!relationship) {
      throw new NotFoundException(
        'Onaylanacak bir ilişki sonlandırma talebi bulunamadı',
      );
    }

    const initiatorId = relationship.deactivationInitiatedBy;

    await this.prisma.relationship.update({
      where: { id: relationship.id },
      data: {
        status: 'ENDED',
        endedAt: new Date(),
      },
    });

    // Notify the initiator that the partner confirmed
    if (initiatorId) {
      await this.prisma.notification.create({
        data: {
          userId: initiatorId,
          type: 'SYSTEM',
          title: 'İlişki Modu Sonlandırıldı',
          body: 'Partneriniz ilişki sonlandırma talebinizi onayladı. İlişki modu sonlandırıldı.',
          data: { relationshipId: relationship.id },
        },
      });
    }

    return {
      confirmed: true,
      message: 'İlişki modu sonlandırıldı',
    };
  }

  /**
   * Cancel a pending deactivation (initiator only).
   * Reverts the relationship back to ACTIVE status.
   */
  async cancelDeactivation(userId: string) {
    const relationship = await this.prisma.relationship.findFirst({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        status: 'ENDING',
        deactivationInitiatedBy: userId,
      },
    });

    if (!relationship) {
      throw new NotFoundException(
        'İptal edilecek bir ilişki sonlandırma talebi bulunamadı',
      );
    }

    const partnerId = relationship.userAId === userId
      ? relationship.userBId
      : relationship.userAId;

    await this.prisma.relationship.update({
      where: { id: relationship.id },
      data: {
        status: 'ACTIVE',
        deactivationInitiatedAt: null,
        deactivationInitiatedBy: null,
        deactivationDeadline: null,
      },
    });

    // Notify partner that deactivation was cancelled
    await this.prisma.notification.create({
      data: {
        userId: partnerId,
        type: 'SYSTEM',
        title: 'İlişki Sonlandırma İptal Edildi',
        body: 'Partneriniz ilişki sonlandırma talebini geri çekti. İlişki modu aktif olmaya devam ediyor.',
        data: { relationshipId: relationship.id },
      },
    });

    return {
      cancelled: true,
      message: 'İlişki sonlandırma talebi iptal edildi. İlişki modu aktif.',
    };
  }

  /**
   * Auto-end relationships where the 48-hour deactivation deadline has passed.
   * Called by the cron job in TasksService.
   */
  async autoEndExpiredRelationships(): Promise<number> {
    const now = new Date();

    const expiredRelationships = await this.prisma.relationship.findMany({
      where: {
        status: 'ENDING',
        deactivationDeadline: { lt: now },
      },
    });

    if (expiredRelationships.length === 0) {
      return 0;
    }

    // Update all expired ENDING relationships to ENDED
    await this.prisma.relationship.updateMany({
      where: {
        status: 'ENDING',
        deactivationDeadline: { lt: now },
      },
      data: {
        status: 'ENDED',
        endedAt: now,
      },
    });

    // Notify both users for each expired relationship
    const notifications = expiredRelationships.flatMap((rel) => [
      {
        userId: rel.userAId,
        type: 'SYSTEM' as const,
        title: 'İlişki Modu Sonlandırıldı',
        body: '48 saatlik bekleme süresi doldu. İlişki modu otomatik olarak sonlandırıldı.',
        data: { relationshipId: rel.id },
      },
      {
        userId: rel.userBId,
        type: 'SYSTEM' as const,
        title: 'İlişki Modu Sonlandırıldı',
        body: '48 saatlik bekleme süresi doldu. İlişki modu otomatik olarak sonlandırıldı.',
        data: { relationshipId: rel.id },
      },
    ]);

    await this.prisma.notification.createMany({ data: notifications });

    return expiredRelationships.length;
  }

  /**
   * Toggle relationship visibility for Couples Club.
   */
  async toggleVisibility(userId: string, dto: ToggleVisibilityDto) {
    const relationship = await this.findActiveRelationship(userId);

    if (!relationship) {
      throw new NotFoundException('Aktif bir ilişkiniz bulunmuyor');
    }

    await this.prisma.relationship.update({
      where: { id: relationship.id },
      data: { isVisible: dto.isVisible },
    });

    return {
      isVisible: dto.isVisible,
      message: dto.isVisible
        ? 'Çiftler Kulübünde görünür oldunuz'
        : 'Çiftler Kulübünde gizli oldunuz',
    };
  }

  /**
   * Get current relationship status.
   */
  async getStatus(userId: string) {
    const relationship = await this.prisma.relationship.findFirst({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        status: { in: ['PROPOSED', 'ACTIVE', 'HIDDEN', 'ENDING'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!relationship) {
      return {
        hasActiveRelationship: false,
        relationship: null,
      };
    }

    // Get partner info
    const partnerId = relationship.userAId === userId
      ? relationship.userBId
      : relationship.userAId;

    const partner = await this.prisma.user.findUnique({
      where: { id: partnerId },
      select: {
        id: true,
        isSelfieVerified: true,
        profile: {
          select: {
            firstName: true,
            birthDate: true,
            city: true,
          },
        },
        photos: {
          where: { isPrimary: true, isApproved: true },
          take: 1,
          select: { url: true, thumbnailUrl: true },
        },
      },
    });

    // Calculate relationship duration
    const durationDays = relationship.activatedAt
      ? Math.floor(
          (Date.now() - relationship.activatedAt.getTime()) / (1000 * 60 * 60 * 24),
        )
      : 0;

    // Get couple badge if any
    const coupleBadge = await this.prisma.coupleBadge.findUnique({
      where: { relationshipId: relationship.id },
    });

    return {
      hasActiveRelationship: relationship.status === 'ACTIVE',
      relationship: {
        id: relationship.id,
        status: relationship.status,
        isVisible: relationship.isVisible,
        activatedAt: relationship.activatedAt,
        durationDays,
        coupleBadge,
        partner: partner
          ? {
              userId: partner.id,
              firstName: partner.profile?.firstName,
              age: partner.profile
                ? this.calculateAge(partner.profile.birthDate)
                : null,
              city: partner.profile?.city,
              isVerified: partner.isSelfieVerified,
              photo: partner.photos[0] ?? null,
            }
          : null,
      },
    };
  }

  /**
   * Get relationship milestones (achieved and upcoming).
   * Time-based: 1 week, 1 month, 3 months, 6 months, 1 year
   * Count-based: 10 messages, 100 messages, first harmony session, 5 shared places
   */
  async getMilestones(userId: string) {
    const relationship = await this.findActiveRelationship(userId);

    if (!relationship) {
      return {
        achieved: [],
        upcoming: [],
        totalAchieved: 0,
        totalMilestones: 0,
      };
    }

    const partnerId = relationship.userAId === userId
      ? relationship.userBId
      : relationship.userAId;

    // Calculate days since activation
    const activatedAt = relationship.activatedAt ?? relationship.createdAt;
    const daysSinceActivation = Math.floor(
      (Date.now() - activatedAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Count messages between the two users (via shared matches)
    const matchBetween = await this.prisma.match.findFirst({
      where: {
        OR: [
          { userAId: userId, userBId: partnerId },
          { userAId: partnerId, userBId: userId },
        ],
      },
    });

    let messageCount = 0;
    if (matchBetween) {
      messageCount = await this.prisma.chatMessage.count({
        where: { matchId: matchBetween.id },
      });
    }

    // Count harmony sessions
    const harmonyCount = await this.prisma.harmonySession.count({
      where: {
        OR: [
          { userAId: userId, userBId: partnerId },
          { userAId: partnerId, userBId: userId },
        ],
        status: { not: 'PENDING' },
      },
    });

    // Count shared places
    const myPlaces = await this.prisma.placeCheckIn.findMany({
      where: { userId },
      select: { placeId: true },
    });
    const partnerPlaces = await this.prisma.placeCheckIn.findMany({
      where: { userId: partnerId },
      select: { placeId: true },
    });
    const myPlaceIds = new Set(myPlaces.map((p) => p.placeId));
    const sharedPlaceCount = new Set(
      partnerPlaces.filter((p) => myPlaceIds.has(p.placeId)).map((p) => p.placeId),
    ).size;

    // Define all milestones
    interface MilestoneDef {
      id: string;
      key: string;
      title: string;
      description: string;
      icon: string;
      currentValue: number;
      targetValue: number;
      achievedAt: Date | null;
    }

    const timeMilestones: MilestoneDef[] = [
      {
        id: 'tm_1w',
        key: 'first_week',
        title: 'Ilk Haftaniz!',
        description: 'Birlikte ilk haftanizi tamamladiniz.',
        icon: 'week',
        currentValue: daysSinceActivation,
        targetValue: 7,
        achievedAt: daysSinceActivation >= 7
          ? new Date(activatedAt.getTime() + 7 * 24 * 60 * 60 * 1000)
          : null,
      },
      {
        id: 'tm_1m',
        key: 'first_month',
        title: '1 Aylik!',
        description: 'Bir aydir birliktesiniz. Tebrikler!',
        icon: 'month',
        currentValue: daysSinceActivation,
        targetValue: 30,
        achievedAt: daysSinceActivation >= 30
          ? new Date(activatedAt.getTime() + 30 * 24 * 60 * 60 * 1000)
          : null,
      },
      {
        id: 'tm_3m',
        key: 'three_months',
        title: '3 Aylik!',
        description: 'Uc aydir guclu bir bag kuruyorsunuz.',
        icon: 'quarter',
        currentValue: daysSinceActivation,
        targetValue: 90,
        achievedAt: daysSinceActivation >= 90
          ? new Date(activatedAt.getTime() + 90 * 24 * 60 * 60 * 1000)
          : null,
      },
      {
        id: 'tm_6m',
        key: 'six_months',
        title: '6 Aylik!',
        description: 'Alti ay boyunca birbirinizi tanidiniz.',
        icon: 'half_year',
        currentValue: daysSinceActivation,
        targetValue: 180,
        achievedAt: daysSinceActivation >= 180
          ? new Date(activatedAt.getTime() + 180 * 24 * 60 * 60 * 1000)
          : null,
      },
      {
        id: 'tm_1y',
        key: 'one_year',
        title: '1 Yillik!',
        description: 'Bir yildir birliktesiniz. Muhtesem!',
        icon: 'year',
        currentValue: daysSinceActivation,
        targetValue: 365,
        achievedAt: daysSinceActivation >= 365
          ? new Date(activatedAt.getTime() + 365 * 24 * 60 * 60 * 1000)
          : null,
      },
    ];

    const countMilestones: MilestoneDef[] = [
      {
        id: 'cm_10msg',
        key: 'ten_messages',
        title: '10 Mesaj!',
        description: 'Birbirinize ilk 10 mesajinizi gonderdiniz.',
        icon: 'messages',
        currentValue: messageCount,
        targetValue: 10,
        achievedAt: messageCount >= 10 ? new Date() : null,
      },
      {
        id: 'cm_100msg',
        key: 'hundred_messages',
        title: '100 Mesaj!',
        description: 'Ilk 100 mesaj! Iletisim cok guclu.',
        icon: 'messages_100',
        currentValue: messageCount,
        targetValue: 100,
        achievedAt: messageCount >= 100 ? new Date() : null,
      },
      {
        id: 'cm_harmony',
        key: 'first_harmony',
        title: 'Ilk Harmony Oturumu!',
        description: 'Ilk Harmony oturumunuzu gerceklestirdiniz.',
        icon: 'harmony',
        currentValue: harmonyCount,
        targetValue: 1,
        achievedAt: harmonyCount >= 1 ? new Date() : null,
      },
      {
        id: 'cm_5places',
        key: 'five_shared_places',
        title: '5 Ortak Mekan!',
        description: 'Birlikte 5 farkli mekan kesfettiniz.',
        icon: 'places',
        currentValue: sharedPlaceCount,
        targetValue: 5,
        achievedAt: sharedPlaceCount >= 5 ? new Date() : null,
      },
    ];

    const allMilestones = [...timeMilestones, ...countMilestones];

    const achieved = allMilestones
      .filter((m) => m.achievedAt !== null)
      .map((m) => ({
        id: m.id,
        key: m.key,
        title: m.title,
        description: m.description,
        icon: m.icon,
        isAchieved: true,
        achievedAt: m.achievedAt!.toISOString(),
        progress: 1,
        currentValue: m.currentValue,
        targetValue: m.targetValue,
      }));

    const upcoming = allMilestones
      .filter((m) => m.achievedAt === null)
      .map((m) => ({
        id: m.id,
        key: m.key,
        title: m.title,
        description: m.description,
        icon: m.icon,
        isAchieved: false,
        achievedAt: null,
        progress: Math.min(1, m.currentValue / m.targetValue),
        currentValue: m.currentValue,
        targetValue: m.targetValue,
      }));

    return {
      achieved,
      upcoming,
      totalAchieved: achieved.length,
      totalMilestones: allMilestones.length,
    };
  }

  /**
   * Find compatible couples for 2v2 interactions in Couples Club.
   * Calculates couple compatibility based on average pairwise scores and shared interests.
   */
  async findCoupleMatches(userId: string) {
    // Find the user's active relationship
    const myRelationship = await this.findActiveRelationship(userId);

    if (!myRelationship) {
      throw new NotFoundException(
        'Çift eşleşmelerini görmek için aktif bir ilişkiniz olmalıdır',
      );
    }

    const partnerId = myRelationship.userAId === userId
      ? myRelationship.userBId
      : myRelationship.userAId;

    // Find other active, visible relationships (exclude user's own)
    const otherRelationships = await this.prisma.relationship.findMany({
      where: {
        status: 'ACTIVE',
        isVisible: true,
        id: { not: myRelationship.id },
      },
      include: {
        userA: {
          select: {
            id: true,
            profile: {
              select: {
                firstName: true,
                intentionTag: true,
              },
            },
          },
        },
        userB: {
          select: {
            id: true,
            profile: {
              select: {
                firstName: true,
                intentionTag: true,
              },
            },
          },
        },
      },
    });

    if (otherRelationships.length === 0) {
      return { coupleMatches: [], total: 0 };
    }

    // Gather all candidate user IDs for batch compatibility lookup
    const allCandidateUserIds = otherRelationships.flatMap((r) => [r.userAId, r.userBId]);
    const myUserIds = [userId, partnerId];

    // Build all possible pairs between our couple and each candidate couple
    const pairsToLookup: Array<{ first: string; second: string }> = [];
    for (const candidateId of allCandidateUserIds) {
      for (const myId of myUserIds) {
        pairsToLookup.push(this.orderIds(myId, candidateId));
      }
    }

    // Batch fetch compatibility scores
    const scores = pairsToLookup.length > 0
      ? await this.prisma.compatibilityScore.findMany({
          where: {
            OR: pairsToLookup.map((p) => ({
              userAId: p.first,
              userBId: p.second,
            })),
          },
          select: { userAId: true, userBId: true, finalScore: true },
        })
      : [];

    // Build O(1) score lookup map
    const scoreMap = new Map<string, number>();
    for (const s of scores) {
      scoreMap.set(`${s.userAId}_${s.userBId}`, s.finalScore);
    }

    // Get my couple's intention tags for interest matching
    const myProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { intentionTag: true },
    });
    const partnerProfile = await this.prisma.userProfile.findUnique({
      where: { userId: partnerId },
      select: { intentionTag: true },
    });
    const myIntentions = new Set<string>(
      ([myProfile?.intentionTag, partnerProfile?.intentionTag].filter(Boolean)) as string[],
    );

    // Calculate couple compatibility for each candidate
    const coupleMatches: CoupleMatch[] = otherRelationships.map((rel) => {
      const candAId = rel.userAId;
      const candBId = rel.userBId;

      // Get all 4 pairwise compatibility scores
      const pairScores: number[] = [];
      for (const myId of myUserIds) {
        for (const candId of [candAId, candBId]) {
          const { first, second } = this.orderIds(myId, candId);
          const score = scoreMap.get(`${first}_${second}`);
          if (score !== undefined) {
            pairScores.push(score);
          }
        }
      }

      // Average compatibility across all available pairs
      const avgScore = pairScores.length > 0
        ? Math.round((pairScores.reduce((a, b) => a + b, 0) / pairScores.length) * 10) / 10
        : 0;

      // Check shared intention tags
      const candIntentions = [
        rel.userA.profile?.intentionTag,
        rel.userB.profile?.intentionTag,
      ].filter(Boolean) as string[];
      const sharedInterests = candIntentions.filter((tag) => myIntentions.has(tag));

      const partnerNames = [
        rel.userA.profile?.firstName ?? 'Bilinmeyen',
        rel.userB.profile?.firstName ?? 'Bilinmeyen',
      ];

      return {
        coupleId: rel.id,
        partnerNames,
        sharedInterests,
        compatibilityScore: avgScore,
      };
    });

    // Sort by compatibility score descending and take top 5
    coupleMatches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
    const top5 = coupleMatches.slice(0, 5);

    return {
      coupleMatches: top5,
      total: top5.length,
    };
  }

  /**
   * Get upcoming Couples Club events.
   * Only accessible to users in active relationships.
   */
  async getEvents(userId: string) {
    const relationship = await this.findActiveRelationship(userId);

    if (!relationship) {
      throw new NotFoundException('Aktif bir ilişkiniz bulunmuyor');
    }

    const events = await this.prisma.couplesClubEvent.findMany({
      where: {
        isActive: true,
        eventDate: { gte: new Date() },
      },
      include: {
        _count: {
          select: { participants: true },
        },
      },
      orderBy: { eventDate: 'asc' },
    });

    return {
      events: events.map((e) => ({
        id: e.id,
        title: e.titleTr,
        description: e.descriptionTr,
        eventDate: e.eventDate,
        location: e.location,
        maxCouples: e.maxCouples,
        currentCouples: e._count.participants,
        isFull: e._count.participants >= e.maxCouples,
        imageUrl: e.imageUrl,
      })),
    };
  }

  /**
   * RSVP to a Couples Club event.
   */
  async rsvpEvent(userId: string, eventId: string, status: 'attending' | 'maybe' | 'declined') {
    const relationship = await this.findActiveRelationship(userId);

    if (!relationship) {
      throw new NotFoundException('Aktif bir ilişkiniz bulunmuyor');
    }

    const event = await this.prisma.couplesClubEvent.findUnique({
      where: { id: eventId, isActive: true },
      include: { _count: { select: { participants: true } } },
    });

    if (!event) {
      throw new NotFoundException('Etkinlik bulunamadı');
    }

    if (status === 'attending' && event._count.participants >= event.maxCouples) {
      throw new BadRequestException('Bu etkinlik dolu.');
    }

    const rsvp = await this.prisma.couplesClubParticipant.upsert({
      where: {
        eventId_relationshipId: { eventId, relationshipId: relationship.id },
      },
      create: {
        eventId,
        relationshipId: relationship.id,
        rsvpStatus: status.toUpperCase(),
      },
      update: {
        rsvpStatus: status.toUpperCase(),
      },
    });

    return {
      eventId,
      rsvpStatus: rsvp.rsvpStatus,
      message: status === 'attending'
        ? 'Etkinliğe katılımınız onaylandı!'
        : status === 'maybe'
          ? 'Katılım durumunuz "belki" olarak kaydedildi.'
          : 'Etkinlikten çıkış yapıldı.',
    };
  }

  /**
   * Create a new Couples Club event.
   * Only accessible to users in active relationships.
   */
  async createEvent(userId: string, dto: CreateEventDto) {
    const relationship = await this.findActiveRelationship(userId);

    if (!relationship) {
      throw new NotFoundException('Aktif bir ilişkiniz bulunmuyor');
    }

    const eventDate = new Date(dto.date);
    if (eventDate <= new Date()) {
      throw new BadRequestException('Etkinlik tarihi gelecekte olmalıdır');
    }

    const event = await this.prisma.couplesClubEvent.create({
      data: {
        title: dto.title,
        titleTr: dto.title,
        description: dto.description,
        descriptionTr: dto.description,
        eventDate,
        location: dto.location,
        maxCouples: dto.capacity,
        imageUrl: dto.imageUrl ?? null,
        isActive: true,
      },
    });

    // Get the creator's name for the response
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { firstName: true },
    });

    return {
      id: event.id,
      title: event.titleTr,
      description: event.descriptionTr,
      date: event.eventDate.toISOString(),
      location: event.location ?? '',
      capacity: event.maxCouples,
      attendeeCount: 0,
      isRsvped: false,
      createdByName: profile?.firstName ?? 'Bilinmeyen',
      imageUrl: event.imageUrl,
      isPro: false,
    };
  }

  /**
   * Get the Couples Club leaderboard.
   * Ranks active, visible couples by a composite score:
   * relationship duration + badge count + milestone engagement.
   * Only accessible to users in active relationships.
   */
  async getLeaderboard(userId: string) {
    const relationship = await this.findActiveRelationship(userId);

    if (!relationship) {
      throw new NotFoundException('Aktif bir ilişkiniz bulunmuyor');
    }

    // Find all active, visible relationships
    const activeRelationships = await this.prisma.relationship.findMany({
      where: {
        status: 'ACTIVE',
        isVisible: true,
      },
      include: {
        userA: {
          select: {
            profile: {
              select: { firstName: true },
            },
          },
        },
        userB: {
          select: {
            profile: {
              select: { firstName: true },
            },
          },
        },
        coupleBadge: true,
      },
      orderBy: { activatedAt: 'asc' },
    });

    // Calculate scores for each couple
    const now = Date.now();
    const entries = activeRelationships.map((rel) => {
      const activatedAt = rel.activatedAt ?? rel.createdAt;
      const durationDays = Math.floor(
        (now - activatedAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      const badgeCount = rel.coupleBadge ? 1 : 0;

      // Score formula: duration weight + badge bonus
      const score = durationDays * 10 + badgeCount * 50;

      return {
        coupleId: rel.id,
        partnerAName: rel.userA.profile?.firstName ?? 'Bilinmeyen',
        partnerBName: rel.userB.profile?.firstName ?? 'Bilinmeyen',
        score,
        badgeCount,
        durationDays,
      };
    });

    // Sort by score descending
    entries.sort((a, b) => b.score - a.score);

    // Assign ranks
    const ranked = entries.map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));

    // Find the current user's rank
    const myEntry = ranked.find((e) => e.coupleId === relationship.id);

    return {
      entries: ranked.slice(0, 50), // Return top 50
      myRank: myEntry?.rank ?? null,
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private async findActiveRelationship(userId: string) {
    return this.prisma.relationship.findFirst({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        status: 'ACTIVE',
      },
    });
  }

  private orderIds(a: string, b: string) {
    return a < b ? { first: a, second: b } : { first: b, second: a };
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  }
}
