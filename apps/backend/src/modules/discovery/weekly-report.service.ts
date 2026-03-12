import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Turkish day names (Monday = index 1 in JS getDay() mapping)
const TURKISH_DAY_NAMES: Record<number, string> = {
  0: 'Pazar',
  1: 'Pazartesi',
  2: 'Sali',
  3: 'Carsamba',
  4: 'Persembe',
  5: 'Cuma',
  6: 'Cumartesi',
};

// Turkish category labels for top category display
const CATEGORY_LABELS_TR: Record<string, string> = {
  COMMUNICATION: 'Iletisim Tarzi',
  LIFE_GOALS: 'Yasam Hedefleri',
  VALUES: 'Degerler',
  LIFESTYLE: 'Yasam Tarzi',
  EMOTIONAL_INTELLIGENCE: 'Duygusal Zeka',
  RELATIONSHIP_EXPECTATIONS: 'Iliski Beklentileri',
  SOCIAL_COMPATIBILITY: 'Sosyal Uyum',
  ATTACHMENT_STYLE: 'Baglanma Tarzi',
  LOVE_LANGUAGE: 'Sevgi Dili',
  CONFLICT_STYLE: 'Catisma Yaklasimi',
  FUTURE_VISION: 'Gelecek Vizyonu',
  INTELLECTUAL: 'Entelektuel Uyum',
  INTIMACY: 'Yakinlik',
  GROWTH_MINDSET: 'Gelisim Odaklilik',
  CORE_FEARS: 'Temel Kaygilar',
};

// Maximum number of trending interests to return
const MAX_TRENDING_INTERESTS = 10;

export interface WeeklyReportResponse {
  weekStart: string;
  totalSwipes: number;
  totalLikes: number;
  totalMatches: number;
  avgCompatibility: number;
  topCategory: string | null;
  messagesExchanged: number;
  mostActiveDay: string | null;
  likeRate: number;
  likesReceived: number;
  topCompatibilityMatch: TopCompatMatchInfo | null;
  trendingInterests: TrendingInterest[];
  insights: string[];
}

/** Info about the highest-compatibility match of the week */
interface TopCompatMatchInfo {
  userId: string;
  firstName: string;
  compatibilityScore: number;
  matchedAt: string;
}

/** A trending interest tag in the user's area */
interface TrendingInterest {
  tag: string;
  count: number;
}

