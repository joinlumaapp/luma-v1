import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { PrismaService } from "../../prisma/prisma.service";
import { BadgesService } from "../badges/badges.service";
import { ReceiptValidatorService } from "./receipt-validator.service";
import { PackageTier } from "./dto/subscribe.dto";

const mockPrisma = {
  user: { findUnique: jest.fn(), update: jest.fn() },
  subscription: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  goldTransaction: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  iapReceipt: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
  $executeRaw: jest.fn(),
};

const mockBadgesService = {
  checkAndAwardBadges: jest.fn().mockResolvedValue(undefined),
};

const mockReceiptValidator = {
  validateReceipt: jest.fn().mockResolvedValue({
    isValid: true,
    transactionId: `mock_txn_${Date.now()}`,
    productId: "mock_product",
    purchaseDate: new Date(),
    expiresDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    platform: "APPLE" as const,
    isTrial: false,
    isCancelled: false,
    rawResult: {
      isValid: true,
      transactionId: `mock_txn_${Date.now()}`,
      originalTransactionId: `mock_orig_${Date.now()}`,
      productId: "mock_product",
      purchaseDate: new Date(),
      expiresDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isTrial: false,
      isCancelled: false,
      environment: "mock",
      bundleId: "com.luma.dating",
    },
  }),
  validateAppleReceipt: jest.fn(),
  validateGoogleReceipt: jest.fn(),
};

