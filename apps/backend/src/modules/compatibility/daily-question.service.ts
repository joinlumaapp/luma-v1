// LUMA V1 -- Gunluk Uyumluluk Sorusu Servisi
// Benzersiz ozellik: Her gun yeni bir soru, eslesmelerle karsilastirma

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// LOCKED: 45 questions total — daily rotation cycles through all 45
const TOTAL_QUESTION_COUNT = 45;

// Epoch date for daily question rotation — consistent starting point
const EPOCH_DATE = new Date('2025-01-01T00:00:00Z');

export interface DailyQuestionResponse {
  questionId: string;
  questionNumber: number;
  textTr: string;
  textEn: string;
  category: string;
  options: Array<{
    id: string;
    labelTr: string;
    labelEn: string;
    order: number;
  }>;
  dayNumber: number;
  alreadyAnswered: boolean;
  answeredOptionId: string | null;
}

export interface DailyInsightResponse {
  questionId: string;
  totalResponses: number;
  matchResponses: number;
  sameAnswerPercent: number;
  optionBreakdown: Array<{
    optionId: string;
    labelTr: string;
    count: number;
    percent: number;
    isUserChoice: boolean;
  }>;
  soulMateInsight: string;
}

export interface StreakResponse {
  currentStreak: number;
  longestStreak: number;
  totalAnswered: number;
  lastAnsweredAt: string | null;
}

