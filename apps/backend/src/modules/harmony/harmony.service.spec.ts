import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { HarmonyService } from "./harmony.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BadgesService } from "../badges/badges.service";

const mockPrisma = {
  match: { findUnique: jest.fn() },
  harmonySession: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  harmonyQuestionCard: { findMany: jest.fn() },
  harmonyGameCard: { findMany: jest.fn() },
  harmonyUsedCard: {
    createMany: jest.fn(),
    findMany: jest.fn(),
  },
  harmonyMessage: { count: jest.fn() },
  harmonyExtension: { create: jest.fn() },
  notification: { create: jest.fn() },
  user: { findUnique: jest.fn(), update: jest.fn() },
  goldTransaction: { create: jest.fn() },
  chatMessage: { findMany: jest.fn() },
  $transaction: jest.fn(),
};

const mockBadgesService = {
  checkAndAwardBadges: jest.fn().mockResolvedValue([]),
};

describe("HarmonyService", () => {
  let service: HarmonyService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HarmonyService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BadgesService, useValue: mockBadgesService },
      ],
    }).compile();
    service = module.get<HarmonyService>(HarmonyService);
  });

  // ═══════════════════════════════════════════════════════════════
  // getUserSessions()
  // ═══════════════════════════════════════════════════════════════

  describe("getUserSessions()", () => {
    it("should return empty sessions when user has none", async () => {
      mockPrisma.harmonySession.findMany.mockResolvedValue([]);

      const result = await service.getUserSessions("u1");

      expect(result.sessions).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("should map question cards correctly", async () => {
      mockPrisma.harmonySession.findMany.mockResolvedValue([
        {
          id: "s1",
          matchId: "m1",
          userAId: "u1",
          userBId: "u2",
          status: "ACTIVE",
          startedAt: new Date(),
          endsAt: new Date(),
          actualEndedAt: null,
          totalExtensionMinutes: 0,
          hasVoiceChat: false,
          hasVideoChat: false,
          match: { compatibilityScore: 80, compatibilityLevel: "HIGH" },
          userA: { id: "u1", profile: { firstName: "Ali" } },
          userB: { id: "u2", profile: { firstName: "Ayse" } },
          usedCards: [
            {
              usedAt: new Date(),
              questionCard: {
                id: "qc1",
                category: "ICEBREAKER",
                textEn: "Question?",
                textTr: "Soru?",
              },
              gameCard: null,
            },
          ],
        },
      ]);

      const result = await service.getUserSessions("u1");

      expect(result.total).toBe(1);
      expect(result.sessions[0].cards[0].type).toBe("question");
      expect(result.sessions[0].cards[0].category).toBe("ICEBREAKER");
      expect(result.sessions[0].userAName).toBe("Ali");
      expect(result.sessions[0].userBName).toBe("Ayse");
    });

    it("should map game cards correctly", async () => {
      mockPrisma.harmonySession.findMany.mockResolvedValue([
        {
          id: "s1",
          matchId: "m1",
          userAId: "u1",
          userBId: "u2",
          status: "ACTIVE",
          startedAt: new Date(),
          endsAt: new Date(),
          actualEndedAt: null,
          totalExtensionMinutes: 0,
          hasVoiceChat: false,
          hasVideoChat: false,
          match: null,
          userA: { id: "u1", profile: null },
          userB: { id: "u2", profile: null },
          usedCards: [
            {
              usedAt: new Date(),
              questionCard: null,
              gameCard: {
                id: "gc1",
                nameEn: "Game",
                nameTr: "Oyun",
                descriptionEn: "A game",
                descriptionTr: "Bir oyun",
                gameType: "WOULD_YOU_RATHER",
              },
            },
          ],
        },
      ]);

      const result = await service.getUserSessions("u1");

      expect(result.sessions[0].cards[0].type).toBe("game");
      expect(
        (result.sessions[0].cards[0] as { gameType: string }).gameType,
      ).toBe("WOULD_YOU_RATHER");
    });

    it("should default to empty string when profile firstName is null", async () => {
      mockPrisma.harmonySession.findMany.mockResolvedValue([
        {
          id: "s1",
          matchId: "m1",
          userAId: "u1",
          userBId: "u2",
          status: "ENDED",
          startedAt: new Date(),
          endsAt: new Date(),
          actualEndedAt: new Date(),
          totalExtensionMinutes: 0,
          hasVoiceChat: false,
          hasVideoChat: false,
          match: null,
          userA: null,
          userB: null,
          usedCards: [],
        },
      ]);

      const result = await service.getUserSessions("u1");

      expect(result.sessions[0].userAName).toBe("");
      expect(result.sessions[0].userBName).toBe("");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // createSession()
  // ═══════════════════════════════════════════════════════════════

  describe("createSession()", () => {
    it("should throw NotFoundException when match not found", async () => {
      mockPrisma.match.findUnique.mockResolvedValue(null);
      await expect(
        service.createSession("u1", { matchId: "m-bad" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when match is not active", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: "m1",
        userAId: "u1",
        userBId: "u2",
        isActive: false,
      });
      await expect(
        service.createSession("u1", { matchId: "m1" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when user is not participant", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: "m1",
        userAId: "u2",
        userBId: "u3",
        isActive: true,
      });
      await expect(
        service.createSession("u1", { matchId: "m1" }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException when active session already exists", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: "m1",
        userAId: "u1",
        userBId: "u2",
        isActive: true,
      });
      mockPrisma.harmonySession.findFirst.mockResolvedValue({ id: "s1" });

      await expect(
        service.createSession("u1", { matchId: "m1" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw ForbiddenException when FREE user tries to create session", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: "m1",
        userAId: "u1",
        userBId: "u2",
        isActive: true,
      });
      mockPrisma.harmonySession.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ packageTier: "FREE" });

      await expect(
        service.createSession("u1", { matchId: "m1" }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException when only one user sent messages", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: "m1",
        userAId: "u1",
        userBId: "u2",
        isActive: true,
      });
      mockPrisma.harmonySession.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ packageTier: "GOLD" });
      const now = Date.now();
      mockPrisma.chatMessage.findMany.mockResolvedValue([
        { senderId: "u1", createdAt: new Date(now - 6 * 60 * 1000) },
        { senderId: "u1", createdAt: new Date(now) },
      ]);

      await expect(
        service.createSession("u1", { matchId: "m1" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when fewer than 2 messages", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: "m1",
        userAId: "u1",
        userBId: "u2",
        isActive: true,
      });
      mockPrisma.harmonySession.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ packageTier: "GOLD" });
      mockPrisma.chatMessage.findMany.mockResolvedValue([
        { senderId: "u1", createdAt: new Date() },
      ]);

      await expect(
        service.createSession("u1", { matchId: "m1" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when chat duration is less than 5 minutes", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: "m1",
        userAId: "u1",
        userBId: "u2",
        isActive: true,
      });
      mockPrisma.harmonySession.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ packageTier: "PRO" });
      const now = Date.now();
      mockPrisma.chatMessage.findMany.mockResolvedValue([
        { senderId: "u1", createdAt: new Date(now - 2 * 60 * 1000) },
        { senderId: "u2", createdAt: new Date(now) },
      ]);

      await expect(
        service.createSession("u1", { matchId: "m1" }),
      ).rejects.toThrow(BadRequestException);
    });

    const setupSuccessfulCreate = (
      overrides: { userId?: string; deckCategory?: string } = {},
    ) => {
      const userId = overrides.userId ?? "u1";
      mockPrisma.match.findUnique.mockResolvedValue({
        id: "m1",
        userAId: "u1",
        userBId: "u2",
        isActive: true,
      });
      mockPrisma.harmonySession.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ packageTier: "GOLD" });
      const now = Date.now();
      mockPrisma.chatMessage.findMany.mockResolvedValue([
        { senderId: "u1", createdAt: new Date(now - 6 * 60 * 1000) },
        { senderId: "u2", createdAt: new Date(now) },
      ]);
      mockPrisma.harmonySession.create.mockResolvedValue({
        id: "s1",
        matchId: "m1",
        status: "ACTIVE",
        startedAt: new Date(),
        endsAt: new Date(Date.now() + 30 * 60 * 1000),
      });
      mockPrisma.harmonyQuestionCard.findMany.mockResolvedValue([
        { id: "qc1", order: 1, isActive: true },
        { id: "qc2", order: 2, isActive: true },
        { id: "qc3", order: 3, isActive: true },
        { id: "qc4", order: 4, isActive: true },
      ]);
      mockPrisma.harmonyGameCard.findMany.mockResolvedValue([
        { id: "gc1", isActive: true },
      ]);
      mockPrisma.harmonyUsedCard.createMany.mockResolvedValue({ count: 5 });
      mockPrisma.notification.create.mockResolvedValue({});
      mockPrisma.harmonyUsedCard.findMany.mockResolvedValue([]);
    };

    it("should create session with initial cards and notify partner", async () => {
      setupSuccessfulCreate();

      const result = await service.createSession("u1", { matchId: "m1" });

      expect(result.sessionId).toBe("s1");
      expect(result.durationMinutes).toBe(30);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "u2",
            type: "HARMONY_INVITE",
          }),
        }),
      );
    });

    it("should allow GOLD user to create session", async () => {
      setupSuccessfulCreate();

      const result = await service.createSession("u1", { matchId: "m1" });

      expect(result.sessionId).toBe("s1");
      expect(result.status).toBe("ACTIVE");
    });

    it("should use deckCategory filter when provided", async () => {
      setupSuccessfulCreate();

      await service.createSession("u1", {
        matchId: "m1",
        deckCategory: "ICEBREAKER",
      });

      expect(mockPrisma.harmonyQuestionCard.findMany).toHaveBeenCalledWith({
        where: { isActive: true, category: "ICEBREAKER" },
        orderBy: { order: "asc" },
      });
    });

    it("should not filter by category when deckCategory is not provided", async () => {
      setupSuccessfulCreate();

      await service.createSession("u1", { matchId: "m1" });

      expect(mockPrisma.harmonyQuestionCard.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { order: "asc" },
      });
    });

    it("should handle empty game cards gracefully", async () => {
      setupSuccessfulCreate();
      mockPrisma.harmonyGameCard.findMany.mockResolvedValue([]);

      const result = await service.createSession("u1", { matchId: "m1" });

      expect(result.sessionId).toBe("s1");
    });

    it("should determine partner correctly when userB is the creator", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: "m1",
        userAId: "u1",
        userBId: "u2",
        isActive: true,
      });
      mockPrisma.harmonySession.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ packageTier: "GOLD" });
      const now = Date.now();
      mockPrisma.chatMessage.findMany.mockResolvedValue([
        { senderId: "u1", createdAt: new Date(now - 6 * 60 * 1000) },
        { senderId: "u2", createdAt: new Date(now) },
      ]);
      mockPrisma.harmonySession.create.mockResolvedValue({
        id: "s1",
        matchId: "m1",
        status: "ACTIVE",
        startedAt: new Date(),
        endsAt: new Date(Date.now() + 30 * 60 * 1000),
      });
      mockPrisma.harmonyQuestionCard.findMany.mockResolvedValue([]);
      mockPrisma.harmonyGameCard.findMany.mockResolvedValue([]);
      mockPrisma.harmonyUsedCard.findMany.mockResolvedValue([]);
      mockPrisma.notification.create.mockResolvedValue({});

      await service.createSession("u2", { matchId: "m1" });

      // Partner should be u1 (userA)
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: "u1" }),
        }),
      );
    });

    it("should skip createMany when no cards selected", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: "m1",
        userAId: "u1",
        userBId: "u2",
        isActive: true,
      });
      mockPrisma.harmonySession.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ packageTier: "GOLD" });
      const now = Date.now();
      mockPrisma.chatMessage.findMany.mockResolvedValue([
        { senderId: "u1", createdAt: new Date(now - 6 * 60 * 1000) },
        { senderId: "u2", createdAt: new Date(now) },
      ]);
      mockPrisma.harmonySession.create.mockResolvedValue({
        id: "s1",
        matchId: "m1",
        status: "ACTIVE",
        startedAt: new Date(),
        endsAt: new Date(Date.now() + 30 * 60 * 1000),
      });
      mockPrisma.harmonyQuestionCard.findMany.mockResolvedValue([]);
      mockPrisma.harmonyGameCard.findMany.mockResolvedValue([]);
      mockPrisma.harmonyUsedCard.findMany.mockResolvedValue([]);
      mockPrisma.notification.create.mockResolvedValue({});

      await service.createSession("u1", { matchId: "m1" });

      expect(mockPrisma.harmonyUsedCard.createMany).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getSession()
  // ═══════════════════════════════════════════════════════════════

  describe("getSession()", () => {
    it("should throw NotFoundException when session not found", async () => {
      mockPrisma.harmonySession.findUnique.mockResolvedValue(null);
      await expect(service.getSession("u1", "s-bad")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException when user not participant", async () => {
      mockPrisma.harmonySession.findUnique.mockResolvedValue({
        id: "s1",
        userAId: "u2",
        userBId: "u3",
        match: {},
      });
      await expect(service.getSession("u1", "s1")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should auto-end expired sessions and check badges", async () => {
      mockPrisma.harmonySession.findUnique.mockResolvedValue({
        id: "s1",
        userAId: "u1",
        userBId: "u2",
        status: "ACTIVE",
        endsAt: new Date(Date.now() - 1000),
        totalExtensionMinutes: 0,
        hasVoiceChat: false,
        hasVideoChat: false,
        matchId: "m1",
        match: { compatibilityScore: 75, compatibilityLevel: "NORMAL" },
        userA: { id: "u1", profile: { firstName: "Ali" } },
        userB: { id: "u2", profile: { firstName: "Ayse" } },
      });
      mockPrisma.harmonySession.update.mockResolvedValue({});
      mockPrisma.harmonyUsedCard.findMany.mockResolvedValue([]);
      mockPrisma.harmonyMessage.count.mockResolvedValue(0);

      const result = await service.getSession("u1", "s1");

      expect(result.status).toBe("ENDED");
      expect(mockPrisma.harmonySession.update).toHaveBeenCalledWith({
        where: { id: "s1" },
        data: expect.objectContaining({ status: "ENDED" }),
      });
      expect(mockBadgesService.checkAndAwardBadges).toHaveBeenCalledWith(
        "u1",
        "harmony",
      );
      expect(mockBadgesService.checkAndAwardBadges).toHaveBeenCalledWith(
        "u2",
        "harmony",
      );
    });

    it("should handle badge check failure gracefully", async () => {
      mockBadgesService.checkAndAwardBadges.mockRejectedValue(
        new Error("Badge error"),
      );
      mockPrisma.harmonySession.findUnique.mockResolvedValue({
        id: "s1",
        userAId: "u1",
        userBId: "u2",
        status: "ACTIVE",
        endsAt: new Date(Date.now() - 1000),
        totalExtensionMinutes: 0,
        hasVoiceChat: false,
        hasVideoChat: false,
        matchId: "m1",
        match: { compatibilityScore: 75, compatibilityLevel: "NORMAL" },
        userA: { id: "u1", profile: { firstName: "Ali" } },
        userB: { id: "u2", profile: { firstName: "Ayse" } },
      });
      mockPrisma.harmonySession.update.mockResolvedValue({});
      mockPrisma.harmonyUsedCard.findMany.mockResolvedValue([]);
      mockPrisma.harmonyMessage.count.mockResolvedValue(0);

      // Should not throw even when badge check fails
      const result = await service.getSession("u1", "s1");
      expect(result.status).toBe("ENDED");
    });

    it("should not auto-end non-expired active session", async () => {
      const endsAt = new Date(Date.now() + 15 * 60 * 1000);
      mockPrisma.harmonySession.findUnique.mockResolvedValue({
        id: "s1",
        userAId: "u1",
        userBId: "u2",
        status: "ACTIVE",
        startedAt: new Date(),
        endsAt,
        totalExtensionMinutes: 0,
        hasVoiceChat: false,
        hasVideoChat: false,
        matchId: "m1",
        match: { compatibilityScore: 75, compatibilityLevel: "NORMAL" },
        userA: { id: "u1", profile: { firstName: "Ali" } },
        userB: { id: "u2", profile: { firstName: "Ayse" } },
      });
      mockPrisma.harmonyUsedCard.findMany.mockResolvedValue([]);
      mockPrisma.harmonyMessage.count.mockResolvedValue(5);

      const result = await service.getSession("u1", "s1");

      expect(result.status).toBe("ACTIVE");
      expect(mockPrisma.harmonySession.update).not.toHaveBeenCalled();
    });

    it("should return remaining time for active session", async () => {
      const endsAt = new Date(Date.now() + 15 * 60 * 1000);
      mockPrisma.harmonySession.findUnique.mockResolvedValue({
        id: "s1",
        userAId: "u1",
        userBId: "u2",
        status: "ACTIVE",
        startedAt: new Date(),
        endsAt,
        totalExtensionMinutes: 0,
        hasVoiceChat: false,
        hasVideoChat: false,
        matchId: "m1",
        match: { compatibilityScore: 75, compatibilityLevel: "NORMAL" },
        userA: { id: "u1", profile: { firstName: "Ali" } },
        userB: { id: "u2", profile: { firstName: "Ayse" } },
      });
      mockPrisma.harmonyUsedCard.findMany.mockResolvedValue([]);
      mockPrisma.harmonyMessage.count.mockResolvedValue(5);

      const result = await service.getSession("u1", "s1");

      expect(result.remainingSeconds).toBeGreaterThan(800);
      expect(result.remainingSeconds).toBeLessThanOrEqual(900);
      expect(result.messageCount).toBe(5);
    });

    it("should return 0 remaining seconds when endsAt is null", async () => {
      mockPrisma.harmonySession.findUnique.mockResolvedValue({
        id: "s1",
        userAId: "u1",
        userBId: "u2",
        status: "ENDED",
        startedAt: new Date(),
        endsAt: null,
        totalExtensionMinutes: 0,
        hasVoiceChat: false,
        hasVideoChat: false,
        matchId: "m1",
        match: null,
        userA: { id: "u1", profile: { firstName: "Ali" } },
        userB: { id: "u2", profile: { firstName: "Ayse" } },
      });
      mockPrisma.harmonyUsedCard.findMany.mockResolvedValue([]);
      mockPrisma.harmonyMessage.count.mockResolvedValue(0);

      const result = await service.getSession("u1", "s1");

      expect(result.remainingSeconds).toBe(0);
    });

    it("should skip auto-end for non-ACTIVE status even if endsAt is expired", async () => {
      mockPrisma.harmonySession.findUnique.mockResolvedValue({
        id: "s1",
        userAId: "u1",
        userBId: "u2",
        status: "ENDED",
        endsAt: new Date(Date.now() - 1000),
        totalExtensionMinutes: 0,
        hasVoiceChat: false,
        hasVideoChat: false,
        matchId: "m1",
        match: null,
        userA: null,
        userB: null,
      });
      mockPrisma.harmonyUsedCard.findMany.mockResolvedValue([]);
      mockPrisma.harmonyMessage.count.mockResolvedValue(0);

      const result = await service.getSession("u1", "s1");

      expect(result.status).toBe("ENDED");
      expect(mockPrisma.harmonySession.update).not.toHaveBeenCalled();
    });

    it("should allow userB to view the session", async () => {
      mockPrisma.harmonySession.findUnique.mockResolvedValue({
        id: "s1",
        userAId: "u1",
        userBId: "u2",
        status: "ACTIVE",
        startedAt: new Date(),
        endsAt: new Date(Date.now() + 10 * 60 * 1000),
        totalExtensionMinutes: 0,
        hasVoiceChat: false,
        hasVideoChat: false,
        matchId: "m1",
        match: null,
        userA: { id: "u1", profile: { firstName: "Ali" } },
        userB: { id: "u2", profile: { firstName: "Ayse" } },
      });
      mockPrisma.harmonyUsedCard.findMany.mockResolvedValue([]);
      mockPrisma.harmonyMessage.count.mockResolvedValue(0);

      const result = await service.getSession("u2", "s1");

      expect(result.sessionId).toBe("s1");
    });

    it("should map question and game cards in getSessionCards", async () => {
      mockPrisma.harmonySession.findUnique.mockResolvedValue({
        id: "s1",
        userAId: "u1",
        userBId: "u2",
        status: "ACTIVE",
        startedAt: new Date(),
        endsAt: new Date(Date.now() + 10 * 60 * 1000),
        totalExtensionMinutes: 0,
        hasVoiceChat: true,
        hasVideoChat: false,
        matchId: "m1",
        match: null,
        userA: null,
        userB: null,
      });
      mockPrisma.harmonyUsedCard.findMany.mockResolvedValue([
        {
          usedAt: new Date(),
          questionCard: {
            id: "qc1",
            category: "DEEP_CONNECTION",
            textEn: "Q?",
            textTr: "S?",
          },
          gameCard: null,
        },
        {
          usedAt: new Date(),
          questionCard: null,
          gameCard: {
            id: "gc1",
            nameEn: "Game",
            nameTr: "Oyun",
            descriptionEn: "Desc",
            descriptionTr: "Aciklama",
            gameType: "WOULD_YOU_RATHER",
          },
        },
      ]);
      mockPrisma.harmonyMessage.count.mockResolvedValue(3);

      const result = await service.getSession("u1", "s1");

      expect(result.cards).toHaveLength(2);
      expect(result.cards[0].type).toBe("question");
      expect(result.cards[1].type).toBe("game");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // extendSession()
  // ═══════════════════════════════════════════════════════════════

  describe("extendSession()", () => {
    it("should throw NotFoundException when session not found", async () => {
      mockPrisma.harmonySession.findUnique.mockResolvedValue(null);
      await expect(
        service.extendSession("u1", {
          sessionId: "s-bad",
          additionalMinutes: 10,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when user is not participant", async () => {
      mockPrisma.harmonySession.findUnique.mockResolvedValue({
        id: "s1",
        userAId: "u2",
        userBId: "u3",
        status: "ACTIVE",
        totalExtensionMinutes: 0,
      });

      await expect(
        service.extendSession("u1", { sessionId: "s1", additionalMinutes: 15 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException for ENDED session", async () => {
      mockPrisma.harmonySession.findUnique.mockResolvedValue({
        id: "s1",
        userAId: "u1",
        userBId: "u2",
        status: "ENDED",
        totalExtensionMinutes: 0,
      });

      await expect(
        service.extendSession("u1", { sessionId: "s1", additionalMinutes: 15 }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when exceeding max extension", async () => {
      mockPrisma.harmonySession.findUnique.mockResolvedValue({
        id: "s1",
        userAId: "u1",
        userBId: "u2",
        status: "ACTIVE",
        totalExtensionMinutes: 55,
        endsAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      await expect(
        service.extendSession("u1", { sessionId: "s1", additionalMinutes: 10 }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for insufficient Gold", async () => {
      mockPrisma.harmonySession.findUnique.mockResolvedValue({
        id: "s1",
        userAId: "u1",
        userBId: "u2",
        status: "ACTIVE",
        totalExtensionMinutes: 0,
        endsAt: new Date(Date.now() + 5 * 60 * 1000),
      });
      mockPrisma.user.findUnique.mockResolvedValue({ goldBalance: 5 });

      await expect(
        service.extendSession("u1", { sessionId: "s1", additionalMinutes: 10 }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when user not found (null)", async () => {
      mockPrisma.harmonySession.findUnique.mockResolvedValue({
        id: "s1",
        userAId: "u1",
        userBId: "u2",
        status: "ACTIVE",
        totalExtensionMinutes: 0,
        endsAt: new Date(Date.now() + 5 * 60 * 1000),
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.extendSession("u1", { sessionId: "s1", additionalMinutes: 15 }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should successfully extend an ACTIVE session with transaction", async () => {
      const endsAt = new Date(Date.now() + 5 * 60 * 1000);
      mockPrisma.harmonySession.findUnique.mockResolvedValue({
        id: "s1",
        userAId: "u1",
        userBId: "u2",
        status: "ACTIVE",
        totalExtensionMinutes: 0,
        endsAt,
      });
      mockPrisma.user.findUnique.mockResolvedValue({ goldBalance: 200 });

      // Mock transaction callback
      const newEndsAt = new Date(endsAt.getTime() + 15 * 60 * 1000);
      mockPrisma.$transaction.mockImplementation(
        async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => {
          return cb(mockPrisma);
        },
      );
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.goldTransaction.create.mockResolvedValue({});
      mockPrisma.harmonyExtension.create.mockResolvedValue({});
      mockPrisma.harmonySession.update.mockResolvedValue({
        endsAt: newEndsAt,
        status: "EXTENDED",
        totalExtensionMinutes: 15,
      });

      // Bonus cards
      mockPrisma.harmonyQuestionCard.findMany.mockResolvedValue([
        { id: "qc1", isActive: true },
        { id: "qc2", isActive: true },
        { id: "qc3", isActive: true },
      ]);
      mockPrisma.harmonyUsedCard.findMany.mockResolvedValue([
        { questionCardId: "qc1", gameCardId: null },
      ]);
      mockPrisma.harmonyUsedCard.createMany.mockResolvedValue({ count: 2 });

      const result = await service.extendSession("u1", {
        sessionId: "s1",
        additionalMinutes: 15,
      });

      expect(result.sessionId).toBe("s1");
      expect(result.goldDeducted).toBe(50); // 1 block of 15 min = 50 Gold
      expect(result.additionalMinutes).toBe(15);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it("should allow extending an EXTENDED session", async () => {
      const endsAt = new Date(Date.now() + 10 * 60 * 1000);
      mockPrisma.harmonySession.findUnique.mockResolvedValue({
        id: "s1",
        userAId: "u1",
        userBId: "u2",
        status: "EXTENDED",
        totalExtensionMinutes: 15,
        endsAt,
      });
      mockPrisma.user.findUnique.mockResolvedValue({ goldBalance: 500 });

      mockPrisma.$transaction.mockImplementation(
        async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => {
          return cb(mockPrisma);
        },
      );
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.goldTransaction.create.mockResolvedValue({});
      mockPrisma.harmonyExtension.create.mockResolvedValue({});
      mockPrisma.harmonySession.update.mockResolvedValue({
        endsAt: new Date(endsAt.getTime() + 15 * 60 * 1000),
        status: "EXTENDED",
        totalExtensionMinutes: 30,
      });
      mockPrisma.harmonyQuestionCard.findMany.mockResolvedValue([]);
      mockPrisma.harmonyUsedCard.findMany.mockResolvedValue([]);

      const result = await service.extendSession("u1", {
        sessionId: "s1",
        additionalMinutes: 15,
      });

      expect(result.sessionId).toBe("s1");
      expect(result.bonusCardsAdded).toBe(0);
    });

    it("should handle session with null endsAt in extension", async () => {
      mockPrisma.harmonySession.findUnique.mockResolvedValue({
        id: "s1",
        userAId: "u1",
        userBId: "u2",
        status: "ACTIVE",
        totalExtensionMinutes: 0,
        endsAt: null,
      });
      mockPrisma.user.findUnique.mockResolvedValue({ goldBalance: 500 });

      const mockNewEndsAt = new Date();
      mockPrisma.$transaction.mockImplementation(
        async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => {
          return cb(mockPrisma);
        },
      );
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.goldTransaction.create.mockResolvedValue({});
      mockPrisma.harmonyExtension.create.mockResolvedValue({});
      mockPrisma.harmonySession.update.mockResolvedValue({
        endsAt: mockNewEndsAt,
        status: "EXTENDED",
        totalExtensionMinutes: 15,
      });
      mockPrisma.harmonyQuestionCard.findMany.mockResolvedValue([]);
      mockPrisma.harmonyUsedCard.findMany.mockResolvedValue([]);

      const result = await service.extendSession("u1", {
        sessionId: "s1",
        additionalMinutes: 15,
      });

      expect(result.sessionId).toBe("s1");
    });

    it("should calculate gold cost in 15-minute blocks", async () => {
      mockPrisma.harmonySession.findUnique.mockResolvedValue({
        id: "s1",
        userAId: "u1",
        userBId: "u2",
        status: "ACTIVE",
        totalExtensionMinutes: 0,
        endsAt: new Date(Date.now() + 5 * 60 * 1000),
      });
      // 20 min = ceil(20/15) = 2 blocks * 50 = 100 Gold
      mockPrisma.user.findUnique.mockResolvedValue({ goldBalance: 500 });

      mockPrisma.$transaction.mockImplementation(
        async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => {
          return cb(mockPrisma);
        },
      );
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.goldTransaction.create.mockResolvedValue({});
      mockPrisma.harmonyExtension.create.mockResolvedValue({});
      mockPrisma.harmonySession.update.mockResolvedValue({
        endsAt: new Date(),
        status: "EXTENDED",
        totalExtensionMinutes: 20,
      });
      mockPrisma.harmonyQuestionCard.findMany.mockResolvedValue([]);
      mockPrisma.harmonyUsedCard.findMany.mockResolvedValue([]);

      const result = await service.extendSession("u1", {
        sessionId: "s1",
        additionalMinutes: 20,
      });

      expect(result.goldDeducted).toBe(100); // 2 blocks * 50 Gold
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getCards()
  // ═══════════════════════════════════════════════════════════════

  describe("getCards()", () => {
    it("should throw NotFoundException when session not found", async () => {
      mockPrisma.harmonySession.findUnique.mockResolvedValue(null);

      await expect(service.getCards("u1", "s-bad")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException when user is not participant", async () => {
      mockPrisma.harmonySession.findUnique.mockResolvedValue({
        id: "s1",
        userAId: "u2",
        userBId: "u3",
      });

      await expect(service.getCards("u1", "s1")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should return cards for valid participant", async () => {
      mockPrisma.harmonySession.findUnique.mockResolvedValue({
        id: "s1",
        userAId: "u1",
        userBId: "u2",
      });
      mockPrisma.harmonyUsedCard.findMany.mockResolvedValue([
        {
          usedAt: new Date(),
          questionCard: {
            id: "qc1",
            category: "ICEBREAKER",
            textEn: "Q?",
            textTr: "S?",
          },
          gameCard: null,
        },
      ]);

      const result = await service.getCards("u1", "s1");

      expect(result.sessionId).toBe("s1");
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].type).toBe("question");
    });

    it("should allow userB to get cards", async () => {
      mockPrisma.harmonySession.findUnique.mockResolvedValue({
        id: "s1",
        userAId: "u1",
        userBId: "u2",
      });
      mockPrisma.harmonyUsedCard.findMany.mockResolvedValue([]);

      const result = await service.getCards("u2", "s1");

      expect(result.sessionId).toBe("s1");
      expect(result.cards).toEqual([]);
    });
  });
});
