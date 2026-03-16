import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BadgesService } from "../badges/badges.service";
import {
  LumaCacheService,
  CACHE_KEYS,
  CACHE_TTL,
} from "../cache/cache.service";
import { SubmitAnswerDto, SubmitAnswersBulkDto } from "./dto";

// LOCKED: 2 Compatibility Levels
const SUPER_COMPATIBILITY_THRESHOLD = 90;
const CORE_QUESTION_COUNT = 20;
const TOTAL_QUESTION_COUNT = 45;

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

// Core questions weighted 2x compared to premium questions
const CORE_WEIGHT_MULTIPLIER = 2;
const PREMIUM_WEIGHT_MULTIPLIER = 1;

// Bonus percentages for profile alignment
const INTENTION_TAG_BONUS_PERCENT = 10; // +10% for matching intention tags
const SAME_CITY_BONUS_PERCENT = 5; // +5% for same city

// Turkish labels for compatibility dimension categories
const DIMENSION_LABELS_TR: Record<string, string> = {
  COMMUNICATION: "Iletisim Tarzi",
  LIFE_GOALS: "Yasam Hedefleri",
  VALUES: "Degerler",
  LIFESTYLE: "Yasam Tarzi",
  EMOTIONAL_INTELLIGENCE: "Duygusal Zeka",
  RELATIONSHIP_EXPECTATIONS: "Iliski Beklentileri",
  SOCIAL_COMPATIBILITY: "Sosyal Uyum",
  ATTACHMENT_STYLE: "Baglanma Tarzi",
  LOVE_LANGUAGE: "Sevgi Dili",
  CONFLICT_STYLE: "Catisma Yaklasimi",
  FUTURE_VISION: "Gelecek Vizyonu",
  INTELLECTUAL: "Entelektuel Uyum",
  INTIMACY: "Yakinlik",
  GROWTH_MINDSET: "Gelisim Odaklilik",
  CORE_FEARS: "Temel Kaygilar",
  // Lowercase variants for consistent lookup
  communication: "Iletisim Tarzi",
  life_goals: "Yasam Hedefleri",
  values: "Degerler",
  lifestyle: "Yasam Tarzi",
  emotional_intelligence: "Duygusal Zeka",
  relationship_expectations: "Iliski Beklentileri",
  social_compatibility: "Sosyal Uyum",
  attachment_style: "Baglanma Tarzi",
  love_language: "Sevgi Dili",
  conflict_style: "Catisma Yaklasimi",
  future_vision: "Gelecek Vizyonu",
  intellectual: "Entelektuel Uyum",
  intimacy: "Yakinlik",
  growth_mindset: "Gelisim Odaklilik",
  core_fears: "Temel Kaygilar",
};

// Conversation starter templates per category (Turkish)
const CONVERSATION_STARTERS_TR: Record<string, string[]> = {
  COMMUNICATION: [
    "Iletisimde en cok neye onem verirsiniz?",
    "Zor bir konuyu nasil dile getirirsiniz?",
  ],
  LIFE_GOALS: [
    "5 yil sonra kendinizi nerede goruyorsunuz?",
    "Hayattaki en buyuk hedefiniz ne?",
  ],
  VALUES: [
    "Sizin icin vazgecilmez degerleriniz neler?",
    "Hayatta en cok neye onem verirsiniz?",
  ],
  LIFESTYLE: [
    "Ideal bir hafta sonu nasil gecirir?",
    "Serbest zamaninizda en cok ne yapmayi seversiniz?",
  ],
  EMOTIONAL_INTELLIGENCE: [
    "Duygularinizi nasil ifade edersiniz?",
    "Zor zamanlarla nasil basa cikarsiniz?",
  ],
  RELATIONSHIP_EXPECTATIONS: [
    "Ideal bir iliskide en onemli sey sizce ne?",
    "Bir iliskiden beklentileriniz neler?",
  ],
  SOCIAL_COMPATIBILITY: [
    "Arkadasliklariniz sizin icin ne ifade ediyor?",
    "Sosyal ortamlarda kendinizi nasil hissedersiniz?",
  ],
  ATTACHMENT_STYLE: [
    "Yakinlik kurarken kendinizi rahat hisseder misiniz?",
    "Guven sizin icin ne anlama geliyor?",
  ],
  LOVE_LANGUAGE: [
    "Sevginizi nasil gosterirsiniz?",
    "Sevildigini en cok ne zaman hissedersiniz?",
  ],
  CONFLICT_STYLE: [
    "Bir anlasmazlik yasandiginda nasil tepki verirsiniz?",
    "Cozum odakli misiniz yoksa once duygulari mi konusursunuz?",
  ],
  FUTURE_VISION: [
    "Gelecege dair en buyuk hayaliniz ne?",
    "Hayatinizda neyi degistirmek isterdiniz?",
  ],
  INTELLECTUAL: [
    "Yeni bir sey ogrenmeyi sever misiniz?",
    "Hangi konularda tutkulu sayilirsiniz?",
  ],
  INTIMACY: [
    "Yakinlik sizin icin ne anlam tasiyor?",
    "Bir iliskide fiziksel ve duygusal yakinlik dengesi nasil olmali?",
  ],
  GROWTH_MINDSET: [
    "Kendinizi gelistirmek icin neler yapiyorsunuz?",
    "Hatalarinizdan nasil ders cikarirsiniz?",
  ],
  CORE_FEARS: [
    "Bir iliskide sizi en cok ne endiselendirir?",
    "Guven konusunda nasil hissediyorsunuz?",
  ],
};