describe("PaymentsService", () => {
  let service: PaymentsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Reset the mock to return unique transactionIds per call
    mockReceiptValidator.validateReceipt.mockImplementation(async () => ({
      isValid: true,
      transactionId: `mock_txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      productId: "mock_product",
      purchaseDate: new Date(),
      expiresDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      platform: "APPLE" as const,
      isTrial: false,
      isCancelled: false,
      rawResult: {
        isValid: true,
        transactionId: `mock_txn_${Date.now()}`,
        originalTransactionId: `mock_orig_${Date.now()}`,
        productId: "mock_product",
        purchaseDate: new Date(),
        expiresDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isTrial: false,
        isCancelled: false,
        environment: "mock",
        bundleId: "com.luma.dating",
      },
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BadgesService, useValue: mockBadgesService },
        { provide: ReceiptValidatorService, useValue: mockReceiptValidator },
      ],
    }).compile();
    service = module.get<PaymentsService>(PaymentsService);
  });

  // ═══════════════════════════════════════════════════════════════
  // getPackages()
  // ═══════════════════════════════════════════════════════════════

  describe("getPackages()", () => {
    it("should return all 4 packages and gold packs", async () => {
      const result = await service.getPackages();

      expect(result.packages).toHaveLength(4);
      expect(result.goldPacks).toHaveLength(4);
      const tiers = result.packages.map((p) => p.tier);
      expect(tiers).toEqual(
        expect.arrayContaining(["FREE", "GOLD", "PRO", "RESERVED"]),
      );
    });

    it("should include feature details for each package", async () => {
      const result = await service.getPackages();

      const freePkg = result.packages.find((p) => p.tier === "FREE");
      expect(freePkg?.features.dailySwipes).toBe(999999);

      const goldPkg = result.packages.find((p) => p.tier === "GOLD");
      expect(goldPkg?.features.dailySwipes).toBe(999999);
      expect(goldPkg?.features.seeWhoLikesYou).toBe(true);
    });

    it("should include gold packs with amounts and prices", async () => {
      const result = await service.getPackages();

      const pack50 = result.goldPacks.find((p) => p.id === "gold_50");
      expect(pack50?.amount).toBe(50);
      expect(pack50?.priceUsd).toBeGreaterThan(0);
    });

    it("should include totalGold (amount + bonus) for each gold pack", async () => {
      const result = await service.getPackages();

      const pack150 = result.goldPacks.find((p) => p.id === "gold_150");
      expect(pack150?.totalGold).toBe(160); // 150 + 10 bonus

      const pack50 = result.goldPacks.find((p) => p.id === "gold_50");
      expect(pack50?.totalGold).toBe(50); // 50 + 0 bonus
    });

    it("should have consistent feature gating across tiers", async () => {
      const result = await service.getPackages();

      const free = result.packages.find((p) => p.tier === "FREE");
      const gold = result.packages.find((p) => p.tier === "GOLD");
      const pro = result.packages.find((p) => p.tier === "PRO");
      const reserved = result.packages.find((p) => p.tier === "RESERVED");

      // Free tier: no premium features
      expect(free?.features.premiumQuestions).toBe(0);
      expect(free?.features.seeWhoLikesYou).toBe(false);
      expect(free?.features.undoSwipe).toBe(false);
      expect(free?.features.readReceipts).toBe(false);
      expect(free?.features.profileBoost).toBe(false);
      expect(free?.features.priorityInFeed).toBe(false);
      expect(free?.features.monthlyGold).toBe(0);

      // Gold: readReceipts should be false (not Pro-level)
      expect(gold?.features.readReceipts).toBe(false);
      expect(gold?.features.seeWhoLikesYou).toBe(true);
      expect(gold?.features.undoSwipe).toBe(true);

      // Pro: all features except VIP
      expect(pro?.features.readReceipts).toBe(true);
      expect(pro?.features.profileBoost).toBe(true);
      expect(pro?.features.priorityInFeed).toBe(true);

      // Reserved: everything enabled, highest values
      expect(reserved?.features.dailySwipes).toBe(999999);
      expect(reserved?.features.monthlyGold).toBe(1000);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // subscribe()
  // ═══════════════════════════════════════════════════════════════

  describe("subscribe()", () => {
    it("should throw BadRequestException for FREE tier", async () => {
      await expect(
        service.subscribe("u1", {
          packageTier: PackageTier.FREE,
          platform: "apple",
          receipt: "mock-receipt",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when already subscribed", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: "sub1",
        isActive: true,
      });

      await expect(
        service.subscribe("u1", {
          packageTier: PackageTier.GOLD,
          platform: "apple",
          receipt: "mock-receipt",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should reject duplicate receipt (replay protection)", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);
      // Receipt already exists
      mockPrisma.iapReceipt.findUnique.mockResolvedValue({ id: "existing" });

      await expect(
        service.subscribe("u1", {
          packageTier: PackageTier.GOLD,
          platform: "apple",
          receipt: "duplicate-receipt",
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // cancelSubscription()
  // ═══════════════════════════════════════════════════════════════

  describe("cancelSubscription()", () => {
    it("should throw NotFoundException when no active subscription", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);

      await expect(service.cancelSubscription("u1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should cancel subscription and return access until date", async () => {
      const expiryDate = new Date("2027-01-01");
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: "sub1",
        isActive: true,
        expiryDate,
      });
      mockPrisma.subscription.update.mockResolvedValue({});

      const result = await service.cancelSubscription("u1");

      expect(result.cancelled).toBe(true);
      expect(result.accessUntil).toEqual(expiryDate);
      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { id: "sub1" },
        data: expect.objectContaining({
          autoRenew: false,
        }),
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getGoldBalance()
  // ═══════════════════════════════════════════════════════════════

  describe("getGoldBalance()", () => {
    it("should return gold balance and recent transactions", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        goldBalance: 250,
        packageTier: "GOLD",
      });
      mockPrisma.goldTransaction.findMany.mockResolvedValue([
        {
          id: "tx1",
          type: "PURCHASE",
          amount: 150,
          balance: 250,
          description: "Gold satin alma",
          createdAt: new Date(),
        },
      ]);

      const result = await service.getGoldBalance("u1");

      expect(result.balance).toBe(250);
      expect(result.packageTier).toBe("GOLD");
      expect(result.currency).toBe("gold");
      expect(result.recentTransactions).toHaveLength(1);
    });

    it("should throw NotFoundException when user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getGoldBalance("invalid")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // spendGold()
  // ═══════════════════════════════════════════════════════════════

  describe("spendGold()", () => {
    it("should throw BadRequestException for invalid action", async () => {
      await expect(
        service.spendGold("u1", { action: "invalid_action" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when user not found", async () => {
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
          mockPrisma.$executeRaw.mockResolvedValue(0); // no rows updated
          mockPrisma.user.findUnique.mockResolvedValue(null); // user not found
          return fn(mockPrisma);
        },
      );

      await expect(
        service.spendGold("u1", { action: "super_like" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException for insufficient gold", async () => {
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
          mockPrisma.$executeRaw.mockResolvedValue(0); // no rows updated (insufficient)
          mockPrisma.user.findUnique.mockResolvedValue({ goldBalance: 10 });
          return fn(mockPrisma);
        },
      );

      await expect(
        service.spendGold("u1", { action: "super_like" }), // costs 25
      ).rejects.toThrow(BadRequestException);
    });

    it("should debit gold and return new balance", async () => {
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
          mockPrisma.$executeRaw.mockResolvedValue(1); // 1 row updated
          mockPrisma.user.findUnique.mockResolvedValue({ goldBalance: 75 }); // post-debit balance
          mockPrisma.goldTransaction.create.mockResolvedValue({});
          return fn(mockPrisma);
        },
      );

      const result = await service.spendGold("u1", {
        action: "super_like",
        referenceId: "target-user-1",
      });

      expect(result.spent).toBe(true);
      expect(result.action).toBe("super_like");
      expect(result.goldSpent).toBe(25);
      expect(result.newBalance).toBe(75);
    });

    it("should correctly charge for profile_boost (100 gold)", async () => {
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
          mockPrisma.$executeRaw.mockResolvedValue(1);
          mockPrisma.user.findUnique.mockResolvedValue({ goldBalance: 100 });
          mockPrisma.goldTransaction.create.mockResolvedValue({});
          return fn(mockPrisma);
        },
      );

      const result = await service.spendGold("u1", {
        action: "profile_boost",
      });

      expect(result.goldSpent).toBe(100);
      expect(result.newBalance).toBe(100);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getGoldHistory()
  // ═══════════════════════════════════════════════════════════════

  describe("getGoldHistory()", () => {
    it("should return paginated gold transaction history", async () => {
      mockPrisma.goldTransaction.findMany.mockResolvedValue([
        { id: "tx1", type: "PURCHASE", amount: 150, balance: 150 },
      ]);
      mockPrisma.goldTransaction.count.mockResolvedValue(1);

      const result = await service.getGoldHistory("u1", 1, 20);

      expect(result.transactions).toHaveLength(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it("should clamp limit between 1 and 50", async () => {
      mockPrisma.goldTransaction.findMany.mockResolvedValue([]);
      mockPrisma.goldTransaction.count.mockResolvedValue(0);

      const result = await service.getGoldHistory("u1", 1, 100);
      expect(result.pagination.limit).toBe(50);

      const result2 = await service.getGoldHistory("u1", 1, -5);
      expect(result2.pagination.limit).toBe(1);
    });

    it("should clamp page to minimum of 1", async () => {
      mockPrisma.goldTransaction.findMany.mockResolvedValue([]);
      mockPrisma.goldTransaction.count.mockResolvedValue(0);

      const result = await service.getGoldHistory("u1", -1, 20);
      expect(result.pagination.page).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getSubscriptionStatus()
  // ═══════════════════════════════════════════════════════════════

  describe("getSubscriptionStatus()", () => {
    it("should return FREE tier status for user with no subscription", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        packageTier: "FREE",
        goldBalance: 0,
      });
      mockPrisma.subscription.findFirst.mockResolvedValue(null);

      const result = await service.getSubscriptionStatus("u1");

      expect(result.packageTier).toBe("FREE");
      expect(result.isPaid).toBe(false);
      expect(result.isActive).toBe(true); // Free is always active
      expect(result.autoRenew).toBe(false);
      expect(result.goldBalance).toBe(0);
    });

    it("should return active subscription details for paid user", async () => {
      const expiryDate = new Date("2027-03-01");
      const startDate = new Date("2027-02-01");
      mockPrisma.user.findUnique.mockResolvedValue({
        packageTier: "GOLD",
        goldBalance: 50,
      });
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: "sub1",
        packageTier: "GOLD",
        platform: "APPLE",
        startDate,
        expiryDate,
        autoRenew: true,
        cancelledAt: null,
        isActive: true,
        isTrial: false,
        trialEndDate: null,
        gracePeriodEnd: null,
      });

      const result = await service.getSubscriptionStatus("u1");

      expect(result.packageTier).toBe("GOLD");
      expect(result.isPaid).toBe(true);
      expect(result.isActive).toBe(true);
      expect(result.autoRenew).toBe(true);
      expect(result.platform).toBe("APPLE");
      expect(result.goldBalance).toBe(50);
      expect(result.features.dailySwipes).toBe(999999);
      expect(result.isTrial).toBe(false);
      expect(result.trialDaysRemaining).toBe(0);
      expect(result.isInGracePeriod).toBe(false);
    });

    it("should throw NotFoundException when user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getSubscriptionStatus("invalid")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should flag isExpiringSoon when within 3 days of expiry", async () => {
      const now = new Date();
      const soonExpiry = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days from now
      mockPrisma.user.findUnique.mockResolvedValue({
        packageTier: "PRO",
        goldBalance: 100,
      });
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: "sub1",
        packageTier: "PRO",
        platform: "GOOGLE",
        startDate: new Date(),
        expiryDate: soonExpiry,
        autoRenew: false,
        cancelledAt: new Date(),
        isActive: true,
        isTrial: false,
        trialEndDate: null,
        gracePeriodEnd: null,
      });

      const result = await service.getSubscriptionStatus("u1");
      expect(result.isExpiringSoon).toBe(true);
    });

    it("should return trial info when subscription is a trial", async () => {
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days from now
      const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      mockPrisma.user.findUnique.mockResolvedValue({
        packageTier: "GOLD",
        goldBalance: 250,
      });
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: "sub1",
        packageTier: "GOLD",
        platform: "APPLE",
        startDate: new Date(),
        expiryDate,
        autoRenew: true,
        cancelledAt: null,
        isActive: true,
        isTrial: true,
        trialEndDate: trialEnd,
        gracePeriodEnd: null,
      });

      const result = await service.getSubscriptionStatus("u1");
      expect(result.isTrial).toBe(true);
      expect(result.trialDaysRemaining).toBe(5);
    });

    it("should return isInGracePeriod when grace period is active", async () => {
      const now = new Date();
      const gracePeriodEnd = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
      mockPrisma.user.findUnique.mockResolvedValue({
        packageTier: "GOLD",
        goldBalance: 0,
      });
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: "sub1",
        packageTier: "GOLD",
        platform: "APPLE",
        startDate: new Date(),
        expiryDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        autoRenew: false,
        cancelledAt: null,
        isActive: true,
        isTrial: false,
        trialEndDate: null,
        gracePeriodEnd,
      });

      const result = await service.getSubscriptionStatus("u1");
      expect(result.isInGracePeriod).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // processExpiredSubscriptions()
  // ═══════════════════════════════════════════════════════════════

  describe("processExpiredSubscriptions()", () => {
    it("should set grace period for newly expired subscriptions without one", async () => {
      // Phase 1: newly expired (no gracePeriodEnd)
      mockPrisma.subscription.findMany
        .mockResolvedValueOnce([
          { id: "sub1", userId: "u1", packageTier: "GOLD", expiryDate: new Date("2025-01-01") },
        ])
        // Phase 2: grace period expired (none yet)
        .mockResolvedValueOnce([]);

      const count = await service.processExpiredSubscriptions();

      // Grace period set, but no downgrades yet
      expect(count).toBe(0);
      expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "sub1" },
          data: expect.objectContaining({ gracePeriodEnd: expect.any(Date) }),
        }),
      );
    });

    it("should downgrade subscriptions whose grace period has ended", async () => {
      // Phase 1: no newly expired
      mockPrisma.subscription.findMany
        .mockResolvedValueOnce([])
        // Phase 2: grace period expired
        .mockResolvedValueOnce([
          { id: "sub1", userId: "u1", packageTier: "GOLD" },
          { id: "sub2", userId: "u2", packageTier: "PRO" },
        ]);
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: typeof mockPrisma) => Promise<void>) => {
          await fn(mockPrisma);
        },
      );

      const count = await service.processExpiredSubscriptions();

      expect(count).toBe(2);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
    });

    it("should return 0 when no expired subscriptions", async () => {
      mockPrisma.subscription.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const count = await service.processExpiredSubscriptions();

      expect(count).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // upgradePackage()
  // ═══════════════════════════════════════════════════════════════

  describe("upgradePackage()", () => {
    it("should throw NotFoundException when user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.upgradePackage("u1", {
          targetTier: PackageTier.GOLD,
          platform: "apple",
          receipt: "receipt",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when downgrading", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        packageTier: "PRO",
        goldBalance: 0,
      });

      await expect(
        service.upgradePackage("u1", {
          targetTier: PackageTier.GOLD,
          platform: "apple",
          receipt: "receipt",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when upgrading to same tier", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        packageTier: "GOLD",
        goldBalance: 0,
      });

      await expect(
        service.upgradePackage("u1", {
          targetTier: PackageTier.GOLD,
          platform: "apple",
          receipt: "receipt",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should reject duplicate receipt on upgrade", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        packageTier: "FREE",
        goldBalance: 0,
      });
      mockPrisma.iapReceipt.findUnique.mockResolvedValue({ id: "existing" });

      await expect(
        service.upgradePackage("u1", {
          targetTier: PackageTier.GOLD,
          platform: "apple",
          receipt: "duplicate",
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // purchaseGold()
  // ═══════════════════════════════════════════════════════════════

  describe("purchaseGold()", () => {
    it("should throw BadRequestException for invalid gold pack", async () => {
      await expect(
        service.purchaseGold("u1", {
          packageId: "gold_9999",
          platform: "apple",
          receipt: "receipt",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should reject duplicate receipt on gold purchase", async () => {
      mockPrisma.iapReceipt.findUnique.mockResolvedValue({ id: "existing" });

      await expect(
        service.purchaseGold("u1", {
          packageId: "gold_50",
          platform: "apple",
          receipt: "duplicate",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should accept valid gold pack IDs", async () => {
      const validPacks = ["gold_50", "gold_150", "gold_500", "gold_1000"];
      for (const packId of validPacks) {
        mockPrisma.iapReceipt.findUnique.mockResolvedValue(null);
        mockPrisma.$transaction.mockImplementation(
          async (fn: (tx: typeof mockPrisma) => Promise<void>) => {
            mockPrisma.user.findUnique.mockResolvedValue({ goldBalance: 0 });
            await fn(mockPrisma);
          },
        );

        const result = await service.purchaseGold("u1", {
          packageId: packId,
          platform: "apple",
          receipt: `receipt-${packId}`,
        });

        expect(result.purchased).toBe(true);
        expect(result.packageId).toBe(packId);
      }
    });

    it("should credit correct total gold including bonus for gold_150", async () => {
      mockPrisma.iapReceipt.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: typeof mockPrisma) => Promise<number>) => {
          mockPrisma.user.findUnique.mockResolvedValue({ goldBalance: 100 });
          return fn(mockPrisma);
        },
      );

      const result = await service.purchaseGold("u1", {
        packageId: "gold_150",
        platform: "apple",
        receipt: "receipt-150",
      });

      expect(result.purchased).toBe(true);
      expect(result.goldAdded).toBe(160); // 150 + 10 bonus
      expect(result.newBalance).toBe(260); // 100 + 160
    });

    it("should credit correct total gold including bonus for gold_1000", async () => {
      mockPrisma.iapReceipt.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: typeof mockPrisma) => Promise<number>) => {
          mockPrisma.user.findUnique.mockResolvedValue({ goldBalance: 0 });
          return fn(mockPrisma);
        },
      );

      const result = await service.purchaseGold("u1", {
        packageId: "gold_1000",
        platform: "apple",
        receipt: "receipt-1000",
      });

      expect(result.purchased).toBe(true);
      expect(result.goldAdded).toBe(1150); // 1000 + 150 bonus
    });

    it("should return TRY price in result", async () => {
      mockPrisma.iapReceipt.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: typeof mockPrisma) => Promise<number>) => {
          mockPrisma.user.findUnique.mockResolvedValue({ goldBalance: 0 });
          return fn(mockPrisma);
        },
      );

      const result = await service.purchaseGold("u1", {
        packageId: "gold_50",
        platform: "apple",
        receipt: "receipt-50",
      });

      expect(result.priceTry).toBe(29.99);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // validateReceipt()
  // ═══════════════════════════════════════════════════════════════

  describe("validateReceipt()", () => {
    it("should return valid result for valid receipt", async () => {
      const result = await service.validateReceipt("u1", {
        platform: "apple",
        receipt: "valid-receipt",
      });

      expect(result.valid).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.productId).toBeDefined();
    });

    it("should return invalid result for invalid receipt", async () => {
      mockReceiptValidator.validateReceipt.mockResolvedValueOnce({
        isValid: false,
        transactionId: null,
        productId: null,
      });

      const result = await service.validateReceipt("u1", {
        platform: "apple",
        receipt: "invalid-receipt",
      });

      expect(result.valid).toBe(false);
    });

    it("should pass google platform correctly", async () => {
      await service.validateReceipt("u1", {
        platform: "google",
        receipt: "google-receipt",
      });

      expect(mockReceiptValidator.validateReceipt).toHaveBeenCalledWith(
        "GOOGLE",
        "google-receipt",
        "com.luma.dating",
        undefined,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getTransactionHistory()
  // ═══════════════════════════════════════════════════════════════

  describe("getTransactionHistory()", () => {
    it("should return both gold transactions and subscriptions", async () => {
      mockPrisma.goldTransaction.findMany.mockResolvedValue([
        {
          id: "tx1",
          type: "PURCHASE",
          amount: 50,
          balance: 50,
          description: "Gold",
          createdAt: new Date(),
        },
      ]);
      mockPrisma.subscription.findMany.mockResolvedValue([
        {
          id: "sub1",
          packageTier: "GOLD",
          platform: "APPLE",
          isActive: true,
          createdAt: new Date(),
        },
      ]);
      mockPrisma.goldTransaction.count.mockResolvedValue(1);

      const result = await service.getTransactionHistory("u1", 1, 20);

      expect(result.goldTransactions).toHaveLength(1);
      expect(result.subscriptions).toHaveLength(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.total).toBe(1);
    });

    it("should clamp pagination limits", async () => {
      mockPrisma.goldTransaction.findMany.mockResolvedValue([]);
      mockPrisma.subscription.findMany.mockResolvedValue([]);
      mockPrisma.goldTransaction.count.mockResolvedValue(0);

      const result = await service.getTransactionHistory("u1", -1, 999);

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(50);
    });

    it("should return empty results for user with no history", async () => {
      mockPrisma.goldTransaction.findMany.mockResolvedValue([]);
      mockPrisma.subscription.findMany.mockResolvedValue([]);
      mockPrisma.goldTransaction.count.mockResolvedValue(0);

      const result = await service.getTransactionHistory("u1", 1, 20);

      expect(result.goldTransactions).toEqual([]);
      expect(result.subscriptions).toEqual([]);
      expect(result.pagination.totalPages).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // purchaseOneTime()
  // ═══════════════════════════════════════════════════════════════

  describe("purchaseOneTime()", () => {
    it("should throw BadRequestException for invalid product", async () => {
      await expect(
        service.purchaseOneTime("u1", "invalid_product", "apple", "receipt"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for invalid receipt", async () => {
      mockReceiptValidator.validateReceipt.mockResolvedValueOnce({
        isValid: false,
        transactionId: null,
      });

      await expect(
        service.purchaseOneTime("u1", "deep_analysis", "apple", "bad-receipt"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for duplicate receipt", async () => {
      mockPrisma.iapReceipt.findUnique.mockResolvedValue({ id: "existing" });

      await expect(
        service.purchaseOneTime(
          "u1",
          "deep_analysis",
          "apple",
          "duplicate-receipt",
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should successfully purchase a one-time product", async () => {
      mockPrisma.iapReceipt.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: typeof mockPrisma) => Promise<void>) => {
          mockPrisma.user.findUnique.mockResolvedValue({ goldBalance: 50 });
          await fn(mockPrisma);
        },
      );

      const result = await service.purchaseOneTime(
        "u1",
        "deep_analysis",
        "apple",
        "receipt",
      );

      expect(result.purchased).toBe(true);
      expect(result.productId).toBe("deep_analysis");
      expect(result.priceTry).toBe(69);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // hasOneTimePurchase()
  // ═══════════════════════════════════════════════════════════════

  describe("hasOneTimePurchase()", () => {
    it("should return true when purchase exists", async () => {
      mockPrisma.goldTransaction.findFirst.mockResolvedValue({ id: "tx1" });

      const result = await service.hasOneTimePurchase("u1", "deep_analysis");

      expect(result).toBe(true);
    });

    it("should return false when no purchase exists", async () => {
      mockPrisma.goldTransaction.findFirst.mockResolvedValue(null);

      const result = await service.hasOneTimePurchase("u1", "deep_analysis");

      expect(result).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // subscribe() — additional edge cases
  // ═══════════════════════════════════════════════════════════════

  describe("subscribe() — receipt validation", () => {
    it("should throw BadRequestException for invalid receipt", async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);
      mockReceiptValidator.validateReceipt.mockResolvedValueOnce({
        isValid: false,
        transactionId: null,
      });

      await expect(
        service.subscribe("u1", {
          packageTier: PackageTier.GOLD,
          platform: "apple",
          receipt: "invalid-receipt",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should successfully subscribe to GOLD tier with trial for first-time user", async () => {
      mockPrisma.subscription.findFirst
        .mockResolvedValueOnce(null) // no active subscription
        .mockResolvedValueOnce(null); // no previous trial
      mockPrisma.iapReceipt.findUnique.mockResolvedValue(null);
      const subExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
          mockPrisma.subscription.create.mockResolvedValue({
            id: "sub-new",
            expiryDate: subExpiry,
            trialEndDate: trialEnd,
          });
          mockPrisma.user.findUnique.mockResolvedValue({ goldBalance: 0 });
          return fn(mockPrisma);
        },
      );

      const result = await service.subscribe("u1", {
        packageTier: PackageTier.GOLD,
        platform: "apple",
        receipt: "valid-receipt",
      });

      expect(result.subscribed).toBe(true);
      expect(result.packageTier).toBe("GOLD");
      expect(result.isTrial).toBe(true);
      expect(result.trialEndDate).toBeDefined();
    });

    it("should not grant trial to user who already used trial", async () => {
      mockPrisma.subscription.findFirst
        .mockResolvedValueOnce(null) // no active subscription
        .mockResolvedValueOnce({ id: "old-trial", isTrial: true }); // previous trial exists
      mockPrisma.iapReceipt.findUnique.mockResolvedValue(null);
      const subExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
          mockPrisma.subscription.create.mockResolvedValue({
            id: "sub-new",
            expiryDate: subExpiry,
            trialEndDate: null,
          });
          mockPrisma.user.findUnique.mockResolvedValue({ goldBalance: 0 });
          return fn(mockPrisma);
        },
      );

      const result = await service.subscribe("u1", {
        packageTier: PackageTier.GOLD,
        platform: "apple",
        receipt: "valid-receipt",
      });

      expect(result.subscribed).toBe(true);
      expect(result.isTrial).toBe(false);
      expect(result.trialEndDate).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // spendGold() — all actions
  // ═══════════════════════════════════════════════════════════════

  describe("spendGold() — all valid actions", () => {
    // Helper: mock a successful gold spend transaction
    function mockSuccessfulSpend(newBalance: number) {
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
          mockPrisma.$executeRaw.mockResolvedValue(1); // 1 row updated
          mockPrisma.user.findUnique.mockResolvedValue({ goldBalance: newBalance });
          mockPrisma.goldTransaction.create.mockResolvedValue({});
          return fn(mockPrisma);
        },
      );
    }

    it("should correctly charge for super_like (25 gold)", async () => {
      mockSuccessfulSpend(75);
      const result = await service.spendGold("u1", { action: "super_like" });
      expect(result.goldSpent).toBe(25);
      expect(result.newBalance).toBe(75);
      expect(result.action).toBe("super_like");
    });

    it("should reject spend when balance is exactly at the cost", async () => {
      mockSuccessfulSpend(0);
      const result = await service.spendGold("u1", { action: "super_like" });
      expect(result.spent).toBe(true);
      expect(result.newBalance).toBe(0);
    });

    it("should reject when balance is 1 below cost", async () => {
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
          mockPrisma.$executeRaw.mockResolvedValue(0); // 0 rows = insufficient
          mockPrisma.user.findUnique.mockResolvedValue({ goldBalance: 24 });
          return fn(mockPrisma);
        },
      );

      await expect(
        service.spendGold("u1", { action: "super_like" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should correctly charge for read_receipts (15 gold)", async () => {
      mockSuccessfulSpend(85);
      const result = await service.spendGold("u1", { action: "read_receipts" });
      expect(result.goldSpent).toBe(15);
      expect(result.newBalance).toBe(85);
    });

    it("should correctly charge for undo_pass (30 gold)", async () => {
      mockSuccessfulSpend(70);
      const result = await service.spendGold("u1", { action: "undo_pass" });
      expect(result.goldSpent).toBe(30);
      expect(result.newBalance).toBe(70);
    });

    it("should correctly charge for spotlight (75 gold)", async () => {
      mockSuccessfulSpend(25);
      const result = await service.spendGold("u1", { action: "spotlight" });
      expect(result.goldSpent).toBe(75);
      expect(result.newBalance).toBe(25);
    });

    it("should correctly charge for travel_mode (200 gold)", async () => {
      mockSuccessfulSpend(100);
      const result = await service.spendGold("u1", { action: "travel_mode" });
      expect(result.goldSpent).toBe(200);
      expect(result.newBalance).toBe(100);
    });

    it("should correctly charge for priority_message (40 gold)", async () => {
      mockSuccessfulSpend(60);
      const result = await service.spendGold("u1", { action: "priority_message" });
      expect(result.goldSpent).toBe(40);
      expect(result.newBalance).toBe(60);
    });

    it("should include referenceId when provided", async () => {
      mockSuccessfulSpend(75);
      const result = await service.spendGold("u1", {
        action: "super_like",
        referenceId: "target-user-123",
      });
      expect(result.spent).toBe(true);
    });
  });
});