@Injectable()
export class DailyQuestionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get today's daily question for a user.
   * The question rotates daily through all 45 questions using a deterministic
   * day-based index: daysSinceEpoch % 45.
   */
  async getDailyQuestion(userId: string): Promise<DailyQuestionResponse> {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanici bulunamadi');
    }

    const dayNumber = this.getDayNumber();
    const questionIndex = dayNumber % TOTAL_QUESTION_COUNT;

    // Get the question for today (1-indexed questionNumber)
    const question = await this.prisma.compatibilityQuestion.findFirst({
      where: {
        questionNumber: questionIndex + 1,
        isActive: true,
      },
      include: {
        options: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            labelTr: true,
            labelEn: true,
            order: true,
          },
        },
      },
    });

    if (!question) {
      throw new NotFoundException('Gunun sorusu bulunamadi');
    }

    // Check if user already answered today's question
    const existingAnswer = await this.prisma.dailyQuestionAnswer.findUnique({
      where: {
        userId_dayNumber: {
          userId,
          dayNumber,
        },
      },
      select: { optionId: true },
    });

    return {
      questionId: question.id,
      questionNumber: question.questionNumber,
      textTr: question.textTr,
      textEn: question.textEn,
      category: question.category,
      options: question.options,
      dayNumber,
      alreadyAnswered: !!existingAnswer,
      answeredOptionId: existingAnswer?.optionId ?? null,
    };
  }

  /**
   * Answer today's daily question.
   * Each user can only answer once per day per question.
   */
  async answerDailyQuestion(
    userId: string,
    questionId: string,
    optionId: string,
  ): Promise<{ saved: boolean; dayNumber: number }> {
    const dayNumber = this.getDayNumber();

    // Validate question exists and matches today
    const questionIndex = dayNumber % TOTAL_QUESTION_COUNT;
    const question = await this.prisma.compatibilityQuestion.findFirst({
      where: {
        id: questionId,
        questionNumber: questionIndex + 1,
        isActive: true,
      },
      include: {
        options: { select: { id: true } },
      },
    });

    if (!question) {
      throw new BadRequestException(
        'Bu soru bugunun sorusu degil veya gecersiz',
      );
    }

    // Validate option belongs to this question
    const validOptionIds = question.options.map((o: { id: string }) => o.id);
    if (!validOptionIds.includes(optionId)) {
      throw new BadRequestException(
        'Gecersiz secenek. Bu secenek bu soruya ait degil.',
      );
    }

    // Check if already answered
    const existing = await this.prisma.dailyQuestionAnswer.findUnique({
      where: {
        userId_dayNumber: {
          userId,
          dayNumber,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'Bu soruyu bugun zaten yanitladin. Yarin yeni bir soru gelecek!',
      );
    }

    // Save the answer
    await this.prisma.dailyQuestionAnswer.create({
      data: {
        userId,
        questionId,
        optionId,
        dayNumber,
        // createdAt is auto-set by @default(now())
      },
    });

    return { saved: true, dayNumber };
  }

  /**
   * Get insight for a daily question after the user has answered.
   * Shows what percentage of their matches answered the same way.
   */
  async getDailyInsight(
    userId: string,
    questionId: string,
  ): Promise<DailyInsightResponse> {
    const dayNumber = this.getDayNumber();

    // Get user's own answer
    const userAnswer = await this.prisma.dailyQuestionAnswer.findUnique({
      where: {
        userId_dayNumber: {
          userId,
          dayNumber,
        },
      },
      select: { optionId: true },
    });

    if (!userAnswer) {
      throw new BadRequestException(
        'Once bu soruyu yanitlamalisin',
      );
    }

    // Get the question with options for labels
    const question = await this.prisma.compatibilityQuestion.findUnique({
      where: { id: questionId },
      include: {
        options: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            labelTr: true,
          },
        },
      },
    });

    if (!question) {
      throw new NotFoundException('Soru bulunamadi');
    }

    // Get user's match IDs
    const matches = await this.prisma.match.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        isActive: true,
      },
      select: { userAId: true, userBId: true },
    });

    const matchUserIds = matches.map((m: { userAId: string; userBId: string }) =>
      m.userAId === userId ? m.userBId : m.userAId,
    );

    // Get all answers for this question on this day from matches
    const matchAnswers = await this.prisma.dailyQuestionAnswer.findMany({
      where: {
        questionId,
        dayNumber,
        userId: { in: matchUserIds },
      },
      select: { optionId: true },
    });

    // Calculate option breakdown from ALL answers today (not just matches)
    const allAnswers = await this.prisma.dailyQuestionAnswer.findMany({
      where: {
        questionId,
        dayNumber,
      },
      select: { optionId: true },
    });

    const totalResponses = allAnswers.length;
    const matchResponses = matchAnswers.length;
    const sameAnswerMatchCount = matchAnswers.filter(
      (a: { optionId: string | null }) => a.optionId === userAnswer.optionId,
    ).length;
    const sameAnswerPercent =
      matchResponses > 0
        ? Math.round((sameAnswerMatchCount / matchResponses) * 100)
        : 0;

    // Option breakdown
    const optionCounts = new Map<string, number>();
    for (const answer of allAnswers) {
      if (answer.optionId) {
        optionCounts.set(
          answer.optionId,
          (optionCounts.get(answer.optionId) ?? 0) + 1,
        );
      }
    }

    const optionBreakdown = question.options.map((opt: { id: string; labelTr: string }) => {
      const count = optionCounts.get(opt.id) ?? 0;
      return {
        optionId: opt.id,
        labelTr: opt.labelTr,
        count,
        percent: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0,
        isUserChoice: opt.id === userAnswer.optionId,
      };
    });

    // Generate soul mate insight based on match alignment
    const soulMateInsight = this.generateSoulMateInsight(
      sameAnswerPercent,
      matchResponses,
    );

    return {
      questionId,
      totalResponses,
      matchResponses,
      sameAnswerPercent,
      optionBreakdown,
      soulMateInsight,
    };
  }

  /**
   * Get the user's daily question answer streak.
   * Counts consecutive days the user has answered.
   */
  async getStreak(userId: string): Promise<StreakResponse> {
    // Get all daily answers ordered by dayNumber descending
    const answers = await this.prisma.dailyQuestionAnswer.findMany({
      where: { userId },
      orderBy: { dayNumber: 'desc' },
      select: { dayNumber: true, createdAt: true },
      distinct: ['dayNumber'],
    });

    if (answers.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        totalAnswered: 0,
        lastAnsweredAt: null,
      };
    }

    const today = this.getDayNumber();
    const dayNumbers = answers.map((a: { dayNumber: number }) => a.dayNumber);
    const daySet = new Set<number>(dayNumbers);

    // Calculate current streak (must include today or yesterday)
    let currentStreak = 0;
    let checkDay = today;

    // Allow streak to count if answered today OR yesterday
    if (!daySet.has(checkDay)) {
      checkDay = today - 1;
    }

    while (daySet.has(checkDay)) {
      currentStreak++;
      checkDay--;
    }

    // Calculate longest streak
    const sortedDays = [...daySet].sort((a, b) => a - b);
    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = 1; i < sortedDays.length; i++) {
      if (sortedDays[i] === sortedDays[i - 1] + 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    const lastAnsweredAt = answers[0]?.createdAt?.toISOString() ?? null;

    return {
      currentStreak,
      longestStreak,
      totalAnswered: answers.length,
      lastAnsweredAt,
    };
  }

  /**
   * Get global answer statistics for a specific question.
   * Returns total count, percentage breakdown by option, and most popular answer.
   * This is a public-facing stat endpoint (no match-specific data).
   */
  async getAnswerStats(
    questionId: string,
    userId: string,
  ): Promise<{
    questionId: string;
    totalAnswers: number;
    optionBreakdown: Array<{
      optionId: string;
      labelTr: string;
      count: number;
      percent: number;
    }>;
    mostPopularOption: {
      optionId: string;
      labelTr: string;
      percent: number;
    } | null;
    userAnswer: {
      optionId: string;
      labelTr: string;
      percent: number;
      insightMessage: string;
    } | null;
  }> {
    // Validate question exists
    const question = await this.prisma.compatibilityQuestion.findUnique({
      where: { id: questionId },
      include: {
        options: {
          orderBy: { order: 'asc' },
          select: { id: true, labelTr: true },
        },
      },
    });

    if (!question) {
      throw new NotFoundException('Soru bulunamadi');
    }

    // Get ALL daily answers for this question (across all days)
    const allAnswers = await this.prisma.dailyQuestionAnswer.findMany({
      where: { questionId },
      select: { optionId: true, userId: true },
    });

    const totalAnswers = allAnswers.length;

    // Count per option
    const optionCounts = new Map<string, number>();
    for (const answer of allAnswers) {
      if (answer.optionId) {
        optionCounts.set(
          answer.optionId,
          (optionCounts.get(answer.optionId) ?? 0) + 1,
        );
      }
    }

    // Build breakdown
    const optionBreakdown = question.options.map((opt: { id: string; labelTr: string }) => {
      const count = optionCounts.get(opt.id) ?? 0;
      return {
        optionId: opt.id,
        labelTr: opt.labelTr,
        count,
        percent: totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0,
      };
    });

    // Most popular
    let mostPopularOption: {
      optionId: string;
      labelTr: string;
      percent: number;
    } | null = null;

    if (optionBreakdown.length > 0) {
      const sorted = [...optionBreakdown].sort((a, b) => b.count - a.count);
      if (sorted[0].count > 0) {
        mostPopularOption = {
          optionId: sorted[0].optionId,
          labelTr: sorted[0].labelTr,
          percent: sorted[0].percent,
        };
      }
    }

    // Find user's answer for this question (most recent daily answer)
    const userDailyAnswer = await this.prisma.dailyQuestionAnswer.findFirst({
      where: { userId, questionId },
      orderBy: { dayNumber: 'desc' },
      select: { optionId: true },
    });

    let userAnswer: {
      optionId: string;
      labelTr: string;
      percent: number;
      insightMessage: string;
    } | null = null;

    if (userDailyAnswer?.optionId) {
      const userOption = optionBreakdown.find(
        (ob: { optionId: string }) => ob.optionId === userDailyAnswer.optionId,
      );
      if (userOption) {
        let insightMessage: string;
        if (userOption.percent >= 50) {
          insightMessage = `Kullanicilarin %${userOption.percent}'i ayni cevabi verdi`;
        } else if (userOption.percent >= 30) {
          insightMessage = `Populer bir secim! Kullanicilarin %${userOption.percent}'i boyle dusunuyor`;
        } else {
          insightMessage = `Farkli dusunuyorsun! Sadece %${userOption.percent}'i boyle cevapladi`;
        }

        userAnswer = {
          optionId: userOption.optionId,
          labelTr: userOption.labelTr,
          percent: userOption.percent,
          insightMessage,
        };
      }
    }

    return {
      questionId,
      totalAnswers,
      optionBreakdown,
      mostPopularOption,
      userAnswer,
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  /**
   * Calculate the day number since epoch for consistent daily rotation.
   */
  private getDayNumber(): number {
    const now = new Date();
    const diffMs = now.getTime() - EPOCH_DATE.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Generate a Turkish insight message based on match alignment.
   */
  private generateSoulMateInsight(
    sameAnswerPercent: number,
    matchResponses: number,
  ): string {
    if (matchResponses === 0) {
      return 'Eslesmelerinden henuz kimse bu soruyu yanitlamadi. Yarinki soruyu kacirma!';
    }

    if (sameAnswerPercent >= 80) {
      return 'Ruh esin de ayni sekilde dusunuyor! Eslesmelerinle muhtesem bir uyum icerindesin.';
    }

    if (sameAnswerPercent >= 60) {
      return 'Eslesmelerinle bakis aciniz oldukca yakin. Guzel bir baglanti kurabilirsiniz!';
    }

    if (sameAnswerPercent >= 40) {
      return 'Farkli bakis acilari iliskiyi zenginlestirir. Birbirinizden ogrenebileceginiz cok sey var!';
    }

    if (sameAnswerPercent >= 20) {
      return 'Farkli dusunceler farkli perspektifler getirir. Bu bir firsat olabilir!';
    }

    return 'Eslesmelerinle farkli dusunuyorsun — ama bu da bir uyum gostergesi olabilir!';
  }
}
