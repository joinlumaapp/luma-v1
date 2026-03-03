import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Turkish day names (Monday = index 1 in JS getDay() mapping)
const TURKISH_DAY_NAMES: Record<number, string> = {
  0: 'Pazar',
  1: 'Pazartesi',
  2: 'Sal\u0131',
  3: '\u00c7ar\u015famba',
  4: 'Per\u015fembe',
  5: 'Cuma',
  6: 'Cumartesi',
};

// Turkish category labels for top category display
const CATEGORY_LABELS_TR: Record<string, string> = {
  COMMUNICATION: '\u0130leti\u015fim Tarz\u0131',
  LIFE_GOALS: 'Ya\u015fam Hedefleri',
  VALUES: 'De\u011ferler',
  LIFESTYLE: 'Ya\u015fam Tarz\u0131',
  EMOTIONAL_INTELLIGENCE: 'Duygusal Zeka',
  RELATIONSHIP_EXPECTATIONS: '\u0130li\u015fki Beklentileri',
  SOCIAL_COMPATIBILITY: 'Sosyal Uyum',
  ATTACHMENT_STYLE: 'Ba\u011flanma Tarz\u0131',
  LOVE_LANGUAGE: 'Sevgi Dili',
  CONFLICT_STYLE: '\u00c7at\u0131\u015fma Yakla\u015f\u0131m\u0131',
  FUTURE_VISION: 'Gelecek Vizyonu',
  INTELLECTUAL: 'Entelekt\u00fcel Uyum',
  INTIMACY: 'Yak\u0131nl\u0131k',
  GROWTH_MINDSET: 'Geli\u015fim Odakl\u0131l\u0131k',
  CORE_FEARS: 'Temel Kayg\u0131lar',
};

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
  insights: string[];
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

    return this.formatReport(latestReport);
  }

  /**
   * Generate a weekly report for the user based on the last 7 days of activity.
   * If a report already exists for this week, returns the existing one.
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
      return this.formatReport(existingReport);
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
    ] = await Promise.all([
      // Total swipes in the period
      this.prisma.swipe.count({
        where: {
          swiperId: userId,
          createdAt: { gte: weekStart, lt: weekEnd },
        },
      }),

      // Total likes in the period
      this.prisma.swipe.count({
        where: {
          swiperId: userId,
          action: 'LIKE',
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

    return this.formatReport(report);
  }

  // ─── Private Helpers ───────────────────────────────────────────

  /**
   * Get the last Monday (00:00:00) relative to today.
   * If today is Monday, returns today at midnight.
   */
  private getLastMonday(): Date {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday, ...
    const diff = day === 0 ? 6 : day - 1; // Days since last Monday
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
   * Format a WeeklyReport database record into the API response shape.
   * Includes calculated likeRate and rule-based Turkish insights.
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
  }): WeeklyReportResponse {
    const likeRate =
      report.totalSwipes > 0
        ? Math.round((report.totalLikes / report.totalSwipes) * 10000) / 100
        : 0;

    const insights = this.generateInsights({
      likeRate,
      totalMatches: report.totalMatches,
      messagesExchanged: report.messagesExchanged,
      avgCompatibility: report.avgCompatibility,
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
   * Returns 2-3 actionable insights.
   */
  private generateInsights(params: {
    likeRate: number;
    totalMatches: number;
    messagesExchanged: number;
    avgCompatibility: number;
  }): string[] {
    const insights: string[] = [];

    // Like rate insights
    if (params.likeRate > 50) {
      insights.push(
        'Se\u00e7ici davran\u0131yorsun \u2014 bu kaliteli e\u015fle\u015fmelere yol a\u00e7ar',
      );
    } else if (params.likeRate < 20 && params.likeRate > 0) {
      insights.push(
        'Daha a\u00e7\u0131k ol \u2014 farkl\u0131 profillere \u015fans ver',
      );
    }

    // Match count insights
    if (params.totalMatches > 3) {
      insights.push(
        `Harika bir hafta! ${params.totalMatches} yeni e\u015fle\u015fme kazand\u0131n`,
      );
    } else if (params.totalMatches === 0) {
      insights.push(
        'Bu hafta e\u015fle\u015fme olmad\u0131 \u2014 profilini g\u00fcncellemeyi dene',
      );
    }

    // Message activity insight
    if (params.messagesExchanged > 20) {
      insights.push(
        'Aktif sohbet ediyorsun \u2014 bu e\u015fle\u015fmeleri g\u00fc\u00e7lendirir',
      );
    }

    // Compatibility insight
    if (params.avgCompatibility > 80) {
      insights.push(
        'Y\u00fcksek uyumlu profillerle e\u015fle\u015fiyorsun',
      );
    }

    // Ensure at least one insight is always returned
    if (insights.length === 0) {
      insights.push(
        'Ke\u015ffetmeye devam et \u2014 do\u011fru ki\u015fi seni bekliyor',
      );
    }

    // Cap at 3 insights
    return insights.slice(0, 3);
  }
}
