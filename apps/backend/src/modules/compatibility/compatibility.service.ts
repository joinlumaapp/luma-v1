import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BadgesService } from "../badges/badges.service";
import { LumaCacheService, CACHE_KEYS } from "../cache/cache.service";
import { SubmitAnswerDto, SubmitAnswersBulkDto } from "./dto";

// LOCKED: 2 Compatibility Levels
const SUPER_COMPATIBILITY_THRESHOLD = 90;
const QUESTION_COUNT = 20;

// Score display bounds — LOCKED per product spec
const MIN_DISPLAY_SCORE = 47;
const MAX_DISPLAY_SCORE = 97;

// Staleness threshold for cached scores — recalculate after 24 hours
const SCORE_STALENESS_MS = 24 * 60 * 60 * 1000;

// Redis cache TTL for compatibility scores (24 hours in seconds)
const SCORE_CACHE_TTL = 86400;

// ─── Scoring Constants ────────────────────────────────────────
// Points awarded based on answer proximity (option order distance)
const EXACT_MATCH_POINTS = 100;
const ADJACENT_MATCH_POINTS = 70; // 1 step apart
const TWO_STEP_MATCH_POINTS = 40; // 2 steps apart
const FAR_MATCH_POINTS = 10; // 3+ steps apart

// All 20 questions are equally weighted (no premium tier)
const QUESTION_WEIGHT_MULTIPLIER = 1;

// Bonus percentages for profile alignment
const INTENTION_TAG_BONUS_PERCENT = 10; // +10% for matching intention tags
const SAME_CITY_BONUS_PERCENT = 5; // +5% for same city

// Turkish labels for compatibility dimension categories (8 new categories)
const DIMENSION_LABELS_TR: Record<string, string> = {
  COMMUNICATION: "İletişim Tarzı",
  CONFLICT_RESOLUTION: "Çatışma Çözümü",
  EMOTIONAL_DEPTH: "Duygusal Derinlik",
  SOCIAL_ENERGY: "Sosyal Enerji",
  LIFE_PACE: "Yaşam Temposu",
  LONG_TERM_VISION: "Uzun Vadeli Vizyon",
  RELATIONSHIP_EXPECTATIONS: "İlişki Beklentileri",
  LIFESTYLE_COMPATIBILITY: "Yaşam Tarzı Uyumu",
  // Lowercase variants for consistent lookup
  communication: "İletişim Tarzı",
  conflict_resolution: "Çatışma Çözümü",
  emotional_depth: "Duygusal Derinlik",
  social_energy: "Sosyal Enerji",
  life_pace: "Yaşam Temposu",
  long_term_vision: "Uzun Vadeli Vizyon",
  relationship_expectations: "İlişki Beklentileri",
  lifestyle_compatibility: "Yaşam Tarzı Uyumu",
};

// Conversation starter templates per category (Turkish)
const CONVERSATION_STARTERS_TR: Record<string, string[]> = {
  COMMUNICATION: [
    "İletişimde en çok neye önem verirsiniz?",
    "Zor bir konuyu nasıl dile getirirsiniz?",
  ],
  CONFLICT_RESOLUTION: [
    "Bir anlaşmazlık yaşandığında nasıl tepki verirsiniz?",
    "Çözüm odaklı mısınız yoksa önce duyguları mı konuşursunuz?",
  ],
  EMOTIONAL_DEPTH: [
    "Duygularınızı nasıl ifade edersiniz?",
    "Zor zamanlarla nasıl başa çıkarsınız?",
  ],
  SOCIAL_ENERGY: [
    "Arkadaşlıklarınız sizin için ne ifade ediyor?",
    "Sosyal ortamlarda kendinizi nasıl hissedersiniz?",
  ],
  LIFE_PACE: [
    "İdeal bir hafta sonu nasıl geçirir?",
    "Serbest zamanınızda en çok ne yapmayı seversiniz?",
  ],
  LONG_TERM_VISION: [
    "5 yıl sonra kendinizi nerede görüyorsunuz?",
    "Hayattaki en büyük hedefiniz ne?",
  ],
  RELATIONSHIP_EXPECTATIONS: [
    "İdeal bir ilişkide en önemli şey sizce ne?",
    "Bir ilişkiden beklentileriniz neler?",
  ],
  LIFESTYLE_COMPATIBILITY: [
    "Sizin için vazgeçilmez yaşam alışkanlıklarınız neler?",
    "Hayat tarzınızda en çok neye önem verirsiniz?",
  ],
};

