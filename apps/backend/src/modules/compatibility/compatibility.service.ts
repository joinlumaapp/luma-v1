import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BadgesService } from '../badges/badges.service';
import { SubmitAnswerDto, SubmitAnswersBulkDto } from './dto';

// LOCKED: 2 Compatibility Levels
const SUPER_COMPATIBILITY_THRESHOLD = 85;
const CORE_QUESTION_COUNT = 20;
const TOTAL_QUESTION_COUNT = 45;

// Staleness threshold for cached scores — recalculate after 24 hours
const SCORE_STALENESS_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class CompatibilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all compatibility questions.
   * LUMA has exactly 45 questions: 20 core + 25 premium (LOCKED).
   * Free users only see 20 core; Gold/Pro/Reserved see all 45.
   */
  async getQuestions(userId: string) {
    // Get user's package tier
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { packageTier: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    const hasPremiumAccess = user.packageTier !== 'FREE';

    // Fetch questions with options
    const questions = await this.prisma.compatibilityQuestion.findMany({
      where: {
        isActive: true,
        ...(hasPremiumAccess ? {} : { isPremium: false }),
      },
      include: {
        options: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            labelEn: true,
            labelTr: true,
            order: true,
          },
        },
      },
      orderBy: { questionNumber: 'asc' },
    });

    // Get user's existing answers
    const answers = await this.prisma.userAnswer.findMany({
      where: { userId },
      select: { questionId: true, optionId: true },
    });

    const answeredMap = new Map(answers.map((a) => [a.questionId, a.optionId]));

    // Build response
    const questionsWithStatus = questions.map((q) => ({
      id: q.id,
      questionNumber: q.questionNumber,
      category: q.category,
      textEn: q.textEn,
      textTr: q.textTr,
      weight: q.weight,
      isPremium: q.isPremium,
      options: q.options,
      answeredOptionId: answeredMap.get(q.id) ?? null,
      isAnswered: answeredMap.has(q.id),
    }));

    return {
      questions: questionsWithStatus,
      answeredCount: answers.length,
      totalCount: hasPremiumAccess ? TOTAL_QUESTION_COUNT : CORE_QUESTION_COUNT,
      hasPremiumAccess,
    };
  }

  /**
   * Submit an answer to a compatibility question.
   * Allows changing answers (upsert).
   */
  async submitAnswer(userId: string, dto: SubmitAnswerDto) {
    // Validate question exists
    const question = await this.prisma.compatibilityQuestion.findUnique({
      where: { id: dto.questionId },
      include: {
        options: { orderBy: { order: 'asc' } },
      },
    });

    if (!question || !question.isActive) {
      throw new NotFoundException('Soru bulunamadı');
    }

    // Check premium access
    if (question.isPremium) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { packageTier: true },
      });

      if (user?.packageTier === 'FREE') {
        throw new ForbiddenException(
          'Premium sorulara erişmek için Gold veya üzeri pakete geçin',
        );
      }
    }

    // Validate answer index
    if (dto.answerIndex < 0 || dto.answerIndex >= question.options.length) {
      throw new BadRequestException(
        `Geçersiz cevap indeksi. 0 ile ${question.options.length - 1} arasında olmalı.`,
      );
    }

    const selectedOption = question.options[dto.answerIndex];

    // Upsert answer (allow changing)
    await this.prisma.userAnswer.upsert({
      where: {
        userId_questionId: { userId, questionId: dto.questionId },
      },
      create: {
        userId,
        questionId: dto.questionId,
        optionId: selectedOption.id,
      },
      update: {
        optionId: selectedOption.id,
        answeredAt: new Date(),
      },
    });

    // Count total answers for progress tracking
    const answeredCount = await this.prisma.userAnswer.count({
      where: { userId },
    });

    return {
      questionId: dto.questionId,
      optionId: selectedOption.id,
      saved: true,
      answeredCount,
      totalCount: TOTAL_QUESTION_COUNT,
    };
  }

  /**
   * Submit multiple answers at once in a single transaction.
   * Each answer maps a questionId to an optionId directly.
   */
  async submitAnswersBulk(userId: string, dto: SubmitAnswersBulkDto) {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { packageTier: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    const hasPremiumAccess = user.packageTier !== 'FREE';

    // Fetch all referenced questions with their options
    const questionIds = dto.answers.map((a) => a.questionId);
    const questions = await this.prisma.compatibilityQuestion.findMany({
      where: { id: { in: questionIds }, isActive: true },
      include: { options: { select: { id: true } } },
    });

    const questionMap = new Map(questions.map((q) => [q.id, q]));

    // Validate each answer
    for (const answer of dto.answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) {
        throw new NotFoundException(`Soru bulunamadı: ${answer.questionId}`);
      }
      if (question.isPremium && !hasPremiumAccess) {
        throw new ForbiddenException(
          'Premium sorulara erişmek için Gold veya üzeri pakete geçin',
        );
      }
      const validOptionIds = question.options.map((o) => o.id);
      if (!validOptionIds.includes(answer.optionId)) {
        throw new BadRequestException(
          `Geçersiz seçenek: ${answer.optionId} (soru: ${answer.questionId})`,
        );
      }
    }

    // Execute all upserts in a transaction
    await this.prisma.$transaction(
      dto.answers.map((answer) =>
        this.prisma.userAnswer.upsert({
          where: {
            userId_questionId: { userId, questionId: answer.questionId },
          },
          create: {
            userId,
            questionId: answer.questionId,
            optionId: answer.optionId,
          },
          update: {
            optionId: answer.optionId,
            answeredAt: new Date(),
          },
        }),
      ),
    );

    // Count total answers for progress tracking
    const answeredCount = await this.prisma.userAnswer.count({
      where: { userId },
    });

    return {
      saved: true,
      savedCount: dto.answers.length,
      answeredCount,
      totalCount: hasPremiumAccess ? TOTAL_QUESTION_COUNT : CORE_QUESTION_COUNT,
    };
  }

  /**
   * Get compatibility score between current user and another user.
   * Returns one of 2 compatibility levels (LOCKED: Normal / Super).
   */
  async getScoreWithUser(userId: string, targetUserId: string) {
    // Guard: prevent self-comparison
    if (userId === targetUserId) {
      throw new BadRequestException('Kendinizle uyumluluk puani hesaplanamaz');
    }

    // Check if score is already computed
    const existingScore = await this.prisma.compatibilityScore.findUnique({
      where: {
        userAId_userBId: {
          userAId: this.orderIds(userId, targetUserId).first,
          userBId: this.orderIds(userId, targetUserId).second,
        },
      },
    });

    if (existingScore) {
      // Check staleness — recalculate if older than threshold
      const age = Date.now() - new Date(existingScore.updatedAt).getTime();
      if (age > SCORE_STALENESS_MS) {
        return this.calculateAndStoreScore(userId, targetUserId);
      }
      return this.formatScoreResponse(userId, targetUserId, existingScore);
    }

    // Calculate score
    return this.calculateAndStoreScore(userId, targetUserId);
  }

  /**
   * Calculate pairwise compatibility score between two users.
   * Core algorithm: Weighted answer similarity across categories.
   */
  async calculateAndStoreScore(userAId: string, userBId: string) {
    // Order IDs consistently for storage
    const { first, second } = this.orderIds(userAId, userBId);

    // Get both users' answers with question weights
    const [answersA, answersB] = await Promise.all([
      this.prisma.userAnswer.findMany({
        where: { userId: first },
        include: {
          question: true,
          option: true,
        },
      }),
      this.prisma.userAnswer.findMany({
        where: { userId: second },
        include: {
          question: true,
          option: true,
        },
      }),
    ]);

    // Create answer maps: questionId -> option value
    const mapA = new Map(answersA.map((a) => [a.questionId, { value: a.option.value, weight: a.question.weight, category: a.question.category, isPremium: a.question.isPremium }]));
    const mapB = new Map(answersB.map((a) => [a.questionId, { value: a.option.value, weight: a.question.weight, category: a.question.category, isPremium: a.question.isPremium }]));

    // Find common questions (both users answered)
    const commonQuestionIds = [...mapA.keys()].filter((id) => mapB.has(id));

    if (commonQuestionIds.length === 0) {
      return {
        userId: userAId,
        targetUserId: userBId,
        baseScore: 0,
        deepScore: null,
        finalScore: 0,
        level: 'NORMAL',
        breakdown: {},
        commonQuestions: 0,
      };
    }

    // Calculate scores per category
    const categoryScores: Record<string, { total: number; weight: number; count: number }> = {};
    let coreTotal = 0;
    let coreWeight = 0;
    let premiumTotal = 0;
    let premiumWeight = 0;

    for (const qId of commonQuestionIds) {
      const a = mapA.get(qId)!;
      const b = mapB.get(qId)!;

      // Similarity: 1 - |valueA - valueB| (values are normalized 0-1)
      const similarity = 1 - Math.abs(a.value - b.value);
      const weightedScore = similarity * a.weight;

      // Accumulate category scores
      if (!categoryScores[a.category]) {
        categoryScores[a.category] = { total: 0, weight: 0, count: 0 };
      }
      categoryScores[a.category].total += weightedScore;
      categoryScores[a.category].weight += a.weight;
      categoryScores[a.category].count++;

      // Accumulate totals separately for core and premium
      if (a.isPremium) {
        premiumTotal += weightedScore;
        premiumWeight += a.weight;
      } else {
        coreTotal += weightedScore;
        coreWeight += a.weight;
      }
    }

    // Calculate percentage scores
    const baseScore = coreWeight > 0
      ? Math.round((coreTotal / coreWeight) * 100)
      : 0;

    const hasPremiumAnswers = premiumWeight > 0;
    const premiumScore = hasPremiumAnswers
      ? Math.round((premiumTotal / premiumWeight) * 100)
      : null;

    // Deep score = combined score from ALL questions (core + premium)
    const allWeight = coreWeight + premiumWeight;
    const allTotal = coreTotal + premiumTotal;
    const deepScore = hasPremiumAnswers && allWeight > 0
      ? Math.round((allTotal / allWeight) * 100)
      : null;

    // Final score: 70% core + 30% premium-only (not double-counted)
    // This ensures premium questions add refinement without diluting core
    const finalScore = premiumScore !== null
      ? Math.round(baseScore * 0.7 + premiumScore * 0.3)
      : baseScore;

    // Determine compatibility level (LOCKED: 2 levels)
    const level = finalScore >= SUPER_COMPATIBILITY_THRESHOLD ? 'SUPER' : 'NORMAL';

    // Category breakdown
    const breakdown: Record<string, number> = {};
    for (const [cat, data] of Object.entries(categoryScores)) {
      breakdown[cat] = data.weight > 0
        ? Math.round((data.total / data.weight) * 100)
        : 0;
    }

    // Store/update the score
    const score = await this.prisma.compatibilityScore.upsert({
      where: {
        userAId_userBId: { userAId: first, userBId: second },
      },
      create: {
        userAId: first,
        userBId: second,
        baseScore,
        deepScore,
        finalScore,
        level,
        dimensionScores: breakdown,
      },
      update: {
        baseScore,
        deepScore,
        finalScore,
        level,
        dimensionScores: breakdown,
      },
    });

    return this.formatScoreResponse(userAId, userBId, score);
  }

  /**
   * Get all answers submitted by the current user.
   * Returns question details with selected options.
   */
  async getMyAnswers(userId: string) {
    const answers = await this.prisma.userAnswer.findMany({
      where: { userId },
      include: {
        question: {
          select: {
            id: true,
            questionNumber: true,
            category: true,
            textEn: true,
            textTr: true,
            isPremium: true,
          },
        },
        option: {
          select: {
            id: true,
            labelEn: true,
            labelTr: true,
            value: true,
          },
        },
      },
      orderBy: { question: { questionNumber: 'asc' } },
    });

    return {
      answers: answers.map((a) => ({
        questionId: a.questionId,
        questionNumber: a.question.questionNumber,
        category: a.question.category,
        textEn: a.question.textEn,
        textTr: a.question.textTr,
        isPremium: a.question.isPremium,
        selectedOption: {
          id: a.option.id,
          labelEn: a.option.labelEn,
          labelTr: a.option.labelTr,
        },
        answeredAt: a.answeredAt,
      })),
      totalAnswered: answers.length,
      totalQuestions: TOTAL_QUESTION_COUNT,
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  /**
   * Consistently order two user IDs for pairwise storage.
   */
  private orderIds(a: string, b: string): { first: string; second: string } {
    return a < b ? { first: a, second: b } : { first: b, second: a };
  }

  private formatScoreResponse(
    userId: string,
    targetUserId: string,
    score: {
      baseScore: number;
      deepScore: number | null;
      finalScore: number;
      level: string;
      dimensionScores: unknown;
      updatedAt?: Date;
    },
  ) {
    return {
      userId,
      targetUserId,
      baseScore: score.baseScore,
      deepScore: score.deepScore,
      finalScore: score.finalScore,
      level: score.level,
      isSuperCompatible: score.level === 'SUPER',
      breakdown: score.dimensionScores ?? {},
    };
  }
}