// Turkish reason templates based on category scores
const REASON_TEMPLATES_TR: Record<string, { high: string; medium: string }> = {
  communication: {
    high: "Iletisim tarzlariniz cok uyumlu",
    medium: "Iletisim konusunda birbirinizi tamamliyorsunuz",
  },
  life_goals: {
    high: "Yasam hedefleriniz ortusuyor",
    medium: "Benzer yasam hedeflerine sahipsiniz",
  },
  values: {
    high: "Temel degerleriniz ayni noktada",
    medium: "Ortak degerleriniz var",
  },
  lifestyle: {
    high: "Yasam tarzlariniz birbiriyle uyumlu",
    medium: "Birbirinize denk bir yasam tempoinuz var",
  },
  emotional_intelligence: {
    high: "Duygusal zeka seviyeniz birbirine cok yakin",
    medium: "Duygusal anlayisiniz uyumlu",
  },
  relationship_expectations: {
    high: "Iliski beklentileriniz neredeyse ayni",
    medium: "Iliskide ortak beklentileriniz var",
  },
  social_compatibility: {
    high: "Sosyal uyumunuz mukemmel",
    medium: "Sosyal dunyalariniz birbirine yakin",
  },
  attachment_style: {
    high: "Baglanma tarzlariniz birbirine cok uygun",
    medium: "Guven ve yakinlik konusunda birbirinizi tamamliyorsunuz",
  },
  love_language: {
    high: "Sevgi dilleriniz ortusuyor",
    medium: "Sevgiyi ifade bicimleriniz uyumlu",
  },
  conflict_style: {
    high: "Catisma cozme yaklasimlariniz benzer",
    medium: "Sorunlara birlikte yaklasabilirsiniz",
  },
  future_vision: {
    high: "Gelecek vizyonunuz ortak bir noktada bulusuyor",
    medium: "Gelecege benzer gozlerle bakiyorsunuz",
  },
  intellectual: {
    high: "Entelektuel uyumunuz harika",
    medium: "Dusunce dunya size yakin",
  },
  intimacy: {
    high: "Yakinlik anlayisiniz birbirinize cok uygun",
    medium: "Yakinlik konusunda uyumlu bir ciftsiniz",
  },
  growth_mindset: {
    high: "Birlikte gelismeye cok uygunsunuz",
    medium: "Gelisim odakli bakis aciniz ortak",
  },
  core_fears: {
    high: "Temel kaygilariniz benzer, birbirinizi anlayabilirsiniz",
    medium: "Endiselerinizi paylasarak baglarinizi guclendirirsiniz",
  },
};

