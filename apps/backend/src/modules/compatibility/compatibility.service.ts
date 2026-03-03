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
const SUPER_COMPATIBILITY_THRESHOLD = 90;
const CORE_QUESTION_COUNT = 20;
const TOTAL_QUESTION_COUNT = 45;

// Score display bounds — LOCKED per product spec
const MIN_DISPLAY_SCORE = 47;
const MAX_DISPLAY_SCORE = 97;

// Staleness threshold for cached scores — recalculate after 24 hours
const SCORE_STALENESS_MS = 24 * 60 * 60 * 1000;

// Turkish labels for compatibility dimension categories
const DIMENSION_LABELS_TR: Record<string, string> = {
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

// Conversation starter templates per category (Turkish)
const CONVERSATION_STARTERS_TR: Record<string, string[]> = {
  COMMUNICATION: [
    'Iletisimde en cok neye onem verirsiniz?',
    'Zor bir konuyu nasil dile getirirsiniz?',
  ],
  LIFE_GOALS: [
    '5 yil sonra kendinizi nerede goruyorsunuz?',
    'Hayattaki en buyuk hedefiniz ne?',
  ],
  VALUES: [
    'Sizin icin vazgecilmez degerleriniz neler?',
    'Hayatta en cok neye onem verirsiniz?',
  ],
  LIFESTYLE: [
    'Ideal bir hafta sonu nasil gecirir?',
    'Serbest zamaninizda en cok ne yapmayi seversiniz?',
  ],
  EMOTIONAL_INTELLIGENCE: [
    'Duygularinizi nasil ifade edersiniz?',
    'Zor zamanlarla nasil basa cikarsiniz?',
  ],
  RELATIONSHIP_EXPECTATIONS: [
    'Ideal bir iliskide en onemli sey sizce ne?',
    'Bir iliskiden beklentileriniz neler?',
  ],
  SOCIAL_COMPATIBILITY: [
    'Arkadasliklariniz sizin icin ne ifade ediyor?',
    'Sosyal ortamlarda kendinizi nasil hissedersiniz?',
  ],
  ATTACHMENT_STYLE: [
    'Yakinlik kurarken kendinizi rahat hisseder misiniz?',
    'Guven sizin icin ne anlama geliyor?',
  ],
  LOVE_LANGUAGE: [
    'Sevginizi nasil gosterirsiniz?',
    'Sevildigini en cok ne zaman hissedersiniz?',
  ],
  CONFLICT_STYLE: [
    'Bir anlasmazlik yasandiginda nasil tepki verirsiniz?',
    'Cozum odakli misiniz yoksa once duygulari mi konusursunuz?',
  ],
};

// Categories where balanced opposites are beneficial (complementary pairing)
// These categories benefit from diversity, not just similarity
const COMPLEMENTARY_CATEGORIES = new Set([
  'social_compatibility', // Introverts + extroverts can complement
  'lifestyle',            // Different life paces can balance
  'conflict_style',       // Different conflict approaches can be healthy
  'attachment_style',     // Anxious + secure pairing is well-documented
]);

@Injectable()
export class CompatibilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly badgesService: BadgesService,
  ) {}

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

    const answeredMap = new Map<string, string>(
      answers.map((a: { questionId: string; optionId: string }) => [a.questionId, a.optionId]),
    );

    // Build response
    const questionsWithStatus = questions.map((q: {
      id: string; questionNumber: number; category: string;
      textEn: string; textTr: string; weight: number;
      isPremium: boolean; options: unknown[];
    }) => ({
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

    // Check and award answer-related badges
    await this.badgesService.checkAndAwardBadges(userId, 'answer');

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

    const questionMap = new Map<string, { id: string; isPremium: boolean; options: { id: string }[] }>(
      questions.map((q: { id: string; isPremium: boolean; options: { id: string }[] }) => [q.id, q]),
    );

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
      const validOptionIds = question.options.map((o: { id: string }) => o.id);
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

    // Check and award answer-related badges
    await this.badgesService.checkAndAwardBadges(userId, 'answer');

    return {
      saved: true,
      savedCount: dto.answers.length,
      answeredCount,
      totalCount: hasPremiumAccess ? TOTAL_QUESTION_COUNT : CORE_QUESTION_COUNT,
    };
  }

  /**
   * Check daily compatibility check limit for the user's tier.
   * Free=1/day, Gold=3/day, Pro=5/day, Reserved=unlimited
   */
  private async checkDailyCompatibilityLimit(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { packageTier: true },
    });

    const DAILY_COMPAT_LIMITS: Record<string, number> = {
      FREE: 1,
      GOLD: 3,
      PRO: 5,
      RESERVED: 999999,
    };

    const dailyLimit = DAILY_COMPAT_LIMITS[user?.packageTier ?? 'FREE'] ?? 1;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = await this.prisma.compatibilityScore.count({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        calculatedAt: { gte: today },
      },
    });

    if (todayCount >= dailyLimit) {
      throw new ForbiddenException(
        `Günlük uyumluluk kontrol limitinize ulaştınız (${dailyLimit}). Daha fazla kontrol için paketinizi yükseltin.`,
      );
    }
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

    // Enforce daily compatibility check limit per tier
    await this.checkDailyCompatibilityLimit(userId);

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
    interface AnswerData {
      value: number;
      weight: number;
      category: string;
      isPremium: boolean;
    }
    const mapA = new Map<string, AnswerData>(
      answersA.map((a: { questionId: string; option: { value: number }; question: { weight: number; category: string; isPremium: boolean } }) => [
        a.questionId,
        { value: a.option.value, weight: a.question.weight, category: a.question.category, isPremium: a.question.isPremium },
      ]),
    );
    const mapB = new Map<string, AnswerData>(
      answersB.map((a: { questionId: string; option: { value: number }; question: { weight: number; category: string; isPremium: boolean } }) => [
        a.questionId,
        { value: a.option.value, weight: a.question.weight, category: a.question.category, isPremium: a.question.isPremium },
      ]),
    );

    // Find common questions (both users answered)
    const commonQuestionIds = [...mapA.keys()].filter((id) => mapB.has(id));

    if (commonQuestionIds.length === 0) {
      return {
        userId: userAId,
        targetUserId: userBId,
        baseScore: MIN_DISPLAY_SCORE,
        deepScore: null,
        finalScore: MIN_DISPLAY_SCORE,
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

      // Compatibility score: similarity OR complementary depending on category
      // Complementary categories: balanced opposites can score HIGHER than similar answers
      // This detects "anxious+secure", "introvert+extrovert" type pairings
      const rawSimilarity = 1 - Math.abs(a.value - b.value);
      let similarity: number;
      if (COMPLEMENTARY_CATEGORIES.has(a.category)) {
        // Complementary pairing: moderate differences score highest (sweet spot at ~0.4 difference)
        // Pure similarity: 1.0 -> 0.85, moderate diff: 0.4 -> 1.0, extreme diff: 1.0 -> 0.7
        const diff = Math.abs(a.value - b.value);
        const complementBonus = diff > 0.2 && diff < 0.7 ? 0.15 : 0;
        similarity = Math.max(0.4, rawSimilarity) + complementBonus;
        similarity = Math.min(1.0, similarity);
      } else {
        similarity = rawSimilarity;
      }
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

    // Intention tag alignment bonus
    const [userAProfile, userBProfile] = await Promise.all([
      this.prisma.userProfile.findUnique({
        where: { userId: first },
        select: { intentionTag: true },
      }),
      this.prisma.userProfile.findUnique({
        where: { userId: second },
        select: { intentionTag: true },
      }),
    ]);

    let intentionBonus = 0;
    if (userAProfile?.intentionTag && userBProfile?.intentionTag) {
      if (userAProfile.intentionTag === userBProfile.intentionTag) {
        intentionBonus = 3; // Same intention: +3 points to final score
      } else {
        intentionBonus = -1; // Different intention: slight penalty
      }
    }

    // Calculate raw percentage scores (0-100 range)
    const rawBaseScore = coreWeight > 0
      ? (coreTotal / coreWeight) * 100
      : 0;

    const hasPremiumAnswers = premiumWeight > 0;

    // Deep score = combined score from ALL questions (core + premium)
    const allWeight = coreWeight + premiumWeight;
    const allTotal = coreTotal + premiumTotal;
    const rawDeepScore = hasPremiumAnswers && allWeight > 0
      ? (allTotal / allWeight) * 100
      : null;

    // MASTER BRIEF: Premium NEVER changes displayed score, only ranking visibility
    // finalScore is ALWAYS based on core answers only
    // deepScore is stored separately for ranking and Deep Match features
    const rawFinalScore = rawBaseScore;
    const rawFinalScoreWithIntent = rawFinalScore + intentionBonus;

    // Clamp all scores to display range [47-97] — no 100%, minimum 47
    const clampScore = (raw: number): number =>
      Math.round(Math.max(MIN_DISPLAY_SCORE, Math.min(MAX_DISPLAY_SCORE, raw)));

    const baseScore = clampScore(rawBaseScore);
    const deepScore = rawDeepScore !== null ? clampScore(rawDeepScore) : null;
    const finalScore = clampScore(rawFinalScoreWithIntent);

    // Category breakdown (computed before level determination)
    const breakdown: Record<string, number> = {};
    for (const [cat, data] of Object.entries(categoryScores)) {
      breakdown[cat] = data.weight > 0
        ? Math.round((data.total / data.weight) * 100)
        : 0;
    }

    // SUPER compatibility requires multi-criteria (per shared types spec):
    // - finalScore >= 90
    // - All dimensions >= 60
    // - At least 3 dimensions >= 90
    const dimensionValues = Object.values(breakdown);
    const allDimensionsAbove60 = dimensionValues.length > 0 && dimensionValues.every((v) => v >= 60);
    const highDimensionCount = dimensionValues.filter((v) => v >= 90).length;
    const level = (
      finalScore >= SUPER_COMPATIBILITY_THRESHOLD &&
      allDimensionsAbove60 &&
      highDimensionCount >= 3
    ) ? 'SUPER' : 'NORMAL';

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

    // Award Deep Match badge if both users answered all 45 questions
    if (deepScore !== null) {
      await Promise.all([
        this.badgesService.checkAndAwardBadges(first, 'compatibility'),
        this.badgesService.checkAndAwardBadges(second, 'compatibility'),
      ]);
    }

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
      answers: answers.map((a: {
        questionId: string;
        question: { questionNumber: number; category: string; textEn: string; textTr: string; isPremium: boolean };
        option: { id: string; labelEn: string; labelTr: string };
        answeredAt: Date;
      }) => ({
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

  /**
   * Get detailed compatibility breakdown between current user and target.
   * Returns strong areas, differences, and conversation starters (all Turkish).
   */
  async getDetailedCompatibility(
    userId: string,
    targetUserId: string,
  ): Promise<{
    score: number;
    level: 'NORMAL' | 'SUPER';
    strongAreas: Array<{ category: string; labelTr: string; description: string }>;
    differences: Array<{ category: string; labelTr: string; description: string }>;
    conversationStarters: string[];
  }> {
    if (userId === targetUserId) {
      throw new BadRequestException('Kendinizle uyumluluk detayi goruntuleyemezsiniz');
    }

    const { first, second } = this.orderIds(userId, targetUserId);

    // Fetch or compute the score
    let existingScore = await this.prisma.compatibilityScore.findUnique({
      where: { userAId_userBId: { userAId: first, userBId: second } },
    });

    if (!existingScore) {
      await this.calculateAndStoreScore(userId, targetUserId);
      existingScore = await this.prisma.compatibilityScore.findUnique({
        where: { userAId_userBId: { userAId: first, userBId: second } },
      });
    }

    const finalScore = existingScore?.finalScore ?? MIN_DISPLAY_SCORE;
    const level = (existingScore?.level ?? 'NORMAL') as 'NORMAL' | 'SUPER';
    const dimensionScores = (existingScore?.dimensionScores ?? {}) as Record<string, number>;

    // Partition dimensions into strong areas and differences
    const strongAreas: Array<{ category: string; labelTr: string; description: string }> = [];
    const differences: Array<{ category: string; labelTr: string; description: string }> = [];

    for (const [category, score] of Object.entries(dimensionScores)) {
      const labelTr = DIMENSION_LABELS_TR[category] ?? category;

      if (score >= 70) {
        strongAreas.push({
          category,
          labelTr,
          description: score >= 90
            ? `${labelTr} alaninda mukemmel bir uyumunuz var (%${Math.round(score)})`
            : `${labelTr} alaninda guclu bir uyumunuz var (%${Math.round(score)})`,
        });
      } else {
        differences.push({
          category,
          labelTr,
          description: score >= 50
            ? `${labelTr} alaninda farkli bakis acilariniz var (%${Math.round(score)})`
            : `${labelTr} alaninda belirgin farkliliklar mevcut (%${Math.round(score)})`,
        });
      }
    }

    // Sort strong areas by score (descending), differences by score (ascending)
    strongAreas.sort((a, b) => {
      const scoreA = dimensionScores[a.category] ?? 0;
      const scoreB = dimensionScores[b.category] ?? 0;
      return scoreB - scoreA;
    });
    differences.sort((a, b) => {
      const scoreA = dimensionScores[a.category] ?? 0;
      const scoreB = dimensionScores[b.category] ?? 0;
      return scoreA - scoreB;
    });

    // Generate conversation starters based on dimensions
    const conversationStarters = this.generateConversationStarters(
      dimensionScores,
      strongAreas,
      differences,
    );

    return {
      score: finalScore,
      level,
      strongAreas,
      differences,
      conversationStarters,
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

  /**
   * Generate conversation starter suggestions based on compatibility dimensions.
   * Picks starters from strong areas and difference areas for balanced discussion.
   */
  private generateConversationStarters(
    dimensionScores: Record<string, number>,
    strongAreas: Array<{ category: string }>,
    differences: Array<{ category: string }>,
  ): string[] {
    const starters: string[] = [];
    const usedCategories = new Set<string>();

    // Add 1-2 starters from strong areas
    for (const area of strongAreas.slice(0, 2)) {
      const categoryStarters = CONVERSATION_STARTERS_TR[area.category];
      if (categoryStarters && categoryStarters.length > 0 && !usedCategories.has(area.category)) {
        starters.push(categoryStarters[0]);
        usedCategories.add(area.category);
      }
    }

    // Add 1 starter from differences (to explore different perspectives)
    for (const diff of differences.slice(0, 1)) {
      const categoryStarters = CONVERSATION_STARTERS_TR[diff.category];
      if (categoryStarters && categoryStarters.length > 1 && !usedCategories.has(diff.category)) {
        starters.push(categoryStarters[1]);
        usedCategories.add(diff.category);
      }
    }

    // Fill remaining slots from any unused high-score categories
    if (starters.length < 3) {
      const sortedDimensions = Object.entries(dimensionScores)
        .sort((a, b) => b[1] - a[1]);

      for (const [category] of sortedDimensions) {
        if (starters.length >= 3) break;
        if (usedCategories.has(category)) continue;

        const categoryStarters = CONVERSATION_STARTERS_TR[category];
        if (categoryStarters && categoryStarters.length > 0) {
          starters.push(categoryStarters[0]);
          usedCategories.add(category);
        }
      }
    }

    // Fallback if no dimension-based starters available
    if (starters.length === 0) {
      starters.push(
        'Hayatta en cok neye onem verirsiniz?',
        'Ideal bir hafta sonu nasil gecirirsiniz?',
        'Sizi en cok ne mutlu eder?',
      );
    }

    return starters.slice(0, 5);
  }
}