// Turkish reason templates based on category scores (8 new categories)
const REASON_TEMPLATES_TR: Record<string, { high: string; medium: string }> = {
  COMMUNICATION: {
    high: "İletişim tarzlarınız çok uyumlu",
    medium: "İletişim konusunda birbirinizi tamamlıyorsunuz",
  },
  CONFLICT_RESOLUTION: {
    high: "Çatışma çözme yaklaşımlarınız benzer",
    medium: "Sorunlara birlikte yaklaşabilirsiniz",
  },
  EMOTIONAL_DEPTH: {
    high: "Duygusal derinliğiniz birbirine çok yakın",
    medium: "Duygusal anlayışınız uyumlu",
  },
  SOCIAL_ENERGY: {
    high: "Sosyal enerji seviyeniz mükemmel uyumlu",
    medium: "Sosyal dünyalarınız birbirine yakın",
  },
  LIFE_PACE: {
    high: "Yaşam tempolarınız birbiriyle uyumlu",
    medium: "Birbirinize denk bir yaşam tempoinuz var",
  },
  LONG_TERM_VISION: {
    high: "Uzun vadeli vizyonunuz ortak bir noktada buluşuyor",
    medium: "Geleceğe benzer gözlerle bakıyorsunuz",
  },
  RELATIONSHIP_EXPECTATIONS: {
    high: "İlişki beklentileriniz neredeyse aynı",
    medium: "İlişkide ortak beklentileriniz var",
  },
  LIFESTYLE_COMPATIBILITY: {
    high: "Yaşam tarzlarınız birbiriyle uyumlu",
    medium: "Yaşam alışkanlıklarınız birbirine yakın",
  },
};

// Categories where balanced opposites are beneficial (complementary pairing)
// These categories benefit from diversity, not just similarity
const COMPLEMENTARY_CATEGORIES = new Set([
  "SOCIAL_ENERGY", // Introverts + extroverts can complement
  "LIFE_PACE", // Different life paces can balance
  "CONFLICT_RESOLUTION", // Different conflict approaches can be healthy
]);

// Compatibility level label thresholds (before display clamping)
interface LevelLabelInfo {
  label: string;
  minScore: number;
}

const LEVEL_LABELS: LevelLabelInfo[] = [
  { label: "Yuksek Uyum", minScore: 80 },
  { label: "Iyi Uyum", minScore: 60 },
  { label: "Orta Uyum", minScore: 40 },
  { label: "Dusuk Uyum", minScore: 0 },
];

// ─── Internal type for answer data during scoring ─────────────
interface AnswerData {
  optionOrder: number; // 0-based order of the selected option
  optionCount: number; // total number of options for this question
  value: number; // normalized 0-1 value
  weight: number; // question weight from DB
  category: string; // question category
}

// ─── Internal type for category score accumulation ────────────
interface CategoryAccumulator {
  totalPoints: number;
  maxPoints: number;
  count: number;
}

// ─── Cached score shape stored in Redis ───────────────────────
interface CachedCompatibilityScore {
  userId: string;
  targetUserId: string;
  finalScore: number;
  level: string;
  levelLabel: string;
  isSuperCompatible: boolean;
  breakdown: Record<string, number>;
  categoryScores: Array<{
    category: string;
    categoryLabel: string;
    score: number;
    matchedQuestions: number;
  }>;
  topReasons: string[];
  bonuses: {
    intentionTagMatch: number;
    sameCityBonus: number;
    totalBonus: number;
  };
  commonQuestions: number;
}

@Injectable()
export class CompatibilityService {
  private readonly logger = new Logger(CompatibilityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly badgesService: BadgesService,
    private readonly cacheService: LumaCacheService,
  ) {}

  /**
   * Get all compatibility questions.
   * LUMA has exactly 20 mandatory uyum questions (LOCKED).
   */
  async getQuestions(userId: string) {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException("Kullanıcı bulunamadı");
    }

