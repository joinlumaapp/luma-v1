import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { IcebreakerController } from "./icebreaker.controller";
import { PrismaService } from "../../prisma/prisma.service";
import { IcebreakerGameType } from "./dto/icebreaker.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

describe("IcebreakerController", () => {
  let controller: IcebreakerController;

  const mockPrisma = {
    match: {
      findUnique: jest.fn(),
    },
    icebreakerSession: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    icebreakerAnswer: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IcebreakerController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<IcebreakerController>(IcebreakerController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /chat/icebreaker/:matchId
  // ═══════════════════════════════════════════════════════════════

  describe("getAvailableGames()", () => {
    const userId = "user-uuid-1";
    const matchId = "match-uuid-1";

    it("should return list of available games", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: matchId,
        userAId: userId,
        userBId: "user-uuid-2",
        isActive: true,
      });

      const result = await controller.getAvailableGames(userId, matchId);

      expect(result.matchId).toBe(matchId);
      expect(result.games).toHaveLength(3);
      expect(result.games[0].type).toBe(IcebreakerGameType.THIS_OR_THAT);
      expect(result.games[1].type).toBe(IcebreakerGameType.TWO_TRUTHS_ONE_LIE);
      expect(result.games[2].type).toBe(IcebreakerGameType.RAPID_FIRE);
      expect(
        result.games.every((g: { isAvailable: boolean }) => g.isAvailable),
      ).toBe(true);
    });

    it("should throw NotFoundException when match does not exist", async () => {
      mockPrisma.match.findUnique.mockResolvedValue(null);

      await expect(
        controller.getAvailableGames(userId, matchId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when user is not part of match", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: matchId,
        userAId: "other-user-1",
        userBId: "other-user-2",
        isActive: true,
      });

      await expect(
        controller.getAvailableGames(userId, matchId),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException when match is not active", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: matchId,
        userAId: userId,
        userBId: "user-uuid-2",
        isActive: false,
      });

      await expect(
        controller.getAvailableGames(userId, matchId),
      ).rejects.toThrow(BadRequestException);
    });

    it("should delegate to prisma.match.findUnique with correct params", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: matchId,
        userAId: userId,
        userBId: "user-uuid-2",
        isActive: true,
      });

      await controller.getAvailableGames(userId, matchId);

      expect(mockPrisma.match.findUnique).toHaveBeenCalledWith({
        where: { id: matchId },
        select: { id: true, userAId: true, userBId: true, isActive: true },
      });
      expect(mockPrisma.match.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /chat/icebreaker/:matchId/start
  // ═══════════════════════════════════════════════════════════════

  describe("startGame()", () => {
    const userId = "user-uuid-1";
    const matchId = "match-uuid-1";
    const sessionId = "session-uuid-1";
    const now = new Date("2026-02-24T12:00:00.000Z");

    it("should create a persisted game session and return questions", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: matchId,
        userAId: userId,
        userBId: "user-uuid-2",
        isActive: true,
      });
      mockPrisma.icebreakerSession.create.mockResolvedValue({
        id: sessionId,
        matchId,
        gameType: IcebreakerGameType.THIS_OR_THAT,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });

      const dto = { gameType: IcebreakerGameType.THIS_OR_THAT };
      const result = await controller.startGame(userId, matchId, dto);

      expect(result.sessionId).toBe(sessionId);
      expect(result.matchId).toBe(matchId);
      expect(result.gameType).toBe(IcebreakerGameType.THIS_OR_THAT);
      expect(result.questions).toHaveLength(8);
      expect(result.startedBy).toBe(userId);
      expect(result.startedAt).toBe(now.toISOString());
      expect(result.message).toBe("Oyun baslatildi! Iyi eglenceler!");
    });

    it("should persist session to database via prisma", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: matchId,
        userAId: userId,
        userBId: "user-uuid-2",
        isActive: true,
      });
      mockPrisma.icebreakerSession.create.mockResolvedValue({
        id: sessionId,
        matchId,
        gameType: IcebreakerGameType.RAPID_FIRE,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });

      const dto = { gameType: IcebreakerGameType.RAPID_FIRE };
      await controller.startGame(userId, matchId, dto);

      expect(mockPrisma.icebreakerSession.create).toHaveBeenCalledWith({
        data: {
          matchId,
          gameType: IcebreakerGameType.RAPID_FIRE,
          status: "active",
        },
      });
    });

    it("should return 10 questions for RAPID_FIRE game type", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: matchId,
        userAId: userId,
        userBId: "user-uuid-2",
        isActive: true,
      });
      mockPrisma.icebreakerSession.create.mockResolvedValue({
        id: sessionId,
        matchId,
        gameType: IcebreakerGameType.RAPID_FIRE,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });

      const dto = { gameType: IcebreakerGameType.RAPID_FIRE };
      const result = await controller.startGame(userId, matchId, dto);

      expect(result.gameType).toBe(IcebreakerGameType.RAPID_FIRE);
      expect(result.questions).toHaveLength(10);
    });

    it("should validate match participation before starting game", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: matchId,
        userAId: "other-user-1",
        userBId: "other-user-2",
        isActive: true,
      });

      const dto = { gameType: IcebreakerGameType.THIS_OR_THAT };
      await expect(controller.startGame(userId, matchId, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should throw NotFoundException when match does not exist", async () => {
      mockPrisma.match.findUnique.mockResolvedValue(null);

      const dto = { gameType: IcebreakerGameType.TWO_TRUTHS_ONE_LIE };
      await expect(controller.startGame(userId, matchId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /chat/icebreaker/:matchId/answer
  // ═══════════════════════════════════════════════════════════════

  describe("submitAnswer()", () => {
    const userId = "user-uuid-1";
    const matchId = "match-uuid-1";
    const sessionId = "session-uuid-1";
    const now = new Date("2026-02-24T12:00:00.000Z");

    it("should persist an answer to the database and return result", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: matchId,
        userAId: userId,
        userBId: "user-uuid-2",
        isActive: true,
      });
      mockPrisma.icebreakerSession.findFirst.mockResolvedValue({
        id: sessionId,
        matchId,
        status: "active",
      });
      mockPrisma.icebreakerAnswer.upsert.mockResolvedValue({
        id: "answer-uuid-1",
        sessionId,
        userId,
        questionId: "tot_1",
        answer: "Sabah insani",
        createdAt: now,
      });
      mockPrisma.icebreakerAnswer.findFirst.mockResolvedValue(null);

      const dto = { sessionId, questionId: "tot_1", answer: "Sabah insani" };
      const result = await controller.submitAnswer(userId, matchId, dto);

      expect(result.questionId).toBe("tot_1");
      expect(result.answer).toBe("Sabah insani");
      expect(result.submittedAt).toBe(now.toISOString());
      expect(result.partnerAnswered).toBe(false);
      expect(result.isMatch).toBeNull();
    });

    it("should persist answer via prisma upsert", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: matchId,
        userAId: userId,
        userBId: "user-uuid-2",
        isActive: true,
      });
      mockPrisma.icebreakerSession.findFirst.mockResolvedValue({
        id: sessionId,
        matchId,
        status: "active",
      });
      mockPrisma.icebreakerAnswer.upsert.mockResolvedValue({
        id: "answer-uuid-1",
        sessionId,
        userId,
        questionId: "rf_3",
        answer: "Ucmak",
        createdAt: now,
      });
      mockPrisma.icebreakerAnswer.findFirst.mockResolvedValue(null);

      const dto = { sessionId, questionId: "rf_3", answer: "Ucmak" };
      await controller.submitAnswer(userId, matchId, dto);

      expect(mockPrisma.icebreakerAnswer.upsert).toHaveBeenCalledWith({
        where: {
          sessionId_userId_questionId: {
            sessionId,
            userId,
            questionId: "rf_3",
          },
        },
        update: { answer: "Ucmak" },
        create: {
          sessionId,
          userId,
          questionId: "rf_3",
          answer: "Ucmak",
        },
      });
    });

    it("should detect when partner has answered the same question with matching answer", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: matchId,
        userAId: userId,
        userBId: "user-uuid-2",
        isActive: true,
      });
      mockPrisma.icebreakerSession.findFirst.mockResolvedValue({
        id: sessionId,
        matchId,
        status: "active",
      });
      mockPrisma.icebreakerAnswer.upsert.mockResolvedValue({
        id: "answer-uuid-1",
        sessionId,
        userId,
        questionId: "tot_4",
        answer: "Kahve",
        createdAt: now,
      });
      // Partner has already answered with same answer
      mockPrisma.icebreakerAnswer.findFirst.mockResolvedValue({
        id: "answer-uuid-2",
        sessionId,
        userId: "user-uuid-2",
        questionId: "tot_4",
        answer: "Kahve",
        createdAt: now,
      });

      const dto = { sessionId, questionId: "tot_4", answer: "Kahve" };
      const result = await controller.submitAnswer(userId, matchId, dto);

      expect(result.partnerAnswered).toBe(true);
      expect(result.isMatch).toBe(true);
    });

    it("should detect when partner has answered with a different answer", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: matchId,
        userAId: userId,
        userBId: "user-uuid-2",
        isActive: true,
      });
      mockPrisma.icebreakerSession.findFirst.mockResolvedValue({
        id: sessionId,
        matchId,
        status: "active",
      });
      mockPrisma.icebreakerAnswer.upsert.mockResolvedValue({
        id: "answer-uuid-1",
        sessionId,
        userId,
        questionId: "tot_4",
        answer: "Cay",
        createdAt: now,
      });
      // Partner answered differently
      mockPrisma.icebreakerAnswer.findFirst.mockResolvedValue({
        id: "answer-uuid-2",
        sessionId,
        userId: "user-uuid-2",
        questionId: "tot_4",
        answer: "Kahve",
        createdAt: now,
      });

      const dto = { sessionId, questionId: "tot_4", answer: "Cay" };
      const result = await controller.submitAnswer(userId, matchId, dto);

      expect(result.partnerAnswered).toBe(true);
      expect(result.isMatch).toBe(false);
    });

    it("should throw NotFoundException when session does not exist", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: matchId,
        userAId: userId,
        userBId: "user-uuid-2",
        isActive: true,
      });
      mockPrisma.icebreakerSession.findFirst.mockResolvedValue(null);

      const dto = {
        sessionId: "invalid-session",
        questionId: "tot_1",
        answer: "Sabah insani",
      };
      await expect(
        controller.submitAnswer(userId, matchId, dto),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when user is not in match", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: matchId,
        userAId: "other-user-1",
        userBId: "other-user-2",
        isActive: true,
      });

      const dto = { sessionId, questionId: "tot_1", answer: "Sabah insani" };
      await expect(
        controller.submitAnswer(userId, matchId, dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException when match is inactive", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: matchId,
        userAId: userId,
        userBId: "user-uuid-2",
        isActive: false,
      });

      const dto = { sessionId, questionId: "tot_1", answer: "Sabah insani" };
      await expect(
        controller.submitAnswer(userId, matchId, dto),
      ).rejects.toThrow(BadRequestException);
    });

    it("should verify session belongs to the match", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: matchId,
        userAId: userId,
        userBId: "user-uuid-2",
        isActive: true,
      });
      mockPrisma.icebreakerSession.findFirst.mockResolvedValue(null);

      const dto = { sessionId, questionId: "tot_1", answer: "test" };
      await expect(
        controller.submitAnswer(userId, matchId, dto),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.icebreakerSession.findFirst).toHaveBeenCalledWith({
        where: {
          id: sessionId,
          matchId,
          status: "active",
        },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /chat/icebreaker/:matchId/history
  // ═══════════════════════════════════════════════════════════════

  describe("getSessionHistory()", () => {
    const userId = "user-uuid-1";
    const matchId = "match-uuid-1";
    const now = new Date("2026-02-24T12:00:00.000Z");

    it("should return past game sessions with answers", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: matchId,
        userAId: userId,
        userBId: "user-uuid-2",
        isActive: true,
      });
      mockPrisma.icebreakerSession.findMany.mockResolvedValue([
        {
          id: "session-1",
          matchId,
          gameType: "THIS_OR_THAT",
          status: "active",
          createdAt: now,
          updatedAt: now,
          answers: [
            {
              id: "answer-1",
              sessionId: "session-1",
              userId: "user-uuid-1",
              questionId: "tot_1",
              answer: "Sabah insani",
              createdAt: now,
            },
            {
              id: "answer-2",
              sessionId: "session-1",
              userId: "user-uuid-2",
              questionId: "tot_1",
              answer: "Gece kusu",
              createdAt: now,
            },
          ],
        },
      ]);

      const result = await controller.getSessionHistory(userId, matchId);

      expect(result.matchId).toBe(matchId);
      expect(result.totalSessions).toBe(1);
      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].id).toBe("session-1");
      expect(result.sessions[0].gameType).toBe("THIS_OR_THAT");
      expect(result.sessions[0].answers).toHaveLength(2);
      expect(result.sessions[0].answers[0].userId).toBe("user-uuid-1");
      expect(result.sessions[0].answers[0].answer).toBe("Sabah insani");
    });

    it("should return empty sessions when no games have been played", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: matchId,
        userAId: userId,
        userBId: "user-uuid-2",
        isActive: true,
      });
      mockPrisma.icebreakerSession.findMany.mockResolvedValue([]);

      const result = await controller.getSessionHistory(userId, matchId);

      expect(result.matchId).toBe(matchId);
      expect(result.totalSessions).toBe(0);
      expect(result.sessions).toHaveLength(0);
    });

    it("should query sessions with correct params including answers", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: matchId,
        userAId: userId,
        userBId: "user-uuid-2",
        isActive: true,
      });
      mockPrisma.icebreakerSession.findMany.mockResolvedValue([]);

      await controller.getSessionHistory(userId, matchId);

      expect(mockPrisma.icebreakerSession.findMany).toHaveBeenCalledWith({
        where: { matchId },
        include: {
          answers: {
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should throw NotFoundException when match does not exist", async () => {
      mockPrisma.match.findUnique.mockResolvedValue(null);

      await expect(
        controller.getSessionHistory(userId, matchId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when user is not in match", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: matchId,
        userAId: "other-user-1",
        userBId: "other-user-2",
        isActive: true,
      });

      await expect(
        controller.getSessionHistory(userId, matchId),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException when match is inactive", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: matchId,
        userAId: userId,
        userBId: "user-uuid-2",
        isActive: false,
      });

      await expect(
        controller.getSessionHistory(userId, matchId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
