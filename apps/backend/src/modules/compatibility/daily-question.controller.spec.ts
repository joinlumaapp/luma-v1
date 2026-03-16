import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { DailyQuestionController } from "./daily-question.controller";
import { DailyQuestionService } from "./daily-question.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

describe("DailyQuestionController", () => {
  let controller: DailyQuestionController;

  const mockDailyQuestionService = {
    getDailyQuestion: jest.fn(),
    answerDailyQuestion: jest.fn(),
    getDailyInsight: jest.fn(),
    getAnswerStats: jest.fn(),
    getStreak: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DailyQuestionController],
      providers: [
        { provide: DailyQuestionService, useValue: mockDailyQuestionService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DailyQuestionController>(DailyQuestionController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /compatibility/daily
  // ═══════════════════════════════════════════════════════════════

  describe("getDailyQuestion()", () => {
    const userId = "user-uuid-1";

    it("should return today's daily question", async () => {
      const expected = {
        questionId: "q-1",
        questionNumber: 15,
        textTr: "Hafta sonu nasil vakit gecirmeyi tercih edersiniz?",
        textEn: "How do you prefer to spend weekends?",
        category: "LIFESTYLE",
        options: [
          {
            id: "opt-1",
            labelTr: "Evde dinlenerek",
            labelEn: "Relaxing at home",
            order: 0,
          },
          {
            id: "opt-2",
            labelTr: "Sosyal aktiviteler",
            labelEn: "Social activities",
            order: 1,
          },
        ],
        dayNumber: 150,
        alreadyAnswered: false,
        answeredOptionId: null,
      };
      mockDailyQuestionService.getDailyQuestion.mockResolvedValue(expected);

      const result = await controller.getDailyQuestion(userId);

      expect(result.questionId).toBe("q-1");
      expect(result.options).toHaveLength(2);
      expect(result.alreadyAnswered).toBe(false);
    });

    it("should return question with answered status when already answered", async () => {
      const expected = {
        questionId: "q-1",
        alreadyAnswered: true,
        answeredOptionId: "opt-2",
      };
      mockDailyQuestionService.getDailyQuestion.mockResolvedValue(expected);

      const result = await controller.getDailyQuestion(userId);

      expect(result.alreadyAnswered).toBe(true);
      expect(result.answeredOptionId).toBe("opt-2");
    });

    it("should throw NotFoundException when user does not exist", async () => {
      mockDailyQuestionService.getDailyQuestion.mockRejectedValue(
        new NotFoundException("Kullanici bulunamadi"),
      );

      await expect(controller.getDailyQuestion(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should delegate to dailyQuestionService.getDailyQuestion with userId", async () => {
      mockDailyQuestionService.getDailyQuestion.mockResolvedValue({
        questionId: "q-1",
      });

      await controller.getDailyQuestion(userId);

      expect(mockDailyQuestionService.getDailyQuestion).toHaveBeenCalledWith(
        userId,
      );
      expect(mockDailyQuestionService.getDailyQuestion).toHaveBeenCalledTimes(
        1,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /compatibility/daily
  // ═══════════════════════════════════════════════════════════════

  describe("answerDailyQuestion()", () => {
    const userId = "user-uuid-1";

    it("should answer daily question successfully", async () => {
      const dto = { questionId: "q-1", optionId: "opt-2" };
      mockDailyQuestionService.answerDailyQuestion.mockResolvedValue({
        saved: true,
        dayNumber: 150,
      });

      const result = await controller.answerDailyQuestion(userId, dto);

      expect(result.saved).toBe(true);
      expect(result.dayNumber).toBe(150);
    });

    it("should throw BadRequestException for invalid question", async () => {
      const dto = { questionId: "bad-id", optionId: "opt-1" };
      mockDailyQuestionService.answerDailyQuestion.mockRejectedValue(
        new BadRequestException("Bu soru bugunun sorusu degil veya gecersiz"),
      );

      await expect(controller.answerDailyQuestion(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw ConflictException when already answered today", async () => {
      const dto = { questionId: "q-1", optionId: "opt-1" };
      mockDailyQuestionService.answerDailyQuestion.mockRejectedValue(
        new ConflictException("Bu soruyu bugun zaten yanitladin"),
      );

      await expect(controller.answerDailyQuestion(userId, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should delegate to dailyQuestionService.answerDailyQuestion with correct args", async () => {
      const dto = { questionId: "q-1", optionId: "opt-2" };
      mockDailyQuestionService.answerDailyQuestion.mockResolvedValue({
        saved: true,
        dayNumber: 1,
      });

      await controller.answerDailyQuestion(userId, dto);

      expect(mockDailyQuestionService.answerDailyQuestion).toHaveBeenCalledWith(
        userId,
        dto.questionId,
        dto.optionId,
      );
      expect(
        mockDailyQuestionService.answerDailyQuestion,
      ).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /compatibility/daily/insight
  // ═══════════════════════════════════════════════════════════════

  describe("getDailyInsight()", () => {
    const userId = "user-uuid-1";
    const questionId = "q-1";

    it("should return insight for answered question", async () => {
      const expected = {
        questionId,
        totalResponses: 100,
        matchResponses: 5,
        sameAnswerPercent: 60,
        optionBreakdown: [
          {
            optionId: "opt-1",
            labelTr: "A",
            count: 40,
            percent: 40,
            isUserChoice: false,
          },
          {
            optionId: "opt-2",
            labelTr: "B",
            count: 60,
            percent: 60,
            isUserChoice: true,
          },
        ],
        soulMateInsight: "Eslesmelerinle bakis aciniz oldukca yakin.",
      };
      mockDailyQuestionService.getDailyInsight.mockResolvedValue(expected);

      const result = await controller.getDailyInsight(userId, questionId);

      expect(result.totalResponses).toBe(100);
      expect(result.sameAnswerPercent).toBe(60);
      expect(result.optionBreakdown).toHaveLength(2);
    });

    it("should throw BadRequestException when user has not answered", async () => {
      mockDailyQuestionService.getDailyInsight.mockRejectedValue(
        new BadRequestException("Once bu soruyu yanitlamalisin"),
      );

      await expect(
        controller.getDailyInsight(userId, questionId),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when question does not exist", async () => {
      mockDailyQuestionService.getDailyInsight.mockRejectedValue(
        new NotFoundException("Soru bulunamadi"),
      );

      await expect(
        controller.getDailyInsight(userId, "bad-id"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should delegate to dailyQuestionService.getDailyInsight with userId and questionId", async () => {
      mockDailyQuestionService.getDailyInsight.mockResolvedValue({
        questionId,
      });

      await controller.getDailyInsight(userId, questionId);

      expect(mockDailyQuestionService.getDailyInsight).toHaveBeenCalledWith(
        userId,
        questionId,
      );
      expect(mockDailyQuestionService.getDailyInsight).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /compatibility/daily/streak
  // ═══════════════════════════════════════════════════════════════

  describe("getStreak()", () => {
    const userId = "user-uuid-1";

    it("should return streak information", async () => {
      const expected = {
        currentStreak: 7,
        longestStreak: 14,
        totalAnswered: 30,
        lastAnsweredAt: "2025-06-01T12:00:00Z",
      };
      mockDailyQuestionService.getStreak.mockResolvedValue(expected);

      const result = await controller.getStreak(userId);

      expect(result.currentStreak).toBe(7);
      expect(result.longestStreak).toBe(14);
      expect(result.totalAnswered).toBe(30);
    });

    it("should return zero streak for new user", async () => {
      const expected = {
        currentStreak: 0,
        longestStreak: 0,
        totalAnswered: 0,
        lastAnsweredAt: null,
      };
      mockDailyQuestionService.getStreak.mockResolvedValue(expected);

      const result = await controller.getStreak(userId);

      expect(result.currentStreak).toBe(0);
      expect(result.lastAnsweredAt).toBeNull();
    });

    it("should delegate to dailyQuestionService.getStreak with userId", async () => {
      mockDailyQuestionService.getStreak.mockResolvedValue({
        currentStreak: 0,
        longestStreak: 0,
        totalAnswered: 0,
        lastAnsweredAt: null,
      });

      await controller.getStreak(userId);

      expect(mockDailyQuestionService.getStreak).toHaveBeenCalledWith(userId);
      expect(mockDailyQuestionService.getStreak).toHaveBeenCalledTimes(1);
    });
  });
});