@Injectable()
export class WeeklyReportService {
  private readonly logger = new Logger(WeeklyReportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get the most recent weekly report for a user.
   * If no report exists or the latest is older than 7 days, generates a new one.
   */
  async getWeeklyReport(userId: string): Promise<WeeklyReportResponse> {
    const latestReport = await this.prisma.weeklyReport.findFirst({
      where: { userId },
      orderBy: { weekStart: 'desc' },
    });

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    if (!latestReport || latestReport.weekStart < sevenDaysAgo) {
      return this.generateWeeklyReport(userId);
    }

    // For stored reports, augment with live data for new fields
    const weekStart = latestReport.weekStart;
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [likesReceived, topMatch, trendingInterests] = await Promise.all([
      this.getLikesReceivedCount(userId, weekStart, weekEnd),
      this.getTopCompatibilityMatch(userId, weekStart, weekEnd),
      this.getTrendingInterestsInArea(userId),
    ]);

    return {
      ...this.formatReport(latestReport),
      likesReceived,
      topCompatibilityMatch: topMatch,
      trendingInterests,
    };
  }

  /**
   * Generate a weekly report for the user based on the last 7 days of activity.
   * Includes: profiles seen, likes given/received, matches made,
   * top compatibility match of the week, and trending interests in area.
   */
  async generateWeeklyReport(userId: string): Promise<WeeklyReportResponse> {
    const weekStart = this.getLastMonday();

    // Check if report already exists for this week
    const existingReport = await this.prisma.weeklyReport.findUnique({
      where: {
        userId_weekStart: { userId, weekStart },
      },
    });

    if (existingReport) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const [likesReceived, topMatch, trendingInterests] = await Promise.all([
        this.getLikesReceivedCount(userId, weekStart, weekEnd),
        this.getTopCompatibilityMatch(userId, weekStart, weekEnd),
        this.getTrendingInterestsInArea(userId),
      ]);

      return {
        ...this.formatReport(existingReport),
        likesReceived,
        topCompatibilityMatch: topMatch,
        trendingInterests,
      };
    }

    // Calculate the end of the reporting period (7 days from weekStart)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Query all metrics in parallel for efficiency
    const [
      totalSwipes,
      totalLikes,
      totalMatches,
      matchesWithScores,
      messageCount,
      swipesByDay,
      topCategoryResult,
      likesReceived,
      topMatch,
      trendingInterests,
    ] = await Promise.all([
      // Total swipes (profiles seen) in the period
      this.prisma.swipe.count({
        where: {
          swiperId: userId,
          createdAt: { gte: weekStart, lt: weekEnd },
        },
      }),

      // Total likes given in the period
      this.prisma.swipe.count({
        where: {
          swiperId: userId,
          action: { in: ['LIKE', 'SUPER_LIKE'] },
          createdAt: { gte: weekStart, lt: weekEnd },
        },
      }),

      // Total new matches in the period
      this.prisma.match.count({
        where: {
          OR: [{ userAId: userId }, { userBId: userId }],
          createdAt: { gte: weekStart, lt: weekEnd },
        },
      }),

      // Matches with compatibility scores for average calculation
      this.prisma.match.findMany({
        where: {
          OR: [{ userAId: userId }, { userBId: userId }],
          createdAt: { gte: weekStart, lt: weekEnd },
        },
        select: { compatibilityScore: true },
      }),

      // Messages exchanged in the period
      this.prisma.chatMessage.count({
        where: {
          senderId: userId,
          createdAt: { gte: weekStart, lt: weekEnd },
        },
      }),

      // Swipes grouped by day for most active day detection
      this.prisma.swipe.findMany({
        where: {
          swiperId: userId,
          createdAt: { gte: weekStart, lt: weekEnd },
        },
        select: { createdAt: true },
      }),

      // Top compatibility category from user answers
      this.getTopCategory(userId),

      // Likes received in the period
      this.getLikesReceivedCount(userId, weekStart, weekEnd),

      // Top compatibility match of the week
      this.getTopCompatibilityMatch(userId, weekStart, weekEnd),

      // Trending interests in user's area
      this.getTrendingInterestsInArea(userId),
    ]);

    // Calculate average compatibility from matches
    const avgCompatibility =
      matchesWithScores.length > 0
        ? Math.round(
            (matchesWithScores.reduce(
              (sum, m) => sum + m.compatibilityScore,
              0,
            ) /
              matchesWithScores.length) *
              100,
          ) / 100
        : 0;

    // Find most active day by grouping swipes
    const mostActiveDay = this.findMostActiveDay(swipesByDay.map((s) => s.createdAt));

    // Create the weekly report record
    const report = await this.prisma.weeklyReport.create({
      data: {
        userId,
        weekStart,
        totalSwipes,
        totalLikes,
        totalMatches,
        avgCompatibility,
        topCategory: topCategoryResult,
        messagesExchanged: messageCount,
        mostActiveDay,
      },
    });

    this.logger.log(
      `Weekly report generated for user ${userId} — week of ${weekStart.toISOString().slice(0, 10)}`,
    );

    return {
      ...this.formatReport(report),
      likesReceived,
      topCompatibilityMatch: topMatch,
      trendingInterests,
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  /**
   * Get the last Monday (00:00:00) relative to today.
   * If today is Monday, returns today at midnight.
   */
  private getLastMonday(): Date {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday, ...
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(monday.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  /**
   * Find the most active day from a list of timestamps.
   * Returns the Turkish day name with the highest swipe count.
   */
  private findMostActiveDay(dates: Date[]): string | null {
    if (dates.length === 0) return null;

    const dayCounts = new Map<number, number>();

    for (const date of dates) {
      const dayOfWeek = date.getDay();
      dayCounts.set(dayOfWeek, (dayCounts.get(dayOfWeek) ?? 0) + 1);
    }

    let maxDay = 0;
    let maxCount = 0;

    for (const [day, count] of dayCounts.entries()) {
      if (count > maxCount) {
        maxDay = day;
        maxCount = count;
      }
    }

    return TURKISH_DAY_NAMES[maxDay] ?? null;
  }

  /**
   * Find the most answered compatibility question category for the user.
   * Returns the category key (e.g., "COMMUNICATION") or null.
   */
  private async getTopCategory(userId: string): Promise<string | null> {
    const answers = await this.prisma.userAnswer.findMany({
      where: { userId },
      include: {
        question: {
          select: { category: true },
        },
      },
    });

    if (answers.length === 0) return null;

    const categoryCounts = new Map<string, number>();

    for (const answer of answers) {
      const category = answer.question.category;
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }

    let topCategory: string | null = null;
    let maxCount = 0;

    for (const [category, count] of categoryCounts.entries()) {
      if (count > maxCount) {
        topCategory = category;
        maxCount = count;
      }
    }

    return topCategory;
  }

  /**
   * Count likes received by the user during the reporting period.
   */
  private async getLikesReceivedCount(
    userId: string,
    weekStart: Date,
    weekEnd: Date,
  ): Promise<number> {
    return this.prisma.swipe.count({
      where: {
        targetId: userId,
        action: { in: ['LIKE', 'SUPER_LIKE'] },
        createdAt: { gte: weekStart, lt: weekEnd },
      },
    });
  }

  /**
   * Get the top compatibility match of the week.
   * Returns the match with the highest compatibility score created this week.
   */
  private async getTopCompatibilityMatch(
    userId: string,
    weekStart: Date,
    weekEnd: Date,
  ): Promise<TopCompatMatchInfo | null> {
    const topMatch = await this.prisma.match.findFirst({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        createdAt: { gte: weekStart, lt: weekEnd },
      },
      orderBy: { compatibilityScore: 'desc' },
      select: {
        userAId: true,
        userBId: true,
        compatibilityScore: true,
        createdAt: true,
      },
    });

    if (!topMatch) return null;

    // Get the partner's profile
    const partnerId = topMatch.userAId === userId
      ? topMatch.userBId
      : topMatch.userAId;

    const partnerProfile = await this.prisma.userProfile.findUnique({
      where: { userId: partnerId },
      select: { firstName: true },
    });

    return {
      userId: partnerId,
      firstName: partnerProfile?.firstName ?? '',
      compatibilityScore: topMatch.compatibilityScore,
      matchedAt: topMatch.createdAt.toISOString(),
    };
  }

  /**
   * Get trending interest tags in the user's area (same city).
   * Returns the top N most popular interest tags among active users
   * in the same city as the current user.
   */
  private async getTrendingInterestsInArea(userId: string): Promise<TrendingInterest[]> {
    // Get user's city
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { city: true },
    });

    if (!userProfile?.city) return [];

    // Get interest tags from active users in the same city
    const profiles = await this.prisma.userProfile.findMany({
      where: {
        city: userProfile.city,
        isComplete: true,
        userId: { not: userId },
        user: {
          isActive: true,
          deletedAt: null,
        },
        interestTags: { isEmpty: false },
      },
      select: { interestTags: true },
      take: 500, // cap to avoid scanning too many records
    });

    // Count interest tag frequency
    const tagCounts = new Map<string, number>();
    for (const profile of profiles) {
      for (const tag of profile.interestTags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }

    // Sort by frequency and take top N
    const trending: TrendingInterest[] = [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_TRENDING_INTERESTS)
      .map(([tag, count]) => ({ tag, count }));

    return trending;
  }

  /**
   * Format a WeeklyReport database record into the API response shape.
   * Includes calculated likeRate and rule-based Turkish insights.
   * Note: likesReceived, topCompatibilityMatch, and trendingInterests
   * are computed separately and merged by the caller.
   */
  private formatReport(report: {
    weekStart: Date;
    totalSwipes: number;
    totalLikes: number;
    totalMatches: number;
    avgCompatibility: number;
    topCategory: string | null;
    messagesExchanged: number;
    mostActiveDay: string | null;
  }): Omit<WeeklyReportResponse, 'likesReceived' | 'topCompatibilityMatch' | 'trendingInterests'> {
    const likeRate =
      report.totalSwipes > 0
        ? Math.round((report.totalLikes / report.totalSwipes) * 10000) / 100
        : 0;

    const insights = this.generateInsights({
      likeRate,
      totalMatches: report.totalMatches,
      messagesExchanged: report.messagesExchanged,
      avgCompatibility: report.avgCompatibility,
      totalSwipes: report.totalSwipes,
    });

    // Translate top category to Turkish label
    const topCategoryTr = report.topCategory
      ? CATEGORY_LABELS_TR[report.topCategory] ?? report.topCategory
      : null;

    return {
      weekStart: report.weekStart.toISOString().slice(0, 10),
      totalSwipes: report.totalSwipes,
      totalLikes: report.totalLikes,
      totalMatches: report.totalMatches,
      avgCompatibility: report.avgCompatibility,
      topCategory: topCategoryTr,
      messagesExchanged: report.messagesExchanged,
      mostActiveDay: report.mostActiveDay,
      likeRate,
      insights,
    };
  }

  /**
   * Generate rule-based Turkish insight sentences based on weekly activity.
   * Returns 2-4 actionable insights covering engagement, match quality,
   * messaging, and compatibility trends.
   */
  private generateInsights(params: {
    likeRate: number;
    totalMatches: number;
    messagesExchanged: number;
    avgCompatibility: number;
    totalSwipes: number;
  }): string[] {
    const insights: string[] = [];

    // Like rate insights
    if (params.likeRate > 50) {
      insights.push(
        'Secici davraniyorsun — bu kaliteli eslesmelere yol acar',
      );
    } else if (params.likeRate < 20 && params.likeRate > 0) {
      insights.push(
        'Daha acik ol — farkli profillere sans ver',
      );
    }

    // Match count insights
    if (params.totalMatches > 3) {
      insights.push(
        `Harika bir hafta! ${params.totalMatches} yeni eslesme kazandin`,
      );
    } else if (params.totalMatches === 0 && params.totalSwipes > 0) {
      insights.push(
        'Bu hafta eslesme olmadi — profilini guncellemeyi dene',
      );
    }

    // Message activity insight
    if (params.messagesExchanged > 20) {
      insights.push(
        'Aktif sohbet ediyorsun — bu eslesmeleri guclendirir',
      );
    } else if (params.messagesExchanged === 0 && params.totalMatches > 0) {
      insights.push(
        'Eslesmelerine mesaj gonder — ilk adimi at!',
      );
    }

    // Compatibility insight
    if (params.avgCompatibility > 80) {
      insights.push(
        'Yuksek uyumlu profillerle eslesiyorsun — harika secimler',
      );
    } else if (params.avgCompatibility > 0 && params.avgCompatibility < 50) {
      insights.push(
        'Uyumluluk sorularini tamamla — daha isabetli eslesmelere ulasirsun',
      );
    }

    // Activity level insight
    if (params.totalSwipes === 0) {
      insights.push(
        'Bu hafta hic kesfetmedin — duzenli kullanim eslesme sansini artirir',
      );
    } else if (params.totalSwipes > 50) {
      insights.push(
        'Aktif bir kesfetme haftasi gecirdin — bu momentum senin icin iyi',
      );
    }

    // Ensure at least one insight is always returned
    if (insights.length === 0) {
      insights.push(
        'Kesfetmeye devam et — dogru kisi seni bekliyor',
      );
    }

    // Cap at 4 insights
    return insights.slice(0, 4);
  }
}
