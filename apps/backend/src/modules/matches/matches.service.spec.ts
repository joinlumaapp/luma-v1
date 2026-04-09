import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { MatchesService } from "./matches.service";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

const mockTx = {
  match: { update: jest.fn() },
  chatMessage: { updateMany: jest.fn() },
};

const mockPrisma = {
  match: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  compatibilityScore: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn((cb: (tx: typeof mockTx) => Promise<unknown>) =>
    cb(mockTx),
  ),
};

const mockNotificationsService = {
  sendPushNotification: jest.fn().mockResolvedValue({ sent: true, stored: true }),
};

describe("MatchesService", () => {
  let service: MatchesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();
    service = module.get<MatchesService>(MatchesService);
  });

  describe("getAllMatches()", () => {
    it("should return formatted matches with partner info", async () => {
      mockPrisma.match.findMany.mockResolvedValue([
        {
          id: "m1",
          userAId: "u1",
          userBId: "u2",
          compatibilityScore: 78,
          compatibilityLevel: "NORMAL",
          animationType: "NORMAL",
          isActive: true,
          createdAt: new Date(),
          userA: {
            id: "u1",
            isSelfieVerified: true,
            profile: {
              firstName: "Ali",
              birthDate: new Date("1995-01-01"),
              city: "Istanbul",
              intentionTag: "EXPLORING",
            },
            photos: [
              {
                url: "https://cdn.luma.app/a.jpg",
                thumbnailUrl: "https://cdn.luma.app/a_t.jpg",
              },
            ],
          },
          userB: {
            id: "u2",
            isSelfieVerified: true,
            profile: {
              firstName: "Ayse",
              birthDate: new Date("1998-06-15"),
              city: "Ankara",
              intentionTag: "SERIOUS_RELATIONSHIP",
            },
            photos: [
              {
                url: "https://cdn.luma.app/b.jpg",
                thumbnailUrl: "https://cdn.luma.app/b_t.jpg",
              },
            ],
          },
        },
      ]);

      const result = await service.getAllMatches("u1");

      expect(result.total).toBe(1);
      expect(result.matches[0].partner.firstName).toBe("Ayse");
      expect(result.matches[0].partner.userId).toBe("u2");
    });

    it("should return empty list when no matches", async () => {
      mockPrisma.match.findMany.mockResolvedValue([]);

      const result = await service.getAllMatches("u1");

      expect(result.total).toBe(0);
      expect(result.matches).toEqual([]);
    });

    it("should show partner as userA when current user is userB", async () => {
      mockPrisma.match.findMany.mockResolvedValue([
        {
          id: "m2",
          userAId: "u3",
          userBId: "u1",
          compatibilityScore: 90,
          compatibilityLevel: "SUPER",
          animationType: "SUPER_COMPATIBILITY",
          isActive: true,
          createdAt: new Date(),
          userA: {
            id: "u3",
            isSelfieVerified: false,
            profile: {
              firstName: "Mehmet",
              birthDate: new Date("1992-01-01"),
              city: "Izmir",
              intentionTag: "NOT_SURE",
            },
            photos: [],
          },
          userB: {
            id: "u1",
            isSelfieVerified: true,
            profile: {
              firstName: "Ali",
              birthDate: new Date("1995-01-01"),
              city: "Istanbul",
              intentionTag: "EXPLORING",
            },
            photos: [],
          },
        },
      ]);

      const result = await service.getAllMatches("u1");

      expect(result.matches[0].partner.userId).toBe("u3");
      expect(result.matches[0].partner.firstName).toBe("Mehmet");
    });
  });

  describe("getMatch()", () => {
    it("should throw NotFoundException when match not found", async () => {
      mockPrisma.match.findUnique.mockResolvedValue(null);

      await expect(service.getMatch("u1", "m-bad")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException when user is not a participant", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: "m1",
        userAId: "u2",
        userBId: "u3",
        userA: { id: "u2", profile: null, photos: [], badges: [] },
        userB: { id: "u3", profile: null, photos: [], badges: [] },

      });

      await expect(service.getMatch("u1", "m1")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should return full match details with compatibility breakdown", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: "m1",
        userAId: "u1",
        userBId: "u2",
        compatibilityScore: 85,
        compatibilityLevel: "SUPER",
        animationType: "SUPER_COMPATIBILITY",
        isActive: true,
        createdAt: new Date(),
        userA: {
          id: "u1",
          isSelfieVerified: true,
          isFullyVerified: true,
          profile: {
            firstName: "Ali",
            birthDate: new Date("1995-01-01"),
            bio: "Hey",
            city: "Istanbul",
            country: "TR",
            intentionTag: "EXPLORING",
          },
          photos: [],
          badges: [],
        },
        userB: {
          id: "u2",
          isSelfieVerified: true,
          isFullyVerified: true,
          profile: {
            firstName: "Ayse",
            birthDate: new Date("1998-06-15"),
            bio: "Hi",
            city: "Ankara",
            country: "TR",
            intentionTag: "SERIOUS_RELATIONSHIP",
          },
          photos: [
            {
              id: "p1",
              url: "https://cdn.luma.app/1.jpg",
              thumbnailUrl: "https://cdn.luma.app/1_t.jpg",
              order: 0,
            },
          ],
          badges: [
            {
              badge: {
                key: "verified_identity",
                nameTr: "Doğrulanmış",
                iconUrl: "/badge.png",
              },
              earnedAt: new Date(),
            },
          ],
        },

      });
      mockPrisma.compatibilityScore.findUnique.mockResolvedValue({
        baseScore: 82,
        deepScore: 90,
        finalScore: 85,
        level: "SUPER",
        dimensionScores: { VALUES: 95, LIFESTYLE: 75 },
      });

      const result = await service.getMatch("u1", "m1");

      expect(result.matchId).toBe("m1");
      expect(result.partner.firstName).toBe("Ayse");
      expect(result.compatibility.score).toBe(85);
      expect(result.compatibility.breakdown).toEqual({
        VALUES: 95,
        LIFESTYLE: 75,
      });
      expect(result.partner.badges).toHaveLength(1);
    });
  });

  describe("unmatch()", () => {
    it("should throw NotFoundException when match not found", async () => {
      mockPrisma.match.findUnique.mockResolvedValue(null);

      await expect(service.unmatch("u1", "m-bad")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException when user is not participant", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: "m1",
        userAId: "u2",
        userBId: "u3",
      });

      await expect(service.unmatch("u1", "m1")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should deactivate match and notify partner", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: "m1",
        userAId: "u1",
        userBId: "u2",
        userA: { id: "u1", profile: { firstName: "Ali" } },
        userB: { id: "u2", profile: { firstName: "Ayse" } },
      });
      mockTx.match.update.mockResolvedValue({});
      mockTx.chatMessage.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.unmatch("u1", "m1");

      expect(result.unmatched).toBe(true);
      expect(mockTx.match.update).toHaveBeenCalledWith({
        where: { id: "m1" },
        data: expect.objectContaining({ isActive: false }),
      });
      expect(mockNotificationsService.sendPushNotification).toHaveBeenCalledWith(
        "u2",
        "Eşleşme Kaldırıldı",
        "Bir eşleşmeniz kaldırıldı.",
        { matchId: "m1" },
        "MATCH_REMOVED",
      );
    });

    it("should notify userA when userB initiates unmatch", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: "m1",
        userAId: "u1",
        userBId: "u2",
        userA: { id: "u1", profile: { firstName: "Ali" } },
        userB: { id: "u2", profile: { firstName: "Ayse" } },
      });
      mockTx.match.update.mockResolvedValue({});
      mockTx.chatMessage.updateMany.mockResolvedValue({ count: 0 });

      await service.unmatch("u2", "m1");

      expect(mockNotificationsService.sendPushNotification).toHaveBeenCalledWith(
        "u1",
        "Eşleşme Kaldırıldı",
        "Bir eşleşmeniz kaldırıldı.",
        { matchId: "m1" },
        "MATCH_REMOVED",
      );
    });

    it("should set unmatchedAt timestamp", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: "m1",
        userAId: "u1",
        userBId: "u2",
        userA: { id: "u1", profile: { firstName: "Ali" } },
        userB: { id: "u2", profile: { firstName: "Ayse" } },
      });
      mockTx.match.update.mockResolvedValue({});
      mockTx.chatMessage.updateMany.mockResolvedValue({ count: 0 });

      await service.unmatch("u1", "m1");

      expect(mockTx.match.update).toHaveBeenCalledWith({
        where: { id: "m1" },
        data: expect.objectContaining({
          isActive: false,
          unmatchedAt: expect.any(Date),
        }),
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // generateCompatibilityExplanation()
  // ═══════════════════════════════════════════════════════════════

  describe("generateCompatibilityExplanation()", () => {
    it("should return super-match explanation for score >= 90", () => {
      const dimensions = { communication: 95, values: 92 };
      const result = service.generateCompatibilityExplanation(dimensions, 92);

      expect(result).toContain("harika uyum");
      expect(result).toContain("doğal olacak");
    });

    it("should return strong explanation for score 75-89", () => {
      const dimensions = { lifestyle: 80, life_goals: 78 };
      const result = service.generateCompatibilityExplanation(dimensions, 80);

      expect(result).toContain("güçlü bir temel");
    });

    it("should return moderate explanation for score < 75", () => {
      const dimensions = { values: 60, lifestyle: 55 };
      const result = service.generateCompatibilityExplanation(dimensions, 60);

      expect(result).toContain("ortak noktalarınız");
      expect(result).toContain("zenginleştirebilir");
    });

    it("should use fallback when fewer than 2 dimensions exist", () => {
      const dimensions = { values: 80 };
      const result = service.generateCompatibilityExplanation(dimensions, 92);

      expect(result).toContain("Muhteşem bir uyumunuz");
    });

    it("should use fallback for low score with fewer than 2 dimensions", () => {
      const dimensions = { values: 50 };
      const result = service.generateCompatibilityExplanation(dimensions, 50);

      expect(result).toContain("İlginç bir uyumluluk");
    });

    it("should handle empty dimension scores", () => {
      const result = service.generateCompatibilityExplanation({}, 70);

      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should use Turkish dimension names when available", () => {
      const dimensions = { emotional_intelligence: 95, love_language: 90 };
      const result = service.generateCompatibilityExplanation(dimensions, 93);

      expect(result.toLowerCase()).toContain("duygusal zekanız");
    });

    it("should capitalize first letter of explanation", () => {
      const dimensions = { communication: 88, values: 85 };
      const result = service.generateCompatibilityExplanation(dimensions, 80);

      // First character should be uppercase
      expect(result.charAt(0)).toBe(result.charAt(0).toUpperCase());
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // generateConversationStarters()
  // ═══════════════════════════════════════════════════════════════

  describe("generateConversationStarters()", () => {
    it("should return empty array when match not found", async () => {
      mockPrisma.match.findUnique.mockResolvedValue(null);

      const result = await service.generateConversationStarters("m-bad");

      expect(result).toEqual([]);
    });

    it("should return empty array when no compatibility score exists", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: "m1",
        userAId: "u1",
        userBId: "u2",
      });
      mockPrisma.compatibilityScore.findUnique.mockResolvedValue(null);

      const result = await service.generateConversationStarters("m1");

      expect(result).toEqual([]);
    });

    it("should return fallback starters when no high-scoring dimensions", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: "m1",
        userAId: "u1",
        userBId: "u2",
      });
      mockPrisma.compatibilityScore.findUnique.mockResolvedValue({
        dimensionScores: { communication: 40, values: 30 },
        finalScore: 35,
      });

      const result = await service.generateConversationStarters("m1");

      expect(result.length).toBeGreaterThanOrEqual(1);
      // Fallback starters should be Turkish
      expect(
        result.some(
          (s: string) => s.includes("Merhaba") || s.includes("Selam"),
        ),
      ).toBe(true);
    });

    it("should return at most 3 conversation starters", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: "m1",
        userAId: "u1",
        userBId: "u2",
      });
      mockPrisma.compatibilityScore.findUnique.mockResolvedValue({
        dimensionScores: {
          communication: 90,
          values: 88,
          lifestyle: 85,
          life_goals: 82,
          emotional_intelligence: 80,
        },
        finalScore: 85,
      });

      const result = await service.generateConversationStarters("m1");

      expect(result.length).toBeLessThanOrEqual(3);
    });

    it("should return starters based on highest scoring dimensions", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: "m1",
        userAId: "u1",
        userBId: "u2",
      });
      mockPrisma.compatibilityScore.findUnique.mockResolvedValue({
        dimensionScores: {
          communication: 95,
          values: 70,
        },
        finalScore: 82,
      });

      const result = await service.generateConversationStarters("m1");

      // Should include at least one starter (from communication which is high)
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it("should return empty dimensionScores as empty starters with fallback", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: "m1",
        userAId: "u1",
        userBId: "u2",
      });
      mockPrisma.compatibilityScore.findUnique.mockResolvedValue({
        dimensionScores: null,
        finalScore: 75,
      });

      const result = await service.generateConversationStarters("m1");

      expect(result).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getAllMatches() — additional edge cases
  // ═══════════════════════════════════════════════════════════════

  describe("getAllMatches() — edge cases", () => {
    it("should calculate partner age correctly", async () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 25);
      birthDate.setMonth(birthDate.getMonth() - 1); // ensure birthday has passed

      mockPrisma.match.findMany.mockResolvedValue([
        {
          id: "m1",
          userAId: "u1",
          userBId: "u2",
          compatibilityScore: 70,
          compatibilityLevel: "NORMAL",
          animationType: "NORMAL",
          isActive: true,
          createdAt: new Date(),
          userA: {
            id: "u1",
            isSelfieVerified: true,
            profile: {
              firstName: "Ali",
              birthDate: new Date("1995-01-01"),
              city: "Istanbul",
              intentionTag: "EXPLORING",
            },
            photos: [],
          },
          userB: {
            id: "u2",
            isSelfieVerified: false,
            profile: {
              firstName: "Ayse",
              birthDate,
              city: "Ankara",
              intentionTag: "EXPLORING",
            },
            photos: [],
          },
        },
      ]);

      const result = await service.getAllMatches("u1");

      expect(result.matches[0].partner.age).toBe(25);
    });

    it("should return null age when partner has no profile", async () => {
      mockPrisma.match.findMany.mockResolvedValue([
        {
          id: "m1",
          userAId: "u1",
          userBId: "u2",
          compatibilityScore: 70,
          compatibilityLevel: "NORMAL",
          animationType: "NORMAL",
          isActive: true,
          createdAt: new Date(),
          userA: {
            id: "u1",
            isSelfieVerified: true,
            profile: {
              firstName: "Ali",
              birthDate: new Date("1995-01-01"),
              city: "Istanbul",
              intentionTag: "EXPLORING",
            },
            photos: [],
          },
          userB: {
            id: "u2",
            isSelfieVerified: false,
            profile: null,
            photos: [],
          },
        },
      ]);

      const result = await service.getAllMatches("u1");

      expect(result.matches[0].partner.age).toBeNull();
      expect(result.matches[0].partner.firstName).toBe("Kullanıcı");
    });

    it("should include partner photo when available", async () => {
      const photo = {
        url: "https://cdn.luma.app/photo.jpg",
        thumbnailUrl: "https://cdn.luma.app/thumb.jpg",
      };
      mockPrisma.match.findMany.mockResolvedValue([
        {
          id: "m1",
          userAId: "u1",
          userBId: "u2",
          compatibilityScore: 75,
          compatibilityLevel: "NORMAL",
          animationType: "NORMAL",
          isActive: true,
          createdAt: new Date(),
          userA: {
            id: "u1",
            isSelfieVerified: true,
            profile: {
              firstName: "Ali",
              birthDate: new Date("1995-01-01"),
              city: "Istanbul",
              intentionTag: "EXPLORING",
            },
            photos: [],
          },
          userB: {
            id: "u2",
            isSelfieVerified: true,
            profile: {
              firstName: "Ayse",
              birthDate: new Date("1998-06-15"),
              city: "Ankara",
              intentionTag: "SERIOUS_RELATIONSHIP",
            },
            photos: [photo],
          },
        },
      ]);

      const result = await service.getAllMatches("u1");

      expect(result.matches[0].partner.photo).toEqual(photo);
    });

    it("should return null photo when partner has no photos", async () => {
      mockPrisma.match.findMany.mockResolvedValue([
        {
          id: "m1",
          userAId: "u1",
          userBId: "u2",
          compatibilityScore: 75,
          compatibilityLevel: "NORMAL",
          animationType: "NORMAL",
          isActive: true,
          createdAt: new Date(),
          userA: {
            id: "u1",
            isSelfieVerified: true,
            profile: {
              firstName: "Ali",
              birthDate: new Date("1995-01-01"),
              city: "Istanbul",
              intentionTag: "EXPLORING",
            },
            photos: [],
          },
          userB: {
            id: "u2",
            isSelfieVerified: false,
            profile: {
              firstName: "Ayse",
              birthDate: new Date("1998-06-15"),
              city: "Ankara",
              intentionTag: "EXPLORING",
            },
            photos: [],
          },
        },
      ]);

      const result = await service.getAllMatches("u1");

      expect(result.matches[0].partner.photo).toBeNull();
    });

    it("should return multiple matches sorted correctly", async () => {
      const date1 = new Date("2026-01-01");
      const date2 = new Date("2026-02-01");
      mockPrisma.match.findMany.mockResolvedValue([
        {
          id: "m2",
          userAId: "u1",
          userBId: "u3",
          compatibilityScore: 92,
          compatibilityLevel: "SUPER",
          animationType: "SUPER_COMPATIBILITY",
          isActive: true,
          createdAt: date2,
          userA: {
            id: "u1",
            isSelfieVerified: true,
            profile: {
              firstName: "Ali",
              birthDate: new Date("1995-01-01"),
              city: "Istanbul",
              intentionTag: "EXPLORING",
            },
            photos: [],
          },
          userB: {
            id: "u3",
            isSelfieVerified: true,
            profile: {
              firstName: "Zeynep",
              birthDate: new Date("1997-03-20"),
              city: "Izmir",
              intentionTag: "SERIOUS_RELATIONSHIP",
            },
            photos: [],
          },
        },
        {
          id: "m1",
          userAId: "u1",
          userBId: "u2",
          compatibilityScore: 70,
          compatibilityLevel: "NORMAL",
          animationType: "NORMAL",
          isActive: true,
          createdAt: date1,
          userA: {
            id: "u1",
            isSelfieVerified: true,
            profile: {
              firstName: "Ali",
              birthDate: new Date("1995-01-01"),
              city: "Istanbul",
              intentionTag: "EXPLORING",
            },
            photos: [],
          },
          userB: {
            id: "u2",
            isSelfieVerified: false,
            profile: {
              firstName: "Ayse",
              birthDate: new Date("1998-06-15"),
              city: "Ankara",
              intentionTag: "EXPLORING",
            },
            photos: [],
          },
        },
      ]);

      const result = await service.getAllMatches("u1");

      expect(result.total).toBe(2);
      expect(result.matches[0].matchId).toBe("m2");
      expect(result.matches[1].matchId).toBe("m1");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getMatch() — additional edge cases
  // ═══════════════════════════════════════════════════════════════

  describe("getMatch() — edge cases", () => {
    it("should return null breakdown when no compatibility score exists", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: "m1",
        userAId: "u1",
        userBId: "u2",
        compatibilityScore: 75,
        compatibilityLevel: "NORMAL",
        animationType: "NORMAL",
        isActive: true,
        createdAt: new Date(),
        userA: {
          id: "u1",
          isSelfieVerified: true,
          isFullyVerified: true,
          profile: {
            firstName: "Ali",
            birthDate: new Date("1995-01-01"),
            bio: "Hey",
            city: "Istanbul",
            country: "TR",
            intentionTag: "EXPLORING",
          },
          photos: [],
          badges: [],
        },
        userB: {
          id: "u2",
          isSelfieVerified: true,
          isFullyVerified: true,
          profile: {
            firstName: "Ayse",
            birthDate: new Date("1998-06-15"),
            bio: "Hi",
            city: "Ankara",
            country: "TR",
            intentionTag: "EXPLORING",
          },
          photos: [],
          badges: [],
        },

      });
      mockPrisma.compatibilityScore.findUnique.mockResolvedValue(null);

      const result = await service.getMatch("u1", "m1");

      expect(result.compatibility.breakdown).toEqual({});
    });

    it("should return partner as userA when current user is userB", async () => {
      mockPrisma.match.findUnique.mockResolvedValue({
        id: "m1",
        userAId: "u2",
        userBId: "u1",
        compatibilityScore: 80,
        compatibilityLevel: "NORMAL",
        animationType: "NORMAL",
        isActive: true,
        createdAt: new Date(),
        userA: {
          id: "u2",
          isSelfieVerified: true,
          isFullyVerified: true,
          profile: {
            firstName: "Mehmet",
            birthDate: new Date("1992-01-01"),
            bio: "Hello",
            city: "Izmir",
            country: "TR",
            intentionTag: "SERIOUS_RELATIONSHIP",
          },
          photos: [{ id: "p1", url: "url", thumbnailUrl: "thumb", order: 0 }],
          badges: [],
        },
        userB: {
          id: "u1",
          isSelfieVerified: true,
          isFullyVerified: true,
          profile: {
            firstName: "Ali",
            birthDate: new Date("1995-01-01"),
            bio: "Hey",
            city: "Istanbul",
            country: "TR",
            intentionTag: "EXPLORING",
          },
          photos: [],
          badges: [],
        },

      });
      mockPrisma.compatibilityScore.findUnique.mockResolvedValue(null);

      const result = await service.getMatch("u1", "m1");

      expect(result.partner.userId).toBe("u2");
      expect(result.partner.firstName).toBe("Mehmet");
      expect(result.partner.photos).toHaveLength(1);
    });
  });
});
