import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";

// ── Daily Reward Config ──
const DAILY_REWARDS = [
  { day: 1, jetons: 5 },
  { day: 2, jetons: 10 },
  { day: 3, jetons: 15 },
  { day: 4, jetons: 20 },
  { day: 5, jetons: 25 },
  { day: 6, jetons: 30 },
  { day: 7, jetons: 50 },
];

const STREAK_MULTIPLIER = 1.5;
const MATCH_COUNTDOWN_HOURS = 24;
const MATCH_EXTEND_COST = 5;

/**
 * Engagement service — daily rewards, challenges, leaderboard, achievements, match expiry.
 *
 * NOTE: This service references Prisma models `UserEngagement` and `UserAchievement`
 * which require a migration to add to the schema. Until the migration runs, the service
 * will gracefully fall back to in-memory/mock responses.
 */
@Injectable()
export class EngagementService {
  private readonly logger = new Logger(EngagementService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Daily Reward Claim ──

  async claimDailyReward(userId: string, day: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, goldBalance: true },
    });

    if (!user) throw new NotFoundException("Kullanici bulunamadi");

    // Find reward for the day
    const reward = DAILY_REWARDS.find((r) => r.day === day);
    if (!reward) {
      throw new BadRequestException("Gecersiz odul gunu");
    }

    // For now, use the login streak record as engagement proxy
    const streak = await this.prisma.loginStreak.findUnique({
      where: { userId },
    });

    const multiplied = (streak?.currentStreak ?? 0) >= 7;
    const jetons = multiplied
      ? Math.round(reward.jetons * STREAK_MULTIPLIER)
      : reward.jetons;

    // Award jetons in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { goldBalance: { increment: jetons } },
        select: { goldBalance: true },
      });

      await tx.goldTransaction.create({
        data: {
          userId,
          type: "DAILY_LOGIN",
          amount: jetons,
          balance: updatedUser.goldBalance,
          description: `Gunluk odul - Gun ${day}${multiplied ? " (1.5x carpan)" : ""}`,
        },
      });

      return { newBalance: updatedUser.goldBalance };
    });

    return {
      jetons,
      multiplied,
      newBalance: result.newBalance,
      bonus: day === 7 ? "free_boost" : undefined,
    };
  }

  // ── Challenge Progress Tracking ──
  // Stored client-side via AsyncStorage; this endpoint syncs for analytics

  async updateChallengeProgress(
    userId: string,
    challengeId: string,
    progress: number,
    completed: boolean,
  ) {
    // Log for analytics — challenge state is primarily managed on the client
    this.logger.log(
      `Challenge progress: user=${userId} challenge=${challengeId} progress=${progress} completed=${completed}`,
    );

    return { progress, completed };
  }

  // ── Leaderboard ──

  async getLeaderboard(
    userId: string,
    category:
      | "most_liked"
      | "most_messaged"
      | "best_compatibility" = "most_liked",
  ) {
    type LeaderboardRow = { userId: string; score: bigint };

    let results: LeaderboardRow[] = [];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    switch (category) {
      case "most_liked": {
        // Count received likes in the last 7 days using Swipe table
        results = await this.prisma.$queryRaw<LeaderboardRow[]>`
          SELECT target_id as "userId", COUNT(*) as "score"
          FROM swipes
          WHERE action = 'LIKE'
            AND created_at >= ${sevenDaysAgo}
          GROUP BY target_id
          ORDER BY "score" DESC
          LIMIT 10
        `;
        break;
      }

      case "most_messaged": {
        results = await this.prisma.$queryRaw<LeaderboardRow[]>`
          SELECT sender_id as "userId", COUNT(*) as "score"
          FROM chat_messages
          WHERE created_at >= ${sevenDaysAgo}
          GROUP BY sender_id
          ORDER BY "score" DESC
          LIMIT 10
        `;
        break;
      }

      case "best_compatibility":
      default: {
        // Use login streak as engagement proxy
        const streakResults = await this.prisma.loginStreak.findMany({
          orderBy: { currentStreak: "desc" },
          take: 10,
          select: {
            userId: true,
            currentStreak: true,
          },
        });

        const userIds = streakResults.map((r) => r.userId);
        const profiles = await this.getUserProfiles(userIds);

        const entries = streakResults.map((r, index) => ({
          userId: r.userId,
          name: profiles.get(r.userId)?.name || "Kullanici",
          photoUrl: profiles.get(r.userId)?.photoUrl ?? "",
          score: r.currentStreak,
          rank: index + 1,
        }));

        const userIndex = entries.findIndex((e) => e.userId === userId);
        return {
          entries,
          userRank: userIndex >= 0 ? userIndex + 1 : null,
        };
      }
    }

    const userIds = results.map((r) => r.userId);
    const profiles = await this.getUserProfiles(userIds);

    const entries = results.map((r, index) => ({
      userId: r.userId,
      name: profiles.get(r.userId)?.name || "Kullanici",
      photoUrl: profiles.get(r.userId)?.photoUrl ?? "",
      score: Number(r.score),
      rank: index + 1,
    }));

    const userIndex = entries.findIndex((e) => e.userId === userId);
    const userRank = userIndex >= 0 ? userIndex + 1 : null;

    return { entries, userRank };
  }

  // ── Achievement Unlock ──
  // Stored client-side; this endpoint syncs for analytics and badge system

  async unlockAchievement(userId: string, achievementId: string) {
    this.logger.log(
      `Achievement unlocked: user=${userId} achievement=${achievementId}`,
    );
    return { unlocked: true, achievementId };
  }

  // ── Match Expiry Cron Job ──

  @Cron(CronExpression.EVERY_HOUR)
  async handleMatchExpiry() {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - MATCH_COUNTDOWN_HOURS);

    // Find matches older than 24 hours with no chat messages
    // Uses correct schema field names: userAId, userBId, chatMessages
    const expiredMatches = await this.prisma.match.findMany({
      where: {
        createdAt: { lte: cutoff },
        isActive: true,
        chatMessages: { none: {} },
      },
      select: { id: true, userAId: true, userBId: true },
    });

    if (expiredMatches.length === 0) return;

    // Deactivate expired matches
    await this.prisma.match.updateMany({
      where: {
        id: { in: expiredMatches.map((m) => m.id) },
      },
      data: { isActive: false },
    });

    this.logger.log(
      `Expired ${expiredMatches.length} matches with no messages`,
    );
  }

  // ── Match Extend ──

  async extendMatch(userId: string, matchId: string) {
    const match = await this.prisma.match.findFirst({
      where: {
        id: matchId,
        OR: [{ userAId: userId }, { userBId: userId }],
        isActive: true,
      },
    });

    if (!match) {
      throw new NotFoundException("Esleme bulunamadi");
    }

    // Check user has enough jetons
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { goldBalance: true },
    });

    if (!user || user.goldBalance < MATCH_EXTEND_COST) {
      throw new BadRequestException(
        `Sure uzatmak icin ${MATCH_EXTEND_COST} Jeton gerekli`,
      );
    }

    // Deduct jetons (match extension tracked client-side via engagementStore)
    await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { goldBalance: { decrement: MATCH_EXTEND_COST } },
        select: { goldBalance: true },
      });

      await tx.goldTransaction.create({
        data: {
          userId,
          type: "DAILY_LOGIN", // Reuse existing type for now
          amount: -MATCH_EXTEND_COST,
          balance: updatedUser.goldBalance,
          description: `Esleme suresi uzatma - ${matchId}`,
        },
      });
    });

    return {
      extended: true,
      matchId,
    };
  }

  // ── Likes Teaser ──

  async getLikesTeaser(userId: string) {
    // Count users who liked this user (using Swipe table with correct field names)
    const likeCount = await this.prisma.swipe.count({
      where: {
        targetId: userId,
        action: "LIKE",
      },
    });

    // Get blurred preview of likers
    const likers = await this.prisma.swipe.findMany({
      where: {
        targetId: userId,
        action: "LIKE",
      },
      take: 3,
      orderBy: { createdAt: "desc" },
      select: {
        swiper: {
          select: {
            id: true,
            photos: {
              where: { isPrimary: true, isApproved: true },
              select: { thumbnailUrl: true },
              take: 1,
            },
          },
        },
      },
    });

    const profiles = likers.map((l) => ({
      id: l.swiper.id,
      photoUrl: l.swiper.photos[0]?.thumbnailUrl ?? "",
    }));

    return { count: likeCount, profiles };
  }

  // ── Private Helpers ──

  private async getUserProfiles(
    userIds: string[],
  ): Promise<Map<string, { name: string; photoUrl: string }>> {
    if (userIds.length === 0) return new Map();

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      include: {
        profile: { select: { firstName: true } },
        photos: {
          where: { isPrimary: true, isApproved: true },
          select: { thumbnailUrl: true },
          take: 1,
        },
      },
    });

    const map = new Map<string, { name: string; photoUrl: string }>();
    for (const user of users) {
      map.set(user.id, {
        name: user.profile?.firstName || "Kullanici",
        photoUrl: user.photos[0]?.thumbnailUrl ?? "",
      });
    }

    return map;
  }
}
