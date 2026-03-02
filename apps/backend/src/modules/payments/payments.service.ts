import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BadgesService } from '../badges/badges.service';
import {
  ReceiptValidatorService,
  ReceiptValidationResult,
} from './receipt-validator.service';
import {
  SubscribeDto,
  ValidateReceiptDto,
  PurchaseGoldDto,
  UpgradePackageDto,
  SpendGoldDto,
} from './dto';

// LOCKED: 4 Package Tiers with features
const PACKAGE_DEFINITIONS = {
  free: {
    tier: 'FREE',
    name: 'Free',
    nameTr: 'Ucretsiz',
    monthlyPriceUsd: 0,
    monthlyPriceTry: 0,
    features: {
      dailySwipes: 20,
      coreQuestions: 20,
      premiumQuestions: 0,
      harmonyMinutes: 30,
      monthlyGold: 0,
      dailyCompatibilityChecks: 1,
      dailySuperCompatibility: 0,
      seeWhoLikesYou: false,
      profileBoost: false,
      readReceipts: false,
      undoSwipe: false,
      priorityInFeed: false,
    },
  },
  gold: {
    tier: 'GOLD',
    name: 'Gold',
    nameTr: 'Gold',
    monthlyPriceUsd: 14.99,
    monthlyPriceTry: 149.99,
    features: {
      dailySwipes: 60,
      coreQuestions: 20,
      premiumQuestions: 25,
      harmonyMinutes: 30,
      monthlyGold: 50,
      dailyCompatibilityChecks: 3,
      dailySuperCompatibility: 0,
      seeWhoLikesYou: true,
      profileBoost: false,
      readReceipts: false,
      undoSwipe: true,
      priorityInFeed: false,
    },
  },
  pro: {
    tier: 'PRO',
    name: 'Pro',
    nameTr: 'Pro',
    monthlyPriceUsd: 29.99,
    monthlyPriceTry: 299.99,
    features: {
      dailySwipes: 200,
      coreQuestions: 20,
      premiumQuestions: 25,
      harmonyMinutes: 45,
      monthlyGold: 150,
      dailyCompatibilityChecks: 5,
      dailySuperCompatibility: 1,
      seeWhoLikesYou: true,
      profileBoost: true,
      readReceipts: true,
      undoSwipe: true,
      priorityInFeed: true,
    },
  },
  reserved: {
    tier: 'RESERVED',
    name: 'Reserved',
    nameTr: 'Reserved',
    monthlyPriceUsd: 49.99,
    monthlyPriceTry: 999.99,
    features: {
      dailySwipes: 999999,
      coreQuestions: 20,
      premiumQuestions: 25,
      harmonyMinutes: 60,
      monthlyGold: 500,
      dailyCompatibilityChecks: 999999,
      dailySuperCompatibility: 3,
      seeWhoLikesYou: true,
      profileBoost: true,
      readReceipts: true,
      undoSwipe: true,
      priorityInFeed: true,
    },
  },
};

// Gold pack definitions with TRY pricing
const GOLD_PACKS: Record<string, { amount: number; priceUsd: number; priceTry: number; bonus: number }> = {
  gold_50: { amount: 50, priceUsd: 4.99, priceTry: 29.99, bonus: 0 },
  gold_150: { amount: 150, priceUsd: 12.99, priceTry: 79.99, bonus: 10 },
  gold_500: { amount: 500, priceUsd: 39.99, priceTry: 199.99, bonus: 50 },
  gold_1000: { amount: 1000, priceUsd: 69.99, priceTry: 349.99, bonus: 150 },
};

// Gold spending costs per action
const GOLD_COSTS: Record<string, { cost: number; descriptionTr: string }> = {
  harmony_extension: { cost: 50, descriptionTr: 'Harmony Room sure uzatma (15 dk)' },
  profile_boost: { cost: 100, descriptionTr: 'Profil one cikarma (24 saat)' },
  super_like: { cost: 25, descriptionTr: 'Super begeni gonderme' },
};

// One-time purchase products (not subscription-based)
const ONE_TIME_PRODUCTS: Record<string, { priceTry: number; priceUsd: number; descriptionTr: string }> = {
  deep_analysis: { priceTry: 69, priceUsd: 9.99, descriptionTr: 'Derin uyumluluk analizi' },
};

