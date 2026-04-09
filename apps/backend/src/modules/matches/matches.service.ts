import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { calculateAge } from "../../common/utils/date.utils";

@Injectable()
export class MatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

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
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to client-friendly format
    const formatted = matches.map((match) => {
      // Determine partner (the other user)
      const isUserA = match.userAId === userId;
      const partner = isUserA ? match.userB : match.userA;
      const partnerAge = partner.profile
        ? calculateAge(partner.profile.birthDate)
        : null;

      return {
        matchId: match.id,
        createdAt: match.createdAt,
        compatibilityScore: match.compatibilityScore,
        compatibilityLevel: match.compatibilityLevel,
        animationType: match.animationType,
        partner: {
          userId: partner.id,
          firstName: partner.profile?.firstName ?? "Kullanıcı",
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
              orderBy: { order: "asc" },
              select: { id: true, url: true, thumbnailUrl: true, order: true },
            },
            badges: {
              include: {
                badge: { select: { key: true, nameTr: true, iconUrl: true } },
              },
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
              orderBy: { order: "asc" },
              select: { id: true, url: true, thumbnailUrl: true, order: true },
            },
            badges: {
              include: {
                badge: { select: { key: true, nameTr: true, iconUrl: true } },
              },
              take: 5,
            },
          },
        },
      },
    });

    if (!match) {
      throw new NotFoundException("Eşleşme bulunamadı");
    }

    // Verify user is a participant
    if (match.userAId !== userId && match.userBId !== userId) {
      throw new ForbiddenException("Bu eşleşmeye erişim yetkiniz yok");
    }

    // Determine partner
    const isUserA = match.userAId === userId;
    const partner = isUserA ? match.userB : match.userA;
    const partnerAge = partner.profile
      ? calculateAge(partner.profile.birthDate)
      : null;

    // Get compatibility breakdown
    const { first, second } = this.orderIds(match.userAId, match.userBId);
    const compatScore = await this.prisma.compatibilityScore.findUnique({
      where: { userAId_userBId: { userAId: first, userBId: second } },
      select: {
        finalScore: true,
        level: true,
        dimensionScores: true,
      },
    });

    // Generate intelligent compatibility explanation and conversation starters
    const breakdown = (compatScore?.dimensionScores ?? {}) as Record<
      string,
      number
    >;
    const explanation = this.generateCompatibilityExplanation(
      breakdown,
      match.compatibilityScore,
    );
    const conversationStarters =
      await this.generateConversationStarters(matchId);

    return {
      matchId: match.id,
      createdAt: match.createdAt,
      isActive: match.isActive,
      compatibility: {
        score: match.compatibilityScore,
        level: match.compatibilityLevel,
        animationType: match.animationType,
        breakdown,
        explanation,
      },
      conversationStarters,
      partner: {
        userId: partner.id,
        firstName: partner.profile?.firstName ?? "Kullanıcı",
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
    };
  }

  /**
   * Unmatch — deactivate a match.
   * Records who initiated the unmatch and notifies the other user.
   */
  async unmatch(userId: string, matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        userA: {
          select: { id: true, profile: { select: { firstName: true } } },
        },
        userB: {
          select: { id: true, profile: { select: { firstName: true } } },
        },
      },
    });

    if (!match) {
      throw new NotFoundException("Eşleşme bulunamadı");
    }

    if (match.userAId !== userId && match.userBId !== userId) {
      throw new ForbiddenException("Bu eşleşmeye erişim yetkiniz yok");
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

      // Soft-delete chat messages — mark all as READ to prevent further delivery
      await tx.chatMessage.updateMany({
        where: { matchId, status: { in: ["SENT", "DELIVERED"] } },
        data: { status: "READ" },
      });
    });

    // Notify the partner that the match was removed (through NotificationsService
    // which handles push delivery, preferences, quiet hours, and rate limiting)
    await this.notificationsService.sendPushNotification(
      partnerId,
      "Eşleşme Kaldırıldı",
      "Bir eşleşmeniz kaldırıldı.",
      { matchId },
      "MATCH_REMOVED",
    );

    return { unmatched: true };
  }

  /**
   * Generate 2-3 smart conversation starters based on shared compatibility dimensions.
   * Analyzes top-scoring categories to create personalized opening lines.
   */
  async generateConversationStarters(matchId: string): Promise<string[]> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) return [];

    const { first, second } = this.orderIds(match.userAId, match.userBId);
    const compatScore = await this.prisma.compatibilityScore.findUnique({
      where: { userAId_userBId: { userAId: first, userBId: second } },
      select: { dimensionScores: true, finalScore: true },
    });

    if (!compatScore?.dimensionScores) return [];

    const dimensions = compatScore.dimensionScores as Record<string, number>;
    const starters: string[] = [];

    // Sort dimensions by score (highest first) and pick top 2-3
    const sorted = Object.entries(dimensions)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    for (const [category, score] of sorted) {
      const starter = this.getStarterForCategory(category, score);
      if (starter) starters.push(starter);
      if (starters.length >= 3) break;
    }

    // Fallback if no dimension-specific starters
    if (starters.length === 0) {
      starters.push(
        "Merhaba! Profilini çok beğendim, biraz kendinden bahseder misin?",
        "Selam! Uyumluluk puanımız güzel görünüyor, tanışmak isterim!",
      );
    }

    return starters;
  }

  /**
   * Generate intelligent compatibility explanation in natural language (Turkish).
   * Summarizes top dimensions and explains WHY two users are compatible.
   */
  generateCompatibilityExplanation(
    dimensionScores: Record<string, number>,
    finalScore: number,
  ): string {
    const sorted = Object.entries(dimensionScores).sort(
      ([, a], [, b]) => b - a,
    );

    const topDimensions = sorted.slice(0, 2);
    const dimNames: Record<string, string> = {
      communication: "iletişim tarzınız",
      life_goals: "yaşam hedefleriniz",
      values: "değerleriniz",
      lifestyle: "yaşam tarzınız",
      emotional_intelligence: "duygusal zekanız",
      relationship_expectations: "ilişki beklentileriniz",
      social_compatibility: "sosyal uyumunuz",
      attachment_style: "bağlanma tarzınız",
      love_language: "sevgi diliniz",
      conflict_style: "çatışma yaklaşımınız",
      future_vision: "gelecek vizyonunuz",
      intellectual: "entelektüel uyumunuz",
      intimacy: "yakınlık anlayışınız",
      growth_mindset: "gelişim bakış açınız",
      core_fears: "derin anlayışınız",
    };

    if (topDimensions.length < 2) {
      return finalScore >= 90
        ? "Muhteşem bir uyumunuz var! Birbirinizi gerçekten anlayabilirsiniz."
        : "İlginç bir uyumluluk profiliniz var. Birbirinizi keşfedin!";
    }

    const dim1 = dimNames[topDimensions[0][0]] ?? "temel değerleriniz";
    const dim2 = dimNames[topDimensions[1][0]] ?? "yaşam tarzınız";

    if (finalScore >= 90) {
      return `${dim1.charAt(0).toUpperCase() + dim1.slice(1)} ve ${dim2} harika uyum gösteriyor. Birbirinizi anlamak sizin için çok doğal olacak.`;
    }
    if (finalScore >= 75) {
      return `${dim1.charAt(0).toUpperCase() + dim1.slice(1)} ve ${dim2} güçlü bir temel oluşturuyor. Birlikte güzel bir yolculuk başlayabilir.`;
    }
    return `${dim1.charAt(0).toUpperCase() + dim1.slice(1)} konusunda ortak noktalarınız var. Farklılıklarınız ilişkinizi zenginleştirebilir.`;
  }

  // ─── Private Helpers ───────────────────────────────────────────

  /**
   * Get a personalized conversation starter based on a compatibility category.
   */
  private getStarterForCategory(
    category: string,
    score: number,
  ): string | null {
    const highScoreStarters: Record<string, string[]> = {
      communication: [
        "İletişim konusunda çok benzer düşünüyorsunuz! Sence ideal bir sohbet nasıl olmalı?",
        "İletişim tarzlarınız çok uyumlu! İlk izlenim senin için ne kadar önemli?",
      ],
      life_goals: [
        "Yaşam hedefleriniz çok uyumlu! 5 yıl sonra kendini nerede görüyorsun?",
        "Hayata bakış açınız birbirine yakın! En büyük hayalin ne?",
      ],
      values: [
        "Değerleriniz çok uyumlu! Hayatta en önemli 3 şey senin için ne?",
        "Temel değerleriniz örtüşüyor! Sence bir ilişkide en önemli şey ne?",
      ],
      lifestyle: [
        "Yaşam tarzlarınız çok uyumlu! Hafta sonları genelde nasıl geçirirsin?",
        "Yaşam tarzınız birbirine yakın! İdeal bir gün sence nasıl olurdu?",
      ],
      emotional_intelligence: [
        "Duygusal zekanız çok uyumlu! Zor anlarda kendini nasıl motive edersin?",
        "Duygusal olarak çok uyumlusunuz! Mutluluk sence nereden gelir?",
      ],
      relationship_expectations: [
        "İlişki beklentileriniz çok uyumlu! Sence ideal bir ilişki nasıl olmalı?",
        "İlişkiye bakış açınız benzer! Bir ilişkide en çok neye değer verirsin?",
      ],
      social_compatibility: [
        "Sosyal uyumunuz harika! Arkadaşlarınla vakit geçirmeyi mi yoksa baş başa kalmayı mı tercih edersin?",
        "Sosyal tarzlarınız birbirini tamamlıyor! İdeal bir buluşma sence nasıl olurdu?",
      ],
    };

    const starters = highScoreStarters[category];
    if (!starters || score < 60) return null;

    return starters[Math.floor(Math.random() * starters.length)];
  }

  // ─── Viewers (Kim Gördü) ─────────────────────────────────────────

  /**
   * Get profile viewers for the current user.
   * Returns blurred/revealed viewers based on the user's package tier.
   */
  async getViewers(
    userId: string,
    tier: string,
  ): Promise<{
    viewers: any[];
    dailyRevealsUsed: number;
    dailyRevealsLimit: number;
  }> {
    const viewerConfig: Record<
      string,
      { dailyReveals: number; delayHours: number }
    > = {
      FREE: { dailyReveals: 1, delayHours: 24 },
      PREMIUM: { dailyReveals: 5, delayHours: 6 },
      SUPREME: { dailyReveals: 999999, delayHours: 0 },
    };

    const config = viewerConfig[tier] ?? viewerConfig.FREE;

    // TODO: Fetch actual viewers from DB using Prisma
    // const viewers = await this.prisma.profileView.findMany({
    //   where: { viewedUserId: userId },
    //   orderBy: { lastViewedAt: 'desc' },
    //   include: { viewer: { select: { id: true, profile: true, photos: true } } },
    // });

    // TODO: Check daily reveal usage from DB
    const dailyRevealsUsed = 0;

    // Mock data — will be replaced with real DB queries
    const mockViewers = [
      {
        id: "v1",
        viewerId: "user_mock_1",
        name: "Gizli",
        age: null,
        photoUrl: "",
        viewCount: 3,
        lastViewedAt: new Date().toISOString(),
        distanceKm: 5,
        isRevealed: dailyRevealsUsed < config.dailyReveals,
      },
      {
        id: "v2",
        viewerId: "user_mock_2",
        name: "Gizli",
        age: null,
        photoUrl: "",
        viewCount: 1,
        lastViewedAt: new Date().toISOString(),
        distanceKm: 12,
        isRevealed: false,
      },
    ];

    return {
      viewers: mockViewers,
      dailyRevealsUsed,
      dailyRevealsLimit: config.dailyReveals,
    };
  }

  // ─── Activity Strip (Canlı Aktivite Şeridi) ────────────────────

  /**
   * Get activity strip profiles — recently active, nearby, or super compatible users.
   */
  async getActivityStrip(userId: string, tier: string): Promise<any[]> {
    // TODO: Fetch real activity ring profiles from DB
    // const recentActive = await this.prisma.user.findMany({
    //   where: { lastActiveAt: { gte: new Date(Date.now() - 30 * 60 * 1000) } },
    //   select: { id: true, profile: true, photos: true },
    //   take: 10,
    // });

    const tierRingLimit: Record<string, number> = {
      FREE: 3,
      PREMIUM: 6,
      SUPREME: 10,
    };

    const limit = tierRingLimit[tier] ?? 3;

    // Mock data — will be replaced with real DB queries
    const mockProfiles = [
      {
        userId: "u_act_1",
        name: "Deniz",
        photoUrl: "",
        ringType: "super_compatible" as const,
        compatibilityPercent: 91,
        distanceKm: 3,
        isRevealed: true,
      },
      {
        userId: "u_act_2",
        name: "Ece",
        photoUrl: "",
        ringType: "nearby" as const,
        compatibilityPercent: null,
        distanceKm: 1,
        isRevealed: true,
      },
      {
        userId: "u_act_3",
        name: "Gizli",
        photoUrl: "",
        ringType: "locked" as const,
        compatibilityPercent: null,
        distanceKm: null,
        isRevealed: false,
      },
    ];

    return mockProfiles.slice(0, limit);
  }

  // ─── Warm Banner (Samimi Bildirim Afişi) ────────────────────────

  /**
   * Get a warm notification banner for the matches screen.
   * Returns a contextual, encouraging message based on user activity.
   */
  async getWarmBanner(userId: string): Promise<{
    message: string;
    detail: string | null;
    emoji: string;
    type: "super_compatible" | "nearby" | "weekly_summary" | "new_like";
  }> {
    // TODO: Fetch real user activity data from DB to generate contextual banners
    // const recentLikes = await this.prisma.swipe.count({
    //   where: { targetId: userId, action: 'LIKE', createdAt: { gte: last24h } },
    // });
    // const nearbyCount = await this.prisma.user.count({
    //   where: { ... nearby logic ... },
    // });

    // Mock — return a sample warm message
    return {
      message: "Bu hafta 3 kişiyle süper uyumlusun!",
      detail: "Hemen keşfet ve tanışmaya başla.",
      emoji: "💫",
      type: "super_compatible",
    };
  }

  // ─── Weekly Top Matches (Haftalık Top 3) ────────────────────────

  /**
   * Get the top 3 most compatible recent likes for the current user this week.
   * Revealed count depends on the user's package tier.
   */
  async getWeeklyTop(
    userId: string,
    tier: string,
  ): Promise<{
    matches: any[];
    generatedAt: string;
    nextRefreshAt: string;
  }> {
    const visibleCount: Record<string, number> = {
      FREE: 1,
      PREMIUM: 2,
      SUPREME: 3,
    };
    const limit = visibleCount[tier] || 1;

    // TODO: Fetch top 3 most compatible recent likes from DB
    // const topLikes = await this.prisma.swipe.findMany({
    //   where: { targetId: userId, action: 'LIKE', createdAt: { gte: startOfWeek } },
    //   orderBy: { ... by compatibility score ... },
    //   take: 3,
    // });

    const mockMatches = [
      {
        userId: "u1",
        name: "Elif",
        age: 26,
        photoUrl: "",
        compatibilityPercent: 92,
        isRevealed: true,
        matchReason: "Süper uyumlu",
      },
      {
        userId: "u2",
        name: "Selin",
        age: 24,
        photoUrl: "",
        compatibilityPercent: 87,
        isRevealed: false,
        matchReason: "Yüksek uyum",
      },
      {
        userId: "u3",
        name: "Ayşe",
        age: 25,
        photoUrl: "",
        compatibilityPercent: 83,
        isRevealed: false,
        matchReason: "Yüksek uyum",
      },
    ].map((m, i) => ({ ...m, isRevealed: i < limit }));

    const nextMonday = new Date();
    nextMonday.setDate(
      nextMonday.getDate() + ((8 - nextMonday.getDay()) % 7 || 7),
    );
    nextMonday.setHours(0, 0, 0, 0);

    return {
      matches: mockMatches,
      generatedAt: new Date().toISOString(),
      nextRefreshAt: nextMonday.toISOString(),
    };
  }

  // ─── Daily Match (Günün Eşleşmesi) ─────────────────────────────

  /**
   * Get AI-powered daily match recommendation based on uyum score.
   * Package limits: FREE = 1/week, PREMIUM = 1/day, SUPREME = 3/day.
   */
  async getDailyMatch(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, packageTier: true },
    });

    if (!user) {
      throw new NotFoundException("Kullanıcı bulunamadı");
    }

    const tier = user.packageTier as string;
    const limits: Record<string, number> = {
      FREE: 1,
      PREMIUM: 1,
      SUPREME: 3,
    };
    const tierLimit = limits[tier] ?? 1;

    // Today at midnight (UTC)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // FREE users: 1 per week — check last 7 days
    if (tier === "FREE") {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const weekPicks = await this.prisma.dailyPick.count({
        where: { userId, date: { gte: weekAgo } },
      });
      if (weekPicks >= 1) {
        const lastPick = await this.prisma.dailyPick.findFirst({
          where: { userId },
          orderBy: { date: "desc" },
        });
        const nextAvailable = lastPick
          ? new Date(lastPick.date.getTime() + 7 * 24 * 60 * 60 * 1000)
          : new Date();
        return {
          match: null,
          remaining: 0,
          nextAvailableAt: nextAvailable.toISOString(),
          limit: 1,
          period: "weekly" as const,
        };
      }
    } else {
      // PREMIUM / SUPREME: check daily usage
      const todayPicks = await this.prisma.dailyPick.count({
        where: { userId, date: { gte: today } },
      });
      if (todayPicks >= tierLimit) {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return {
          match: null,
          remaining: 0,
          nextAvailableAt: tomorrow.toISOString(),
          limit: tierLimit,
          period: "daily" as const,
        };
      }
    }

    // Count how many picks used today (for remaining calculation)
    const todayPicks = await this.prisma.dailyPick.count({
      where: { userId, date: { gte: today } },
    });

    // Collect user IDs to exclude: recent picks (last 30 days) + blocked users
    const recentPickRecords = await this.prisma.dailyPick.findMany({
      where: {
        userId,
        date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { pickedUserId: true },
    });
    const excludeIds = recentPickRecords.map((p) => p.pickedUserId);

    // Add blocked users to exclude list
    const blocks = await this.prisma.block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    });
    for (const b of blocks) {
      excludeIds.push(b.blockerId === userId ? b.blockedId : b.blockerId);
    }

    // Also exclude the user themselves
    excludeIds.push(userId);

    // Find the top compatible user (minimum 75% for daily match)
    const bestMatch = await this.prisma.compatibilityScore.findFirst({
      where: {
        OR: [
          { userAId: userId, userBId: { notIn: excludeIds } },
          { userBId: userId, userAId: { notIn: excludeIds } },
        ],
        finalScore: { gte: 75 },
      },
      orderBy: { finalScore: "desc" },
    });

    if (!bestMatch) {
      return {
        match: null,
        remaining: tierLimit - todayPicks,
        nextAvailableAt: null,
        limit: tierLimit,
        period: tier === "FREE" ? ("weekly" as const) : ("daily" as const),
      };
    }

    const matchedUserId =
      bestMatch.userAId === userId ? bestMatch.userBId : bestMatch.userAId;

    // Create DailyPick record
    await this.prisma.dailyPick.create({
      data: {
        userId,
        pickedUserId: matchedUserId,
        date: new Date(),
      },
    });

    // Get matched user profile
    const matchedUser = await this.prisma.user.findUnique({
      where: { id: matchedUserId },
      include: {
        profile: {
          select: {
            firstName: true,
            birthDate: true,
            city: true,
          },
        },
        photos: {
          where: { isApproved: true },
          orderBy: { order: "asc" },
          take: 3,
        },
      },
    });

    const age = matchedUser?.profile?.birthDate
      ? calculateAge(matchedUser.profile.birthDate)
      : null;

    return {
      match: {
        userId: matchedUserId,
        firstName: matchedUser?.profile?.firstName ?? "Kullanıcı",
        age,
        city: matchedUser?.profile?.city ?? null,
        photoUrl: matchedUser?.photos[0]?.url ?? null,
        compatibilityScore: bestMatch.finalScore,
        isSuperCompatible: bestMatch.finalScore >= 90,
      },
      remaining: tierLimit - todayPicks - 1,
      nextAvailableAt: null,
      limit: tierLimit,
      period: tier === "FREE" ? ("weekly" as const) : ("daily" as const),
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private orderIds(a: string, b: string) {
    return a < b ? { first: a, second: b } : { first: b, second: a };
  }
}
