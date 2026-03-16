import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { PackageTier } from "./dto/subscribe.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

describe("PaymentsController", () => {
  let controller: PaymentsController;

  const mockPaymentsService = {
    getPackages: jest.fn(),
    subscribe: jest.fn(),
    cancelSubscription: jest.fn(),
    validateReceipt: jest.fn(),
    upgradePackage: jest.fn(),
    getGoldBalance: jest.fn(),
    purchaseGold: jest.fn(),
    getGoldHistory: jest.fn(),
    spendGold: jest.fn(),
    getTransactionHistory: jest.fn(),
    getSubscriptionStatus: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: mockPaymentsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /payments/packages
  // ═══════════════════════════════════════════════════════════════

  describe("getPackages()", () => {
    it("should return all 4 subscription packages and gold packs", async () => {
      const expected = {
        packages: [
          {
            tier: "FREE",
            name: "Free",
            nameTr: "Ucretsiz",
            monthlyPriceTry: 0,
          },
          {
            tier: "GOLD",
            name: "Gold",
            nameTr: "Gold",
            monthlyPriceTry: 149.99,
          },
          { tier: "PRO", name: "Pro", nameTr: "Pro", monthlyPriceTry: 299.99 },
          {
            tier: "RESERVED",
            name: "Reserved",
            nameTr: "Reserved",
            monthlyPriceTry: 999.99,
          },
        ],
        goldPacks: [
          { id: "gold_50", amount: 50, totalGold: 50 },
          { id: "gold_150", amount: 150, totalGold: 160 },
        ],
      };
      mockPaymentsService.getPackages.mockResolvedValue(expected);

      const result = await controller.getPackages();

      expect(result.packages).toHaveLength(4);
      expect(result.goldPacks).toBeDefined();
    });

    it("should not require authentication (public endpoint)", async () => {
      mockPaymentsService.getPackages.mockResolvedValue({
        packages: [],
        goldPacks: [],
      });

      // getPackages() takes no userId parameter — it's a public endpoint
      const result = await controller.getPackages();

      expect(result).toBeDefined();
      expect(mockPaymentsService.getPackages).toHaveBeenCalledWith();
    });

    it("should delegate to paymentsService.getPackages", async () => {
      mockPaymentsService.getPackages.mockResolvedValue({
        packages: [],
        goldPacks: [],
      });

      await controller.getPackages();

      expect(mockPaymentsService.getPackages).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /payments/subscribe
  // ═══════════════════════════════════════════════════════════════

  describe("subscribe()", () => {
    const userId = "user-uuid-1";
    const dto = {
      packageTier: PackageTier.GOLD,
      platform: "apple",
      receipt: "mock-receipt-data",
    };

    it("should subscribe to a package successfully", async () => {
      const expected = {
        subscribed: true,
        subscriptionId: "sub-1",
        packageTier: "gold",
        expiresAt: new Date("2026-03-23"),
      };
      mockPaymentsService.subscribe.mockResolvedValue(expected);

      const result = await controller.subscribe(userId, dto);

      expect(result.subscribed).toBe(true);
      expect(result.packageTier).toBe("gold");
      expect(result.subscriptionId).toBe("sub-1");
    });

    it("should throw BadRequestException for free tier subscription", async () => {
      const freeDto = {
        packageTier: PackageTier.FREE,
        platform: "apple",
        receipt: "receipt",
      };
      mockPaymentsService.subscribe.mockRejectedValue(
        new BadRequestException("Ucretsiz pakete abone olunamaz"),
      );

      await expect(controller.subscribe(userId, freeDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when user already has active subscription", async () => {
      mockPaymentsService.subscribe.mockRejectedValue(
        new BadRequestException("Zaten aktif bir aboneliginiz var"),
      );

      await expect(controller.subscribe(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should delegate to paymentsService.subscribe with userId and dto", async () => {
      mockPaymentsService.subscribe.mockResolvedValue({ subscribed: true });

      await controller.subscribe(userId, dto);

      expect(mockPaymentsService.subscribe).toHaveBeenCalledWith(userId, dto);
      expect(mockPaymentsService.subscribe).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /payments/gold/purchase
  // ═══════════════════════════════════════════════════════════════

  describe("purchaseGold()", () => {
    const userId = "user-uuid-1";
    const dto = {
      packageId: "gold_150",
      platform: "google",
      receipt: "mock-receipt",
    };

    it("should purchase gold pack successfully", async () => {
      const expected = {
        purchased: true,
        goldAdded: 160, // 150 + 10 bonus
        newBalance: 310,
        packageId: "gold_150",
        priceTry: 79.99,
      };
      mockPaymentsService.purchaseGold.mockResolvedValue(expected);

      const result = await controller.purchaseGold(userId, dto);

      expect(result.purchased).toBe(true);
      expect(result.goldAdded).toBe(160);
      expect(result.newBalance).toBe(310);
      expect(result.priceTry).toBe(79.99);
    });

    it("should throw BadRequestException for invalid gold pack", async () => {
      const badDto = {
        packageId: "gold_9999",
        platform: "apple",
        receipt: "receipt",
      };
      mockPaymentsService.purchaseGold.mockRejectedValue(
        new BadRequestException("Gecersiz Gold paketi"),
      );

      await expect(controller.purchaseGold(userId, badDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException for invalid receipt", async () => {
      mockPaymentsService.purchaseGold.mockRejectedValue(
        new BadRequestException("Odeme makbuzu dogrulanamadi"),
      );

      await expect(controller.purchaseGold(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should delegate to paymentsService.purchaseGold with userId and dto", async () => {
      mockPaymentsService.purchaseGold.mockResolvedValue({ purchased: true });

      await controller.purchaseGold(userId, dto);

      expect(mockPaymentsService.purchaseGold).toHaveBeenCalledWith(
        userId,
        dto,
      );
      expect(mockPaymentsService.purchaseGold).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // POST /payments/gold/spend
  // ═══════════════════════════════════════════════════════════════

  describe("spendGold()", () => {
    const userId = "user-uuid-1";
    const dto = { action: "super_like", referenceId: "target-user-1" };

    it("should spend gold on an action successfully", async () => {
      const expected = {
        spent: true,
        action: "super_like",
        goldSpent: 25,
        newBalance: 475,
      };
      mockPaymentsService.spendGold.mockResolvedValue(expected);

      const result = await controller.spendGold(userId, dto);

      expect(result.spent).toBe(true);
      expect(result.action).toBe("super_like");
      expect(result.goldSpent).toBe(25);
      expect(result.newBalance).toBe(475);
    });

    it("should throw BadRequestException for invalid action", async () => {
      const badDto = { action: "invalid_action" };
      mockPaymentsService.spendGold.mockRejectedValue(
        new BadRequestException("Gecersiz islem"),
      );

      await expect(controller.spendGold(userId, badDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException for insufficient gold", async () => {
      mockPaymentsService.spendGold.mockRejectedValue(
        new BadRequestException("Yetersiz Gold bakiye"),
      );

      await expect(controller.spendGold(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should delegate to paymentsService.spendGold with userId and dto", async () => {
      mockPaymentsService.spendGold.mockResolvedValue({ spent: true });

      await controller.spendGold(userId, dto);

      expect(mockPaymentsService.spendGold).toHaveBeenCalledWith(userId, dto);
      expect(mockPaymentsService.spendGold).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /payments/gold/balance
  // ═══════════════════════════════════════════════════════════════

  describe("getGoldBalance()", () => {
    const userId = "user-uuid-1";

    it("should return gold balance and recent transactions", async () => {
      const expected = {
        balance: 500,
        packageTier: "GOLD",
        currency: "gold",
        recentTransactions: [
          { id: "tx-1", type: "PURCHASE", amount: 150, balance: 500 },
        ],
      };
      mockPaymentsService.getGoldBalance.mockResolvedValue(expected);

      const result = await controller.getGoldBalance(userId);

      expect(result.balance).toBe(500);
      expect(result.packageTier).toBe("GOLD");
      expect(result.currency).toBe("gold");
      expect(result.recentTransactions).toHaveLength(1);
    });

    it("should throw NotFoundException when user does not exist", async () => {
      mockPaymentsService.getGoldBalance.mockRejectedValue(
        new NotFoundException("Kullanici bulunamadi"),
      );

      await expect(controller.getGoldBalance(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should delegate to paymentsService.getGoldBalance with userId", async () => {
      mockPaymentsService.getGoldBalance.mockResolvedValue({ balance: 0 });

      await controller.getGoldBalance(userId);

      expect(mockPaymentsService.getGoldBalance).toHaveBeenCalledWith(userId);
      expect(mockPaymentsService.getGoldBalance).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DELETE /payments/subscribe (cancelSubscription)
  // ═══════════════════════════════════════════════════════════════

  describe("cancelSubscription()", () => {
    const userId = "user-uuid-1";

    it("should cancel subscription successfully", async () => {
      const expected = {
        cancelled: true,
        accessUntil: new Date("2026-03-23"),
        message: "Aboneliginiz iptal edildi.",
      };
      mockPaymentsService.cancelSubscription.mockResolvedValue(expected);

      const result = await controller.cancelSubscription(userId);

      expect(result.cancelled).toBe(true);
      expect(result.accessUntil).toBeDefined();
    });

    it("should throw NotFoundException when no active subscription", async () => {
      mockPaymentsService.cancelSubscription.mockRejectedValue(
        new NotFoundException("Aktif abonelik bulunamadi"),
      );

      await expect(controller.cancelSubscription(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should delegate to paymentsService.cancelSubscription with userId", async () => {
      mockPaymentsService.cancelSubscription.mockResolvedValue({
        cancelled: true,
      });

      await controller.cancelSubscription(userId);

      expect(mockPaymentsService.cancelSubscription).toHaveBeenCalledWith(
        userId,
      );
      expect(mockPaymentsService.cancelSubscription).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /payments/gold/history
  // ═══════════════════════════════════════════════════════════════

  describe("getGoldHistory()", () => {
    const userId = "user-uuid-1";

    it("should return paginated gold history", async () => {
      const expected = {
        transactions: [
          { id: "tx-1", type: "PURCHASE", amount: 150 },
          { id: "tx-2", type: "SUPER_LIKE", amount: -25 },
        ],
        pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
      };
      mockPaymentsService.getGoldHistory.mockResolvedValue(expected);

      const result = await controller.getGoldHistory(userId);

      expect(result.transactions).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
    });

    it("should parse string page and limit query params", async () => {
      mockPaymentsService.getGoldHistory.mockResolvedValue({
        transactions: [],
        pagination: { page: 2, limit: 10, total: 0, totalPages: 0 },
      });

      await controller.getGoldHistory(userId, "2", "10");

      expect(mockPaymentsService.getGoldHistory).toHaveBeenCalledWith(
        userId,
        2,
        10,
      );
    });

    it("should default to page 1 and limit 20 when not provided", async () => {
      mockPaymentsService.getGoldHistory.mockResolvedValue({
        transactions: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });

      await controller.getGoldHistory(userId);

      expect(mockPaymentsService.getGoldHistory).toHaveBeenCalledWith(
        userId,
        1,
        20,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GET /payments/status (getSubscriptionStatus)
  // ═══════════════════════════════════════════════════════════════

  describe("getSubscriptionStatus()", () => {
    const userId = "user-uuid-1";

    it("should return subscription status with features", async () => {
      const expected = {
        packageTier: "GOLD",
        packageName: "Gold",
        isPaid: true,
        isActive: true,
        autoRenew: true,
        goldBalance: 50,
        features: { dailySwipes: 60 },
      };
      mockPaymentsService.getSubscriptionStatus.mockResolvedValue(expected);

      const result = await controller.getSubscriptionStatus(userId);

      expect(result.packageTier).toBe("GOLD");
      expect(result.isPaid).toBe(true);
      expect(result.goldBalance).toBe(50);
    });

    it("should delegate to paymentsService.getSubscriptionStatus with userId", async () => {
      mockPaymentsService.getSubscriptionStatus.mockResolvedValue({
        packageTier: "FREE",
      });

      await controller.getSubscriptionStatus(userId);

      expect(mockPaymentsService.getSubscriptionStatus).toHaveBeenCalledWith(
        userId,
      );
      expect(mockPaymentsService.getSubscriptionStatus).toHaveBeenCalledTimes(
        1,
      );
    });

    it("should throw NotFoundException for non-existent user", async () => {
      mockPaymentsService.getSubscriptionStatus.mockRejectedValue(
        new NotFoundException("Kullanici bulunamadi"),
      );

      await expect(controller.getSubscriptionStatus(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