// Categories where balanced opposites are beneficial (complementary pairing)
// These categories benefit from diversity, not just similarity
const COMPLEMENTARY_CATEGORIES = new Set([
  "social_compatibility", // Introverts + extroverts can complement
  "lifestyle", // Different life paces can balance
  "conflict_style", // Different conflict approaches can be healthy
  "attachment_style", // Anxious + secure pairing is well-documented
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
  isPremium: boolean; // whether this is a premium question
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
  baseScore: number;
  deepScore: number | null;
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
      throw new NotFoundException("Kullanıcı bulunamadı");
    }

    const hasPremiumAccess = user.packageTier !== "FREE";

    // Fetch questions with options
    const questions = await this.prisma.compatibilityQuestion.findMany({
      where: {
        isActive: true,
        ...(hasPremiumAccess ? {} : { isPremium: false }),
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
        isPremium: boolean;
        options: unknown[];
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
      }),
    );

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
        options: { orderBy: { order: "asc" } },
      },
    });

    if (!question || !question.isActive) {
      throw new NotFoundException("Soru bulunamadı");
    }

    // Check premium access
    if (question.isPremium) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { packageTier: true },
      });

      if (user?.packageTier === "FREE") {
        throw new ForbiddenException(
          "Premium sorulara erişmek için Gold veya üzeri pakete geçin",
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
      throw new NotFoundException("Kullanıcı bulunamadı");
    }

    const hasPremiumAccess = user.packageTier !== "FREE";

    // Fetch all referenced questions with their options
    const questionIds = dto.answers.map((a) => a.questionId);
    const questions = await this.prisma.compatibilityQuestion.findMany({
      where: { id: { in: questionIds }, isActive: true },
      include: { options: { select: { id: true } } },
    });

    const questionMap = new Map<
      string,
      { id: string; isPremium: boolean; options: { id: string }[] }
    >(
      questions.map(
        (q: { id: string; isPremium: boolean; options: { id: string }[] }) => [
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
      if (question.isPremium && !hasPremiumAccess) {
        throw new ForbiddenException(
          "Premium sorulara erişmek için Gold veya üzeri pakete geçin",
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
        isPremium: boolean;
        options: Array<{ id: string; order: number; value: number }>;
      };
      const opt = a.option as { value: number; order: number };
      mapA.set(a.questionId, {
        optionOrder: opt.order,
        optionCount: q.options.length,
        value: opt.value,
        weight: q.weight,
        category: q.category,
        isPremium: q.isPremium,
      });
    }

    const mapB = new Map<string, AnswerData>();
    for (const b of answersB) {
      const q = b.question as {
        weight: number;
        category: string;
        isPremium: boolean;
        options: Array<{ id: string; order: number; value: number }>;
      };
      const opt = b.option as { value: number; order: number };
      mapB.set(b.questionId, {
        optionOrder: opt.order,
        optionCount: q.options.length,
        value: opt.value,
        weight: q.weight,
        category: q.category,
        isPremium: q.isPremium,
      });
    }

    // Find common questions (both users answered)
    const commonQuestionIds = [...mapA.keys()].filter((id) => mapB.has(id));

    if (commonQuestionIds.length === 0) {
      const emptyResponse: CachedCompatibilityScore = {
        userId: userAId,
        targetUserId: userBId,
        baseScore: MIN_DISPLAY_SCORE,
        deepScore: null,
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
    let coreWeightedPoints = 0;
    let coreMaxPoints = 0;
    let premiumWeightedPoints = 0;
    let premiumMaxPoints = 0;

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

      // Apply tier-based weight multiplier: core questions count 2x
      const tierMultiplier = a.isPremium
        ? PREMIUM_WEIGHT_MULTIPLIER
        : CORE_WEIGHT_MULTIPLIER;
      const weightedPoints = rawPoints * a.weight * tierMultiplier;
      const maxPossible = EXACT_MATCH_POINTS * a.weight * tierMultiplier;

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

      // Accumulate totals separately for core and premium
      if (a.isPremium) {
        premiumWeightedPoints += weightedPoints;
        premiumMaxPoints += maxPossible;
      } else {
        coreWeightedPoints += weightedPoints;
        coreMaxPoints += maxPossible;
      }
    }

    // Fetch both user profiles for bonus calculation
    const [userAProfile, userBProfile] = await Promise.all([
      this.prisma.userProfile.findUnique({
        where: { userId: first },
        select: { intentionTag: true, city: true },
      }),
      this.prisma.userProfile.findUnique({
        where: { userId: second },
        select: { intentionTag: true, city: true },
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

    // Calculate raw percentage scores (0-100 range)
    const rawBaseScore =
      coreMaxPoints > 0 ? (coreWeightedPoints / coreMaxPoints) * 100 : 0;

    const hasPremiumAnswers = premiumMaxPoints > 0;
    const allPoints = coreWeightedPoints + premiumWeightedPoints;
    const allMax = coreMaxPoints + premiumMaxPoints;
    const rawDeepScore =
      hasPremiumAnswers && allMax > 0 ? (allPoints / allMax) * 100 : null;

    // MASTER BRIEF: Premium NEVER changes displayed score, only ranking visibility
    // finalScore is ALWAYS based on core answers only, plus bonuses
    const rawFinalScore = rawBaseScore;
    const rawFinalScoreWithBonuses = Math.min(100, rawFinalScore + totalBonus);

    // Clamp all scores to display range [47-97] — no 100%, minimum 47
    const clampScore = (raw: number): number =>
      Math.round(Math.max(MIN_DISPLAY_SCORE, Math.min(MAX_DISPLAY_SCORE, raw)));

    const baseScore = clampScore(rawBaseScore);
    const deepScore = rawDeepScore !== null ? clampScore(rawDeepScore) : null;
    const finalScore = clampScore(rawFinalScoreWithBonuses);

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
    const levelLabel = this.getLevelLabel(rawFinalScoreWithBonuses);

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
        this.badgesService.checkAndAwardBadges(first, "compatibility"),
        this.badgesService.checkAndAwardBadges(second, "compatibility"),
      ]);
    }

    const response: CachedCompatibilityScore = {
      userId: userAId,
      targetUserId: userBId,
      baseScore: score.baseScore,
      deepScore: score.deepScore,
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
            isPremium: boolean;
          };
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
        }),
      ),
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
              ? `${labelTr} alaninda mukemmel bir uyumunuz var (%${Math.round(score)})`
              : `${labelTr} alaninda guclu bir uyumunuz var (%${Math.round(score)})`,
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
      baseScore: number;
      deepScore: number | null;
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
      baseScore: score.baseScore,
      deepScore: score.deepScore,
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