    // Fetch all active questions with options
    const questions = await this.prisma.compatibilityQuestion.findMany({
      where: {
        isActive: true,
      },
      include: {
        options: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            labelEn: true,
            labelTr: true,
            order: true,
          },
        },
      },
      orderBy: { questionNumber: "asc" },
    });

    // Get user's existing answers
    const answers = await this.prisma.userAnswer.findMany({
      where: { userId },
      select: { questionId: true, optionId: true },
    });

    const answeredMap = new Map<string, string>(
      answers.map((a: { questionId: string; optionId: string }) => [
        a.questionId,
        a.optionId,
      ]),
    );

    // Build response
    const questionsWithStatus = questions.map(
      (q: {
        id: string;
        questionNumber: number;
        category: string;
        textEn: string;
        textTr: string;
        weight: number;
        options: unknown[];
      }) => ({
        id: q.id,
        questionNumber: q.questionNumber,
        category: q.category,
        textEn: q.textEn,
        textTr: q.textTr,
        weight: q.weight,
        options: q.options,
        answeredOptionId: answeredMap.get(q.id) ?? null,
        isAnswered: answeredMap.has(q.id),
      }),
    );

    return {
      questions: questionsWithStatus,
      answeredCount: answers.length,
      totalCount: QUESTION_COUNT,
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
        options: { orderBy: { order: "asc" } },
      },
    });

    if (!question || !question.isActive) {
      throw new NotFoundException("Soru bulunamadı");
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

    // Invalidate cached compatibility scores for this user
    await this.invalidateUserCompatibilityCache(userId);

    // Count total answers for progress tracking
    const answeredCount = await this.prisma.userAnswer.count({
      where: { userId },
    });

    // Check and award answer-related badges
    await this.badgesService.checkAndAwardBadges(userId, "answer");

    return {
      questionId: dto.questionId,
      optionId: selectedOption.id,
      saved: true,
      answeredCount,
      totalCount: QUESTION_COUNT,
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
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException("Kullanıcı bulunamadı");
    }

    // Fetch all referenced questions with their options
    const questionIds = dto.answers.map((a) => a.questionId);
    const questions = await this.prisma.compatibilityQuestion.findMany({
      where: { id: { in: questionIds }, isActive: true },
      include: { options: { select: { id: true } } },
    });

    const questionMap = new Map<
      string,
      { id: string; options: { id: string }[] }
    >(
      questions.map(
        (q: { id: string; options: { id: string }[] }) => [
          q.id,
          q,
        ],
      ),
    );

    // Validate each answer
    for (const answer of dto.answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) {
        throw new NotFoundException(`Soru bulunamadı: ${answer.questionId}`);
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

    // Invalidate cached compatibility scores for this user
    await this.invalidateUserCompatibilityCache(userId);

    // Count total answers for progress tracking
    const answeredCount = await this.prisma.userAnswer.count({
      where: { userId },
    });

    // Check and award answer-related badges
    await this.badgesService.checkAndAwardBadges(userId, "answer");

    return {
      saved: true,
      savedCount: dto.answers.length,
      answeredCount,
      totalCount: QUESTION_COUNT,
    };
  }

  /**
   * Get user's quiz progress — answered question numbers and last answered.
   */
  async getProgress(userId: string) {
    const answers = await this.prisma.userAnswer.findMany({
      where: { userId },
      include: {
        question: { select: { questionNumber: true } },
      },
      orderBy: { answeredAt: "asc" },
    });

    const completedQuestions = answers.map(
      (a: { question: { questionNumber: number } }) => a.question.questionNumber,
    );
    const lastQuestion =
      completedQuestions.length > 0
        ? Math.max(...completedQuestions)
        : 0;

    return {
      completedQuestions,
      lastQuestion,
      answeredCount: answers.length,
      totalCount: QUESTION_COUNT,
    };
  }

  /**
   * Trigger compatibility score calculation after completing all 20 questions.
   * Invalidates stale caches so next discovery queries get fresh scores.
   */
  async triggerCalculate(userId: string) {
    const answeredCount = await this.prisma.userAnswer.count({
      where: { userId },
    });

    if (answeredCount < QUESTION_COUNT) {
      return {
        calculated: false,
        reason: `Henüz ${answeredCount}/${QUESTION_COUNT} soru cevaplanmış.`,
        answeredCount,
        totalCount: QUESTION_COUNT,
      };
    }

    // Invalidate all cached scores so they're recalculated on next access
    await this.invalidateUserCompatibilityCache(userId);

    // Check and award completion badges
    await this.badgesService.checkAndAwardBadges(userId, "answer");

    return {
      calculated: true,
      answeredCount,
      totalCount: QUESTION_COUNT,
    };
  }

  /**
   * Check daily compatibility check limit for the user's tier.
   * Free=1/day, Premium=5/day, Supreme=unlimited
   */
  private async checkDailyCompatibilityLimit(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { packageTier: true },
    });

    const DAILY_COMPAT_LIMITS: Record<string, number> = {
      FREE: 1,
      PREMIUM: 5,
      SUPREME: 999999,
    };

    const dailyLimit = DAILY_COMPAT_LIMITS[user?.packageTier ?? "FREE"] ?? 1;

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
   * Uses Redis cache with 24h TTL for performance.
   */
  async getScoreWithUser(userId: string, targetUserId: string) {
    // Guard: prevent self-comparison
    if (userId === targetUserId) {
      throw new BadRequestException("Kendinizle uyumluluk puani hesaplanamaz");
    }

    // Enforce daily compatibility check limit per tier
    await this.checkDailyCompatibilityLimit(userId);

    // Check Redis cache first
    const { first, second } = this.orderIds(userId, targetUserId);
    const cacheKey = CACHE_KEYS.compatScore(first, second);
    const cached =
      await this.cacheService.get<CachedCompatibilityScore>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for compatibility ${first}:${second}`);
      return cached;
    }

    // Check if score is already computed in DB
    const existingScore = await this.prisma.compatibilityScore.findUnique({
      where: {
        userAId_userBId: { userAId: first, userBId: second },
      },
    });

    if (existingScore) {
      // Check staleness — recalculate if older than threshold
      const age = Date.now() - new Date(existingScore.updatedAt).getTime();
      if (age > SCORE_STALENESS_MS) {
        return this.calculateAndStoreScore(userId, targetUserId);
      }
      const response = this.formatScoreResponse(
        userId,
        targetUserId,
        existingScore,
      );
      // Cache the response
      await this.cacheService.set(cacheKey, response, SCORE_CACHE_TTL);
      return response;
    }

    // Calculate score
    return this.calculateAndStoreScore(userId, targetUserId);
  }

  /**
   * Calculate pairwise compatibility score between two users.
   *
   * Algorithm:
   * 1. Fetch both users' answers with option order information
   * 2. For each common question, calculate points based on answer distance:
   *    - Exact match: 100 points
   *    - 1 step apart: 70 points
   *    - 2 steps apart: 40 points
   *    - 3+ steps apart: 10 points
   * 3. Core questions (Q1-Q20) are weighted 2x compared to premium (Q21-Q45)
   * 4. Calculate per-category sub-scores
   * 5. Apply bonuses: +10% intention tag match, +5% same city
   * 6. Determine compatibility level (NORMAL / SUPER)
   * 7. Cache result in Redis with 24h TTL
   */
  async calculateAndStoreScore(userAId: string, userBId: string) {
    // Order IDs consistently for storage
    const { first, second } = this.orderIds(userAId, userBId);

    // Get both users' answers with question details and option orders
    const [answersA, answersB] = await Promise.all([
      this.prisma.userAnswer.findMany({
        where: { userId: first },
        include: {
          question: {
            include: {
              options: {
                orderBy: { order: "asc" },
                select: { id: true, order: true, value: true },
              },
            },
          },
          option: true,
        },
      }),
      this.prisma.userAnswer.findMany({
        where: { userId: second },
        include: {
          question: {
            include: {
              options: {
                orderBy: { order: "asc" },
                select: { id: true, order: true, value: true },
              },
            },
          },
          option: true,
        },
      }),
    ]);

    // Create answer maps: questionId -> AnswerData
    const mapA = new Map<string, AnswerData>();
    for (const a of answersA) {
      const q = a.question as {
        weight: number;
        category: string;
        options: Array<{ id: string; order: number; value: number }>;
      };
      const opt = a.option as { value: number; order: number };
      mapA.set(a.questionId, {
        optionOrder: opt.order,
        optionCount: q.options.length,
        value: opt.value,
        weight: q.weight,
        category: q.category,
      });
    }

    const mapB = new Map<string, AnswerData>();
    for (const b of answersB) {
      const q = b.question as {
        weight: number;
        category: string;
        options: Array<{ id: string; order: number; value: number }>;
      };
      const opt = b.option as { value: number; order: number };
      mapB.set(b.questionId, {
        optionOrder: opt.order,
        optionCount: q.options.length,
        value: opt.value,
        weight: q.weight,
        category: q.category,
      });
    }

    // Find common questions (both users answered)
    const commonQuestionIds = [...mapA.keys()].filter((id) => mapB.has(id));

    if (commonQuestionIds.length === 0) {
      const emptyResponse: CachedCompatibilityScore = {
        userId: userAId,
        targetUserId: userBId,
        finalScore: MIN_DISPLAY_SCORE,
        level: "NORMAL",
        levelLabel: "Orta Uyum",
        isSuperCompatible: false,
        breakdown: {},
        categoryScores: [],
        topReasons: [],
        bonuses: { intentionTagMatch: 0, sameCityBonus: 0, totalBonus: 0 },
        commonQuestions: 0,
      };
      return emptyResponse;
    }

    // Calculate scores per category using step-based scoring
    const categoryAccumulators: Record<string, CategoryAccumulator> = {};
    let totalWeightedPoints = 0;
    let totalMaxPoints = 0;

    for (const qId of commonQuestionIds) {
      const a = mapA.get(qId)!;
      const b = mapB.get(qId)!;

      // Calculate step distance between answers
      const stepDistance = Math.abs(a.optionOrder - b.optionOrder);

      // Award points based on proximity
      let rawPoints: number;
      if (stepDistance === 0) {
        rawPoints = EXACT_MATCH_POINTS;
      } else if (stepDistance === 1) {
        rawPoints = ADJACENT_MATCH_POINTS;
      } else if (stepDistance === 2) {
        rawPoints = TWO_STEP_MATCH_POINTS;
      } else {
        rawPoints = FAR_MATCH_POINTS;
      }

      // Apply complementary category bonus for moderate differences
      if (
        COMPLEMENTARY_CATEGORIES.has(a.category) &&
        stepDistance >= 1 &&
        stepDistance <= 2
      ) {
        // Moderate differences in complementary categories get a bonus
        rawPoints = Math.min(EXACT_MATCH_POINTS, rawPoints + 15);
      }

      // Apply weight multiplier
      const weightedPoints = rawPoints * a.weight * QUESTION_WEIGHT_MULTIPLIER;
      const maxPossible = EXACT_MATCH_POINTS * a.weight * QUESTION_WEIGHT_MULTIPLIER;

      // Accumulate category scores
      if (!categoryAccumulators[a.category]) {
        categoryAccumulators[a.category] = {
          totalPoints: 0,
          maxPoints: 0,
          count: 0,
        };
      }
      categoryAccumulators[a.category].totalPoints += weightedPoints;
      categoryAccumulators[a.category].maxPoints += maxPossible;
      categoryAccumulators[a.category].count++;

      // Accumulate totals
      totalWeightedPoints += weightedPoints;
      totalMaxPoints += maxPossible;
    }

    // Fetch both user profiles for bonus + lifestyle + deal-breaker calculation
    const [userAProfile, userBProfile] = await Promise.all([
      this.prisma.userProfile.findUnique({
        where: { userId: first },
        select: {
          intentionTag: true, city: true,
          smoking: true, drinking: true, diet: true,
          sleepSchedule: true, hookah: true, workStyle: true,
          travelFrequency: true, communicationStyle: true,
        },
      }),
      this.prisma.userProfile.findUnique({
        where: { userId: second },
        select: {
          intentionTag: true, city: true,
          smoking: true, drinking: true, diet: true,
          sleepSchedule: true, hookah: true, workStyle: true,
          travelFrequency: true, communicationStyle: true,
        },
      }),
    ]);

    // Calculate bonus percentages
    let intentionBonus = 0;
    if (
      userAProfile?.intentionTag &&
      userBProfile?.intentionTag &&
      userAProfile.intentionTag === userBProfile.intentionTag
    ) {
      intentionBonus = INTENTION_TAG_BONUS_PERCENT;
    }

    let cityBonus = 0;
    if (
      userAProfile?.city &&
      userBProfile?.city &&
      userAProfile.city.toLowerCase() === userBProfile.city.toLowerCase()
    ) {
      cityBonus = SAME_CITY_BONUS_PERCENT;
    }

    const totalBonus = intentionBonus + cityBonus;

    // ── Lifestyle alignment bonus (max +8 points) ──
    let lifestyleBonus = 0;
    if (userAProfile && userBProfile) {
      const exactMatch = (a: string | null, b: string | null): boolean =>
        !!a && !!b && a.toLowerCase() === b.toLowerCase();
      if (exactMatch(userAProfile.smoking, userBProfile.smoking)) lifestyleBonus++;
      if (exactMatch(userAProfile.drinking, userBProfile.drinking)) lifestyleBonus++;
      if (exactMatch(userAProfile.diet, userBProfile.diet)) lifestyleBonus++;
      if (exactMatch(userAProfile.sleepSchedule, userBProfile.sleepSchedule)) lifestyleBonus++;
      // hookah removed — sigara ile aynı sayılır
      if (exactMatch(userAProfile.workStyle, userBProfile.workStyle)) lifestyleBonus++;
      if (exactMatch(userAProfile.travelFrequency, userBProfile.travelFrequency)) lifestyleBonus++;
      if (exactMatch(userAProfile.communicationStyle, userBProfile.communicationStyle)) lifestyleBonus++;
    }
    const lifestyleBonusPoints = (lifestyleBonus / 7) * 7; // max +7 (hookah removed)

    // ── Deal-breaker penalties ──
    let dealBreakerPenalty = 0;
    // Children question (Q14) — max distance = strong mismatch
    const childrenQuestionIds = commonQuestionIds.filter((qId) => {
      const a = mapA.get(qId);
      return a?.category === 'LONG_TERM_VISION';
    });
    for (const qId of childrenQuestionIds) {
      const a = mapA.get(qId)!;
      const b = mapB.get(qId)!;
      if (Math.abs(a.optionOrder - b.optionOrder) === 3) {
        dealBreakerPenalty += 5; // max distance on critical life question
        break; // only penalize once for this dimension
      }
    }
    // Smoking hard mismatch
    if (userAProfile && userBProfile) {
      const smokingA = (userAProfile.smoking ?? '').toLowerCase();
      const smokingB = (userBProfile.smoking ?? '').toLowerCase();
      if ((smokingA === 'iciyor' && smokingB === 'icmiyor') || (smokingA === 'icmiyor' && smokingB === 'iciyor')) {
        dealBreakerPenalty += 3;
      }
      // hookah deal-breaker removed — sigara ile aynı sayılır
      // Drinking hard mismatch
      const drinkingA = (userAProfile.drinking ?? '').toLowerCase();
      const drinkingB = (userBProfile.drinking ?? '').toLowerCase();
      if ((drinkingA === 'iciyor' && drinkingB === 'icmiyor') || (drinkingA === 'icmiyor' && drinkingB === 'iciyor')) {
        dealBreakerPenalty += 2;
      }
    }

    // Calculate raw percentage score (0-100 range)
    const rawScore =
      totalMaxPoints > 0 ? (totalWeightedPoints / totalMaxPoints) * 100 : 0;

    // Apply bonuses, lifestyle bonus, and deal-breaker penalties, then clamp
    const rawScoreWithBonuses = Math.min(
      100,
      rawScore + totalBonus + lifestyleBonusPoints - dealBreakerPenalty,
    );

    const clampScore = (raw: number): number =>
      Math.round(Math.max(MIN_DISPLAY_SCORE, Math.min(MAX_DISPLAY_SCORE, raw)));

    const finalScore = clampScore(rawScoreWithBonuses);

    // Category breakdown
    const breakdown: Record<string, number> = {};
    const categoryScores: Array<{
      category: string;
      categoryLabel: string;
      score: number;
      matchedQuestions: number;
    }> = [];

    for (const [cat, data] of Object.entries(categoryAccumulators)) {
      const catScore =
        data.maxPoints > 0
          ? Math.round((data.totalPoints / data.maxPoints) * 100)
          : 0;
      breakdown[cat] = catScore;
      categoryScores.push({
        category: cat,
        categoryLabel: DIMENSION_LABELS_TR[cat] ?? cat,
        score: catScore,
        matchedQuestions: data.count,
      });
    }

    // Sort category scores by score descending
    categoryScores.sort((a, b) => b.score - a.score);

    // SUPER compatibility requires multi-criteria (per shared types spec):
    // - finalScore >= 90
    // - All dimensions >= 60
    // - At least 3 dimensions >= 90
    const dimensionValues = Object.values(breakdown);
    const allDimensionsAbove60 =
      dimensionValues.length > 0 && dimensionValues.every((v) => v >= 60);
    const highDimensionCount = dimensionValues.filter((v) => v >= 90).length;
    const level =
      finalScore >= SUPER_COMPATIBILITY_THRESHOLD &&
      allDimensionsAbove60 &&
      highDimensionCount >= 3
        ? "SUPER"
        : "NORMAL";

    // Determine display-friendly level label
    const levelLabel = this.getLevelLabel(rawScoreWithBonuses);

    // Generate top 3 compatibility reasons in Turkish
    const topReasons = this.getTopCompatibilityReasons(
      categoryScores,
      intentionBonus,
      cityBonus,
    );

    // Store/update the score in DB
    const score = await this.prisma.compatibilityScore.upsert({
      where: {
        userAId_userBId: { userAId: first, userBId: second },
      },
      create: {
        userAId: first,
        userBId: second,
        finalScore,
        level,
        dimensionScores: breakdown,
      },
      update: {
        finalScore,
        level,
        dimensionScores: breakdown,
      },
    });

    // Award compatibility badges
    await Promise.all([
      this.badgesService.checkAndAwardBadges(first, "compatibility"),
      this.badgesService.checkAndAwardBadges(second, "compatibility"),
    ]);

    const response: CachedCompatibilityScore = {
      userId: userAId,
      targetUserId: userBId,
      finalScore: score.finalScore,
      level: score.level,
      levelLabel,
      isSuperCompatible: score.level === "SUPER",
      breakdown: (score.dimensionScores ?? {}) as Record<string, number>,
      categoryScores,
      topReasons,
      bonuses: {
        intentionTagMatch: intentionBonus,
        sameCityBonus: cityBonus,
        totalBonus,
      },
      commonQuestions: commonQuestionIds.length,
    };

    // Cache the result in Redis with 24h TTL
    const cacheKey = CACHE_KEYS.compatScore(first, second);
    await this.cacheService.set(cacheKey, response, SCORE_CACHE_TTL);

    return response;
  }

  /**
   * Get top 3 compatibility reasons in Turkish.
   * Based on highest-scoring categories and any active bonuses.
   */
  getTopCompatibilityReasons(
    categoryScores: Array<{ category: string; score: number }>,
    intentionBonus: number,
    cityBonus: number,
  ): string[] {
    const reasons: string[] = [];

    // Add top category-based reasons (highest scoring categories first)
    const sorted = [...categoryScores].sort((a, b) => b.score - a.score);

    for (const cat of sorted) {
      if (reasons.length >= 3) break;

      const templates = REASON_TEMPLATES_TR[cat.category];
      if (!templates) continue;

      if (cat.score >= 75) {
        reasons.push(templates.high);
      } else if (cat.score >= 50) {
        reasons.push(templates.medium);
      }
    }

    // Add bonus-based reasons if there is room
    if (reasons.length < 3 && intentionBonus > 0) {
      reasons.push("Ayni iliski niyetine sahipsiniz");
    }

    if (reasons.length < 3 && cityBonus > 0) {
      reasons.push("Ayni sehirde yasiyorsunuz");
    }

    // Fallback reasons if not enough data
    if (reasons.length === 0) {
      reasons.push("Ortak sorulari yanıtlayarak uyumunuzu kesfedebilirsiniz");
    }

    return reasons.slice(0, 3);
  }

  /**
   * Get category-level compatibility scores between two users.
   * Returns an array of CategoryScore objects sorted by score descending.
   */
  async getCategoryScores(
    userId: string,
    targetUserId: string,
  ): Promise<
    Array<{
      category: string;
      categoryLabel: string;
      score: number;
      matchedQuestions: number;
    }>
  > {
    const { first, second } = this.orderIds(userId, targetUserId);

    // Try to get from existing stored score
    const existingScore = await this.prisma.compatibilityScore.findUnique({
      where: { userAId_userBId: { userAId: first, userBId: second } },
    });

    if (existingScore?.dimensionScores) {
      const dimensions = existingScore.dimensionScores as Record<
        string,
        number
      >;
      return Object.entries(dimensions)
        .map(([category, score]) => ({
          category,
          categoryLabel: DIMENSION_LABELS_TR[category] ?? category,
          score,
          matchedQuestions: 0, // not stored in DB, would need recalculation for exact count
        }))
        .sort((a, b) => b.score - a.score);
    }

    // If no stored score, calculate fresh
    const result = await this.calculateAndStoreScore(userId, targetUserId);
    return result.categoryScores;
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
      orderBy: { question: { questionNumber: "asc" } },
    });

    return {
      answers: answers.map(
        (a: {
          questionId: string;
          question: {
            questionNumber: number;
            category: string;
            textEn: string;
            textTr: string;
          };
          option: { id: string; labelEn: string; labelTr: string };
          answeredAt: Date;
        }) => ({
          questionId: a.questionId,
          questionNumber: a.question.questionNumber,
          category: a.question.category,
          textEn: a.question.textEn,
          textTr: a.question.textTr,
          selectedOption: {
            id: a.option.id,
            labelEn: a.option.labelEn,
            labelTr: a.option.labelTr,
          },
          answeredAt: a.answeredAt,
        }),
      ),
      totalAnswered: answers.length,
      totalQuestions: QUESTION_COUNT,
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
    level: "NORMAL" | "SUPER";
    levelLabel: string;
    strongAreas: Array<{
      category: string;
      labelTr: string;
      description: string;
    }>;
    differences: Array<{
      category: string;
      labelTr: string;
      description: string;
    }>;
    conversationStarters: string[];
    topReasons: string[];
  }> {
    if (userId === targetUserId) {
      throw new BadRequestException(
        "Kendinizle uyumluluk detayi goruntuleyemezsiniz",
      );
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
    const level = (existingScore?.level ?? "NORMAL") as "NORMAL" | "SUPER";
    const dimensionScores = (existingScore?.dimensionScores ?? {}) as Record<
      string,
      number
    >;

    // Determine level label from raw score
    const levelLabel = this.getLevelLabel(finalScore);

    // Partition dimensions into strong areas and differences
    const strongAreas: Array<{
      category: string;
      labelTr: string;
      description: string;
    }> = [];
    const differences: Array<{
      category: string;
      labelTr: string;
      description: string;
    }> = [];

    for (const [category, score] of Object.entries(dimensionScores)) {
      const labelTr = DIMENSION_LABELS_TR[category] ?? category;

      if (score >= 70) {
        strongAreas.push({
          category,
          labelTr,
          description:
            score >= 90
              ? `${labelTr} alanında mükemmel bir uyumunuz var (%${Math.round(score)})`
              : `${labelTr} alanında güçlü bir uyumunuz var (%${Math.round(score)})`,
        });
      } else {
        differences.push({
          category,
          labelTr,
          description:
            score >= 50
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

    // Generate top reasons
    const catScores = Object.entries(dimensionScores).map(
      ([category, score]) => ({ category, score }),
    );
    const topReasons = this.getTopCompatibilityReasons(catScores, 0, 0);

    return {
      score: finalScore,
      level,
      levelLabel,
      strongAreas,
      differences,
      conversationStarters,
      topReasons,
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  /**
   * Consistently order two user IDs for pairwise storage.
   */
  private orderIds(a: string, b: string): { first: string; second: string } {
    return a < b ? { first: a, second: b } : { first: b, second: a };
  }

  /**
   * Get Turkish level label based on raw score before clamping.
   */
  private getLevelLabel(rawScore: number): string {
    for (const lvl of LEVEL_LABELS) {
      if (rawScore >= lvl.minScore) {
        return lvl.label;
      }
    }
    return "Dusuk Uyum";
  }

  private formatScoreResponse(
    userId: string,
    targetUserId: string,
    score: {
      finalScore: number;
      level: string;
      dimensionScores: unknown;
      updatedAt?: Date;
    },
  ) {
    const dimensions = (score.dimensionScores ?? {}) as Record<string, number>;
    const categoryScores = Object.entries(dimensions)
      .map(([category, catScore]) => ({
        category,
        categoryLabel: DIMENSION_LABELS_TR[category] ?? category,
        score: catScore,
        matchedQuestions: 0,
      }))
      .sort((a, b) => b.score - a.score);

    const catScoresForReasons = Object.entries(dimensions).map(
      ([category, catScore]) => ({ category, score: catScore }),
    );

    return {
      userId,
      targetUserId,
      finalScore: score.finalScore,
      level: score.level,
      levelLabel: this.getLevelLabel(score.finalScore),
      isSuperCompatible: score.level === "SUPER",
      breakdown: score.dimensionScores ?? {},
      categoryScores,
      topReasons: this.getTopCompatibilityReasons(catScoresForReasons, 0, 0),
      bonuses: { intentionTagMatch: 0, sameCityBonus: 0, totalBonus: 0 },
      commonQuestions: 0,
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

    // Normalize category keys — try both UPPER and lower variants
    const getStarters = (category: string): string[] | undefined => {
      return (
        CONVERSATION_STARTERS_TR[category] ??
        CONVERSATION_STARTERS_TR[category.toUpperCase()]
      );
    };

    // Add 1-2 starters from strong areas
    for (const area of strongAreas.slice(0, 2)) {
      const categoryStarters = getStarters(area.category);
      if (
        categoryStarters &&
        categoryStarters.length > 0 &&
        !usedCategories.has(area.category)
      ) {
        starters.push(categoryStarters[0]);
        usedCategories.add(area.category);
      }
    }

    // Add 1 starter from differences (to explore different perspectives)
    for (const diff of differences.slice(0, 1)) {
      const categoryStarters = getStarters(diff.category);
      if (
        categoryStarters &&
        categoryStarters.length > 1 &&
        !usedCategories.has(diff.category)
      ) {
        starters.push(categoryStarters[1]);
        usedCategories.add(diff.category);
      }
    }

    // Fill remaining slots from any unused high-score categories
    if (starters.length < 3) {
      const sortedDimensions = Object.entries(dimensionScores).sort(
        (a, b) => b[1] - a[1],
      );

      for (const [category] of sortedDimensions) {
        if (starters.length >= 3) break;
        if (usedCategories.has(category)) continue;

        const categoryStarters = getStarters(category);
        if (categoryStarters && categoryStarters.length > 0) {
          starters.push(categoryStarters[0]);
          usedCategories.add(category);
        }
      }
    }

    // Fallback if no dimension-based starters available
    if (starters.length === 0) {
      starters.push(
        "Hayatta en cok neye onem verirsiniz?",
        "Ideal bir hafta sonu nasil gecirirsiniz?",
        "Sizi en cok ne mutlu eder?",
      );
    }

    return starters.slice(0, 5);
  }

  /**
   * Invalidate all cached compatibility scores for a given user.
   * Called when a user submits or updates answers.
   */
  private async invalidateUserCompatibilityCache(
    userId: string,
  ): Promise<void> {
    try {
      await this.cacheService.invalidatePattern(`compat:*${userId}*`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Failed to invalidate compatibility cache for ${userId}: ${message}`,
      );
    }
  }
}
