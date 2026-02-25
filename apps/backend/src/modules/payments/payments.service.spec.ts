import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadgesService } from '../badges/badges.service';
import { PackageTier } from './dto/subscribe.dto';

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
    findMany: jest.fn(),
    count: jest.fn(),
  },
  iapReceipt: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockBadgesService = {
  checkAndAwardBadges: jest.fn().mockResolvedValue(undefined),
};

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BadgesService, useValue: mockBadgesService },
      ],
    }).compile();
    service = module.get<PaymentsService>(PaymentsService);
  });

  // ═══════════════════════════════════════════════════════════════
  // getPackages()
  // ═══════════════════════════════════════════════════════════════

  describe('getPackages()', () => {
    it('should return all 4 packages and gold packs', async () => {
      const result = await service.getPackages();

      expect(result.packages).toHaveLength(4);
      expect(result.goldPacks).toHaveLength(4);
      const tiers = result.packages.map((p) => p.tier);
      expect(tiers).toEqual(
        expect.arrayContaining(['FREE', 'GOLD', 'PRO', 'RESERVED']),
      );
    });

    it('should include feature details for each package', async () => {
      const result = await service.getPackages();

      const freePkg = result.packages.find((p) => p.tier === 'FREE');
      expect(freePkg?.features.dailySwipes).toBe(20);

      const goldPkg = result.packages.find((p) => p.tier === 'GOLD');
      expect(goldPkg?.features.dailySwipes).toBe(60);
      expect(goldPkg?.features.seeWhoLikesYou).toBe(true);
    });

    it('should include gold packs with amounts and prices', async () => {
      const result = await service.getPackages();

      const pack50 = result.goldPacks.find((p) => p.id === 'gold_50');
      expect(pack50?.amount).toBe(50);
      expect(pack50?.priceUsd).toBeGreaterThan(0);
    });

    it('should include totalGold (amount + bonus) for each gold pack', async () => {
      const result = await service.getPackages();

      const pack150 = result.goldPacks.find((p) => p.id === 'gold_150');
      expect(pack150?.totalGold).toBe(160); // 150 + 10 bonus

      const pack50 = result.goldPacks.find((p) => p.id === 'gold_50');
      expect(pack50?.totalGold).toBe(50); // 50 + 0 bonus
    });

    it('should have consistent feature gating across tiers', async () => {
      const result = await service.getPackages();

      const free = result.packages.find((p) => p.tier === 'FREE');
      const gold = result.packages.find((p) => p.tier === 'GOLD');
      const pro = result.packages.find((p) => p.tier === 'PRO');
      const reserved = result.packages.find((p) => p.tier === 'RESERVED');

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
      expect(reserved?.features.monthlyGold).toBe(500);
      expect(reserved?.features.harmonyMinutes).toBe(60);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // subscribe()
  // ═══════════════════════════════════════════════════════════════

  describe('subscribe()', () => {
    it('should throw BadRequestException for FREE tier', async () => {
      await expect(
        service.subscribe('u1', {
          packageTier: PackageTier.FREE,
          platform: 'ios',
          receipt: 'mock-receipt',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when already subscribed', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: 'sub1',
        isActive: true,
      });

      await expect(
        service.subscribe('u1', {
          packageTier: PackageTier.GOLD,
          platform: 'ios',
          receipt: 'mock-receipt',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate receipt (replay protection)', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);
      // Receipt already exists
      mockPrisma.iapReceipt.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.subscribe('u1', {
          packageTier: PackageTier.GOLD,
          platform: 'ios',
          receipt: 'duplicate-receipt',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // cancelSubscription()
  // ═══════════════════════════════════════════════════════════════

  describe('cancelSubscription()', () => {
    it('should throw NotFoundException when no active subscription', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);

      await expect(service.cancelSubscription('u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should cancel subscription and return access until date', async () => {
      const expiryDate = new Date('2027-01-01');
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: 'sub1',
        isActive: true,
        expiryDate,
      });
      mockPrisma.subscription.update.mockResolvedValue({});

      const result = await service.cancelSubscription('u1');

      expect(result.cancelled).toBe(true);
      expect(result.accessUntil).toEqual(expiryDate);
      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub1' },
        data: expect.objectContaining({
          autoRenew: false,
        }),
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getGoldBalance()
  // ═══════════════════════════════════════════════════════════════

  describe('getGoldBalance()', () => {
    it('should return gold balance and recent transactions', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        goldBalance: 250,
        packageTier: 'GOLD',
      });
      mockPrisma.goldTransaction.findMany.mockResolvedValue([
        { id: 'tx1', type: 'PURCHASE', amount: 150, balance: 250, description: 'Gold satin alma', createdAt: new Date() },
      ]);

      const result = await service.getGoldBalance('u1');

      expect(result.balance).toBe(250);
      expect(result.packageTier).toBe('GOLD');
      expect(result.currency).toBe('gold');
      expect(result.recentTransactions).toHaveLength(1);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getGoldBalance('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // spendGold()
  // ═══════════════════════════════════════════════════════════════

  describe('spendGold()', () => {
    it('should throw BadRequestException for invalid action', async () => {
      await expect(
        service.spendGold('u1', { action: 'invalid_action' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.spendGold('u1', { action: 'super_like' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for insufficient gold', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ goldBalance: 10 });

      await expect(
        service.spendGold('u1', { action: 'super_like' }), // costs 25
      ).rejects.toThrow(BadRequestException);
    });

    it('should debit gold and return new balance', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ goldBalance: 100 });
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<void>) => {
        await fn(mockPrisma);
      });

      const result = await service.spendGold('u1', {
        action: 'super_like',
        referenceId: 'target-user-1',
      });

      expect(result.spent).toBe(true);
      expect(result.action).toBe('super_like');
      expect(result.goldSpent).toBe(25);
      expect(result.newBalance).toBe(75);
    });

    it('should correctly charge for harmony_extension (50 gold)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ goldBalance: 200 });
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<void>) => {
        await fn(mockPrisma);
      });

      const result = await service.spendGold('u1', {
        action: 'harmony_extension',
      });

      expect(result.goldSpent).toBe(50);
      expect(result.newBalance).toBe(150);
    });

    it('should correctly charge for profile_boost (100 gold)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ goldBalance: 200 });
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<void>) => {
        await fn(mockPrisma);
      });

      const result = await service.spendGold('u1', {
        action: 'profile_boost',
      });

      expect(result.goldSpent).toBe(100);
      expect(result.newBalance).toBe(100);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getGoldHistory()
  // ═══════════════════════════════════════════════════════════════

  describe('getGoldHistory()', () => {
    it('should return paginated gold transaction history', async () => {
      mockPrisma.goldTransaction.findMany.mockResolvedValue([
        { id: 'tx1', type: 'PURCHASE', amount: 150, balance: 150 },
      ]);
      mockPrisma.goldTransaction.count.mockResolvedValue(1);

      const result = await service.getGoldHistory('u1', 1, 20);

      expect(result.transactions).toHaveLength(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should clamp limit between 1 and 50', async () => {
      mockPrisma.goldTransaction.findMany.mockResolvedValue([]);
      mockPrisma.goldTransaction.count.mockResolvedValue(0);

      const result = await service.getGoldHistory('u1', 1, 100);
      expect(result.pagination.limit).toBe(50);

      const result2 = await service.getGoldHistory('u1', 1, -5);
      expect(result2.pagination.limit).toBe(1);
    });

    it('should clamp page to minimum of 1', async () => {
      mockPrisma.goldTransaction.findMany.mockResolvedValue([]);
      mockPrisma.goldTransaction.count.mockResolvedValue(0);

      const result = await service.getGoldHistory('u1', -1, 20);
      expect(result.pagination.page).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getSubscriptionStatus()
  // ═══════════════════════════════════════════════════════════════

  describe('getSubscriptionStatus()', () => {
    it('should return FREE tier status for user with no subscription', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        packageTier: 'FREE',
        goldBalance: 0,
      });
      mockPrisma.subscription.findFirst.mockResolvedValue(null);

      const result = await service.getSubscriptionStatus('u1');

      expect(result.packageTier).toBe('FREE');
      expect(result.isPaid).toBe(false);
      expect(result.isActive).toBe(true); // Free is always active
      expect(result.autoRenew).toBe(false);
      expect(result.goldBalance).toBe(0);
    });

    it('should return active subscription details for paid user', async () => {
      const expiryDate = new Date('2027-03-01');
      const startDate = new Date('2027-02-01');
      mockPrisma.user.findUnique.mockResolvedValue({
        packageTier: 'GOLD',
        goldBalance: 50,
      });
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: 'sub1',
        packageTier: 'GOLD',
        platform: 'APPLE',
        startDate,
        expiryDate,
        autoRenew: true,
        cancelledAt: null,
        isActive: true,
      });

      const result = await service.getSubscriptionStatus('u1');

      expect(result.packageTier).toBe('GOLD');
      expect(result.isPaid).toBe(true);
      expect(result.isActive).toBe(true);
      expect(result.autoRenew).toBe(true);
      expect(result.platform).toBe('APPLE');
      expect(result.goldBalance).toBe(50);
      expect(result.features.dailySwipes).toBe(60);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getSubscriptionStatus('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should flag isExpiringSoon when within 3 days of expiry', async () => {
      const now = new Date();
      const soonExpiry = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days from now
      mockPrisma.user.findUnique.mockResolvedValue({
        packageTier: 'PRO',
        goldBalance: 100,
      });
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: 'sub1',
        packageTier: 'PRO',
        platform: 'GOOGLE',
        startDate: new Date(),
        expiryDate: soonExpiry,
        autoRenew: false,
        cancelledAt: new Date(),
        isActive: true,
      });

      const result = await service.getSubscriptionStatus('u1');
      expect(result.isExpiringSoon).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // processExpiredSubscriptions()
  // ═══════════════════════════════════════════════════════════════

  describe('processExpiredSubscriptions()', () => {
    it('should downgrade expired non-renewing subscriptions', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([
        { id: 'sub1', userId: 'u1', packageTier: 'GOLD' },
        { id: 'sub2', userId: 'u2', packageTier: 'PRO' },
      ]);
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<void>) => {
        await fn(mockPrisma);
      });

      const count = await service.processExpiredSubscriptions();

      expect(count).toBe(2);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
    });

    it('should return 0 when no expired subscriptions', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([]);

      const count = await service.processExpiredSubscriptions();

      expect(count).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // upgradePackage()
  // ═══════════════════════════════════════════════════════════════

  describe('upgradePackage()', () => {
    it('should throw NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.upgradePackage('u1', {
          targetTier: PackageTier.GOLD,
          platform: 'ios',
          receipt: 'receipt',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when downgrading', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        packageTier: 'PRO',
        goldBalance: 0,
      });

      await expect(
        service.upgradePackage('u1', {
          targetTier: PackageTier.GOLD,
          platform: 'ios',
          receipt: 'receipt',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when upgrading to same tier', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        packageTier: 'GOLD',
        goldBalance: 0,
      });

      await expect(
        service.upgradePackage('u1', {
          targetTier: PackageTier.GOLD,
          platform: 'ios',
          receipt: 'receipt',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate receipt on upgrade', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        packageTier: 'FREE',
        goldBalance: 0,
      });
      mockPrisma.iapReceipt.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.upgradePackage('u1', {
          targetTier: PackageTier.GOLD,
          platform: 'ios',
          receipt: 'duplicate',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // purchaseGold()
  // ═══════════════════════════════════════════════════════════════

  describe('purchaseGold()', () => {
    it('should throw BadRequestException for invalid gold pack', async () => {
      await expect(
        service.purchaseGold('u1', {
          packageId: 'gold_9999',
          platform: 'ios',
          receipt: 'receipt',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate receipt on gold purchase', async () => {
      mockPrisma.iapReceipt.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.purchaseGold('u1', {
          packageId: 'gold_50',
          platform: 'ios',
          receipt: 'duplicate',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid gold pack IDs', async () => {
      const validPacks = ['gold_50', 'gold_150', 'gold_500', 'gold_1000'];
      for (const packId of validPacks) {
        mockPrisma.iapReceipt.findUnique.mockResolvedValue(null);
        mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<void>) => {
          mockPrisma.user.findUnique.mockResolvedValue({ goldBalance: 0 });
          await fn(mockPrisma);
        });

        const result = await service.purchaseGold('u1', {
          packageId: packId,
          platform: 'ios',
          receipt: `receipt-${packId}`,
        });

        expect(result.purchased).toBe(true);
        expect(result.packageId).toBe(packId);
      }
    });
  });
});
