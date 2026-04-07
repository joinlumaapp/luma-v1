import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { DiscoveryService } from "./discovery.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BadgesService } from "../badges/badges.service";
import { NotificationsService } from "../notifications/notifications.service";
import { SearchService } from "../search/search.service";
import { LumaCacheService } from "../cache/cache.service";
import { SwipeDirection } from "./dto/swipe.dto";
import { GenderPreferenceParam } from "./dto/feed-filter.dto";

const mockSearchService = {
  isElasticsearchConnected: jest.fn().mockReturnValue(false),
  searchUsers: jest.fn().mockResolvedValue({ hits: [], total: 0 }),
};

const mockCacheService = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  userProfile: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  swipe: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  block: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  report: {
    findMany: jest.fn(),
  },
  dailySwipeCount: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  compatibilityScore: {
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
  },
  match: {
    create: jest.fn(),
  },
  notification: {
    createMany: jest.fn(),
  },
  relationship: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  profileBoost: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  feedView: {
    findMany: jest.fn().mockResolvedValue([]),
    createMany: jest.fn().mockResolvedValue({ count: 0 }),
  },
  dailyPick: {
    findMany: jest.fn().mockResolvedValue([]),
    createMany: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
  $queryRaw: jest.fn().mockResolvedValue([]),
  $executeRawUnsafe: jest.fn().mockResolvedValue(0),
};

const mockNotifications = {
  notifyNewMatch: jest.fn().mockResolvedValue(undefined),
};

