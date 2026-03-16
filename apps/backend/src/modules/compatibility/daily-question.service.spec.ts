import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { DailyQuestionService } from "./daily-question.service";
import { PrismaService } from "../../prisma/prisma.service";
import { LumaCacheService } from "../cache/cache.service";

describe("DailyQuestionService", () => {
  let service: DailyQuestionService;

  const mockPrisma = {
    user: { findUnique: jest.fn() },
    compatibilityQuestion: { findFirst: jest.fn(), findUnique: jest.fn() },
    dailyQuestionAnswer: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    userAnswer: {
      upsert: jest.fn(),
    },
    match: { findMany: jest.fn() },
  };

  const mockCacheService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    invalidatePattern: jest.fn().mockResolvedValue(undefined),
    isRedisConnected: jest.fn().mockReturnValue(false),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyQuestionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LumaCacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<DailyQuestionService>(DailyQuestionService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // getDailyQuestion()
  // ═══════════════════════════════════════════════════════════════

  describe("getDailyQuestion()", () => {
    const userId = "user-uuid-1";

    it("should return today question with options", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: userId });
      mockPrisma.compatibilityQuestion.findFirst.mockResolvedValue({
        id: "q-1",
        questionNumber: 1,
        textTr: "Test sorusu?",
        textEn: "Test question?",
        category: "personality",
        options: [
          { id: "opt-1", labelTr: "A", labelEn: "A", order: 1 },
          { id: "opt-2", labelTr: "B", labelEn: "B", order: 2 },
        ],
      });
      mockPrisma.dailyQuestionAnswer.findUnique.mockResolvedValue(null);

      const result = await service.getDailyQuestion(userId);

      expect(result.questionId).toBe("q-1");
      expect(result.options).toHaveLength(2);
      expect(result.alreadyAnswered).toBe(false);
      expect(result.answeredOptionId).toBeNull();
      expect(result.dayNumber).toBeGreaterThan(0);
    });

    it("should indicate when user has already answered today", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: userId });
      mockPrisma.compatibilityQuestion.findFirst.mockResolvedValue({
        id: "q-1",
        questionNumber: 1,
        textTr: "Test?",
        textEn: "Test?",
        category: "personality",
        options: [],
      });
      mockPrisma.dailyQuestionAnswer.findUnique.mockResolvedValue({
        optionId: "opt-1",
      });

      const result = await service.getDailyQuestion(userId);

      expect(result.alreadyAnswered).toBe(true);
      expect(result.answeredOptionId).toBe("opt-1");
    });

    it("should throw NotFoundException when user does not exist", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getDailyQuestion(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw NotFoundException when no question is found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: userId });
      mockPrisma.compatibilityQuestion.findFirst.mockResolvedValue(null);

      await expect(service.getDailyQuestion(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // answerDailyQuestion()
  // ═══════════════════════════════════════════════════════════════

  describe("answerDailyQuestion()", () => {
    const userId = "user-uuid-1";
    const questionId = "q-1";
    const optionId = "opt-1";

    it("should save answer successfully and sync to main answers", async () => {
      mockPrisma.compatibilityQuestion.findFirst.mockResolvedValue({
        id: questionId,
        options: [{ id: optionId }, { id: "opt-2" }],
      });
      mockPrisma.dailyQuestionAnswer.findUnique.mockResolvedValue(null);
      mockPrisma.dailyQuestionAnswer.create.mockResolvedValue({});
      mockPrisma.userAnswer.upsert.mockResolvedValue({});

      const result = await service.answerDailyQuestion(
        userId,
        questionId,
        optionId,
      );

      expect(result.saved).toBe(true);
      expect(result.dayNumber).toBeGreaterThan(0);
      expect(mockPrisma.dailyQuestionAnswer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          questionId,
          optionId,
        }),
      });
      // Verify main answer was also synced
      expect(mockPrisma.userAnswer.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_questionId: { userId, questionId } },
          create: expect.objectContaining({ userId, questionId, optionId }),
        }),
      );
      // Verify cache invalidation was called
      expect(mockCacheService.invalidatePattern).toHaveBeenCalled();
    });

    it("should throw BadRequestException when question is not today question", async () => {
      mockPrisma.compatibilityQuestion.findFirst.mockResolvedValue(null);

      await expect(
        service.answerDailyQuestion(userId, questionId, optionId),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when option does not belong to question", async () => {
      mockPrisma.compatibilityQuestion.findFirst.mockResolvedValue({
        id: questionId,
        options: [{ id: "opt-other" }],
      });

      await expect(
        service.answerDailyQuestion(userId, questionId, "invalid-opt"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw ConflictException when already answered today", async () => {
      mockPrisma.compatibilityQuestion.findFirst.mockResolvedValue({
        id: questionId,
        options: [{ id: optionId }],
      });
      mockPrisma.dailyQuestionAnswer.findUnique.mockResolvedValue({
        id: "existing-answer",
      });

      await expect(
        service.answerDailyQuestion(userId, questionId, optionId),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getDailyInsight()
  // ═══════════════════════════════════════════════════════════════

  describe("getDailyInsight()", () => {
    const userId = "user-uuid-1";
    const questionId = "q-1";

    it("should return insight with match comparison data", async () => {
      mockPrisma.dailyQuestionAnswer.findUnique.mockResolvedValue({
        optionId: "opt-1",
      });
      mockPrisma.compatibilityQuestion.findUnique.mockResolvedValue({
        id: questionId,
        options: [
          { id: "opt-1", labelTr: "Secim A" },
          { id: "opt-2", labelTr: "Secim B" },
        ],
      });
      mockPrisma.match.findMany.mockResolvedValue([
        { userAId: userId, userBId: "partner-1" },
        { userAId: "partner-2", userBId: userId },
      ]);
      // Match answers
      mockPrisma.dailyQuestionAnswer.findMany
        .mockResolvedValueOnce([
          { optionId: "opt-1" }, // partner-1 answered same
          { optionId: "opt-2" }, // partner-2 answered different
        ])
        // All answers
        .mockResolvedValueOnce([
          { optionId: "opt-1" },
          { optionId: "opt-1" },
          { optionId: "opt-2" },
        ]);

      const result = await service.getDailyInsight(userId, questionId);

      expect(result.questionId).toBe(questionId);
      expect(result.totalResponses).toBe(3);
      expect(result.matchResponses).toBe(2);
      expect(result.sameAnswerPercent).toBe(50); // 1 out of 2
      expect(result.optionBreakdown).toHaveLength(2);
      expect(result.soulMateInsight).toBeDefined();
      expect(typeof result.soulMateInsight).toBe("string");
    });

    it("should throw BadRequestException when user has not answered", async () => {
      mockPrisma.dailyQuestionAnswer.findUnique.mockResolvedValue(null);

      await expect(service.getDailyInsight(userId, questionId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw NotFoundException when question does not exist", async () => {
      mockPrisma.dailyQuestionAnswer.findUnique.mockResolvedValue({
        optionId: "opt-1",
      });
      mockPrisma.compatibilityQuestion.findUnique.mockResolvedValue(null);

      await expect(service.getDailyInsight(userId, questionId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should return 0 sameAnswerPercent when no matches answered", async () => {
      mockPrisma.dailyQuestionAnswer.findUnique.mockResolvedValue({
        optionId: "opt-1",
      });
      mockPrisma.compatibilityQuestion.findUnique.mockResolvedValue({
        id: questionId,
        options: [{ id: "opt-1", labelTr: "A" }],
      });
      mockPrisma.match.findMany.mockResolvedValue([]);
      mockPrisma.dailyQuestionAnswer.findMany
        .mockResolvedValueOnce([]) // no match answers
        .mockResolvedValueOnce([{ optionId: "opt-1" }]); // only user's answer

      const result = await service.getDailyInsight(userId, questionId);

      expect(result.matchResponses).toBe(0);
      expect(result.sameAnswerPercent).toBe(0);
      expect(result.soulMateInsight).toContain("henuz kimse");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getStreak()
  // ═══════════════════════════════════════════════════════════════

  describe("getStreak()", () => {
    const userId = "user-uuid-1";

    it("should return zero streak when user has no answers", async () => {
      mockPrisma.dailyQuestionAnswer.findMany.mockResolvedValue([]);

      const result = await service.getStreak(userId);

      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(0);
      expect(result.totalAnswered).toBe(0);
      expect(result.lastAnsweredAt).toBeNull();
    });

    it("should calculate current and longest streak", async () => {
      // Simulate getting the current day number via the service's internal method
      const now = new Date();
      const epoch = new Date("2025-01-01T00:00:00Z");
      const today = Math.floor(
        (now.getTime() - epoch.getTime()) / (1000 * 60 * 60 * 24),
      );

      const answeredAt = new Date();
      mockPrisma.dailyQuestionAnswer.findMany.mockResolvedValue([
        { dayNumber: today, createdAt: answeredAt },
        { dayNumber: today - 1, createdAt: new Date(Date.now() - 86400000) },
        { dayNumber: today - 2, createdAt: new Date(Date.now() - 172800000) },
      ]);

      const result = await service.getStreak(userId);

      expect(result.currentStreak).toBe(3);
      expect(result.longestStreak).toBe(3);
      expect(result.totalAnswered).toBe(3);
      expect(result.lastAnsweredAt).toBe(answeredAt.toISOString());
    });

    it("should count streak from yesterday if not answered today", async () => {
      const now = new Date();
      const epoch = new Date("2025-01-01T00:00:00Z");
      const today = Math.floor(
        (now.getTime() - epoch.getTime()) / (1000 * 60 * 60 * 24),
      );

      mockPrisma.dailyQuestionAnswer.findMany.mockResolvedValue([
        { dayNumber: today - 1, createdAt: new Date() },
        { dayNumber: today - 2, createdAt: new Date() },
      ]);

      const result = await service.getStreak(userId);

      expect(result.currentStreak).toBe(2);
    });

    it("should identify longest streak across non-consecutive gaps", async () => {
      const now = new Date();
      const epoch = new Date("2025-01-01T00:00:00Z");
      const today = Math.floor(
        (now.getTime() - epoch.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Current streak of 1 day (today), but a longer past streak of 5 days
      mockPrisma.dailyQuestionAnswer.findMany.mockResolvedValue([
        { dayNumber: today, createdAt: new Date() },
        // gap on today-1
        { dayNumber: today - 10, createdAt: new Date() },
        { dayNumber: today - 11, createdAt: new Date() },
        { dayNumber: today - 12, createdAt: new Date() },
        { dayNumber: today - 13, createdAt: new Date() },
        { dayNumber: today - 14, createdAt: new Date() },
      ]);

      const result = await service.getStreak(userId);

      expect(result.currentStreak).toBe(1); // just today
      expect(result.longestStreak).toBe(5); // the historical streak
      expect(result.totalAnswered).toBe(6);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getAnswerStats()
  // ═══════════════════════════════════════════════════════════════

  describe("getAnswerStats()", () => {
    const userId = "user-uuid-1";
    const questionId = "q-1";

    it("should return global answer stats with option breakdown", async () => {
      mockPrisma.compatibilityQuestion.findUnique.mockResolvedValue({
        id: questionId,
        options: [
          { id: "opt-1", labelTr: "Secim A" },
          { id: "opt-2", labelTr: "Secim B" },
        ],
      });
      mockPrisma.dailyQuestionAnswer.findMany.mockResolvedValue([
        { optionId: "opt-1", userId: "u1" },
        { optionId: "opt-1", userId: "u2" },
        { optionId: "opt-2", userId: "u3" },
      ]);
      mockPrisma.dailyQuestionAnswer.findFirst.mockResolvedValue({
        optionId: "opt-1",
      });

      const result = await service.getAnswerStats(questionId, userId);

      expect(result.questionId).toBe(questionId);
      expect(result.totalAnswers).toBe(3);
      expect(result.optionBreakdown).toHaveLength(2);
      expect(result.mostPopularOption).not.toBeNull();
      expect(result.mostPopularOption!.optionId).toBe("opt-1");
      expect(result.userAnswer).not.toBeNull();
      expect(result.userAnswer!.optionId).toBe("opt-1");
    });

    it("should throw NotFoundException when question does not exist", async () => {
      mockPrisma.compatibilityQuestion.findUnique.mockResolvedValue(null);

      await expect(service.getAnswerStats(questionId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should return null userAnswer when user has not answered", async () => {
      mockPrisma.compatibilityQuestion.findUnique.mockResolvedValue({
        id: questionId,
        options: [{ id: "opt-1", labelTr: "A" }],
      });
      mockPrisma.dailyQuestionAnswer.findMany.mockResolvedValue([]);
      mockPrisma.dailyQuestionAnswer.findFirst.mockResolvedValue(null);

      const result = await service.getAnswerStats(questionId, userId);

      expect(result.userAnswer).toBeNull();
      expect(result.totalAnswers).toBe(0);
    });

    it("should return null mostPopularOption when no answers exist", async () => {
      mockPrisma.compatibilityQuestion.findUnique.mockResolvedValue({
        id: questionId,
        options: [{ id: "opt-1", labelTr: "A" }],
      });
      mockPrisma.dailyQuestionAnswer.findMany.mockResolvedValue([]);
      mockPrisma.dailyQuestionAnswer.findFirst.mockResolvedValue(null);

      const result = await service.getAnswerStats(questionId, userId);

      expect(result.mostPopularOption).toBeNull();
    });

    it("should generate correct insight message for majority answer", async () => {
      mockPrisma.compatibilityQuestion.findUnique.mockResolvedValue({
        id: questionId,
        options: [
          { id: "opt-1", labelTr: "A" },
          { id: "opt-2", labelTr: "B" },
        ],
      });
      // 8 out of 10 picked opt-1
      const answers = [
        ...Array(8).fill({ optionId: "opt-1", userId: "x" }),
        ...Array(2).fill({ optionId: "opt-2", userId: "y" }),
      ];
      mockPrisma.dailyQuestionAnswer.findMany.mockResolvedValue(answers);
      mockPrisma.dailyQuestionAnswer.findFirst.mockResolvedValue({
        optionId: "opt-1",
      });

      const result = await service.getAnswerStats(questionId, userId);

      expect(result.userAnswer!.percent).toBe(80);
      expect(result.userAnswer!.insightMessage).toContain("%80");
    });
  });
});
