import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BadgesService } from '../badges/badges.service';
import { ActivateRelationshipDto, ToggleVisibilityDto } from './dto';

@Injectable()
export class RelationshipsService {
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
          this.badgesService.checkAndAwardBadges(userId, 'relationship').catch(() => {});
          this.badgesService.checkAndAwardBadges(partnerId, 'relationship').catch(() => {});

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
   * End an active relationship.
   * Both users return to discovery pool.
   */
  async deactivate(userId: string) {
    const relationship = await this.findActiveRelationship(userId);

    if (!relationship) {
      throw new NotFoundException('Aktif bir ilişkiniz bulunmuyor');
    }

    const partnerId = relationship.userAId === userId
      ? relationship.userBId
      : relationship.userAId;

    await this.prisma.relationship.update({
      where: { id: relationship.id },
      data: {
        status: 'ENDED',
        endedAt: new Date(),
      },
    });

    // Notify partner
    await this.prisma.notification.create({
      data: {
        userId: partnerId,
        type: 'SYSTEM',
        title: 'İlişki Modu Sonlandırıldı',
        body: 'İlişki modunuz sonlandırıldı. Keşif özelliklerine tekrar erişebilirsiniz.',
        data: { relationshipId: relationship.id },
      },
    });

    return {
      deactivated: true,
      message: 'İlişki modu sonlandırıldı',
    };
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
        status: { in: ['PROPOSED', 'ACTIVE', 'HIDDEN'] },
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
