import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

// Badge progress item returned by getBadgeProgress
export interface BadgeProgressItem {
  badgeKey: string;
  name: string;
  description: string;
  iconUrl: string | null;
  isEarned: boolean;
  earnedAt: Date | null;
  progress: number; // 0-100
  currentValue: number;
  targetValue: number;
  goldReward: number;
}

// Badge criteria stored in BadgeDefinition.criteria JSON
interface BadgeCriteria {
  type: string;
  count: number;
}

@Injectable()
export class BadgesService {
  private readonly logger = new Logger(BadgesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all available badges in the system.
   */
  async getAllBadges() {
    const badges = await this.prisma.badgeDefinition.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        key: true,
        nameEn: true,
        nameTr: true,
        descriptionEn: true,
        descriptionTr: true,
        iconUrl: true,
        criteria: true,
        goldReward: true,
      },
    });

    return {
      badges,
      total: badges.length,
    };
  }

  /**
   * Get all badges earned by the current user.
   * Includes progress toward unearned badges.
   */
  async getMyBadges(userId: string) {
    // Get earned badges
    const earnedBadges = await this.prisma.userBadge.findMany({
      where: { userId },
      include: {
        badge: {
          select: {
            id: true,
            key: true,
            nameEn: true,
            nameTr: true,
            descriptionEn: true,
            descriptionTr: true,
            iconUrl: true,
            goldReward: true,
          },
        },
      },
      orderBy: { earnedAt: "desc" },
    });

    // Get all badge definitions for total count
    const allBadges = await this.prisma.badgeDefinition.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    // Get progress for all badges (reuses single progress method)
    const progress = await this.getBadgeProgress(userId);

    // Filter to only unearned badges for the progress section
    const earnedIds = new Set(earnedBadges.map((eb) => eb.badgeId));
    const unearnedProgress = progress
      .filter((p) => !p.isEarned)
      .map((p) => ({
        badgeKey: p.badgeKey,
        name: p.name,
        progress: p.progress,
        requirement: p.description,
      }));

    return {
      earnedBadges: earnedBadges.map((eb) => ({
        ...eb.badge,
        earnedAt: eb.earnedAt,
      })),
      totalEarned: earnedBadges.length,
      totalAvailable: allBadges.length,
      progress: unearnedProgress,
    };
  }

  /**
   * Get comprehensive badge progress for all 8 badges.
   * Returns each badge with earned status, progress percentage,
   * current/target values, and Turkish descriptions.
   */
  async getBadgeProgress(userId: string): Promise<BadgeProgressItem[]> {
    // Get all badge definitions
    const allBadges = await this.prisma.badgeDefinition.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        key: true,
        nameTr: true,
        descriptionTr: true,
        iconUrl: true,
        criteria: true,
        goldReward: true,
      },
    });

    // Get earned badges for user
    const earnedBadges = await this.prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true, earnedAt: true },
    });

    const earnedMap = new Map(
      earnedBadges.map((eb) => [eb.badgeId, eb.earnedAt]),
    );

    // Build progress for each badge
    const progressItems: BadgeProgressItem[] = [];

    for (const badge of allBadges) {
      const isEarned = earnedMap.has(badge.id);
      const earnedAt = earnedMap.get(badge.id) ?? null;
      const criteria = badge.criteria as BadgeCriteria | null;

      if (isEarned) {
        // Earned badges show 100% progress
        const target = criteria?.count ?? 1;
        progressItems.push({
          badgeKey: badge.key,
          name: badge.nameTr,
          description: badge.descriptionTr,
          iconUrl: badge.iconUrl,
          isEarned: true,
          earnedAt,
          progress: 100,
          currentValue: target,
          targetValue: target,
          goldReward: badge.goldReward,
        });
        continue;
      }

      // Calculate progress for unearned badges
      const { currentValue, targetValue, description } =
        await this.calculateCriteriaProgress(
          userId,
          criteria,
          badge.descriptionTr,
        );

      const progress =
        targetValue > 0
          ? Math.min(100, Math.round((currentValue / targetValue) * 100))
          : 0;

      progressItems.push({
        badgeKey: badge.key,
        name: badge.nameTr,
        description,
        iconUrl: badge.iconUrl,
        isEarned: false,
        earnedAt: null,
        progress,
        currentValue: Math.min(currentValue, targetValue),
        targetValue,
        goldReward: badge.goldReward,
      });
    }

    return progressItems;
  }

  /**
   * Award a badge to a user (internal use by other services).
   * Returns Gold reward amount if badge was newly awarded.
   */
  async awardBadge(
    userId: string,
    badgeKey: string,
  ): Promise<{ awarded: boolean; goldReward: number }> {
    // Find badge definition
    const badge = await this.prisma.badgeDefinition.findUnique({
      where: { key: badgeKey },
    });

    if (!badge) {
      this.logger.warn(`Badge not found: ${badgeKey}`);
      return { awarded: false, goldReward: 0 };
    }

    // Check if already earned
    const existing = await this.prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
    });

    if (existing) {
      return { awarded: false, goldReward: 0 };
    }

    // Award badge and Gold reward in transaction
    await this.prisma.$transaction(async (tx) => {
      // Create badge record
      await tx.userBadge.create({
        data: { userId, badgeId: badge.id },
      });

      // Award Gold reward if any
      if (badge.goldReward > 0) {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { goldBalance: true },
        });
        const newBalance = (user?.goldBalance ?? 0) + badge.goldReward;

        await tx.user.update({
          where: { id: userId },
          data: { goldBalance: newBalance },
        });

        await tx.goldTransaction.create({
          data: {
            userId,
            type: "BADGE_REWARD",
            amount: badge.goldReward,
            balance: newBalance,
            description: `Rozet odulu: ${badge.nameTr}`,
          },
        });
      }

      // Send notification
      await tx.notification.create({
        data: {
          userId,
          type: "BADGE_EARNED",
          title: "Yeni Rozet Kazandiniz!",
          body: `"${badge.nameTr}" rozetini kazandiniz${badge.goldReward > 0 ? ` ve ${badge.goldReward} Gold odulu aldiniz` : ""}!`,
          data: {
            badgeId: badge.id,
            badgeKey: badge.key,
            goldReward: badge.goldReward,
          },
        },
      });
    });

    this.logger.log(`Badge "${badgeKey}" awarded to user ${userId}`);
    return { awarded: true, goldReward: badge.goldReward };
  }

  /**
   * Check all badge conditions for a user and award any newly earned badges.
   * Called by other services after relevant actions (match created, etc.).
   * Accepts an optional hint to only check specific badge types.
   */
  async checkAndAwardBadges(
    userId: string,
    hint?:
      | "match"
      | "harmony"
      | "answer"
      | "compatibility"
      | "verification"
      | "relationship"
      | "swipe"
      | "subscription",
  ): Promise<{ awarded: string[] }> {
    const awarded: string[] = [];

    // Map hints to badge keys that should be checked
    const badgeChecks: Record<string, string[]> = {
      match: ["first_spark", "soul_mate"],
      harmony: ["chat_master"],
      answer: ["question_explorer"],
      compatibility: ["soul_mate", "deep_match"],
      verification: ["verified_star"],
      relationship: ["couple_goal"],
      swipe: ["explorer"],
      subscription: [],
    };

    const keysToCheck = hint
      ? (badgeChecks[hint] ?? [])
      : Object.values(badgeChecks).flat();
    const uniqueKeys = [...new Set(keysToCheck)];

    for (const badgeKey of uniqueKeys) {
      const shouldAward = await this.evaluateBadgeCriteria(userId, badgeKey);
      if (shouldAward) {
        const result = await this.awardBadge(userId, badgeKey);
        if (result.awarded) {
          awarded.push(badgeKey);
        }
      }
    }

    return { awarded };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  /**
   * Evaluate whether a specific badge should be awarded to a user.
   */
  private async evaluateBadgeCriteria(
    userId: string,
    badgeKey: string,
  ): Promise<boolean> {
    switch (badgeKey) {
      case "first_spark": {
        // First match achieved
        const matchCount = await this.prisma.match.count({
          where: {
            OR: [{ userAId: userId }, { userBId: userId }],
            isActive: true,
          },
        });
        return matchCount >= 1;
      }

      case "chat_master": {
        // 5 completed Harmony sessions
        const sessionCount = await this.prisma.harmonySession.count({
          where: {
            OR: [{ userAId: userId }, { userBId: userId }],
            status: { in: ["ENDED", "EXTENDED"] },
          },
        });
        return sessionCount >= 5;
      }

      case "question_explorer": {
        // Answered all 20 core questions
        const answerCount = await this.prisma.userAnswer.count({
          where: { userId },
        });
        return answerCount >= 20;
      }

      case "soul_mate": {
        // Has at least one SUPER compatibility match
        const superMatch = await this.prisma.match.findFirst({
          where: {
            OR: [{ userAId: userId }, { userBId: userId }],
            isActive: true,
            compatibilityLevel: "SUPER",
          },
        });
        return superMatch !== null;
      }

      case "verified_star": {
        // Selfie verified
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { isSelfieVerified: true },
        });
        return user?.isSelfieVerified === true;
      }

      case "couple_goal": {
        // Has an active relationship
        const relationship = await this.prisma.relationship.findFirst({
          where: {
            OR: [{ userAId: userId }, { userBId: userId }],
            status: "ACTIVE",
          },
        });
        return relationship !== null;
      }

      case "explorer": {
        // 50 swipes (profile explorations)
        const swipeCount = await this.prisma.swipe.count({
          where: { swiperId: userId },
        });
        return swipeCount >= 50;
      }

      case "deep_match": {
        // Both users in a match have answered all 45 questions
        const userAnswerCount = await this.prisma.userAnswer.count({
          where: { userId },
        });
        if (userAnswerCount < 45) return false;

        // Check if any matched partner also answered all 45
        const matches = await this.prisma.match.findMany({
          where: {
            OR: [{ userAId: userId }, { userBId: userId }],
            isActive: true,
          },
          select: { userAId: true, userBId: true },
          take: 10,
        });

        for (const match of matches) {
          const partnerId =
            match.userAId === userId ? match.userBId : match.userAId;
          const partnerAnswerCount = await this.prisma.userAnswer.count({
            where: { userId: partnerId },
          });
          if (partnerAnswerCount >= 45) return true;
        }
        return false;
      }

      default:
        return false;
    }
  }

  /**
   * Calculate current progress value for a badge criteria type.
   * Single source of truth for progress calculation.
   */
  private async calculateCriteriaProgress(
    userId: string,
    criteria: BadgeCriteria | null,
    defaultDescription: string,
  ): Promise<{
    currentValue: number;
    targetValue: number;
    description: string;
  }> {
    if (!criteria?.type) {
      return {
        currentValue: 0,
        targetValue: 1,
        description: defaultDescription,
      };
    }

    const targetValue = criteria.count ?? 1;
    let currentValue = 0;
    let description = defaultDescription;

    switch (criteria.type) {
      case "match_count": {
        currentValue = await this.prisma.match.count({
          where: {
            OR: [{ userAId: userId }, { userBId: userId }],
            isActive: true,
          },
        });
        description = `${targetValue} eslesmeni tamamla`;
        break;
      }

      case "harmony_session_count": {
        currentValue = await this.prisma.harmonySession.count({
          where: {
            OR: [{ userAId: userId }, { userBId: userId }],
            status: { in: ["ENDED", "EXTENDED"] },
          },
        });
        description = `${targetValue} Harmony Room oturumu tamamla`;
        break;
      }

      case "answer_count": {
        currentValue = await this.prisma.userAnswer.count({
          where: { userId },
        });
        description = `${targetValue} uyumluluk sorusu yanitla`;
        break;
      }

      case "super_compatibility_match": {
        const superMatch = await this.prisma.match.findFirst({
          where: {
            OR: [{ userAId: userId }, { userBId: userId }],
            isActive: true,
            compatibilityLevel: "SUPER",
          },
        });
        currentValue = superMatch ? 1 : 0;
        description = "Super uyumlu bir eslesme bul";
        break;
      }

      case "selfie_verification": {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { isSelfieVerified: true },
        });
        currentValue = user?.isSelfieVerified ? 1 : 0;
        description = "Selfie dogrulamasini tamamla";
        break;
      }

      case "relationship_activated": {
        const relationship = await this.prisma.relationship.findFirst({
          where: {
            OR: [{ userAId: userId }, { userBId: userId }],
            status: "ACTIVE",
          },
        });
        currentValue = relationship ? 1 : 0;
        description = "Iliski modunu aktiflestir";
        break;
      }

      case "swipe_count": {
        currentValue = await this.prisma.swipe.count({
          where: { swiperId: userId },
        });
        description = `${targetValue} profil kesfet`;
        break;
      }

      case "deep_match": {
        currentValue = await this.prisma.userAnswer.count({
          where: { userId },
        });
        description =
          "45 uyumluluk sorusunu tamamla ve bir eslesmende de tamamlansin";
        break;
      }

      default:
        description = defaultDescription;
        break;
    }

    return { currentValue, targetValue, description };
  }
}
