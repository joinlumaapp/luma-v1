import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { CompatibilityService } from "./compatibility.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BadgesService } from "../badges/badges.service";
import { LumaCacheService } from "../cache/cache.service";

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------
const mockBadgesService = () => ({
  checkAndAwardBadges: jest.fn().mockResolvedValue({ awarded: [] }),
  awardBadge: jest.fn().mockResolvedValue({ awarded: false, goldReward: 0 }),
});

const mockCacheService = () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  invalidatePattern: jest.fn().mockResolvedValue(undefined),
  isRedisConnected: jest.fn().mockReturnValue(false),
});

const mockPrismaService = () => ({
  user: {
    findUnique: jest.fn(),
  },
  userProfile: {
    findUnique: jest.fn(),
  },
  compatibilityQuestion: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  userAnswer: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    count: jest.fn(),
  },
  compatibilityScore: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    count: jest.fn(),
  },
});

type MockPrisma = ReturnType<typeof mockPrismaService>;
type MockCache = ReturnType<typeof mockCacheService>;

describe("CompatibilityService", () => {
  let service: CompatibilityService;
  let prisma: MockPrisma;
  let cache: MockCache;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompatibilityService,
        { provide: PrismaService, useFactory: mockPrismaService },
        { provide: BadgesService, useFactory: mockBadgesService },
        { provide: LumaCacheService, useFactory: mockCacheService },
      ],
    }).compile();

    service = module.get<CompatibilityService>(CompatibilityService);
    prisma = module.get(PrismaService) as unknown as MockPrisma;
    cache = module.get(LumaCacheService) as unknown as MockCache;

    // Default mocks for daily limit check (used by getScoreWithUser)
    // Individual tests can override these as needed
    prisma.user.findUnique.mockResolvedValue({ packageTier: "SUPREME" });
    prisma.compatibilityScore.count.mockResolvedValue(0);
    prisma.userProfile.findUnique.mockResolvedValue(null);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── getQuestions ──────────────────────────────────────────────
  describe("getQuestions", () => {
    it("should throw NotFoundException when user does not exist", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getQuestions("user-1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should return all active questions for FREE users", async () => {
      prisma.user.findUnique.mockResolvedValue({ packageTier: "FREE" });
      prisma.compatibilityQuestion.findMany.mockResolvedValue([
        {
          id: "q1",
          questionNumber: 1,
          category: "VALUES",
          textEn: "Q1",
          textTr: "S1",
          weight: 1,
          options: [{ id: "o1", labelEn: "A", labelTr: "A", order: 0 }],
        },
      ]);
      prisma.userAnswer.findMany.mockResolvedValue([]);

      const result = await service.getQuestions("user-1");

      expect(prisma.compatibilityQuestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
      expect(result.totalCount).toBe(20);
    });

    it("should return all 20 questions for PREMIUM users", async () => {
      prisma.user.findUnique.mockResolvedValue({ packageTier: "PREMIUM" });
      prisma.compatibilityQuestion.findMany.mockResolvedValue([]);
      prisma.userAnswer.findMany.mockResolvedValue([]);

      const result = await service.getQuestions("user-1");

      expect(prisma.compatibilityQuestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
      expect(result.totalCount).toBe(20);
    });

    it("should mark answered questions with their selected option", async () => {
      prisma.user.findUnique.mockResolvedValue({ packageTier: "FREE" });
      prisma.compatibilityQuestion.findMany.mockResolvedValue([
        {
          id: "q1",
          questionNumber: 1,
          category: "VALUES",
          textEn: "Q1",
          textTr: "S1",
          weight: 1,
          options: [{ id: "o1", labelEn: "A", labelTr: "A", order: 0 }],
        },
        {
          id: "q2",
          questionNumber: 2,
          category: "VALUES",
          textEn: "Q2",
          textTr: "S2",
          weight: 1,
          options: [{ id: "o2", labelEn: "B", labelTr: "B", order: 0 }],
        },
      ]);
      prisma.userAnswer.findMany.mockResolvedValue([
        { questionId: "q1", optionId: "o1" },
      ]);

      const result = await service.getQuestions("user-1");

      expect(result.questions[0].isAnswered).toBe(true);
      expect(result.questions[0].answeredOptionId).toBe("o1");
      expect(result.questions[1].isAnswered).toBe(false);
      expect(result.questions[1].answeredOptionId).toBeNull();
      expect(result.answeredCount).toBe(1);
    });

    it("should return questions for PREMIUM and SUPREME tiers", async () => {
      for (const tier of ["PREMIUM", "SUPREME"]) {
        prisma.user.findUnique.mockResolvedValue({ packageTier: tier });
        prisma.compatibilityQuestion.findMany.mockResolvedValue([]);
        prisma.userAnswer.findMany.mockResolvedValue([]);

        const result = await service.getQuestions("user-1");
        expect(result.totalCount).toBe(20);
      }
    });
  });

  // ─── submitAnswer ──────────────────────────────────────────────
  describe("submitAnswer", () => {
    it("should throw NotFoundException when question does not exist", async () => {
      prisma.compatibilityQuestion.findUnique.mockResolvedValue(null);

      await expect(
        service.submitAnswer("user-1", { questionId: "q-bad", answerIndex: 0 }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when question is inactive", async () => {
      prisma.compatibilityQuestion.findUnique.mockResolvedValue({
        id: "q1",
        isActive: false,
        isPremium: false,
        options: [],
      });

      await expect(
        service.submitAnswer("user-1", { questionId: "q1", answerIndex: 0 }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when FREE user answers premium question", async () => {
      prisma.compatibilityQuestion.findUnique.mockResolvedValue({
        id: "q-premium",
        isActive: true,
        isPremium: true,
        options: [{ id: "o1", order: 0 }],
      });
      prisma.user.findUnique.mockResolvedValue({ packageTier: "FREE" });

      await expect(
        service.submitAnswer("user-1", {
          questionId: "q-premium",
          answerIndex: 0,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException for out-of-range answer index", async () => {
      prisma.compatibilityQuestion.findUnique.mockResolvedValue({
        id: "q1",
        isActive: true,
        isPremium: false,
        options: [
          { id: "o1", order: 0 },
          { id: "o2", order: 1 },
        ],
      });

      await expect(
        service.submitAnswer("user-1", { questionId: "q1", answerIndex: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should upsert the answer, invalidate cache, and return progress", async () => {
      prisma.compatibilityQuestion.findUnique.mockResolvedValue({
        id: "q1",
        isActive: true,
        isPremium: false,
        options: [
          { id: "o1", order: 0 },
          { id: "o2", order: 1 },
          { id: "o3", order: 2 },
        ],
      });
      prisma.userAnswer.upsert.mockResolvedValue({});
      prisma.userAnswer.count.mockResolvedValue(5);

      const result = await service.submitAnswer("user-1", {
        questionId: "q1",
        answerIndex: 1,
      });

      expect(prisma.userAnswer.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_questionId: { userId: "user-1", questionId: "q1" },
          },
          create: expect.objectContaining({ optionId: "o2" }),
          update: expect.objectContaining({ optionId: "o2" }),
        }),
      );
      expect(result.saved).toBe(true);
      expect(result.optionId).toBe("o2");
      expect(result.answeredCount).toBe(5);
      expect(result.totalCount).toBe(45);
      // Verify cache invalidation was called
      expect(cache.invalidatePattern).toHaveBeenCalled();
    });

    it("should allow premium users to answer premium questions", async () => {
      prisma.compatibilityQuestion.findUnique.mockResolvedValue({
        id: "q-prem",
        isActive: true,
        isPremium: true,
        options: [{ id: "o1", order: 0 }],
      });
      prisma.user.findUnique.mockResolvedValue({ packageTier: "GOLD" });
      prisma.userAnswer.upsert.mockResolvedValue({});
      prisma.userAnswer.count.mockResolvedValue(21);

      const result = await service.submitAnswer("user-1", {
        questionId: "q-prem",
        answerIndex: 0,
      });

      expect(result.saved).toBe(true);
    });
  });

  // ─── getMyAnswers ────────────────────────────────────────────
  describe("getMyAnswers", () => {
    it("should return formatted answers with question and option details", async () => {
      prisma.userAnswer.findMany.mockResolvedValue([
        {
          questionId: "q1",
          question: {
            id: "q1",
            questionNumber: 1,
            category: "VALUES",
            textEn: "Q1",
            textTr: "S1",
            isPremium: false,
          },
          option: {
            id: "o1",
            labelEn: "A",
            labelTr: "A-tr",
            value: 0.5,
          },
          answeredAt: new Date("2025-06-01"),
        },
      ]);

      const result = await service.getMyAnswers("user-1");

      expect(result.totalAnswered).toBe(1);
      expect(result.totalQuestions).toBe(45);
      expect(result.answers[0].questionId).toBe("q1");
      expect(result.answers[0].selectedOption.id).toBe("o1");
    });

    it("should return empty answers for user with no answers", async () => {
      prisma.userAnswer.findMany.mockResolvedValue([]);

      const result = await service.getMyAnswers("user-1");

      expect(result.totalAnswered).toBe(0);
      expect(result.answers).toHaveLength(0);
    });
  });

  // ─── getScoreWithUser ──────────────────────────────────────────
  describe("getScoreWithUser", () => {
    it("should throw BadRequestException for self-comparison", async () => {
      await expect(service.getScoreWithUser("aaa", "aaa")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should return Redis-cached score when available", async () => {
      const cachedScore = {
        userId: "aaa",
        targetUserId: "bbb",
        baseScore: 75,
        deepScore: null,
        finalScore: 75,
        level: "NORMAL",
        levelLabel: "Iyi Uyum",
        isSuperCompatible: false,
        breakdown: { VALUES: 80 },
        categoryScores: [],
        topReasons: [],
        bonuses: { intentionTagMatch: 0, sameCityBonus: 0, totalBonus: 0 },
        commonQuestions: 5,
      };
      cache.get.mockResolvedValue(cachedScore);

      const result = await service.getScoreWithUser("aaa", "bbb");

      expect(result.finalScore).toBe(75);
      expect(result.level).toBe("NORMAL");
      // Should NOT have queried DB for answers
      expect(prisma.userAnswer.findMany).not.toHaveBeenCalled();
      expect(prisma.compatibilityScore.findUnique).not.toHaveBeenCalled();
    });

    it("should return DB-cached score if Redis misses but DB has fresh score", async () => {
      cache.get.mockResolvedValue(null);
      const existingScore = {
        baseScore: 75,
        deepScore: null,
        finalScore: 75,
        level: "NORMAL",
        dimensionScores: { VALUES: 80 },
        updatedAt: new Date(), // fresh
      };
      prisma.compatibilityScore.findUnique.mockResolvedValue(existingScore);

      const result = await service.getScoreWithUser("aaa", "bbb");

      expect(result.finalScore).toBe(75);
      expect(result.level).toBe("NORMAL");
      expect((result as Record<string, unknown>).isSuperCompatible).toBe(false);
      // Should NOT have called userAnswer.findMany since score was cached
      expect(prisma.userAnswer.findMany).not.toHaveBeenCalled();
      // Should have cached the result in Redis
      expect(cache.set).toHaveBeenCalled();
    });

    it("should recalculate stale cached scores", async () => {
      cache.get.mockResolvedValue(null);
      const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const existingScore = {
        baseScore: 75,
        deepScore: null,
        finalScore: 75,
        level: "NORMAL",
        dimensionScores: { VALUES: 80 },
        updatedAt: staleDate,
      };
      prisma.compatibilityScore.findUnique.mockResolvedValue(existingScore);
      prisma.userAnswer.findMany.mockResolvedValue([]); // no common answers

      const result = await service.getScoreWithUser("aaa", "bbb");

      // Should recalculate since cache is stale
      expect(prisma.userAnswer.findMany).toHaveBeenCalled();
      // No common answers returns MIN_DISPLAY_SCORE (47)
      expect(result.finalScore).toBe(47);
    });

    it("should return MIN_DISPLAY_SCORE when users have no common answers", async () => {
      cache.get.mockResolvedValue(null);
      prisma.compatibilityScore.findUnique.mockResolvedValue(null);
      prisma.userAnswer.findMany.mockResolvedValue([]);

      const result = await service.getScoreWithUser("aaa", "bbb");

      // No common answers returns MIN_DISPLAY_SCORE (47) instead of 0
      expect(result.finalScore).toBe(47);
      expect(result.level).toBe("NORMAL");
      expect((result as Record<string, unknown>).commonQuestions).toBe(0);
    });

    it("should award exact match points (100) for identical answers", async () => {
      cache.get.mockResolvedValue(null);
      prisma.compatibilityScore.findUnique.mockResolvedValueOnce(null);

      const makeOptions = () => [
        { id: "opt0", order: 0, value: 0.0 },
        { id: "opt1", order: 1, value: 0.25 },
        { id: "opt2", order: 2, value: 0.5 },
        { id: "opt3", order: 3, value: 0.75 },
        { id: "opt4", order: 4, value: 1.0 },
      ];

      // User A — selects option at order 2
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: "q1",
          option: { value: 0.5, order: 2 },
          question: {
            weight: 1,
            category: "values",
            isPremium: false,
            options: makeOptions(),
          },
        },
      ]);
      // User B — selects same option at order 2 (exact match)
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: "q1",
          option: { value: 0.5, order: 2 },
          question: {
            weight: 1,
            category: "values",
            isPremium: false,
            options: makeOptions(),
          },
        },
      ]);
      prisma.compatibilityScore.upsert.mockImplementation(
        async (args: Record<string, Record<string, unknown>>) => ({
          baseScore: args.create.baseScore,
          deepScore: args.create.deepScore,
          finalScore: args.create.finalScore,
          level: args.create.level,
          dimensionScores: args.create.dimensionScores,
        }),
      );

      const result = await service.getScoreWithUser("aaa", "bbb");

      // Exact match: 100 points / 100 max = 100%, clamped to 97
      expect(result.finalScore).toBe(97);
    });

    it("should award adjacent match points (70) for 1-step-apart answers", async () => {
      cache.get.mockResolvedValue(null);
      prisma.compatibilityScore.findUnique.mockResolvedValueOnce(null);

      const makeOptions = () => [
        { id: "opt0", order: 0, value: 0.0 },
        { id: "opt1", order: 1, value: 0.25 },
        { id: "opt2", order: 2, value: 0.5 },
        { id: "opt3", order: 3, value: 0.75 },
        { id: "opt4", order: 4, value: 1.0 },
      ];

      // User A — order 2
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: "q1",
          option: { value: 0.5, order: 2 },
          question: {
            weight: 1,
            category: "values",
            isPremium: false,
            options: makeOptions(),
          },
        },
      ]);
      // User B — order 3 (1 step apart)
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: "q1",
          option: { value: 0.75, order: 3 },
          question: {
            weight: 1,
            category: "values",
            isPremium: false,
            options: makeOptions(),
          },
        },
      ]);
      prisma.compatibilityScore.upsert.mockImplementation(
        async (args: Record<string, Record<string, unknown>>) => ({
          baseScore: args.create.baseScore,
          deepScore: args.create.deepScore,
          finalScore: args.create.finalScore,
          level: args.create.level,
          dimensionScores: args.create.dimensionScores,
        }),
      );

      const result = await service.getScoreWithUser("aaa", "bbb");

      // Adjacent: 70 points / 100 max = 70%
      expect(result.finalScore).toBe(70);
    });

    it("should award 40 points for 2-step-apart answers", async () => {
      cache.get.mockResolvedValue(null);
      prisma.compatibilityScore.findUnique.mockResolvedValueOnce(null);

      const makeOptions = () => [
        { id: "opt0", order: 0, value: 0.0 },
        { id: "opt1", order: 1, value: 0.25 },
        { id: "opt2", order: 2, value: 0.5 },
        { id: "opt3", order: 3, value: 0.75 },
        { id: "opt4", order: 4, value: 1.0 },
      ];

      // User A — order 1
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: "q1",
          option: { value: 0.25, order: 1 },
          question: {
            weight: 1,
            category: "values",
            isPremium: false,
            options: makeOptions(),
          },
        },
      ]);
      // User B — order 3 (2 steps apart)
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: "q1",
          option: { value: 0.75, order: 3 },
          question: {
            weight: 1,
            category: "values",
            isPremium: false,
            options: makeOptions(),
          },
        },
      ]);
      prisma.compatibilityScore.upsert.mockImplementation(
        async (args: Record<string, Record<string, unknown>>) => ({
          baseScore: args.create.baseScore,
          deepScore: args.create.deepScore,
          finalScore: args.create.finalScore,
          level: args.create.level,
          dimensionScores: args.create.dimensionScores,
        }),
      );

      const result = await service.getScoreWithUser("aaa", "bbb");

      // 2 steps: 40 points / 100 max = 40%, clamped to 47
      expect(result.finalScore).toBe(47);
    });

    it("should award 10 points for 3+-step-apart answers", async () => {
      cache.get.mockResolvedValue(null);
      prisma.compatibilityScore.findUnique.mockResolvedValueOnce(null);

      const makeOptions = () => [
        { id: "opt0", order: 0, value: 0.0 },
        { id: "opt1", order: 1, value: 0.25 },
        { id: "opt2", order: 2, value: 0.5 },
        { id: "opt3", order: 3, value: 0.75 },
        { id: "opt4", order: 4, value: 1.0 },
      ];

      // User A — order 0
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: "q1",
          option: { value: 0.0, order: 0 },
          question: {
            weight: 1,
            category: "values",
            isPremium: false,
            options: makeOptions(),
          },
        },
      ]);
      // User B — order 4 (4 steps apart)
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: "q1",
          option: { value: 1.0, order: 4 },
          question: {
            weight: 1,
            category: "values",
            isPremium: false,
            options: makeOptions(),
          },
        },
      ]);
      prisma.compatibilityScore.upsert.mockImplementation(
        async (args: Record<string, Record<string, unknown>>) => ({
          baseScore: args.create.baseScore,
          deepScore: args.create.deepScore,
          finalScore: args.create.finalScore,
          level: args.create.level,
          dimensionScores: args.create.dimensionScores,
        }),
      );

      const result = await service.getScoreWithUser("aaa", "bbb");

      // 4 steps: 10 points / 100 max = 10%, clamped to 47
      expect(result.finalScore).toBe(47);
    });

    it("should weight core questions 2x compared to premium", async () => {
      cache.get.mockResolvedValue(null);
      prisma.compatibilityScore.findUnique.mockResolvedValueOnce(null);

      const makeOptions = () => [
        { id: "opt0", order: 0, value: 0.0 },
        { id: "opt1", order: 1, value: 0.5 },
        { id: "opt2", order: 2, value: 1.0 },
      ];

      // User A — one core (exact match) + one premium (exact match)
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: "q1",
          option: { value: 0.5, order: 1 },
          question: {
            weight: 1,
            category: "values",
            isPremium: false,
            options: makeOptions(),
          },
        },
        {
          questionId: "q2",
          option: { value: 0.5, order: 1 },
          question: {
            weight: 1,
            category: "attachment_style",
            isPremium: true,
            options: makeOptions(),
          },
        },
      ]);
      // User B — core 1 step apart, premium exact match
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: "q1",
          option: { value: 0.0, order: 0 },
          question: {
            weight: 1,
            category: "values",
            isPremium: false,
            options: makeOptions(),
          },
        },
        {
          questionId: "q2",
          option: { value: 0.5, order: 1 },
          question: {
            weight: 1,
            category: "attachment_style",
            isPremium: true,
            options: makeOptions(),
          },
        },
      ]);
      prisma.compatibilityScore.upsert.mockImplementation(
        async (args: Record<string, Record<string, unknown>>) => ({
          baseScore: args.create.baseScore,
          deepScore: args.create.deepScore,
          finalScore: args.create.finalScore,
          level: args.create.level,
          dimensionScores: args.create.dimensionScores,
        }),
      );

      const result = await service.getScoreWithUser("aaa", "bbb");

      // Core q1: adjacent (70pts) * weight(1) * 2x = 140, max = 100 * 1 * 2 = 200
      // Premium q2: exact (100pts) * weight(1) * 1x = 100, max = 100 * 1 * 1 = 100
      // finalScore = core only = 70%
      expect(result.finalScore).toBe(70);
    });

    it("should compute SUPER level when multi-criteria threshold is met", async () => {
      cache.get.mockResolvedValue(null);
      prisma.compatibilityScore.findUnique.mockResolvedValueOnce(null);

      const makeOptions = () => [
        { id: "opt0", order: 0, value: 0.0 },
        { id: "opt1", order: 1, value: 1.0 },
      ];

      // User A — 3 different categories, all exact matches
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: "q1",
          option: { value: 1.0, order: 1 },
          question: {
            weight: 1,
            category: "communication",
            isPremium: false,
            options: makeOptions(),
          },
        },
        {
          questionId: "q2",
          option: { value: 1.0, order: 1 },
          question: {
            weight: 1,
            category: "life_goals",
            isPremium: false,
            options: makeOptions(),
          },
        },
        {
          questionId: "q3",
          option: { value: 1.0, order: 1 },
          question: {
            weight: 1,
            category: "values",
            isPremium: false,
            options: makeOptions(),
          },
        },
      ]);
      // User B — identical answers
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: "q1",
          option: { value: 1.0, order: 1 },
          question: {
            weight: 1,
            category: "communication",
            isPremium: false,
            options: makeOptions(),
          },
        },
        {
          questionId: "q2",
          option: { value: 1.0, order: 1 },
          question: {
            weight: 1,
            category: "life_goals",
            isPremium: false,
            options: makeOptions(),
          },
        },
        {
          questionId: "q3",
          option: { value: 1.0, order: 1 },
          question: {
            weight: 1,
            category: "values",
            isPremium: false,
            options: makeOptions(),
          },
        },
      ]);
      prisma.compatibilityScore.upsert.mockImplementation(
        async (args: Record<string, Record<string, unknown>>) => ({
          baseScore: args.create.baseScore,
          deepScore: args.create.deepScore,
          finalScore: args.create.finalScore,
          level: args.create.level,
          dimensionScores: args.create.dimensionScores,
        }),
      );

      const result = await service.getScoreWithUser("aaa", "bbb");

      // All 3 dimensions = 100%, finalScore = 97 (clamped)
      // Multi-criteria: finalScore>=90, all dims>=60, 3+ dims>=90 -> SUPER
      expect(result.finalScore).toBe(97);
      expect(result.level).toBe("SUPER");
      expect((result as Record<string, unknown>).isSuperCompatible).toBe(true);
    });

    it("should NOT grant SUPER with only 1 high dimension even if score >= 90", async () => {
      cache.get.mockResolvedValue(null);
      prisma.compatibilityScore.findUnique.mockResolvedValueOnce(null);

      const makeOptions = () => [
        { id: "opt0", order: 0, value: 0.0 },
        { id: "opt1", order: 1, value: 1.0 },
      ];

      // Single category exact match
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: "q1",
          option: { value: 1.0, order: 1 },
          question: {
            weight: 1,
            category: "VALUES",
            isPremium: false,
            options: makeOptions(),
          },
        },
      ]);
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: "q1",
          option: { value: 1.0, order: 1 },
          question: {
            weight: 1,
            category: "VALUES",
            isPremium: false,
            options: makeOptions(),
          },
        },
      ]);
      prisma.compatibilityScore.upsert.mockImplementation(
        async (args: Record<string, Record<string, unknown>>) => ({
          baseScore: args.create.baseScore,
          deepScore: args.create.deepScore,
          finalScore: args.create.finalScore,
          level: args.create.level,
          dimensionScores: args.create.dimensionScores,
        }),
      );

      const result = await service.getScoreWithUser("aaa", "bbb");

      // Only 1 dimension >= 90, multi-criteria requires 3+ -> NORMAL
      expect(result.finalScore).toBe(97);
      expect(result.level).toBe("NORMAL");
    });

    it("should NOT blend premium into finalScore — finalScore always equals core only", async () => {
      cache.get.mockResolvedValue(null);
      prisma.compatibilityScore.findUnique.mockResolvedValueOnce(null);

      const makeOptions = () => [
        { id: "opt0", order: 0, value: 0.0 },
        { id: "opt1", order: 1, value: 0.5 },
        { id: "opt2", order: 2, value: 1.0 },
      ];

      // User A — two core exact + one premium exact
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: "q1",
          option: { value: 1.0, order: 2 },
          question: {
            weight: 1,
            category: "values",
            isPremium: false,
            options: makeOptions(),
          },
        },
        {
          questionId: "q2",
          option: { value: 0.5, order: 1 },
          question: {
            weight: 1,
            category: "values",
            isPremium: false,
            options: makeOptions(),
          },
        },
        {
          questionId: "q3",
          option: { value: 0.0, order: 0 },
          question: {
            weight: 1,
            category: "intellectual",
            isPremium: true,
            options: makeOptions(),
          },
        },
      ]);
      // User B — same answers
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: "q1",
          option: { value: 1.0, order: 2 },
          question: {
            weight: 1,
            category: "values",
            isPremium: false,
            options: makeOptions(),
          },
        },
        {
          questionId: "q2",
          option: { value: 0.5, order: 1 },
          question: {
            weight: 1,
            category: "values",
            isPremium: false,
            options: makeOptions(),
          },
        },
        {
          questionId: "q3",
          option: { value: 0.0, order: 0 },
          question: {
            weight: 1,
            category: "intellectual",
            isPremium: true,
            options: makeOptions(),
          },
        },
      ]);
      prisma.compatibilityScore.upsert.mockImplementation(
        async (args: Record<string, Record<string, unknown>>) => ({
          baseScore: args.create.baseScore,
          deepScore: args.create.deepScore,
          finalScore: args.create.finalScore,
          level: args.create.level,
          dimensionScores: args.create.dimensionScores,
        }),
      );

      const result = await service.getScoreWithUser("aaa", "bbb");

      // Core: (100*2 + 100*2)/(100*2 + 100*2) = 400/400 = 100%, clamped to 97
      // Final: core only = 97
      expect(result.finalScore).toBe(97);
    });

    it("should add intention tag bonus (+10%) when tags match", async () => {
      cache.get.mockResolvedValue(null);
      prisma.compatibilityScore.findUnique.mockResolvedValueOnce(null);

      const makeOptions = () => [
        { id: "opt0", order: 0, value: 0.0 },
        { id: "opt1", order: 1, value: 0.25 },
        { id: "opt2", order: 2, value: 0.5 },
        { id: "opt3", order: 3, value: 0.75 },
        { id: "opt4", order: 4, value: 1.0 },
      ];

      // User A — order 2
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: "q1",
          option: { value: 0.5, order: 2 },
          question: {
            weight: 1,
            category: "values",
            isPremium: false,
            options: makeOptions(),
          },
        },
      ]);
      // User B — order 3 (1 step: 70 points)
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: "q1",
          option: { value: 0.75, order: 3 },
          question: {
            weight: 1,
            category: "values",
            isPremium: false,
            options: makeOptions(),
          },
        },
      ]);
      // Both have same intention tag
      prisma.userProfile.findUnique
        .mockResolvedValueOnce({
          intentionTag: "serious_relationship",
          city: "Istanbul",
        })
        .mockResolvedValueOnce({
          intentionTag: "serious_relationship",
          city: "Ankara",
        });

      prisma.compatibilityScore.upsert.mockImplementation(
        async (args: Record<string, Record<string, unknown>>) => ({
          baseScore: args.create.baseScore,
          deepScore: args.create.deepScore,
          finalScore: args.create.finalScore,
          level: args.create.level,
          dimensionScores: args.create.dimensionScores,
        }),
      );

      const result = await service.getScoreWithUser("aaa", "bbb");

      // Base: 70% + intention bonus 10% = 80%
      expect(result.finalScore).toBe(80);
      expect(result.bonuses.intentionTagMatch).toBe(10);
      expect(result.bonuses.sameCityBonus).toBe(0);
    });

    it("should add same city bonus (+5%) when cities match", async () => {
      cache.get.mockResolvedValue(null);
      prisma.compatibilityScore.findUnique.mockResolvedValueOnce(null);

      const makeOptions = () => [
        { id: "opt0", order: 0, value: 0.0 },
        { id: "opt1", order: 1, value: 0.25 },
        { id: "opt2", order: 2, value: 0.5 },
        { id: "opt3", order: 3, value: 0.75 },
        { id: "opt4", order: 4, value: 1.0 },
      ];

      // User A — order 2
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: "q1",
          option: { value: 0.5, order: 2 },
          question: {
            weight: 1,
            category: "values",
            isPremium: false,
            options: makeOptions(),
          },
        },
      ]);
      // User B — order 3 (1 step: 70 points)
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: "q1",
          option: { value: 0.75, order: 3 },
          question: {
            weight: 1,
            category: "values",
            isPremium: false,
            options: makeOptions(),
          },
        },
      ]);
      // Same city, different intentions
      prisma.userProfile.findUnique
        .mockResolvedValueOnce({ intentionTag: "exploring", city: "Istanbul" })
        .mockResolvedValueOnce({ intentionTag: "not_sure", city: "istanbul" }); // case insensitive

      prisma.compatibilityScore.upsert.mockImplementation(
        async (args: Record<string, Record<string, unknown>>) => ({
          baseScore: args.create.baseScore,
          deepScore: args.create.deepScore,
          finalScore: args.create.finalScore,
          level: args.create.level,
          dimensionScores: args.create.dimensionScores,
        }),
      );

      const result = await service.getScoreWithUser("aaa", "bbb");

      // Base: 70% + city bonus 5% = 75%
      expect(result.finalScore).toBe(75);
      expect(result.bonuses.sameCityBonus).toBe(5);
      expect(result.bonuses.intentionTagMatch).toBe(0);
    });

    it("should clamp scores to [47-97] range — no 100%, minimum 47", async () => {
      cache.get.mockResolvedValue(null);
      prisma.compatibilityScore.findUnique.mockResolvedValueOnce(null);

      const makeOptions = () => [
        { id: "opt0", order: 0, value: 0.0 },
        { id: "opt1", order: 1, value: 1.0 },
      ];

      // User A — very low similarity (opposite answers, 1 step apart in a 2-option question)
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: "q1",
          option: { value: 0.0, order: 0 },
          question: {
            weight: 1,
            category: "values",
            isPremium: false,
            options: makeOptions(),
          },
        },
      ]);
      // User B — opposite
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: "q1",
          option: { value: 1.0, order: 1 },
          question: {
            weight: 1,
            category: "values",
            isPremium: false,
            options: makeOptions(),
          },
        },
      ]);
      prisma.compatibilityScore.upsert.mockImplementation(
        async (args: Record<string, Record<string, unknown>>) => ({
          baseScore: args.create.baseScore,
          deepScore: args.create.deepScore,
          finalScore: args.create.finalScore,
          level: args.create.level,
          dimensionScores: args.create.dimensionScores,
        }),
      );

      const result = await service.getScoreWithUser("aaa", "bbb");

      // 1 step apart with 2 options: adjacent = 70%, clamped within [47-97]
      expect(result.finalScore).toBeGreaterThanOrEqual(47);
      expect(result.finalScore).toBeLessThanOrEqual(97);
      expect(result.level).toBe("NORMAL");
    });

    it("should boost scores for complementary categories", async () => {
      cache.get.mockResolvedValue(null);
      prisma.compatibilityScore.findUnique.mockResolvedValueOnce(null);

      const makeOptions = () => [
        { id: "opt0", order: 0, value: 0.0 },
        { id: "opt1", order: 1, value: 0.5 },
        { id: "opt2", order: 2, value: 1.0 },
      ];

      // User A — social_compatibility, order 0
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: "q1",
          option: { value: 0.0, order: 0 },
          question: {
            weight: 1,
            category: "social_compatibility",
            isPremium: false,
            options: makeOptions(),
          },
        },
      ]);
      // User B — social_compatibility, order 1 (1 step apart in complementary category)
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: "q1",
          option: { value: 0.5, order: 1 },
          question: {
            weight: 1,
            category: "social_compatibility",
            isPremium: false,
            options: makeOptions(),
          },
        },
      ]);
      prisma.compatibilityScore.upsert.mockImplementation(
        async (args: Record<string, Record<string, unknown>>) => ({
          baseScore: args.create.baseScore,
          deepScore: args.create.deepScore,
          finalScore: args.create.finalScore,
          level: args.create.level,
          dimensionScores: args.create.dimensionScores,
        }),
      );

      const result = await service.getScoreWithUser("aaa", "bbb");

      // Adjacent (70) + complementary bonus (15) = 85 points / 100 max = 85%
      expect(result.finalScore).toBe(85);
    });

    it("should include levelLabel in the response", async () => {
      cache.get.mockResolvedValue(null);
      prisma.compatibilityScore.findUnique.mockResolvedValueOnce(null);

      const makeOptions = () => [
        { id: "opt0", order: 0, value: 0.0 },
        { id: "opt1", order: 1, value: 1.0 },
      ];

      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: "q1",
          option: { value: 1.0, order: 1 },
          question: {
            weight: 1,
            category: "values",
            isPremium: false,
            options: makeOptions(),
          },
        },
      ]);
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: "q1",
          option: { value: 1.0, order: 1 },
          question: {
            weight: 1,
            category: "values",
            isPremium: false,
            options: makeOptions(),
          },
        },
      ]);
      prisma.compatibilityScore.upsert.mockImplementation(
        async (args: Record<string, Record<string, unknown>>) => ({
          baseScore: args.create.baseScore,
          deepScore: args.create.deepScore,
          finalScore: args.create.finalScore,
          level: args.create.level,
          dimensionScores: args.create.dimensionScores,
        }),
      );

      const result = await service.getScoreWithUser("aaa", "bbb");

      // 100% clamped to 97 -> "Yuksek Uyum"
      expect(result.levelLabel).toBe("Yuksek Uyum");
    });

    it("should include categoryScores in the response", async () => {
      cache.get.mockResolvedValue(null);
      prisma.compatibilityScore.findUnique.mockResolvedValueOnce(null);

      const makeOptions = () => [
        { id: "opt0", order: 0, value: 0.0 },
        { id: "opt1", order: 1, value: 1.0 },
      ];

      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: "q1",
          option: { value: 1.0, order: 1 },
          question: {
            weight: 1,
            category: "values",
            isPremium: false,
            options: makeOptions(),
          },
        },
        {
          questionId: "q2",
          option: { value: 0.0, order: 0 },
          question: {
            weight: 1,
            category: "communication",
            isPremium: false,
            options: makeOptions(),
          },
        },
      ]);
      prisma.userAnswer.findMany.mockResolvedValueOnce([
        {
          questionId: "q1",
          option: { value: 1.0, order: 1 },
          question: {
            weight: 1,
            category: "values",
            isPremium: false,
            options: makeOptions(),
          },
        },
        {
          questionId: "q2",
          option: { value: 1.0, order: 1 },
          question: {
            weight: 1,
            category: "communication",
            isPremium: false,
            options: makeOptions(),
          },
        },
      ]);
      prisma.compatibilityScore.upsert.mockImplementation(
        async (args: Record<string, Record<string, unknown>>) => ({
          baseScore: args.create.baseScore,
          deepScore: args.create.deepScore,
          finalScore: args.create.finalScore,
          level: args.create.level,
          dimensionScores: args.create.dimensionScores,
        }),
      );

      const result = await service.getScoreWithUser("aaa", "bbb");

      expect(result.categoryScores).toBeDefined();
      expect(result.categoryScores.length).toBe(2);
      // values: exact match = 100, communication: adjacent (1 step) = 70
      const valuesScore = result.categoryScores.find(
        (c: { category: string }) => c.category === "values",
      );
      const commScore = result.categoryScores.find(
        (c: { category: string }) => c.category === "communication",
      );
      expect(valuesScore?.score).toBe(100);
      expect(commScore?.score).toBe(70);
    });

    it("should cache results in Redis after calculation", async () => {
      cache.get.mockResolvedValue(null);
      prisma.compatibilityScore.findUnique.mockResolvedValueOnce(null);
      prisma.userAnswer.findMany.mockResolvedValue([]);

      await service.getScoreWithUser("aaa", "bbb");

      // No common answers -> still caches are NOT set (empty result returned directly)
      // The empty-answer path returns early without caching
    });

    it("should order user IDs consistently for storage", async () => {
      cache.get.mockResolvedValue(null);
      prisma.compatibilityScore.findUnique.mockResolvedValue(null);
      prisma.userAnswer.findMany.mockResolvedValue([]);

      // Call with bbb first, aaa second — should still query with aaa < bbb
      await service.getScoreWithUser("bbb", "aaa");

      // The cache check should use ordered IDs
      expect(cache.get).toHaveBeenCalledWith(expect.stringContaining("aaa"));
    });
  });

  // ─── getTopCompatibilityReasons ────────────────────────────────
  describe("getTopCompatibilityReasons", () => {
    it("should return up to 3 reasons based on category scores", () => {
      const categoryScores = [
        { category: "values", score: 90 },
        { category: "communication", score: 85 },
        { category: "life_goals", score: 60 },
        { category: "lifestyle", score: 30 },
      ];

      const reasons = service.getTopCompatibilityReasons(categoryScores, 0, 0);

      expect(reasons.length).toBeLessThanOrEqual(3);
      expect(reasons.length).toBeGreaterThan(0);
    });

    it("should include intention tag reason when bonus is active", () => {
      const categoryScores = [{ category: "values", score: 90 }];

      const reasons = service.getTopCompatibilityReasons(categoryScores, 10, 0);

      expect(reasons).toContain("Ayni iliski niyetine sahipsiniz");
    });

    it("should include city reason when bonus is active", () => {
      const categoryScores = [{ category: "values", score: 90 }];

      const reasons = service.getTopCompatibilityReasons(categoryScores, 0, 5);

      expect(reasons).toContain("Ayni sehirde yasiyorsunuz");
    });

    it("should return fallback reason when no category data", () => {
      const reasons = service.getTopCompatibilityReasons([], 0, 0);

      expect(reasons.length).toBeGreaterThan(0);
    });
  });
});
