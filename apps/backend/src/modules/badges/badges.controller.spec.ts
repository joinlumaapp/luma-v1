import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { BadgesController } from "./badges.controller";
import { BadgesService } from "./badges.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

describe("BadgesController", () => {
  let controller: BadgesController;

  const mockBadgesService = {
    getAllBadges: jest.fn(),
    getMyBadges: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BadgesController],
      providers: [{ provide: BadgesService, useValue: mockBadgesService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BadgesController>(BadgesController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /badges
  // ═══════════════════════════════════════════════════════════════

  describe("getAllBadges()", () => {
    it("should return all available badges", async () => {
      const expected = {
        badges: [
          {
            id: "badge-1",
            key: "first_match",
            nameTr: "İlk Eşleşme",
            iconUrl: "https://cdn.luma.app/badges/first_match.png",
          },
          {
            id: "badge-2",
            key: "harmony_master",
            nameTr: "Harmony Ustası",
            iconUrl: "https://cdn.luma.app/badges/harmony_master.png",
          },
        ],
        total: 2,
      };
      mockBadgesService.getAllBadges.mockResolvedValue(expected);

      const result = await controller.getAllBadges();

      expect(result.badges).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should return empty list when no badges exist", async () => {
      mockBadgesService.getAllBadges.mockResolvedValue({
        badges: [],
        total: 0,
      });

      const result = await controller.getAllBadges();

      expect(result.badges).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("should delegate to badgesService.getAllBadges", async () => {
      mockBadgesService.getAllBadges.mockResolvedValue({
        badges: [],
        total: 0,
      });

      await controller.getAllBadges();

      expect(mockBadgesService.getAllBadges).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /badges/me
  // ═══════════════════════════════════════════════════════════════

  describe("getMyBadges()", () => {
    const userId = "user-uuid-1";

    it("should return earned badges and progress", async () => {
      const expected = {
        earnedBadges: [
          {
            id: "badge-1",
            key: "first_match",
            nameTr: "İlk Eşleşme",
            earnedAt: "2025-06-01",
          },
        ],
        totalEarned: 1,
        totalAvailable: 10,
        progress: [
          {
            badgeKey: "harmony_master",
            name: "Harmony Ustası",
            progress: 60,
            requirement: "5 Harmony Room oturumu tamamlayın",
          },
        ],
      };
      mockBadgesService.getMyBadges.mockResolvedValue(expected);

      const result = await controller.getMyBadges(userId);

      expect(result.earnedBadges).toHaveLength(1);
      expect(result.totalEarned).toBe(1);
      expect(result.totalAvailable).toBe(10);
      expect(result.progress).toHaveLength(1);
    });

    it("should return empty earned badges for new user", async () => {
      const expected = {
        earnedBadges: [],
        totalEarned: 0,
        totalAvailable: 10,
        progress: [],
      };
      mockBadgesService.getMyBadges.mockResolvedValue(expected);

      const result = await controller.getMyBadges(userId);

      expect(result.earnedBadges).toEqual([]);
      expect(result.totalEarned).toBe(0);
    });

    it("should throw NotFoundException when user does not exist", async () => {
      mockBadgesService.getMyBadges.mockRejectedValue(
        new NotFoundException("Kullanıcı bulunamadı"),
      );

      await expect(controller.getMyBadges(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should delegate to badgesService.getMyBadges with userId", async () => {
      mockBadgesService.getMyBadges.mockResolvedValue({
        earnedBadges: [],
        totalEarned: 0,
        totalAvailable: 0,
        progress: [],
      });

      await controller.getMyBadges(userId);

      expect(mockBadgesService.getMyBadges).toHaveBeenCalledWith(userId);
      expect(mockBadgesService.getMyBadges).toHaveBeenCalledTimes(1);
    });
  });
});
