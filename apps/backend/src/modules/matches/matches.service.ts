import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

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
          where: { status: { in: ["ACTIVE", "EXTENDED"] } },
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { id: true, status: true },
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
        harmonySessions: {
          orderBy: { createdAt: "desc" },
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
        baseScore: compatScore?.baseScore,
        deepScore: compatScore?.deepScore,
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

      // End any active harmony sessions
      await tx.harmonySession.updateMany({
        where: {
          matchId,
          status: { in: ["PENDING", "ACTIVE", "EXTENDED"] },
        },
        data: {
          status: "CANCELLED",
          actualEndedAt: new Date(),
        },
      });

      // Notify the partner that the match was removed
      await tx.notification.create({
        data: {
          userId: partnerId,
          type: "MATCH_REMOVED",
          title: "Eşleşme Kaldırıldı",
          body: "Bir eşleşmeniz kaldırıldı.",
          data: { matchId },
        },
      });
    });

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