// Tier hierarchy: higher number = higher tier
const TIER_ORDER: Record<string, number> = {
  free: 0,
  gold: 1,
  pro: 2,
  reserved: 3,
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly badgesService: BadgesService,
    private readonly receiptValidator: ReceiptValidatorService,
  ) {}

  /**
   * Get all available subscription packages.
   * LUMA: 4 packages LOCKED.
   */
  async getPackages() {
    return {
      packages: Object.values(PACKAGE_DEFINITIONS),
      goldPacks: Object.entries(GOLD_PACKS).map(([id, pack]) => ({
        id,
        ...pack,
        totalGold: pack.amount + pack.bonus,
      })),
    };
  }

  /**
   * Subscribe to a package tier.
   * Validates receipt with platform store and activates subscription.
   */
  async subscribe(userId: string, dto: SubscribeDto) {
    if (dto.packageTier === 'free') {
      throw new BadRequestException('Ucretsiz pakete abone olunamaz');
    }

    // Check if user already has an active subscription
    const existing = await this.prisma.subscription.findFirst({
      where: { userId, isActive: true },
    });

    if (existing) {
      throw new BadRequestException(
        'Zaten aktif bir aboneliginiz var. Once iptal edin veya yukseltme yapin.',
      );
    }

    // Validate receipt with platform
    const platform = dto.platform.toUpperCase() as 'APPLE' | 'GOOGLE';
    const validationResult = await this.validatePlatformReceipt(
      platform,
      dto.receipt,
    );

    if (!validationResult.isValid) {
      throw new BadRequestException('Odeme makbuzu dogrulanamadi');
    }

    // Prevent receipt replay: check if transactionId was already used
    const existingReceipt = await this.prisma.iapReceipt.findUnique({
      where: { transactionId: validationResult.transactionId },
    });
    if (existingReceipt) {
      throw new BadRequestException('Bu makbuz daha once kullanilmis');
    }

    const tierKey = dto.packageTier.toUpperCase();

    // Create subscription in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create subscription record
      const startDate = new Date();
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1); // Monthly subscription

      const subscription = await tx.subscription.create({
        data: {
          userId,
          packageTier: tierKey as 'FREE' | 'GOLD' | 'PRO' | 'RESERVED',
          platform,
          productId: `luma_${dto.packageTier}_monthly`,
          purchaseToken: dto.receipt,
          startDate,
          expiryDate,
        },
      });

      // Store receipt
      await tx.iapReceipt.create({
        data: {
          subscriptionId: subscription.id,
          platform,
          receiptData: dto.receipt,
          transactionId: validationResult.transactionId,
          productId: `luma_${dto.packageTier}_monthly`,
          isValid: true,
          validationResponse: validationResult as object,
        },
      });

      // Update user's package tier
      await tx.user.update({
        where: { id: userId },
        data: { packageTier: tierKey as 'FREE' | 'GOLD' | 'PRO' | 'RESERVED' },
      });

      // Award monthly Gold allocation
      const packageDef = PACKAGE_DEFINITIONS[dto.packageTier as keyof typeof PACKAGE_DEFINITIONS];
      if (packageDef && packageDef.features.monthlyGold > 0) {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { goldBalance: true },
        });
        const newBalance = (user?.goldBalance ?? 0) + packageDef.features.monthlyGold;

        await tx.user.update({
          where: { id: userId },
          data: { goldBalance: newBalance },
        });

        await tx.goldTransaction.create({
          data: {
            userId,
            type: 'SUBSCRIPTION_ALLOCATION',
            amount: packageDef.features.monthlyGold,
            balance: newBalance,
            description: `${packageDef.name} aylik Gold tahsisi`,
          },
        });
      }

      return subscription;
    });

    this.logger.log(`User ${userId} subscribed to ${dto.packageTier}`);

    // Check badges after subscription (non-blocking)
    this.badgesService.checkAndAwardBadges(userId, 'subscription').catch((err) => this.logger.warn('Badge check failed', err.message));

    return {
      subscribed: true,
      subscriptionId: result.id,
      packageTier: dto.packageTier,
      expiresAt: result.expiryDate,
    };
  }

  /**
   * Upgrade package tier.
   * Validates tier hierarchy: Free -> Gold -> Pro -> Reserved.
   * Only allows upgrading to a higher tier.
   */
  async upgradePackage(userId: string, dto: UpgradePackageDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { packageTier: true, goldBalance: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanici bulunamadi');
    }

    const currentTierKey = user.packageTier.toLowerCase();
    const targetTierKey = dto.targetTier.toLowerCase();

    const currentOrder = TIER_ORDER[currentTierKey];
    const targetOrder = TIER_ORDER[targetTierKey];

    if (currentOrder === undefined || targetOrder === undefined) {
      throw new BadRequestException('Gecersiz paket seviyesi');
    }

    if (targetOrder <= currentOrder) {
      throw new BadRequestException(
        'Sadece daha yuksek bir pakete yukseltme yapabilirsiniz. ' +
        `Mevcut: ${currentTierKey}, Hedef: ${targetTierKey}`,
      );
    }

    // Validate receipt with platform
    const platform = dto.platform.toUpperCase() as 'APPLE' | 'GOOGLE';
    const validationResult = await this.validatePlatformReceipt(
      platform,
      dto.receipt,
    );

    if (!validationResult.isValid) {
      throw new BadRequestException('Odeme makbuzu dogrulanamadi');
    }

    // Prevent receipt replay
    const existingReceipt = await this.prisma.iapReceipt.findUnique({
      where: { transactionId: validationResult.transactionId },
    });
    if (existingReceipt) {
      throw new BadRequestException('Bu makbuz daha once kullanilmis');
    }

    const targetTierUpper = dto.targetTier.toUpperCase() as 'FREE' | 'GOLD' | 'PRO' | 'RESERVED';
    const packageDef = PACKAGE_DEFINITIONS[targetTierKey as keyof typeof PACKAGE_DEFINITIONS];

    const result = await this.prisma.$transaction(async (tx) => {
      // Cancel existing subscription if any
      const existingSub = await tx.subscription.findFirst({
        where: { userId, isActive: true },
      });

      if (existingSub) {
        await tx.subscription.update({
          where: { id: existingSub.id },
          data: {
            isActive: false,
            cancelledAt: new Date(),
          },
        });
      }

      // Create new subscription
      const startDate = new Date();
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);

      const subscription = await tx.subscription.create({
        data: {
          userId,
          packageTier: targetTierUpper,
          platform,
          productId: `luma_${targetTierKey}_monthly`,
          purchaseToken: dto.receipt,
          startDate,
          expiryDate,
        },
      });

      // Store receipt
      await tx.iapReceipt.create({
        data: {
          subscriptionId: subscription.id,
          platform,
          receiptData: dto.receipt,
          transactionId: validationResult.transactionId,
          productId: `luma_${targetTierKey}_monthly`,
          isValid: true,
          validationResponse: validationResult as object,
        },
      });

      // Update user's package tier
      await tx.user.update({
        where: { id: userId },
        data: { packageTier: targetTierUpper },
      });

      // Award monthly Gold allocation for new tier
      if (packageDef && packageDef.features.monthlyGold > 0) {
        const freshUser = await tx.user.findUnique({
          where: { id: userId },
          select: { goldBalance: true },
        });
        const newBalance = (freshUser?.goldBalance ?? 0) + packageDef.features.monthlyGold;

        await tx.user.update({
          where: { id: userId },
          data: { goldBalance: newBalance },
        });

        await tx.goldTransaction.create({
          data: {
            userId,
            type: 'SUBSCRIPTION_ALLOCATION',
            amount: packageDef.features.monthlyGold,
            balance: newBalance,
            description: `${packageDef.name} yukseltme Gold bonusu`,
          },
        });
      }

      return subscription;
    });

    this.logger.log(
      `User ${userId} upgraded from ${currentTierKey} to ${targetTierKey}`,
    );

    return {
      upgraded: true,
      previousTier: currentTierKey,
      newTier: targetTierKey,
      subscriptionId: result.id,
      expiresAt: result.expiryDate,
      features: packageDef.features,
    };
  }

  /**
   * Cancel current subscription.
   * Access continues until the current period ends.
   */
  async cancelSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new NotFoundException('Aktif abonelik bulunamadi');
    }

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        autoRenew: false,
        cancelledAt: new Date(),
      },
    });

    // Note: User keeps access until expiryDate.
    // A scheduled job should downgrade to FREE after expiry.

    this.logger.log(`User ${userId} cancelled subscription ${subscription.id}`);

    return {
      cancelled: true,
      accessUntil: subscription.expiryDate,
      message: `Aboneliginiz iptal edildi. ${subscription.expiryDate.toLocaleDateString('tr-TR')} tarihine kadar erisim devam edecek.`,
    };
  }

  /**
   * Validate a receipt from App Store or Play Store.
   */
  async validateReceipt(userId: string, dto: ValidateReceiptDto) {
    const platform = dto.platform.toUpperCase() as 'APPLE' | 'GOOGLE';
    const result = await this.validatePlatformReceipt(platform, dto.receipt);

    return {
      valid: result.isValid,
      transactionId: result.transactionId,
      productId: result.productId,
    };
  }

  /**
   * Get the user's current Gold balance and recent transactions.
   */
  async getGoldBalance(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { goldBalance: true, packageTier: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanici bulunamadi');
    }

    // Get recent transactions
    const recentTransactions = await this.prisma.goldTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        type: true,
        amount: true,
        balance: true,
        description: true,
        createdAt: true,
      },
    });

    return {
      balance: user.goldBalance,
      packageTier: user.packageTier,
      currency: 'gold',
      recentTransactions,
    };
  }

  /**
   * Purchase Gold via in-app purchase.
   */
  async purchaseGold(userId: string, dto: PurchaseGoldDto) {
    // Validate gold pack exists
    const pack = GOLD_PACKS[dto.packageId];
    if (!pack) {
      throw new BadRequestException(
        `Gecersiz Gold paketi. Gecerli paketler: ${Object.keys(GOLD_PACKS).join(', ')}`,
      );
    }

    // Validate receipt
    const platform = dto.platform.toUpperCase() as 'APPLE' | 'GOOGLE';
    const validation = await this.validatePlatformReceipt(platform, dto.receipt);

    if (!validation.isValid) {
      throw new BadRequestException('Odeme makbuzu dogrulanamadi');
    }

    // Prevent receipt replay
    const existingReceipt = await this.prisma.iapReceipt.findUnique({
      where: { transactionId: validation.transactionId },
    });
    if (existingReceipt) {
      throw new BadRequestException('Bu makbuz daha once kullanilmis');
    }

    const totalGold = pack.amount + pack.bonus;

    // Credit Gold in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { goldBalance: true },
      });

      const newBalance = (user?.goldBalance ?? 0) + totalGold;

      await tx.user.update({
        where: { id: userId },
        data: { goldBalance: newBalance },
      });

      // Record transaction
      const bonusText = pack.bonus > 0 ? ` + ${pack.bonus} bonus` : '';
      await tx.goldTransaction.create({
        data: {
          userId,
          type: 'PURCHASE',
          amount: totalGold,
          balance: newBalance,
          description: `${pack.amount} Gold satin alma${bonusText} (${pack.priceTry} TL)`,
        },
      });

      // Store receipt
      await tx.iapReceipt.create({
        data: {
          platform,
          receiptData: dto.receipt,
          transactionId: validation.transactionId,
          productId: dto.packageId,
          isValid: true,
          validationResponse: validation as object,
        },
      });

      return newBalance;
    });

    this.logger.log(
      `User ${userId} purchased ${dto.packageId}: +${totalGold} gold (new balance: ${result})`,
    );

    return {
      purchased: true,
      goldAdded: totalGold,
      newBalance: result,
      packageId: dto.packageId,
      priceTry: pack.priceTry,
    };
  }

  /**
   * Spend Gold on an action (harmony extension, profile boost, super like).
   */
  async spendGold(userId: string, dto: SpendGoldDto) {
    const actionConfig = GOLD_COSTS[dto.action];
    if (!actionConfig) {
      throw new BadRequestException(
        `Gecersiz islem. Gecerli islemler: ${Object.keys(GOLD_COSTS).join(', ')}`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { goldBalance: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanici bulunamadi');
    }

    if (user.goldBalance < actionConfig.cost) {
      throw new BadRequestException(
        `Yetersiz Gold bakiye. Gerekli: ${actionConfig.cost}, Mevcut: ${user.goldBalance}`,
      );
    }

    const newBalance = user.goldBalance - actionConfig.cost;

    // Debit Gold in transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { goldBalance: newBalance },
      });

      // Map action to transaction type
      const transactionTypeMap: Record<string, string> = {
        harmony_extension: 'HARMONY_EXTENSION',
        profile_boost: 'PROFILE_BOOST',
        super_like: 'SUPER_LIKE',
      };

      await tx.goldTransaction.create({
        data: {
          userId,
          type: (transactionTypeMap[dto.action] ?? 'HARMONY_EXTENSION') as import('@prisma/client').GoldTransactionType,
          amount: -actionConfig.cost,
          balance: newBalance,
          description: actionConfig.descriptionTr,
          referenceId: dto.referenceId ?? null,
        },
      });
    });

    this.logger.log(
      `User ${userId} spent ${actionConfig.cost} gold on ${dto.action} (new balance: ${newBalance})`,
    );

    return {
      spent: true,
      action: dto.action,
      goldSpent: actionConfig.cost,
      newBalance,
    };
  }

  /**
   * Get paginated gold transaction history.
   */
  async getGoldHistory(userId: string, page: number, limit: number) {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const safePage = Math.max(page, 1);
    const skip = (safePage - 1) * safeLimit;

    const [transactions, total] = await Promise.all([
      this.prisma.goldTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
        select: {
          id: true,
          type: true,
          amount: true,
          balance: true,
          description: true,
          referenceId: true,
          createdAt: true,
        },
      }),
      this.prisma.goldTransaction.count({ where: { userId } }),
    ]);

    return {
      transactions,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Get all payment transaction history (subscriptions + gold).
   */
  async getTransactionHistory(userId: string, page: number, limit: number) {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const safePage = Math.max(page, 1);
    const skip = (safePage - 1) * safeLimit;

    const [goldTransactions, subscriptions, goldTotal] = await Promise.all([
      this.prisma.goldTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
        select: {
          id: true,
          type: true,
          amount: true,
          balance: true,
          description: true,
          createdAt: true,
        },
      }),
      this.prisma.subscription.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          packageTier: true,
          platform: true,
          startDate: true,
          expiryDate: true,
          isActive: true,
          cancelledAt: true,
          createdAt: true,
        },
      }),
      this.prisma.goldTransaction.count({ where: { userId } }),
    ]);

    return {
      goldTransactions,
      subscriptions,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: goldTotal,
        totalPages: Math.ceil(goldTotal / safeLimit),
      },
    };
  }

  /**
   * Get the user's current subscription status.
   * Returns tier, expiry date, active status, auto-renew info, and gold balance.
   */
  async getSubscriptionStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { packageTier: true, goldBalance: true },
    });

    if (!user) {
      throw new NotFoundException('Kullanici bulunamadi');
    }

    // Find the latest active subscription
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        packageTier: true,
        platform: true,
        startDate: true,
        expiryDate: true,
        autoRenew: true,
        cancelledAt: true,
        isActive: true,
      },
    });

    const tierKey = user.packageTier.toLowerCase();
    const packageDef = PACKAGE_DEFINITIONS[tierKey as keyof typeof PACKAGE_DEFINITIONS];

    // Determine if subscription is expiring soon (within 3 days)
    let isExpiringSoon = false;
    if (activeSubscription?.expiryDate) {
      const now = new Date();
      const expiry = new Date(activeSubscription.expiryDate);
      const diffMs = expiry.getTime() - now.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      isExpiringSoon = diffDays <= 3 && diffDays > 0;
    }

    return {
      packageTier: user.packageTier,
      packageName: packageDef?.nameTr ?? 'Ucretsiz',
      isPaid: user.packageTier !== 'FREE',
      isActive: activeSubscription?.isActive ?? (user.packageTier === 'FREE'),
      autoRenew: activeSubscription?.autoRenew ?? false,
      expiryDate: activeSubscription?.expiryDate ?? null,
      startDate: activeSubscription?.startDate ?? null,
      cancelledAt: activeSubscription?.cancelledAt ?? null,
      isExpiringSoon,
      platform: activeSubscription?.platform ?? null,
      goldBalance: user.goldBalance,
      features: packageDef?.features ?? PACKAGE_DEFINITIONS.free.features,
    };
  }

  /**
   * Process expired subscriptions: downgrade users to FREE tier.
   * Intended to be called by a scheduled cron job (e.g. every hour).
   * Finds subscriptions where expiryDate has passed, autoRenew is false, and isActive is true.
   */
  async processExpiredSubscriptions(): Promise<number> {
    const now = new Date();

    const expiredSubscriptions = await this.prisma.subscription.findMany({
      where: {
        isActive: true,
        autoRenew: false,
        expiryDate: { lt: now },
      },
      select: {
        id: true,
        userId: true,
        packageTier: true,
      },
    });

    let processedCount = 0;

    for (const sub of expiredSubscriptions) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // Deactivate subscription
          await tx.subscription.update({
            where: { id: sub.id },
            data: { isActive: false },
          });

          // Downgrade user to FREE
          await tx.user.update({
            where: { id: sub.userId },
            data: { packageTier: 'FREE' },
          });
        });

        this.logger.log(
          `Expired subscription ${sub.id}: user ${sub.userId} downgraded from ${sub.packageTier} to FREE`,
        );
        processedCount++;
      } catch (err) {
        this.logger.error(
          `Failed to process expired subscription ${sub.id}: ${err}`,
        );
      }
    }

    if (processedCount > 0) {
      this.logger.log(`Processed ${processedCount} expired subscriptions`);
    }

    return processedCount;
  }

  /**
   * Purchase a one-time product (e.g., deep analysis).
   * Not a subscription — single purchase, permanent unlock.
   */
  async purchaseOneTime(userId: string, productId: string, platform: string, receipt: string) {
    const product = ONE_TIME_PRODUCTS[productId];
    if (!product) {
      throw new BadRequestException(
        `Geçersiz ürün. Geçerli ürünler: ${Object.keys(ONE_TIME_PRODUCTS).join(', ')}`,
      );
    }

    // Validate receipt
    const platformUpper = platform.toUpperCase() as 'APPLE' | 'GOOGLE';
    const validation = await this.validatePlatformReceipt(platformUpper, receipt);
    if (!validation.isValid) {
      throw new BadRequestException('Ödeme makbuzu doğrulanamadı');
    }

    // Prevent receipt replay
    const existingReceipt = await this.prisma.iapReceipt.findUnique({
      where: { transactionId: validation.transactionId },
    });
    if (existingReceipt) {
      throw new BadRequestException('Bu makbuz daha önce kullanılmış');
    }

    // Store purchase
    await this.prisma.$transaction(async (tx) => {
      await tx.iapReceipt.create({
        data: {
          platform: platformUpper,
          receiptData: receipt,
          transactionId: validation.transactionId,
          productId,
          isValid: true,
          validationResponse: validation as object,
        },
      });

      // Record as gold transaction for audit trail (0 gold, but records the purchase)
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { goldBalance: true },
      });

      await tx.goldTransaction.create({
        data: {
          userId,
          type: 'PURCHASE',
          amount: 0,
          balance: user?.goldBalance ?? 0,
          description: `${product.descriptionTr} (${product.priceTry} TL)`,
          referenceId: productId,
        },
      });
    });

    this.logger.log(`User ${userId} purchased one-time product: ${productId}`);

    return {
      purchased: true,
      productId,
      priceTry: product.priceTry,
    };
  }

  /**
   * Check if a user has purchased a specific one-time product.
   */
  async hasOneTimePurchase(userId: string, productId: string): Promise<boolean> {
    const purchase = await this.prisma.goldTransaction.findFirst({
      where: {
        userId,
        referenceId: productId,
        type: 'PURCHASE',
        description: { contains: ONE_TIME_PRODUCTS[productId]?.descriptionTr ?? '' },
      },
    });
    return purchase !== null;
  }

  // ─── Private Helpers ───────────────────────────────────────────

  /**
   * Validate receipt with Apple App Store or Google Play Store.
   * Delegates to ReceiptValidatorService which handles:
   * - Apple: verifyReceipt endpoint with sandbox auto-retry
   * - Google: Android Publisher API via googleapis
   * - Dev fallback: mock validation when credentials not configured
   */
  private async validatePlatformReceipt(
    platform: 'APPLE' | 'GOOGLE',
    receipt: string,
    productId?: string,
  ): Promise<ReceiptValidationResult> {
    this.logger.debug(
      `[${platform}] Validating receipt: ${receipt.substring(0, 20)}...`,
    );

    const result = await this.receiptValidator.validateReceipt(
      platform,
      receipt,
      'com.luma.dating',
      productId,
    );

    this.logger.debug(
      `[${platform}] Validation result: valid=${result.isValid}, txn=${result.transactionId}`,
    );

    return result;
  }
}
