import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { CompatibilityController } from "./compatibility.controller";
import { CompatibilityService } from "./compatibility.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

describe("CompatibilityController", () => {
  let controller: CompatibilityController;

  const mockCompatibilityService = {
    getQuestions: jest.fn(),
    submitAnswer: jest.fn(),
    submitAnswersBulk: jest.fn(),
    getMyAnswers: jest.fn(),
    getScoreWithUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompatibilityController],
      providers: [
        { provide: CompatibilityService, useValue: mockCompatibilityService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CompatibilityController>(CompatibilityController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /compatibility/questions
  // ═══════════════════════════════════════════════════════════════

  describe("getQuestions()", () => {
    const userId = "user-uuid-1";

    it("should return compatibility questions for free user", async () => {
      const expected = {
        questions: [
          {
            id: "q-1",
            questionNumber: 1,
            category: "VALUES",
            textTr: "İlişkide en önemli değer nedir?",
            isAnswered: false,
          },
        ],
        answeredCount: 0,
        totalCount: 20,
      };
      mockCompatibilityService.getQuestions.mockResolvedValue(expected);

      const result = await controller.getQuestions(userId);

      expect(result.questions).toHaveLength(1);
      expect(result.totalCount).toBe(20);
    });

    it("should return all 20 questions for premium user", async () => {
      const expected = {
        questions: Array(20).fill({ id: "q", isAnswered: false }),
        answeredCount: 10,
        totalCount: 20,
      };
      mockCompatibilityService.getQuestions.mockResolvedValue(expected);

      const result = await controller.getQuestions(userId);

      expect(result.totalCount).toBe(20);
    });

    it("should throw NotFoundException when user does not exist", async () => {
      mockCompatibilityService.getQuestions.mockRejectedValue(
        new NotFoundException("Kullanıcı bulunamadı"),
      );

      await expect(controller.getQuestions(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should delegate to compatibilityService.getQuestions with userId", async () => {
      mockCompatibilityService.getQuestions.mockResolvedValue({
        questions: [],
        answeredCount: 0,
        totalCount: 20,
      });

      await controller.getQuestions(userId);

      expect(mockCompatibilityService.getQuestions).toHaveBeenCalledWith(
        userId,
      );
      expect(mockCompatibilityService.getQuestions).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /compatibility/answers
  // ═══════════════════════════════════════════════════════════════

  describe("submitAnswer()", () => {
    const userId = "user-uuid-1";

    it("should submit an answer successfully", async () => {
      const dto = { questionId: "q-1", answerIndex: 2 };
      const expected = {
        questionId: "q-1",
        optionId: "opt-3",
        saved: true,
        answeredCount: 5,
        totalCount: 20,
      };
      mockCompatibilityService.submitAnswer.mockResolvedValue(expected);

      const result = await controller.submitAnswer(userId, dto);

      expect(result.saved).toBe(true);
      expect(result.answeredCount).toBe(5);
    });

    it("should throw NotFoundException when question does not exist", async () => {
      const dto = { questionId: "bad-id", answerIndex: 0 };
      mockCompatibilityService.submitAnswer.mockRejectedValue(
        new NotFoundException("Soru bulunamadı"),
      );

      await expect(controller.submitAnswer(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException for invalid answer index", async () => {
      const dto = { questionId: "q-1", answerIndex: 99 };
      mockCompatibilityService.submitAnswer.mockRejectedValue(
        new BadRequestException("Geçersiz cevap indeksi"),
      );

      await expect(controller.submitAnswer(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw ForbiddenException for premium question without access", async () => {
      const dto = { questionId: "q-premium-1", answerIndex: 0 };
      mockCompatibilityService.submitAnswer.mockRejectedValue(
        new ForbiddenException(
          "Premium sorulara erişmek için Gold veya üzeri pakete geçin",
        ),
      );

      await expect(controller.submitAnswer(userId, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should delegate to compatibilityService.submitAnswer with userId and dto", async () => {
      const dto = { questionId: "q-1", answerIndex: 1 };
      mockCompatibilityService.submitAnswer.mockResolvedValue({ saved: true });

      await controller.submitAnswer(userId, dto);

      expect(mockCompatibilityService.submitAnswer).toHaveBeenCalledWith(
        userId,
        dto,
      );
      expect(mockCompatibilityService.submitAnswer).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /compatibility/answers/bulk
  // ═══════════════════════════════════════════════════════════════

  describe("submitAnswersBulk()", () => {
    const userId = "user-uuid-1";

    it("should submit multiple answers successfully", async () => {
      const dto = {
        answers: [
          { questionId: "q-1", optionId: "opt-1" },
          { questionId: "q-2", optionId: "opt-5" },
        ],
      };
      const expected = {
        saved: true,
        savedCount: 2,
        answeredCount: 12,
        totalCount: 20,
      };
      mockCompatibilityService.submitAnswersBulk.mockResolvedValue(expected);

      const result = await controller.submitAnswersBulk(userId, dto);

      expect(result.saved).toBe(true);
      expect(result.savedCount).toBe(2);
    });

    it("should throw NotFoundException when user does not exist", async () => {
      const dto = { answers: [{ questionId: "q-1", optionId: "opt-1" }] };
      mockCompatibilityService.submitAnswersBulk.mockRejectedValue(
        new NotFoundException("Kullanıcı bulunamadı"),
      );

      await expect(controller.submitAnswersBulk(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should delegate to compatibilityService.submitAnswersBulk with userId and dto", async () => {
      const dto = { answers: [{ questionId: "q-1", optionId: "opt-1" }] };
      mockCompatibilityService.submitAnswersBulk.mockResolvedValue({
        saved: true,
      });

      await controller.submitAnswersBulk(userId, dto);

      expect(mockCompatibilityService.submitAnswersBulk).toHaveBeenCalledWith(
        userId,
        dto,
      );
      expect(mockCompatibilityService.submitAnswersBulk).toHaveBeenCalledTimes(
        1,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /compatibility/my-answers
  // ═══════════════════════════════════════════════════════════════

  describe("getMyAnswers()", () => {
    const userId = "user-uuid-1";

    it("should return user answers", async () => {
      const expected = {
        answers: [
          {
            questionId: "q-1",
            questionNumber: 1,
            category: "VALUES",
            textTr: "Test soru",
            selectedOption: { id: "opt-1", labelTr: "A" },
          },
        ],
        totalAnswered: 1,
        totalQuestions: 45,
      };
      mockCompatibilityService.getMyAnswers.mockResolvedValue(expected);

      const result = await controller.getMyAnswers(userId);

      expect(result.totalAnswered).toBe(1);
      expect(result.totalQuestions).toBe(45);
      expect(result.answers).toHaveLength(1);
    });

    it("should delegate to compatibilityService.getMyAnswers with userId", async () => {
      mockCompatibilityService.getMyAnswers.mockResolvedValue({
        answers: [],
        totalAnswered: 0,
        totalQuestions: 45,
      });

      await controller.getMyAnswers(userId);

      expect(mockCompatibilityService.getMyAnswers).toHaveBeenCalledWith(
        userId,
      );
      expect(mockCompatibilityService.getMyAnswers).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /compatibility/score/:targetUserId
  // ═══════════════════════════════════════════════════════════════

  describe("getScoreWithUser()", () => {
    const userId = "user-uuid-1";
    const targetUserId = "user-uuid-2";

    it("should return compatibility score between two users", async () => {
      const expected = {
        userId,
        targetUserId,
        finalScore: 79,
        level: "NORMAL",
        isSuperCompatible: false,
        breakdown: { VALUES: 85, LIFESTYLE: 70 },
      };
      mockCompatibilityService.getScoreWithUser.mockResolvedValue(expected);

      const result = (await controller.getScoreWithUser(
        userId,
        targetUserId,
      )) as Record<string, unknown>;

      expect(result.finalScore).toBe(79);
      expect(result.level).toBe("NORMAL");
      expect(result.isSuperCompatible).toBe(false);
    });

    it("should return SUPER level for high compatibility", async () => {
      const expected = {
        userId,
        targetUserId,
        finalScore: 91,
        level: "SUPER",
        isSuperCompatible: true,
        breakdown: {},
      };
      mockCompatibilityService.getScoreWithUser.mockResolvedValue(expected);

      const result = (await controller.getScoreWithUser(
        userId,
        targetUserId,
      )) as Record<string, unknown>;

      expect(result.level).toBe("SUPER");
      expect(result.isSuperCompatible).toBe(true);
    });

    it("should return zero score when no common questions", async () => {
      const expected = {
        userId,
        targetUserId,
        finalScore: 0,
        level: "NORMAL",
        isSuperCompatible: false,
        breakdown: {},
      };
      mockCompatibilityService.getScoreWithUser.mockResolvedValue(expected);

      const result = await controller.getScoreWithUser(userId, targetUserId);

      expect(result.finalScore).toBe(0);
    });

    it("should delegate to compatibilityService.getScoreWithUser with userId and targetUserId", async () => {
      mockCompatibilityService.getScoreWithUser.mockResolvedValue({
        finalScore: 50,
        level: "NORMAL",
      });

      await controller.getScoreWithUser(userId, targetUserId);

      expect(mockCompatibilityService.getScoreWithUser).toHaveBeenCalledWith(
        userId,
        targetUserId,
      );
      expect(mockCompatibilityService.getScoreWithUser).toHaveBeenCalledTimes(
        1,
      );
    });
  });
});
