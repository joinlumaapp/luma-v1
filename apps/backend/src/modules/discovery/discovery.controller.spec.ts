import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { DiscoveryController } from "./discovery.controller";
import { DiscoveryService } from "./discovery.service";
import { WeeklyReportService } from "./weekly-report.service";
import { FeedFilterDto, SwipeDto } from "./dto";
import { SwipeDirection } from "./dto/swipe.dto";
import { ThrottlerGuard } from "@nestjs/throttler";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

describe("DiscoveryController", () => {
  let controller: DiscoveryController;

  const mockDiscoveryService = {
    getDiscoveryFeed: jest.fn(),
    swipe: jest.fn(),
    undoSwipe: jest.fn(),
    getLikesYou: jest.fn(),
    getDailyPicks: jest.fn(),
    markDailyPickViewed: jest.fn(),
  };

  const mockWeeklyReportService = {
    getWeeklyReport: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscoveryController],
      providers: [
        { provide: DiscoveryService, useValue: mockDiscoveryService },
        { provide: WeeklyReportService, useValue: mockWeeklyReportService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DiscoveryController>(DiscoveryController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /discovery/feed
  // ═══════════════════════════════════════════════════════════════

  describe("getFeed()", () => {
    const userId = "user-uuid-1";

    it("should return discovery feed cards successfully", async () => {
      const expected = {
        cards: [
          {
            userId: "candidate-1",
            firstName: "Ayse",
            age: 24,
            bio: "Hello!",
            photos: [],
            compatibility: { score: 85, level: "SUPER" },
          },
        ],
        remaining: 18,
        dailyLimit: 20,
      };
      mockDiscoveryService.getDiscoveryFeed.mockResolvedValue(expected);

      const filters: FeedFilterDto = {} as FeedFilterDto;
      const result = await controller.getFeed(userId, filters);

      expect(result.cards).toHaveLength(1);
      expect(result.remaining).toBe(18);
      expect(result.dailyLimit).toBe(20);
    });

    it("should pass filters to the service", async () => {
      const filters = {
        genderPreference: "female",
        minAge: 20,
        maxAge: 30,
        maxDistance: 50,
      } as unknown as FeedFilterDto;

      mockDiscoveryService.getDiscoveryFeed.mockResolvedValue({
        cards: [],
        remaining: 20,
        dailyLimit: 20,
      });

      await controller.getFeed(userId, filters);

      expect(mockDiscoveryService.getDiscoveryFeed).toHaveBeenCalledWith(
        userId,
        filters,
        undefined,
      );
    });

    it("should delegate to discoveryService.getFeed with correct userId", async () => {
      mockDiscoveryService.getDiscoveryFeed.mockResolvedValue({
        cards: [],
        remaining: 20,
        dailyLimit: 20,
      });

      const filters: FeedFilterDto = {} as FeedFilterDto;
      await controller.getFeed(userId, filters);

      expect(mockDiscoveryService.getDiscoveryFeed).toHaveBeenCalledWith(
        userId,
        filters,
        undefined,
      );
      expect(mockDiscoveryService.getDiscoveryFeed).toHaveBeenCalledTimes(1);
    });

    it("should throw BadRequestException when user has no profile", async () => {
      mockDiscoveryService.getDiscoveryFeed.mockRejectedValue(
        new BadRequestException("Keşif için profil oluşturmanız gerekiyor"),
      );

      const filters: FeedFilterDto = {} as FeedFilterDto;
      await expect(controller.getFeed(userId, filters)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should return empty cards when no candidates match filters", async () => {
      mockDiscoveryService.getDiscoveryFeed.mockResolvedValue({
        cards: [],
        remaining: 20,
        dailyLimit: 20,
      });

      const filters: FeedFilterDto = {} as FeedFilterDto;
      const result = await controller.getFeed(userId, filters);

      expect(result.cards).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /discovery/swipe
  // ═══════════════════════════════════════════════════════════════

  describe("swipe()", () => {
    const userId = "user-uuid-1";

    it("should process a like swipe successfully", async () => {
      const expected = {
        direction: "like",
        isMatch: false,
        matchId: null,
        animationType: null,
      };
      mockDiscoveryService.swipe.mockResolvedValue(expected);

      const dto = { targetUserId: "target-1", direction: SwipeDirection.LIKE };
      const result = await controller.swipe(userId, dto);

      expect(result.direction).toBe("like");
      expect(result.isMatch).toBe(false);
    });

    it("should return match info on mutual like", async () => {
      const expected = {
        direction: "like",
        isMatch: true,
        matchId: "match-uuid-1",
        animationType: "SUPER_COMPATIBILITY",
      };
      mockDiscoveryService.swipe.mockResolvedValue(expected);

      const dto = { targetUserId: "target-1", direction: SwipeDirection.LIKE };
      const result = await controller.swipe(userId, dto);

      expect(result.isMatch).toBe(true);
      expect(result.matchId).toBe("match-uuid-1");
      expect(result.animationType).toBe("SUPER_COMPATIBILITY");
    });

    it("should process a pass swipe successfully", async () => {
      const expected = {
        direction: "pass",
        isMatch: false,
        matchId: null,
        animationType: null,
      };
      mockDiscoveryService.swipe.mockResolvedValue(expected);

      const dto = { targetUserId: "target-1", direction: SwipeDirection.PASS };
      const result = await controller.swipe(userId, dto);

      expect(result.direction).toBe("pass");
      expect(result.isMatch).toBe(false);
    });

    it("should throw BadRequestException for duplicate swipe", async () => {
      mockDiscoveryService.swipe.mockRejectedValue(
        new BadRequestException("Bu kullanıcıya zaten karar verdiniz"),
      );

      const dto = { targetUserId: "target-1", direction: SwipeDirection.LIKE };
      await expect(controller.swipe(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw ForbiddenException when daily limit reached", async () => {
      mockDiscoveryService.swipe.mockRejectedValue(
        new ForbiddenException("Günlük beğeni limitinize ulaştınız"),
      );

      const dto = { targetUserId: "target-1", direction: SwipeDirection.LIKE };
      await expect(controller.swipe(userId, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should delegate to discoveryService.swipe with userId and dto", async () => {
      mockDiscoveryService.swipe.mockResolvedValue({
        direction: "like",
        isMatch: false,
        matchId: null,
        animationType: null,
      });

      const dto = { targetUserId: "target-2", direction: SwipeDirection.LIKE };
      await controller.swipe(userId, dto);

      expect(mockDiscoveryService.swipe).toHaveBeenCalledWith(userId, dto);
      expect(mockDiscoveryService.swipe).toHaveBeenCalledTimes(1);
    });
  });
});