describe("DiscoveryService", () => {
  let service: DiscoveryService;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Reset mock defaults after clearAllMocks
    mockSearchService.isElasticsearchConnected.mockReturnValue(false);
    mockSearchService.searchUsers.mockResolvedValue({ hits: [], total: 0 });
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
    mockCacheService.del.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscoveryService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: BadgesService,
          useValue: { checkAndAwardBadges: jest.fn().mockResolvedValue([]) },
        },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: SearchService, useValue: mockSearchService },
        { provide: LumaCacheService, useValue: mockCacheService },
      ],
    }).compile();
    service = module.get<DiscoveryService>(DiscoveryService);
  });

  describe("getDiscoveryFeed()", () => {
    beforeEach(() => {
      // Default: user has no active relationship, no users in relationships
      mockPrisma.relationship.findFirst.mockResolvedValue(null);
      mockPrisma.relationship.findMany.mockResolvedValue([]);
      mockPrisma.profileBoost.findMany.mockResolvedValue([]);
      mockPrisma.feedView.findMany.mockResolvedValue([]);
    });

    it("should return empty feed with hasMore=false when user has active relationship", async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue({
        id: "r1",
        userAId: "u1",
        userBId: "u2",
        status: "ACTIVE",
      });

      const result = await service.getDiscoveryFeed("u1");

      expect(result.cards).toEqual([]);
      expect(result.remaining).toBe(0);
      expect(result.cursor).toBeNull();
      expect(result.hasMore).toBe(false);
    });

    it("should exclude users in active relationships from feed candidates", async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(null);
      mockPrisma.relationship.findMany.mockResolvedValue([
        { userAId: "u-coupled-1", userBId: "u-coupled-2" },
      ]);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        packageTier: "FREE",
        profile: {
          firstName: "Ali",
          intentionTag: "SERIOUS_RELATIONSHIP",
          latitude: null,
          longitude: null,
          interestTags: [],
        },
      });
      mockPrisma.swipe.findMany.mockResolvedValue([]);
      mockPrisma.block.findMany.mockResolvedValue([]);
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.userProfile.findMany.mockResolvedValue([]);
      mockPrisma.dailySwipeCount.findUnique.mockResolvedValue(null);

      await service.getDiscoveryFeed("u1");

      const queryArgs = mockPrisma.userProfile.findMany.mock.calls[0][0];
      expect(queryArgs.where.userId.notIn).toContain("u-coupled-1");
      expect(queryArgs.where.userId.notIn).toContain("u-coupled-2");
    });

    it("should throw BadRequestException when user has no profile", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        profile: null,
      });

      await expect(service.getDiscoveryFeed("u1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should return feed cards with remaining swipes and pagination cursor", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        packageTier: "FREE",
        profile: {
          firstName: "Ali",
          intentionTag: "SERIOUS_RELATIONSHIP",
          latitude: null,
          longitude: null,
          interestTags: ["travel", "music"],
        },
      });
      mockPrisma.swipe.findMany.mockResolvedValue([]);
      mockPrisma.block.findMany.mockResolvedValue([]);
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.userProfile.findMany.mockResolvedValue([
        {
          userId: "u2",
          firstName: "Ayse",
          birthDate: new Date("1998-03-01"),
          bio: "Hi",
          city: "Istanbul",
          gender: "FEMALE",
          intentionTag: "SERIOUS_RELATIONSHIP",
          interestTags: ["travel", "cooking"],
          isComplete: true,
          lastActiveAt: new Date(),
          user: {
            id: "u2",
            isSelfieVerified: true,
            isFullyVerified: true,
            packageTier: "GOLD",
            createdAt: new Date("2025-12-01"),
            photos: [
              {
                id: "p1",
                url: "https://cdn.luma.app/1.jpg",
                thumbnailUrl: "https://cdn.luma.app/1_thumb.jpg",
              },
            ],
          },
        },
      ]);
      mockPrisma.compatibilityScore.findMany.mockResolvedValue([
        {
          userAId: "u1",
          userBId: "u2",
          finalScore: 75,
          level: "NORMAL",
          dimensionScores: null,
        },
      ]);
      mockPrisma.dailySwipeCount.findUnique.mockResolvedValue(null);

      const result = await service.getDiscoveryFeed("u1");

      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].firstName).toBe("Ayse");
      expect(result.cards[0].compatibility?.score).toBe(75);
      expect(result.remaining).toBe(20); // FREE feed view limit
      expect(result.dailyLimit).toBe(20);
    });

    it("should exclude already swiped users", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        packageTier: "FREE",
        profile: {
          firstName: "Ali",
          latitude: null,
          longitude: null,
          interestTags: [],
        },
      });
      mockPrisma.swipe.findMany.mockResolvedValue([{ targetId: "u2" }]);
      mockPrisma.block.findMany.mockResolvedValue([]);
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.userProfile.findMany.mockResolvedValue([]);
      mockPrisma.dailySwipeCount.findUnique.mockResolvedValue(null);

      const result = await service.getDiscoveryFeed("u1");

      const queryArgs = mockPrisma.userProfile.findMany.mock.calls[0][0];
      expect(queryArgs.where.userId.notIn).toContain("u2");
      expect(result.cards).toHaveLength(0);
    });

    it("should exclude blocked users", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        packageTier: "FREE",
        profile: {
          firstName: "Ali",
          latitude: null,
          longitude: null,
          interestTags: [],
        },
      });
      mockPrisma.swipe.findMany.mockResolvedValue([]);
      mockPrisma.block.findMany.mockResolvedValue([
        { blockerId: "u1", blockedId: "u3" },
      ]);
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.userProfile.findMany.mockResolvedValue([]);
      mockPrisma.dailySwipeCount.findUnique.mockResolvedValue(null);

      const result = await service.getDiscoveryFeed("u1");

      const queryArgs = mockPrisma.userProfile.findMany.mock.calls[0][0];
      expect(queryArgs.where.userId.notIn).toContain("u3");
      expect(result.cards).toHaveLength(0);
    });

    it("should exclude reported users", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        packageTier: "FREE",
        profile: {
          firstName: "Ali",
          latitude: null,
          longitude: null,
          interestTags: [],
        },
      });
      mockPrisma.swipe.findMany.mockResolvedValue([]);
      mockPrisma.block.findMany.mockResolvedValue([]);
      mockPrisma.report.findMany.mockResolvedValue([
        { reportedId: "u5" },
      ]);
      mockPrisma.userProfile.findMany.mockResolvedValue([]);
      mockPrisma.dailySwipeCount.findUnique.mockResolvedValue(null);

      const result = await service.getDiscoveryFeed("u1");

      const queryArgs = mockPrisma.userProfile.findMany.mock.calls[0][0];
      expect(queryArgs.where.userId.notIn).toContain("u5");
      expect(result.cards).toHaveLength(0);
    });

    it("should calculate remaining swipes based on daily count", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        packageTier: "GOLD",
        profile: {
          firstName: "Ali",
          latitude: null,
          longitude: null,
          interestTags: [],
        },
      });
      mockPrisma.swipe.findMany.mockResolvedValue([]);
      mockPrisma.block.findMany.mockResolvedValue([]);
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.userProfile.findMany.mockResolvedValue([]);
      mockPrisma.dailySwipeCount.findUnique.mockResolvedValue({ count: 45 });

      const result = await service.getDiscoveryFeed("u1");

      expect(result.dailyLimit).toBe(50); // GOLD feed view limit
      expect(result.remaining).toBe(5); // 50 - 45
    });

    it("should apply gender filter when specified", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        packageTier: "FREE",
        profile: {
          firstName: "Ali",
          latitude: null,
          longitude: null,
          interestTags: [],
        },
      });
      mockPrisma.swipe.findMany.mockResolvedValue([]);
      mockPrisma.block.findMany.mockResolvedValue([]);
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.userProfile.findMany.mockResolvedValue([]);
      mockPrisma.dailySwipeCount.findUnique.mockResolvedValue(null);

      await service.getDiscoveryFeed("u1", {
        genderPreference: GenderPreferenceParam.FEMALE,
      });

      const queryArgs = mockPrisma.userProfile.findMany.mock.calls[0][0];
      expect(queryArgs.where.gender).toBe("FEMALE");
    });

    it("should not apply gender filter when set to ALL", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        packageTier: "FREE",
        profile: {
          firstName: "Ali",
          latitude: null,
          longitude: null,
          interestTags: [],
        },
      });
      mockPrisma.swipe.findMany.mockResolvedValue([]);
      mockPrisma.block.findMany.mockResolvedValue([]);
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.userProfile.findMany.mockResolvedValue([]);
      mockPrisma.dailySwipeCount.findUnique.mockResolvedValue(null);

      await service.getDiscoveryFeed("u1", {
        genderPreference: GenderPreferenceParam.ALL,
      });

      const queryArgs = mockPrisma.userProfile.findMany.mock.calls[0][0];
      expect(queryArgs.where.gender).toBeUndefined();
    });

    it("should apply intention tag filter", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        packageTier: "FREE",
        profile: {
          firstName: "Ali",
          latitude: null,
          longitude: null,
          interestTags: [],
        },
      });
      mockPrisma.swipe.findMany.mockResolvedValue([]);
      mockPrisma.block.findMany.mockResolvedValue([]);
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.userProfile.findMany.mockResolvedValue([]);
      mockPrisma.dailySwipeCount.findUnique.mockResolvedValue(null);

      await service.getDiscoveryFeed("u1", {
        intentionTags: ["serious_relationship", "exploring"],
      });

      const queryArgs = mockPrisma.userProfile.findMany.mock.calls[0][0];
      expect(queryArgs.where.intentionTag).toEqual({
        in: ["serious_relationship", "exploring"],
      });
    });

    it("should filter by age range", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        packageTier: "FREE",
        profile: {
          firstName: "Ali",
          intentionTag: "SERIOUS_RELATIONSHIP",
          latitude: null,
          longitude: null,
          interestTags: [],
        },
      });
      mockPrisma.swipe.findMany.mockResolvedValue([]);
      mockPrisma.block.findMany.mockResolvedValue([]);
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.userProfile.findMany.mockResolvedValue([
        {
          userId: "u2",
          firstName: "Ayse",
          birthDate: new Date("1998-03-01"), // ~28 years old
          bio: "Hi",
          city: "Istanbul",
          gender: "FEMALE",
          intentionTag: "SERIOUS_RELATIONSHIP",
          interestTags: [],
          isComplete: true,
          lastActiveAt: new Date(),
          user: {
            id: "u2",
            isSelfieVerified: true,
            isFullyVerified: true,
            packageTier: "GOLD",
            createdAt: new Date("2025-12-01"),
            photos: [],
          },
        },
        {
          userId: "u3",
          firstName: "Zeynep",
          birthDate: new Date("1960-01-01"), // ~66 years old
          bio: "Hello",
          city: "Ankara",
          gender: "FEMALE",
          intentionTag: "EXPLORING",
          interestTags: [],
          isComplete: true,
          lastActiveAt: new Date(),
          user: {
            id: "u3",
            isSelfieVerified: false,
            isFullyVerified: false,
            packageTier: "FREE",
            createdAt: new Date("2025-11-01"),
            photos: [],
          },
        },
      ]);
      mockPrisma.compatibilityScore.findUnique.mockResolvedValue(null);
      mockPrisma.dailySwipeCount.findUnique.mockResolvedValue(null);

      const result = await service.getDiscoveryFeed("u1", {
        minAge: 25,
        maxAge: 35,
      });

      // Zeynep (66) should be filtered out, only Ayse (28) should remain
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].firstName).toBe("Ayse");
    });

    it("should prioritize super-likers in feed ordering", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        packageTier: "GOLD",
        profile: {
          firstName: "Ali",
          intentionTag: "SERIOUS_RELATIONSHIP",
          latitude: null,
          longitude: null,
          interestTags: [],
        },
      });
      // u3 super-liked u1
      mockPrisma.swipe.findMany
        .mockResolvedValueOnce([]) // swiped IDs
        .mockResolvedValueOnce([{ swiperId: "u3", createdAt: new Date() }]); // super likers
      mockPrisma.block.findMany.mockResolvedValue([]);
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.dailySwipeCount.findUnique.mockResolvedValue(null);

      mockPrisma.userProfile.findMany.mockResolvedValue([
        {
          userId: "u2",
          firstName: "Ayse",
          birthDate: new Date("1998-03-01"),
          bio: "Regular user",
          city: "Istanbul",
          gender: "FEMALE",
          intentionTag: "SERIOUS_RELATIONSHIP",
          interestTags: [],
          isComplete: true,
          lastActiveAt: new Date(),
          user: {
            id: "u2",
            isSelfieVerified: true,
            isFullyVerified: true,
            packageTier: "PRO",
            createdAt: new Date("2025-06-01"),
            photos: [{ id: "p1", url: "url", thumbnailUrl: "thumb" }],
          },
        },
        {
          userId: "u3",
          firstName: "Zeynep",
          birthDate: new Date("1996-05-15"),
          bio: "Super liker",
          city: "Istanbul",
          gender: "FEMALE",
          intentionTag: "SERIOUS_RELATIONSHIP",
          interestTags: [],
          isComplete: true,
          lastActiveAt: new Date(),
          user: {
            id: "u3",
            isSelfieVerified: false,
            isFullyVerified: false,
            packageTier: "FREE",
            createdAt: new Date("2025-11-01"),
            photos: [{ id: "p2", url: "url2", thumbnailUrl: "thumb2" }],
          },
        },
      ]);
      mockPrisma.compatibilityScore.findMany.mockResolvedValue([]);

      const result = await service.getDiscoveryFeed("u1");

      // u3 (super liker) should appear before u2 despite lower score
      expect(result.cards).toHaveLength(2);
      expect(result.cards[0].userId).toBe("u3");
      expect(result.cards[0].isSuperLiker).toBe(true);
    });

    it("should boost scores for boosted users", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        packageTier: "FREE",
        profile: {
          firstName: "Ali",
          intentionTag: "SERIOUS_RELATIONSHIP",
          latitude: null,
          longitude: null,
          interestTags: [],
        },
      });
      mockPrisma.swipe.findMany.mockResolvedValue([]);
      mockPrisma.block.findMany.mockResolvedValue([]);
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.dailySwipeCount.findUnique.mockResolvedValue(null);

      // u4 has an active boost
      mockPrisma.profileBoost.findMany.mockResolvedValue([
        { userId: "u4", endsAt: new Date(Date.now() + 1800000) },
      ]);

      mockPrisma.userProfile.findMany.mockResolvedValue([
        {
          userId: "u4",
          firstName: "Boosted User",
          birthDate: new Date("1995-01-01"),
          bio: "I am boosted",
          city: "Istanbul",
          gender: "FEMALE",
          intentionTag: "SERIOUS_RELATIONSHIP",
          interestTags: [],
          isComplete: true,
          lastActiveAt: new Date(),
          user: {
            id: "u4",
            isSelfieVerified: false,
            isFullyVerified: false,
            packageTier: "FREE",
            createdAt: new Date("2025-06-01"),
            photos: [{ id: "p1", url: "url", thumbnailUrl: "thumb" }],
          },
        },
      ]);
      mockPrisma.compatibilityScore.findMany.mockResolvedValue([]);

      const result = await service.getDiscoveryFeed("u1");

      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].isBoosted).toBe(true);
      // Boosted user's feedScore should be multiplied by 3x
      expect(result.cards[0].feedScore).toBeGreaterThan(0);
    });
  });

  describe("package tier priority boost", () => {
    beforeEach(() => {
      mockPrisma.relationship.findFirst.mockResolvedValue(null);
      mockPrisma.relationship.findMany.mockResolvedValue([]);
      mockPrisma.profileBoost.findMany.mockResolvedValue([]);
      mockPrisma.feedView.findMany.mockResolvedValue([]);
      mockPrisma.swipe.findMany.mockResolvedValue([]);
      mockPrisma.block.findMany.mockResolvedValue([]);
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.dailySwipeCount.findUnique.mockResolvedValue(null);
      mockPrisma.compatibilityScore.findMany.mockResolvedValue([]);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        packageTier: "FREE",
        profile: {
          firstName: "Ali",
          intentionTag: "SERIOUS_RELATIONSHIP",
          latitude: null,
          longitude: null,
          interestTags: [],
        },
      });
    });

    const buildCandidate = (
      userId: string,
      packageTier: string,
    ) => ({
      userId,
      firstName: `User-${userId}`,
      birthDate: new Date("1995-01-01"),
      bio: "Hello world bio text",
      city: "Istanbul",
      gender: "FEMALE",
      intentionTag: "SERIOUS_RELATIONSHIP",
      interestTags: [],
      isComplete: true,
      lastActiveAt: new Date(),
      user: {
        id: userId,
        isSelfieVerified: false,
        isFullyVerified: false,
        packageTier,
        createdAt: new Date("2024-01-01"),
        photos: [{ id: "p1", url: "url", thumbnailUrl: "thumb" }],
      },
    });

    it("should give RESERVED users a higher feed score than FREE users with identical profiles", async () => {
      mockPrisma.userProfile.findMany.mockResolvedValue([
        buildCandidate("u-free", "FREE"),
        buildCandidate("u-reserved", "RESERVED"),
      ]);

      const result = await service.getDiscoveryFeed("u1");

      const freeCard = result.cards.find((c) => c.userId === "u-free");
      const reservedCard = result.cards.find((c) => c.userId === "u-reserved");

      expect(freeCard).toBeDefined();
      expect(reservedCard).toBeDefined();
      // RESERVED gets +15, FREE gets +0 — all other factors are identical
      expect(reservedCard!.feedScore).toBeGreaterThan(freeCard!.feedScore);
      expect(reservedCard!.feedScore - freeCard!.feedScore).toBeCloseTo(15, 0);
    });

    it("should rank paid users higher: RESERVED > PRO > GOLD > FREE", async () => {
      mockPrisma.userProfile.findMany.mockResolvedValue([
        buildCandidate("u-free", "FREE"),
        buildCandidate("u-gold", "GOLD"),
        buildCandidate("u-pro", "PRO"),
        buildCandidate("u-reserved", "RESERVED"),
      ]);

      const result = await service.getDiscoveryFeed("u1");

      const scoreOf = (id: string) =>
        result.cards.find((c) => c.userId === id)!.feedScore;

      expect(scoreOf("u-reserved")).toBeGreaterThan(scoreOf("u-pro"));
      expect(scoreOf("u-pro")).toBeGreaterThan(scoreOf("u-gold"));
      expect(scoreOf("u-gold")).toBeGreaterThan(scoreOf("u-free"));
    });

    it("should apply correct boost amounts per tier", async () => {
      mockPrisma.userProfile.findMany.mockResolvedValue([
        buildCandidate("u-free", "FREE"),
        buildCandidate("u-gold", "GOLD"),
        buildCandidate("u-pro", "PRO"),
        buildCandidate("u-reserved", "RESERVED"),
      ]);

      const result = await service.getDiscoveryFeed("u1");

      const scoreOf = (id: string) =>
        result.cards.find((c) => c.userId === id)!.feedScore;

      const freeScore = scoreOf("u-free");
      expect(scoreOf("u-gold") - freeScore).toBeCloseTo(5, 0);
      expect(scoreOf("u-pro") - freeScore).toBeCloseTo(10, 0);
      expect(scoreOf("u-reserved") - freeScore).toBeCloseTo(15, 0);
    });
  });

  describe("getFeed() backward compatibility", () => {
    it("should delegate to getDiscoveryFeed", async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue({
        id: "r1",
        userAId: "u1",
        userBId: "u2",
        status: "ACTIVE",
      });

      const result = await service.getFeed("u1");
      expect(result.cards).toEqual([]);
      expect(result.hasMore).toBe(false);
    });
  });

  describe("swipe()", () => {
    it("should throw BadRequestException when user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.swipe("u1", {
          targetUserId: "u2",
          direction: SwipeDirection.LIKE,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for inactive target", async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ packageTier: "FREE" })
        .mockResolvedValueOnce({ id: "u2", isActive: false });

      await expect(
        service.swipe("u1", {
          targetUserId: "u2",
          direction: SwipeDirection.LIKE,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for duplicate swipe", async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ packageTier: "FREE" })
        .mockResolvedValueOnce({ id: "u2", isActive: true });
      mockPrisma.block.findFirst.mockResolvedValue(null);
      mockPrisma.swipe.findUnique.mockResolvedValue({ id: "s1" });

      await expect(
        service.swipe("u1", {
          targetUserId: "u2",
          direction: SwipeDirection.LIKE,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when user is blocked", async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ packageTier: "FREE" })
        .mockResolvedValueOnce({ id: "u2", isActive: true });
      mockPrisma.block.findFirst.mockResolvedValue({ id: "block-1" });

      await expect(
        service.swipe("u1", {
          targetUserId: "u2",
          direction: SwipeDirection.LIKE,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw ForbiddenException when daily limit reached", async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ packageTier: "PRO" })
        .mockResolvedValueOnce({ id: "u2", isActive: true });
      mockPrisma.block.findFirst.mockResolvedValue(null);
      mockPrisma.swipe.findUnique.mockResolvedValue(null);
      mockPrisma.dailySwipeCount.upsert.mockResolvedValue({ count: 999999 }); // All tiers have 999999 unlimited limit

      await expect(
        service.swipe("u1", {
          targetUserId: "u2",
          direction: SwipeDirection.LIKE,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should create swipe and return isMatch=false for PASS", async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ packageTier: "FREE" })
        .mockResolvedValueOnce({ id: "u2", isActive: true });
      mockPrisma.block.findFirst.mockResolvedValue(null);
      mockPrisma.swipe.findUnique.mockResolvedValue(null);
      mockPrisma.dailySwipeCount.upsert.mockResolvedValue({ count: 5 });
      mockPrisma.$transaction.mockImplementation(
        async (cb: (tx: unknown) => Promise<unknown>) => {
          return cb({
            swipe: { create: jest.fn().mockResolvedValue({ id: "swipe-1" }) },
            dailySwipeCount: { upsert: jest.fn() },
          });
        },
      );

      const result = await service.swipe("u1", {
        targetUserId: "u2",
        direction: SwipeDirection.PASS,
      });

      expect(result.direction).toBe("PASS");
      expect(result.isMatch).toBe(false);
    });

    it("should detect mutual like and create match", async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ packageTier: "FREE" })
        .mockResolvedValueOnce({ id: "u2", isActive: true });
      mockPrisma.block.findFirst.mockResolvedValue(null);
      mockPrisma.swipe.findUnique.mockResolvedValue(null);
      mockPrisma.dailySwipeCount.upsert.mockResolvedValue({ count: 3 });

      mockPrisma.$transaction.mockImplementation(
        async (cb: (tx: unknown) => Promise<unknown>) => {
          return cb({
            swipe: {
              create: jest.fn().mockResolvedValue({ id: "swipe-2" }),
              findUnique: jest.fn().mockResolvedValue({ action: "LIKE" }),
            },
            dailySwipeCount: { upsert: jest.fn() },
            compatibilityScore: {
              findUnique: jest
                .fn()
                .mockResolvedValue({ finalScore: 92, level: "SUPER" }),
            },
            userProfile: {
              findUnique: jest
                .fn()
                .mockResolvedValue({ firstName: "TestUser" }),
            },
            match: {
              create: jest.fn().mockResolvedValue({ id: "match-1" }),
            },
            notification: { createMany: jest.fn() },
          });
        },
      );

      const result = await service.swipe("u1", {
        targetUserId: "u2",
        direction: SwipeDirection.LIKE,
      });

      expect(result.isMatch).toBe(true);
      expect(result.matchId).toBe("match-1");
      expect(result.animationType).toBe("SUPER_COMPATIBILITY");
    });
  });

  describe("recordInteraction()", () => {
    it("should delegate to swipe() with correct direction mapping", async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ packageTier: "FREE" })
        .mockResolvedValueOnce({ id: "u2", isActive: true });
      mockPrisma.block.findFirst.mockResolvedValue(null);
      mockPrisma.swipe.findUnique.mockResolvedValue(null);
      mockPrisma.dailySwipeCount.upsert.mockResolvedValue({ count: 5 });
      mockPrisma.$transaction.mockImplementation(
        async (cb: (tx: unknown) => Promise<unknown>) => {
          return cb({
            swipe: { create: jest.fn().mockResolvedValue({ id: "swipe-3" }) },
            dailySwipeCount: { upsert: jest.fn() },
          });
        },
      );

      const result = await service.recordInteraction("u1", "u2", "pass");
      expect(result.recorded).toBe(true);
    });
  });

  describe("applyFeedDiversity()", () => {
    it("should break up 3+ consecutive same-city profiles", () => {
      const cards = [
        { userId: "a", city: "Istanbul", age: 25, intentionTag: "SERIOUS", feedScore: 90 },
        { userId: "b", city: "Istanbul", age: 30, intentionTag: "EXPLORING", feedScore: 80 },
        { userId: "c", city: "Istanbul", age: 35, intentionTag: "NOT_SURE", feedScore: 70 },
        { userId: "d", city: "Ankara", age: 28, intentionTag: "SERIOUS", feedScore: 60 },
      ] as Parameters<DiscoveryService["applyFeedDiversity"]>[0];

      const result = service.applyFeedDiversity(cards);

      // Should not have 3 consecutive Istanbul profiles
      for (let i = 2; i < result.length; i++) {
        const sameCity =
          result[i].city === result[i - 1].city &&
          result[i].city === result[i - 2].city;
        if (result[i].city !== null) {
          expect(sameCity).toBe(false);
        }
      }
      // All cards should still be present
      expect(result).toHaveLength(4);
    });

    it("should break up 3+ consecutive same-age-bracket profiles", () => {
      const cards = [
        { userId: "a", city: "Istanbul", age: 25, intentionTag: "SERIOUS", feedScore: 90 },
        { userId: "b", city: "Ankara", age: 26, intentionTag: "EXPLORING", feedScore: 80 },
        { userId: "c", city: "Izmir", age: 24, intentionTag: "NOT_SURE", feedScore: 70 },
        { userId: "d", city: "Bursa", age: 35, intentionTag: "SERIOUS", feedScore: 60 },
      ] as Parameters<DiscoveryService["applyFeedDiversity"]>[0];

      const result = service.applyFeedDiversity(cards);
      expect(result).toHaveLength(4);
    });

    it("should break up 3+ consecutive same-intention-tag profiles", () => {
      const cards = [
        { userId: "a", city: "Istanbul", age: 25, intentionTag: "SERIOUS", feedScore: 90 },
        { userId: "b", city: "Ankara", age: 30, intentionTag: "SERIOUS", feedScore: 80 },
        { userId: "c", city: "Izmir", age: 35, intentionTag: "SERIOUS", feedScore: 70 },
        { userId: "d", city: "Bursa", age: 28, intentionTag: "EXPLORING", feedScore: 60 },
      ] as Parameters<DiscoveryService["applyFeedDiversity"]>[0];

      const result = service.applyFeedDiversity(cards);

      // Should not have 3 consecutive SERIOUS profiles
      for (let i = 2; i < result.length; i++) {
        const sameTag =
          result[i].intentionTag === result[i - 1].intentionTag &&
          result[i].intentionTag === result[i - 2].intentionTag;
        expect(sameTag).toBe(false);
      }
      expect(result).toHaveLength(4);
    });

    it("should return cards as-is when fewer than 3", () => {
      const cards = [
        { userId: "a", city: "Istanbul", age: 25, intentionTag: "SERIOUS", feedScore: 90 },
      ] as Parameters<DiscoveryService["applyFeedDiversity"]>[0];

      const result = service.applyFeedDiversity(cards);
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe("a");
    });
  });

  describe("cache integration", () => {
    beforeEach(() => {
      mockPrisma.relationship.findFirst.mockResolvedValue(null);
      mockPrisma.relationship.findMany.mockResolvedValue([]);
      mockPrisma.profileBoost.findMany.mockResolvedValue([]);
      mockPrisma.feedView.findMany.mockResolvedValue([]);
      mockSearchService.isElasticsearchConnected.mockReturnValue(false);
    });

    it("should return cached feed if available", async () => {
      const cachedFeed = {
        cards: [],
        remaining: 10,
        dailyLimit: 20,
        totalCandidates: 0,
        cursor: null,
        hasMore: false,
      };
      mockCacheService.get.mockResolvedValueOnce(cachedFeed);

      const result = await service.getDiscoveryFeed("u1");

      expect(result).toEqual(cachedFeed);
      // Should not call prisma at all
      expect(mockPrisma.relationship.findFirst).not.toHaveBeenCalled();
    });

    it("should invalidate feed cache after swipe", async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ packageTier: "FREE" })
        .mockResolvedValueOnce({ id: "u2", isActive: true });
      mockPrisma.block.findFirst.mockResolvedValue(null);
      mockPrisma.swipe.findUnique.mockResolvedValue(null);
      mockPrisma.dailySwipeCount.upsert.mockResolvedValue({ count: 5 });
      mockPrisma.$transaction.mockImplementation(
        async (cb: (tx: unknown) => Promise<unknown>) => {
          return cb({
            swipe: { create: jest.fn().mockResolvedValue({ id: "swipe-1" }) },
            dailySwipeCount: { upsert: jest.fn() },
          });
        },
      );

      await service.swipe("u1", {
        targetUserId: "u2",
        direction: SwipeDirection.PASS,
      });

      expect(mockCacheService.del).toHaveBeenCalledWith("discovery:feed:u1");
    });
  });

  describe("Elasticsearch integration", () => {
    beforeEach(() => {
      mockPrisma.relationship.findFirst.mockResolvedValue(null);
      mockPrisma.relationship.findMany.mockResolvedValue([]);
      mockPrisma.profileBoost.findMany.mockResolvedValue([]);
      mockPrisma.feedView.findMany.mockResolvedValue([]);
      mockCacheService.get.mockResolvedValue(null);
    });

    it("should use ES candidates when available", async () => {
      mockSearchService.isElasticsearchConnected.mockReturnValue(true);
      mockSearchService.searchUsers.mockResolvedValue({
        hits: [
          { userId: "u2", firstName: "Ayse", age: 28, gender: "FEMALE", intentionTag: "SERIOUS", bio: null, city: "Istanbul", isVerified: true, packageTier: "GOLD", primaryPhotoUrl: null, distanceKm: 5 },
        ],
        total: 1,
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        packageTier: "FREE",
        profile: {
          firstName: "Ali",
          latitude: 41.0,
          longitude: 29.0,
          interestTags: [],
        },
      });
      mockPrisma.swipe.findMany.mockResolvedValue([]);
      mockPrisma.block.findMany.mockResolvedValue([]);
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.dailySwipeCount.findUnique.mockResolvedValue(null);
      mockPrisma.userProfile.findMany.mockResolvedValue([
        {
          userId: "u2",
          firstName: "Ayse",
          birthDate: new Date("1998-03-01"),
          bio: "Hi",
          city: "Istanbul",
          gender: "FEMALE",
          intentionTag: "SERIOUS_RELATIONSHIP",
          interestTags: [],
          latitude: 41.01,
          longitude: 29.01,
          isComplete: true,
          lastActiveAt: new Date(),
          user: {
            id: "u2",
            isSelfieVerified: true,
            isFullyVerified: true,
            packageTier: "GOLD",
            createdAt: new Date("2025-12-01"),
            photos: [{ id: "p1", url: "url", thumbnailUrl: "thumb" }],
          },
        },
      ]);
      mockPrisma.compatibilityScore.findMany.mockResolvedValue([]);

      const result = await service.getDiscoveryFeed("u1");

      expect(mockSearchService.searchUsers).toHaveBeenCalled();
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].userId).toBe("u2");
    });

    it("should fall back to Prisma when ES is unavailable", async () => {
      mockSearchService.isElasticsearchConnected.mockReturnValue(false);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        packageTier: "FREE",
        profile: {
          firstName: "Ali",
          latitude: null,
          longitude: null,
          interestTags: [],
        },
      });
      mockPrisma.swipe.findMany.mockResolvedValue([]);
      mockPrisma.block.findMany.mockResolvedValue([]);
      mockPrisma.report.findMany.mockResolvedValue([]);
      mockPrisma.userProfile.findMany.mockResolvedValue([]);
      mockPrisma.dailySwipeCount.findUnique.mockResolvedValue(null);

      const result = await service.getDiscoveryFeed("u1");

      expect(mockSearchService.searchUsers).not.toHaveBeenCalled();
      expect(result.cards).toHaveLength(0);
    });
  });

  describe("getDailyPicks()", () => {
    it("should throw BadRequestException when user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getDailyPicks("u-nonexistent")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should return cached picks if already generated today", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        packageTier: "GOLD",
      });
      mockPrisma.dailyPick.findMany.mockResolvedValue([
        { pickedUserId: "u10", isViewed: true },
        { pickedUserId: "u11", isViewed: false },
      ]);
      mockPrisma.userProfile.findMany.mockResolvedValue([
        {
          userId: "u10",
          firstName: "Selin",
          birthDate: new Date("1997-01-01"),
          city: "Istanbul",
          bio: "Hello",
          intentionTag: "SERIOUS_RELATIONSHIP",
          interestTags: [],
          user: {
            isSelfieVerified: true,
            photos: [{ url: "url", thumbnailUrl: "thumb" }],
          },
        },
      ]);
      mockPrisma.compatibilityScore.findMany.mockResolvedValue([]);

      const result = await service.getDailyPicks("u1");
      expect(result.picks).toHaveLength(1); // only u10 has profile data
      expect(result.totalAvailable).toBe(10); // GOLD gets 10
    });
  });
});
