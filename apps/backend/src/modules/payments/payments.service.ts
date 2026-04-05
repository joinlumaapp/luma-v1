import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BadgesService } from "../badges/badges.service";
import {
  ReceiptValidatorService,
  ReceiptValidationResult,
} from "./receipt-validator.service";
import {
  SubscribeDto,
  ValidateReceiptDto,
  PurchaseGoldDto,
  UpgradePackageDto,
  SpendGoldDto,
} from "./dto";

// LOCKED: 4 Package Tiers with features
const PACKAGE_DEFINITIONS = {
  FREE: {
    tier: "FREE",
    name: "Free",
    nameTr: "Ucretsiz",
    monthlyPriceUsd: 0,
    monthlyPriceTry: 0,
    features: {
      dailySwipes: 999999,
      coreQuestions: 20,
      premiumQuestions: 0,
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
  GOLD: {
    tier: "GOLD",
    name: "Gold",
    nameTr: "Gold",
    monthlyPriceUsd: 14.99,
    monthlyPriceTry: 499,
    features: {
      dailySwipes: 999999,
      coreQuestions: 20,
      premiumQuestions: 25,
      monthlyGold: 250,
      dailyCompatibilityChecks: 3,
      dailySuperCompatibility: 0,
      seeWhoLikesYou: true,
      profileBoost: false,
      readReceipts: false,
      undoSwipe: true,
      priorityInFeed: false,
    },
  },
  PRO: {
    tier: "PRO",
    name: "Pro",
    nameTr: "Pro",
    monthlyPriceUsd: 29.99,
    monthlyPriceTry: 599.99,
    features: {
      dailySwipes: 999999,
      coreQuestions: 20,
      premiumQuestions: 25,
      monthlyGold: 500,
      dailyCompatibilityChecks: 5,
      dailySuperCompatibility: 1,
      seeWhoLikesYou: true,
      profileBoost: true,
      readReceipts: true,
      undoSwipe: true,
      priorityInFeed: true,
    },
  },
  RESERVED: {
    tier: "RESERVED",
    name: "Reserved",
    nameTr: "Reserved",
    monthlyPriceUsd: 49.99,
    monthlyPriceTry: 1199,
    features: {
      dailySwipes: 999999,
      coreQuestions: 20,
      premiumQuestions: 25,
      monthlyGold: 1000,
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
const GOLD_PACKS: Record<
  string,
  { amount: number; priceUsd: number; priceTry: number; bonus: number }
> = {
  gold_50: { amount: 50, priceUsd: 4.99, priceTry: 29.99, bonus: 0 },
  gold_150: { amount: 150, priceUsd: 12.99, priceTry: 79.99, bonus: 10 },
  gold_500: { amount: 500, priceUsd: 39.99, priceTry: 199.99, bonus: 50 },
  gold_1000: { amount: 1000, priceUsd: 69.99, priceTry: 349.99, bonus: 150 },
};

// Gold spending costs per action
const GOLD_COSTS: Record<string, { cost: number; descriptionTr: string }> = {
  profile_boost: { cost: 100, descriptionTr: "Profil öne çıkarma (24 saat)" },
  super_like: { cost: 25, descriptionTr: "Süper beğeni gönderme" },
  read_receipts: { cost: 15, descriptionTr: "Mesaj okundu bilgisi (tek kullanımlık)" },
  undo_pass: { cost: 30, descriptionTr: "Geçilen profili geri alma" },
  spotlight: { cost: 75, descriptionTr: "30 dk bölge öne çıkarma" },
  travel_mode: { cost: 200, descriptionTr: "24 saat farklı şehirde profil gösterme" },
  priority_message: { cost: 40, descriptionTr: "Mesajı en üste çıkarma" },
  // ─── Matching Redesign Gold Actions ─────────────────────────
  extra_likes_reveal: { cost: 20, descriptionTr: "Ekstra beğeni açma" },
  extra_viewers_reveal: { cost: 15, descriptionTr: "Ekstra profil görüntüleyici açma" },
  viewer_delay_bypass: { cost: 25, descriptionTr: "Görüntüleme gecikmesi atlama" },
  priority_visibility_1h: { cost: 60, descriptionTr: "1 saat öncelikli görünürlük" },
  priority_visibility_3h: { cost: 150, descriptionTr: "3 saat öncelikli görünürlük" },
  activity_strip_pin: { cost: 40, descriptionTr: "Aktivite şeridine sabitleme" },
  secret_admirer_send: { cost: 75, descriptionTr: "Gizli hayran gönderme" },
  secret_admirer_extra_guess: { cost: 25, descriptionTr: "Ekstra tahmin hakkı" },
  compatibility_xray: { cost: 30, descriptionTr: "Uyum röntgeni açma" },
  super_compatible_reveal: { cost: 20, descriptionTr: "Süper uyumlu profil açma" },
  ai_chat_suggestion_pack: { cost: 30, descriptionTr: "AI sohbet önerisi paketi" },
  nearby_notify: { cost: 35, descriptionTr: "Yakın çevre bildirimi" },
  weekly_top_reveal: { cost: 40, descriptionTr: "Haftalık top eşleşme açma" },
  message_bundle_3: { cost: 350, descriptionTr: "3 mesaj paketi" },
  message_bundle_5: { cost: 500, descriptionTr: "5 mesaj paketi" },
  message_bundle_10: { cost: 800, descriptionTr: "10 mesaj paketi" },
  // ─── Messaging & Social Gold Actions ──────────────────────────
  send_message: { cost: 150, descriptionTr: "Eşleşme olmadan mesaj gönderme" },
  greeting: { cost: 50, descriptionTr: "Selam gönderme" },
  wave_extra: { cost: 5, descriptionTr: "Ekstra dalga gönderme" },
  match_extend: { cost: 5, descriptionTr: "Eşleşme süresini 24 saat uzatma" },
  date_planner: { cost: 5, descriptionTr: "Buluşma planı oluşturma" },
};

// One-time purchase products (not subscription-based)
const ONE_TIME_PRODUCTS: Record<
  string,
  { priceTry: number; priceUsd: number; descriptionTr: string }
> = {
  deep_analysis: {
    priceTry: 69,
    priceUsd: 9.99,
    descriptionTr: "Derin uyumluluk analizi",
  },
};

// Tier hierarchy: higher number = higher tier
const TIER_ORDER: Record<string, number> = {
  FREE: 0,
  GOLD: 1,
  PRO: 2,
  RESERVED: 3,
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
   * Activate a 48-hour premium trial for new users (no IAP receipt needed).
   * Only one trial per user lifetime.
   */
  async activateTrial(userId: string) {
    // Check if user already used a trial
    const existingTrial = await this.prisma.subscription.findFirst({
      where: { userId, isTrial: true },
    });

    if (existingTrial) {
      throw new BadRequestException("Deneme suresi daha once kullanilmis");
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours

    // Create trial subscription record
    await this.prisma.subscription.create({
      data: {
        userId,
        packageTier: "GOLD",
        platform: "TRIAL",
        productId: "trial_48h",
        startDate: now,
        expiryDate: expiresAt,
        isActive: true,
        autoRenew: false,
        isTrial: true,
        trialEndDate: expiresAt,
      },
    });

    // Update user's package tier to GOLD
    await this.prisma.user.update({
      where: { id: userId },
      data: { packageTier: "GOLD" },
    });

    this.logger.log(`Trial activated for user ${userId}, expires at ${expiresAt.toISOString()}`);

    return {
      packageTier: "GOLD",
      expiresAt: expiresAt.toISOString(),
      trialDurationHours: 48,
    };
  }

  /**
   * Subscribe to a package tier.
   * Validates receipt with platform store and activates subscription.
   * Supports 7-day free trial for first-time subscribers.
   */
  async subscribe(userId: string, dto: SubscribeDto) {
    if (dto.packageTier === "FREE") {
      throw new BadRequestException("Ucretsiz pakete abone olunamaz");
    }

    // Check if user already has an active subscription
    const existing = await this.prisma.subscription.findFirst({
      where: { userId, isActive: true },
    });

    if (existing) {
      throw new BadRequestException(
        "Zaten aktif bir aboneliginiz var. Once iptal edin veya yukseltme yapin.",
      );
    }

    // Validate receipt with platform
    const platform = dto.platform.toUpperCase() as "APPLE" | "GOOGLE";
    const validationResult = await this.validatePlatformReceipt(
      platform,
      dto.receipt,
    );

    if (!validationResult.isValid) {
      throw new BadRequestException("Odeme makbuzu dogrulanamadi");
    }

    // Prevent receipt replay: check if transactionId was already used
    const existingReceipt = await this.prisma.iapReceipt.findUnique({
      where: { transactionId: validationResult.transactionId },
    });
    if (existingReceipt) {
      throw new BadRequestException("Bu makbuz daha once kullanilmis");
    }

    // Check trial eligibility: user can only use trial once (any tier)
    const previousTrial = await this.prisma.subscription.findFirst({
      where: { userId, isTrial: true },
    });
    const isEligibleForTrial = previousTrial === null;

    const tierKey = dto.packageTier;

    // Create subscription in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create subscription record
      const startDate = new Date();
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1); // Monthly subscription

      // Trial: 7-day free trial for first-time subscribers
      const isTrial = isEligibleForTrial;
      const trialEndDate = isTrial
        ? new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000)
        : null;

      const subscription = await tx.subscription.create({
        data: {
          userId,
          packageTier: tierKey as "FREE" | "GOLD" | "PRO" | "RESERVED",
          platform,
          productId: `luma_${dto.packageTier.toLowerCase()}_monthly`,
          purchaseToken: dto.receipt,
          startDate,
          expiryDate,
          isTrial,
          trialEndDate,
        },
      });

      // Store receipt
      await tx.iapReceipt.create({
        data: {
          subscriptionId: subscription.id,
          platform,
          receiptData: dto.receipt,
          transactionId: validationResult.transactionId,
          productId: `luma_${dto.packageTier.toLowerCase()}_monthly`,
          isValid: true,
          validationResponse: validationResult as object,
        },
      });

      // Update user's package tier
      await tx.user.update({
        where: { id: userId },
        data: { packageTier: tierKey as "FREE" | "GOLD" | "PRO" | "RESERVED" },
      });

      // Award monthly Gold allocation
      const packageDef =
        PACKAGE_DEFINITIONS[
          dto.packageTier as keyof typeof PACKAGE_DEFINITIONS
        ];
      if (packageDef && packageDef.features.monthlyGold > 0) {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { goldBalance: true },
        });
        const newBalance =
          (user?.goldBalance ?? 0) + packageDef.features.monthlyGold;

        await tx.user.update({
          where: { id: userId },
          data: { goldBalance: newBalance },
        });

        await tx.goldTransaction.create({
          data: {
            userId,
            type: "SUBSCRIPTION_ALLOCATION",
            amount: packageDef.features.monthlyGold,
            balance: newBalance,
            description: `${packageDef.name} aylik Gold tahsisi`,
          },
        });
      }

      return subscription;
    });

    this.logger.log(
      `User ${userId} subscribed to ${dto.packageTier}${isEligibleForTrial ? " (trial)" : ""}`,
    );

    // Check badges after subscription (non-blocking)
    this.badgesService
      .checkAndAwardBadges(userId, "subscription")
      .catch((err) => this.logger.warn("Badge check failed", err.message));

    return {
      subscribed: true,
      subscriptionId: result.id,
      packageTier: dto.packageTier,
      expiresAt: result.expiryDate,
      isTrial: isEligibleForTrial,
      trialEndDate: isEligibleForTrial ? result.trialEndDate : null,
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
      throw new NotFoundException("Kullanici bulunamadi");
    }

    const currentTierKey = user.packageTier;
    const targetTierKey = dto.targetTier;

    const currentOrder = TIER_ORDER[currentTierKey];
    const targetOrder = TIER_ORDER[targetTierKey];

    if (currentOrder === undefined || targetOrder === undefined) {
      throw new BadRequestException("Gecersiz paket seviyesi");
    }

    if (targetOrder <= currentOrder) {
      throw new BadRequestException(
        "Sadece daha yuksek bir pakete yukseltme yapabilirsiniz. " +
          `Mevcut: ${currentTierKey}, Hedef: ${targetTierKey}`,
      );
    }

    // Validate receipt with platform
    const platform = dto.platform.toUpperCase() as "APPLE" | "GOOGLE";
    const validationResult = await this.validatePlatformReceipt(
      platform,
      dto.receipt,
    );

    if (!validationResult.isValid) {
      throw new BadRequestException("Odeme makbuzu dogrulanamadi");
    }

    // Prevent receipt replay
    const existingReceipt = await this.prisma.iapReceipt.findUnique({
      where: { transactionId: validationResult.transactionId },
    });
    if (existingReceipt) {
      throw new BadRequestException("Bu makbuz daha once kullanilmis");
    }

    const targetTierUpper = dto.targetTier as
      | "FREE"
      | "GOLD"
      | "PRO"
      | "RESERVED";
    const packageDef =
      PACKAGE_DEFINITIONS[targetTierKey as keyof typeof PACKAGE_DEFINITIONS];

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
          productId: `luma_${targetTierKey.toLowerCase()}_monthly`,
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
          productId: `luma_${targetTierKey.toLowerCase()}_monthly`,
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
        const newBalance =
          (freshUser?.goldBalance ?? 0) + packageDef.features.monthlyGold;

        await tx.user.update({
          where: { id: userId },
          data: { goldBalance: newBalance },
        });

        await tx.goldTransaction.create({
          data: {
            userId,
            type: "SUBSCRIPTION_ALLOCATION",
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
   * Downgrade package tier.
   * Validates tier hierarchy: Reserved -> Pro -> Gold -> Free.
   * Only allows downgrading to a lower tier.
   * The downgrade takes effect at the end of the current billing period.
   */
  async downgradePackage(userId: string, dto: UpgradePackageDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { packageTier: true, goldBalance: true },
    });

    if (!user) {
      throw new NotFoundException("Kullanici bulunamadi");
    }

    const currentTierKey = user.packageTier;
    const targetTierKey = dto.targetTier;

    const currentOrder = TIER_ORDER[currentTierKey];
    const targetOrder = TIER_ORDER[targetTierKey];

    if (currentOrder === undefined || targetOrder === undefined) {
      throw new BadRequestException("Gecersiz paket seviyesi");
    }

    if (targetOrder >= currentOrder) {
      throw new BadRequestException(
        "Sadece daha dusuk bir pakete gecis yapabilirsiniz. " +
          `Mevcut: ${currentTierKey}, Hedef: ${targetTierKey}`,
      );
    }

    // Find the active subscription
    const existingSub = await this.prisma.subscription.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (!existingSub) {
      throw new NotFoundException("Aktif abonelik bulunamadi");
    }

    // For downgrade to FREE, no receipt is needed — just cancel and schedule downgrade
    // For downgrade to a paid tier, validate receipt
    let validationResult: ReceiptValidationResult | null = null;
    if (targetTierKey !== "FREE") {
      const platform = dto.platform.toUpperCase() as "APPLE" | "GOOGLE";
      validationResult = await this.validatePlatformReceipt(
        platform,
        dto.receipt,
      );

      if (!validationResult.isValid) {
        throw new BadRequestException("Odeme makbuzu dogrulanamadi");
      }

      // Prevent receipt replay
      const existingReceipt = await this.prisma.iapReceipt.findUnique({
        where: { transactionId: validationResult.transactionId },
      });
      if (existingReceipt) {
        throw new BadRequestException("Bu makbuz daha once kullanilmis");
      }
    }

    const targetTierUpper = targetTierKey as
      | "FREE"
      | "GOLD"
      | "PRO"
      | "RESERVED";
    const packageDef =
      PACKAGE_DEFINITIONS[targetTierKey as keyof typeof PACKAGE_DEFINITIONS];

    const result = await this.prisma.$transaction(async (tx) => {
      // Cancel existing subscription
      await tx.subscription.update({
        where: { id: existingSub.id },
        data: {
          isActive: false,
          cancelledAt: new Date(),
        },
      });

      if (targetTierKey === "FREE") {
        // Downgrade to FREE: update user tier immediately, no new subscription needed
        await tx.user.update({
          where: { id: userId },
          data: { packageTier: "FREE" },
        });

        return { id: existingSub.id, expiryDate: existingSub.expiryDate };
      }

      // Downgrade to a paid tier: create a new subscription at the lower tier
      const platform = dto.platform.toUpperCase() as "APPLE" | "GOOGLE";
      const startDate = new Date();
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);

      const subscription = await tx.subscription.create({
        data: {
          userId,
          packageTier: targetTierUpper,
          platform,
          productId: `luma_${targetTierKey.toLowerCase()}_monthly`,
          purchaseToken: dto.receipt,
          startDate,
          expiryDate,
        },
      });

      // Store receipt
      if (validationResult) {
        await tx.iapReceipt.create({
          data: {
            subscriptionId: subscription.id,
            platform,
            receiptData: dto.receipt,
            transactionId: validationResult.transactionId,
            productId: `luma_${targetTierKey.toLowerCase()}_monthly`,
            isValid: true,
            validationResponse: validationResult as object,
          },
        });
      }

      // Update user's package tier
      await tx.user.update({
        where: { id: userId },
        data: { packageTier: targetTierUpper },
      });

      // Award monthly Gold allocation for new (lower) tier
      if (packageDef && packageDef.features.monthlyGold > 0) {
        const freshUser = await tx.user.findUnique({
          where: { id: userId },
          select: { goldBalance: true },
        });
        const newBalance =
          (freshUser?.goldBalance ?? 0) + packageDef.features.monthlyGold;

        await tx.user.update({
          where: { id: userId },
          data: { goldBalance: newBalance },
        });

        await tx.goldTransaction.create({
          data: {
            userId,
            type: "SUBSCRIPTION_ALLOCATION",
            amount: packageDef.features.monthlyGold,
            balance: newBalance,
            description: `${packageDef.name} paket degisikligi Gold tahsisi`,
          },
        });
      }

      return subscription;
    });

    this.logger.log(
      `User ${userId} downgraded from ${currentTierKey} to ${targetTierKey}`,
    );

    return {
      downgraded: true,
      previousTier: currentTierKey,
      newTier: targetTierKey,
      subscriptionId: result.id,
      expiresAt: result.expiryDate,
      features: packageDef?.features ?? PACKAGE_DEFINITIONS.FREE.features,
    };
  }

  /**
   * Cancel current subscription.
   * Access continues until the current period ends.
   */
  async cancelSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (!subscription) {
      throw new NotFoundException("Aktif abonelik bulunamadi");
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
      message: `Aboneliginiz iptal edildi. ${subscription.expiryDate.toLocaleDateString("tr-TR")} tarihine kadar erisim devam edecek.`,
    };
  }

  /**
   * Validate a receipt from App Store or Play Store.
   */
  async validateReceipt(userId: string, dto: ValidateReceiptDto) {
    const platform = dto.platform.toUpperCase() as "APPLE" | "GOOGLE";
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
      throw new NotFoundException("Kullanici bulunamadi");
    }

    // Get recent transactions
    const recentTransactions = await this.prisma.goldTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
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
      currency: "gold",
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
        `Gecersiz Gold paketi. Gecerli paketler: ${Object.keys(GOLD_PACKS).join(", ")}`,
      );
    }

    // Validate receipt
    const platform = dto.platform.toUpperCase() as "APPLE" | "GOOGLE";
    const validation = await this.validatePlatformReceipt(
      platform,
      dto.receipt,
    );

    if (!validation.isValid) {
      throw new BadRequestException("Odeme makbuzu dogrulanamadi");
    }

    // Prevent receipt replay
    const existingReceipt = await this.prisma.iapReceipt.findUnique({
      where: { transactionId: validation.transactionId },
    });
    if (existingReceipt) {
      throw new BadRequestException("Bu makbuz daha once kullanilmis");
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
      const bonusText = pack.bonus > 0 ? ` + ${pack.bonus} bonus` : "";
      await tx.goldTransaction.create({
        data: {
          userId,
          type: "PURCHASE",
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
   * Spend Gold on an action (profile boost, super like, etc.).
   *
   * Uses pessimistic locking via raw SQL to prevent race conditions:
   * UPDATE ... WHERE goldBalance >= cost atomically checks and decrements.
   */
  async spendGold(userId: string, dto: SpendGoldDto) {
    const actionConfig = GOLD_COSTS[dto.action];
    if (!actionConfig) {
      throw new BadRequestException(
        `Gecersiz islem. Gecerli islemler: ${Object.keys(GOLD_COSTS).join(", ")}`,
      );
    }

    // Map action to transaction type
    const transactionTypeMap: Record<string, string> = {
      profile_boost: "PROFILE_BOOST",
      super_like: "SUPER_LIKE",
      read_receipts: "READ_RECEIPTS",
      undo_pass: "UNDO_PASS",
      spotlight: "SPOTLIGHT",
      travel_mode: "TRAVEL_MODE",
      priority_message: "PRIORITY_MESSAGE",
      // Matching redesign actions
      extra_likes_reveal: "EXTRA_LIKES_REVEAL",
      extra_viewers_reveal: "EXTRA_VIEWERS_REVEAL",
      viewer_delay_bypass: "VIEWER_DELAY_BYPASS",
      priority_visibility_1h: "PRIORITY_VISIBILITY",
      priority_visibility_3h: "PRIORITY_VISIBILITY",
      activity_strip_pin: "ACTIVITY_STRIP_PIN",
      secret_admirer_send: "SECRET_ADMIRER_SEND",
      secret_admirer_extra_guess: "SECRET_ADMIRER_EXTRA_GUESS",
      compatibility_xray: "COMPATIBILITY_XRAY",
      super_compatible_reveal: "SUPER_COMPATIBLE_REVEAL",
      ai_chat_suggestion_pack: "AI_CHAT_SUGGESTION",
      nearby_notify: "NEARBY_NOTIFY",
      weekly_top_reveal: "WEEKLY_TOP_REVEAL",
      message_bundle_3: "MESSAGE_BUNDLE",
      message_bundle_5: "MESSAGE_BUNDLE",
      message_bundle_10: "MESSAGE_BUNDLE",
    };

    // Atomic debit inside a serializable transaction to prevent race conditions
    const result = await this.prisma.$transaction(async (tx) => {
      // Atomically decrement gold balance only if sufficient funds exist.
      // This prevents double-spend even under concurrent requests.
      const updated = await tx.$executeRaw`
        UPDATE "User"
        SET "goldBalance" = "goldBalance" - ${actionConfig.cost}
        WHERE "id" = ${userId}
          AND "goldBalance" >= ${actionConfig.cost}
      `;

      if (updated === 0) {
        // Either user not found or insufficient balance
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { goldBalance: true },
        });

        if (!user) {
          throw new NotFoundException("Kullanici bulunamadi");
        }

        throw new BadRequestException(
          `Yetersiz Gold bakiye. Gerekli: ${actionConfig.cost}, Mevcut: ${user.goldBalance}`,
        );
      }

      // Read the updated balance for the transaction log
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { goldBalance: true },
      });

      const newBalance = user?.goldBalance ?? 0;

      await tx.goldTransaction.create({
        data: {
          userId,
          type: (transactionTypeMap[dto.action] ??
            "PROFILE_BOOST") as import("@prisma/client").GoldTransactionType,
          amount: -actionConfig.cost,
          balance: newBalance,
          description: actionConfig.descriptionTr,
          referenceId: dto.referenceId ?? null,
        },
      });

      return newBalance;
    });

    this.logger.log(
      `User ${userId} spent ${actionConfig.cost} gold on ${dto.action} (new balance: ${result})`,
    );

    return {
      spent: true,
      action: dto.action,
      goldSpent: actionConfig.cost,
      newBalance: result,
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
        orderBy: { createdAt: "desc" },
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
        orderBy: { createdAt: "desc" },
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
        orderBy: { createdAt: "desc" },
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
      throw new NotFoundException("Kullanici bulunamadi");
    }

    // Find the latest active subscription
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        packageTier: true,
        platform: true,
        startDate: true,
        expiryDate: true,
        autoRenew: true,
        cancelledAt: true,
        isActive: true,
        isTrial: true,
        trialEndDate: true,
        gracePeriodEnd: true,
      },
    });

    const tierKey = user.packageTier;
    const packageDef =
      PACKAGE_DEFINITIONS[tierKey as keyof typeof PACKAGE_DEFINITIONS];

    // Determine if subscription is expiring soon (within 3 days)
    let isExpiringSoon = false;
    if (activeSubscription?.expiryDate) {
      const now = new Date();
      const expiry = new Date(activeSubscription.expiryDate);
      const diffMs = expiry.getTime() - now.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      isExpiringSoon = diffDays <= 3 && diffDays > 0;
    }

    // Calculate trial days remaining
    const isTrial = activeSubscription?.isTrial ?? false;
    let trialDaysRemaining = 0;
    if (isTrial && activeSubscription?.trialEndDate) {
      const now = new Date();
      const trialEnd = new Date(activeSubscription.trialEndDate);
      const diffMs = trialEnd.getTime() - now.getTime();
      trialDaysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    // Check if in grace period
    const isInGracePeriod = activeSubscription?.gracePeriodEnd
      ? new Date(activeSubscription.gracePeriodEnd).getTime() > new Date().getTime()
      : false;

    return {
      packageTier: user.packageTier,
      packageName: packageDef?.nameTr ?? "Ucretsiz",
      isPaid: user.packageTier !== "FREE",
      isActive: activeSubscription?.isActive ?? user.packageTier === "FREE",
      autoRenew: activeSubscription?.autoRenew ?? false,
      expiryDate: activeSubscription?.expiryDate ?? null,
      startDate: activeSubscription?.startDate ?? null,
      cancelledAt: activeSubscription?.cancelledAt ?? null,
      isExpiringSoon,
      isTrial,
      trialDaysRemaining,
      isInGracePeriod,
      platform: activeSubscription?.platform ?? null,
      goldBalance: user.goldBalance,
      features: packageDef?.features ?? PACKAGE_DEFINITIONS.FREE.features,
    };
  }

  // ─── Store Webhook Handlers ──────────────────────────────────

  /**
   * Apple App Store Server Notifications V2 notification types.
   */
  private static readonly APPLE_NOTIFICATION_TYPES = {
    DID_RENEW: "DID_RENEW",
    DID_FAIL_TO_RENEW: "DID_FAIL_TO_RENEW",
    EXPIRED: "EXPIRED",
    REFUND: "REFUND",
  } as const;

  /**
   * Google Play RTDN subscription notification types.
   */
  private static readonly GOOGLE_NOTIFICATION_TYPES = {
    SUBSCRIPTION_RENEWED: 2,
    SUBSCRIPTION_CANCELED: 3,
    SUBSCRIPTION_EXPIRED: 13,
  } as const;

  /**
   * Handle Apple App Store Server-to-Server Notification (V2).
   *
   * The signedPayload is a JWS (JSON Web Signature) containing the notification.
   * TODO: Implement proper JWS signature verification using Apple's root certificate chain.
   * For now, we decode the payload without cryptographic verification.
   *
   * Notification types handled:
   * - DID_RENEW: Subscription successfully renewed -> extend expiresAt
   * - DID_FAIL_TO_RENEW: Billing retry failed -> start grace period
   * - EXPIRED: Subscription expired -> downgrade to FREE
   * - REFUND: User received a refund -> downgrade to FREE
   */
  async handleAppleWebhook(signedPayload: string): Promise<{ received: boolean }> {
    this.logger.log("Received Apple S2S notification");

    // TODO: Verify JWS signature using Apple's certificate chain
    // For now, decode the payload (base64url) without signature verification
    let payload: {
      notificationType: string;
      data?: {
        signedTransactionInfo?: string;
        signedRenewalInfo?: string;
      };
    };

    try {
      const parts = signedPayload.split(".");
      if (parts.length !== 3) {
        this.logger.warn("Apple webhook: invalid JWS format (expected 3 parts)");
        return { received: false };
      }
      const payloadBase64 = parts[1];
      const decoded = Buffer.from(payloadBase64, "base64url").toString("utf-8");
      payload = JSON.parse(decoded);
    } catch (err) {
      this.logger.error(`Apple webhook: failed to decode payload: ${err}`);
      return { received: false };
    }

    const { notificationType } = payload;
    this.logger.log(`Apple webhook notificationType: ${notificationType}`);

    // Extract transaction info from the nested signed data
    let transactionInfo: {
      originalTransactionId?: string;
      productId?: string;
      expiresDate?: number;
    } = {};

    try {
      if (payload.data?.signedTransactionInfo) {
        const txnParts = payload.data.signedTransactionInfo.split(".");
        if (txnParts.length === 3) {
          const txnDecoded = Buffer.from(txnParts[1], "base64url").toString("utf-8");
          transactionInfo = JSON.parse(txnDecoded);
        }
      }
    } catch (err) {
      this.logger.warn(`Apple webhook: failed to decode transaction info: ${err}`);
    }

    const originalTransactionId = transactionInfo.originalTransactionId;
    if (!originalTransactionId) {
      this.logger.warn("Apple webhook: no originalTransactionId found, skipping");
      return { received: false };
    }

    // Find the subscription by matching the transaction ID via IAP receipt
    const subscription = await this.findSubscriptionByTransaction(originalTransactionId, "APPLE");

    if (!subscription) {
      this.logger.warn(
        `Apple webhook: no subscription found for transactionId ${originalTransactionId}`,
      );
      return { received: false };
    }

    const { DID_RENEW, DID_FAIL_TO_RENEW, EXPIRED, REFUND } =
      PaymentsService.APPLE_NOTIFICATION_TYPES;

    switch (notificationType) {
      case DID_RENEW: {
        // Subscription renewed successfully — extend expiry date
        const newExpiryDate = transactionInfo.expiresDate
          ? new Date(transactionInfo.expiresDate)
          : this.calculateNextExpiryDate(subscription.expiryDate);

        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            expiryDate: newExpiryDate,
            isActive: true,
            autoRenew: true,
            gracePeriodEnd: null,
          },
        });

        this.logger.log(
          `Apple DID_RENEW: subscription ${subscription.id} renewed until ${newExpiryDate.toISOString()}`,
        );

        // Award monthly Gold allocation on renewal
        await this.awardMonthlyGold(subscription.userId, subscription.packageTier);
        break;
      }

      case DID_FAIL_TO_RENEW: {
        // Billing retry period — start grace period (Apple retries for ~60 days)
        const gracePeriodEnd = new Date();
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 16); // 16-day billing grace period

        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            autoRenew: false,
            gracePeriodEnd,
          },
        });

        this.logger.log(
          `Apple DID_FAIL_TO_RENEW: subscription ${subscription.id} grace period until ${gracePeriodEnd.toISOString()}`,
        );
        break;
      }

      case EXPIRED: {
        // Subscription expired — downgrade to FREE
        await this.downgradeSubscriptionToFree(subscription.id, subscription.userId);
        this.logger.log(
          `Apple EXPIRED: subscription ${subscription.id} user ${subscription.userId} downgraded to FREE`,
        );
        break;
      }

      case REFUND: {
        // Refund issued — immediately downgrade to FREE
        await this.downgradeSubscriptionToFree(subscription.id, subscription.userId);
        this.logger.log(
          `Apple REFUND: subscription ${subscription.id} user ${subscription.userId} downgraded to FREE`,
        );
        break;
      }

      default:
        this.logger.log(`Apple webhook: unhandled notificationType ${notificationType}`);
        break;
    }

    return { received: true };
  }

  /**
   * Handle Google Play Real-Time Developer Notification (RTDN).
   *
   * Google sends a Pub/Sub message with base64-encoded JSON data containing:
   * - subscriptionNotification (for subscription events)
   * - oneTimeProductNotification (for one-time purchases)
   *
   * TODO: Verify the Pub/Sub message authenticity (verify push endpoint is registered).
   * TODO: Call Google Play Developer API to get full subscription details.
   *
   * Subscription notification types handled:
   * - 2 (SUBSCRIPTION_RENEWED): extend expiresAt
   * - 3 (SUBSCRIPTION_CANCELED): mark autoRenew=false
   * - 13 (SUBSCRIPTION_EXPIRED): downgrade to FREE
   */
  async handleGoogleWebhook(encodedData: string): Promise<{ received: boolean }> {
    this.logger.log("Received Google RTDN notification");

    let notification: {
      subscriptionNotification?: {
        notificationType: number;
        purchaseToken: string;
        subscriptionId: string;
      };
      packageName?: string;
    };

    try {
      const decoded = Buffer.from(encodedData, "base64").toString("utf-8");
      notification = JSON.parse(decoded);
    } catch (err) {
      this.logger.error(`Google webhook: failed to decode message data: ${err}`);
      return { received: false };
    }

    const subNotification = notification.subscriptionNotification;
    if (!subNotification) {
      this.logger.log("Google webhook: no subscriptionNotification, skipping (possibly one-time purchase)");
      return { received: true };
    }

    const { notificationType, purchaseToken } = subNotification;
    this.logger.log(
      `Google webhook notificationType: ${notificationType}, token: ${purchaseToken.substring(0, 20)}...`,
    );

    // Find subscription by purchase token
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        purchaseToken,
        platform: "GOOGLE",
        isActive: true,
      },
      select: {
        id: true,
        userId: true,
        packageTier: true,
        expiryDate: true,
      },
    });

    if (!subscription) {
      this.logger.warn(
        `Google webhook: no active subscription found for purchaseToken ${purchaseToken.substring(0, 20)}...`,
      );
      return { received: false };
    }

    const { SUBSCRIPTION_RENEWED, SUBSCRIPTION_CANCELED, SUBSCRIPTION_EXPIRED } =
      PaymentsService.GOOGLE_NOTIFICATION_TYPES;

    switch (notificationType) {
      case SUBSCRIPTION_RENEWED: {
        // Subscription renewed — extend expiry by 1 month
        const newExpiryDate = this.calculateNextExpiryDate(subscription.expiryDate);

        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            expiryDate: newExpiryDate,
            isActive: true,
            autoRenew: true,
            gracePeriodEnd: null,
          },
        });

        this.logger.log(
          `Google SUBSCRIPTION_RENEWED: subscription ${subscription.id} renewed until ${newExpiryDate.toISOString()}`,
        );

        // Award monthly Gold allocation on renewal
        await this.awardMonthlyGold(subscription.userId, subscription.packageTier);
        break;
      }

      case SUBSCRIPTION_CANCELED: {
        // User canceled — keep access until expiryDate, stop auto-renew
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            autoRenew: false,
            cancelledAt: new Date(),
          },
        });

        this.logger.log(
          `Google SUBSCRIPTION_CANCELED: subscription ${subscription.id} will expire at ${subscription.expiryDate.toISOString()}`,
        );
        break;
      }

      case SUBSCRIPTION_EXPIRED: {
        // Subscription expired — downgrade to FREE
        await this.downgradeSubscriptionToFree(subscription.id, subscription.userId);
        this.logger.log(
          `Google SUBSCRIPTION_EXPIRED: subscription ${subscription.id} user ${subscription.userId} downgraded to FREE`,
        );
        break;
      }

      default:
        this.logger.log(`Google webhook: unhandled notificationType ${notificationType}`);
        break;
    }

    return { received: true };
  }

  // ─── Webhook Helper Methods ───────────────────────────────────

  /**
   * Find a subscription by its original transaction ID (via IAP receipt).
   */
  private async findSubscriptionByTransaction(
    transactionId: string,
    platform: "APPLE" | "GOOGLE",
  ) {
    const receipt = await this.prisma.iapReceipt.findFirst({
      where: { transactionId },
      select: { subscriptionId: true },
    });

    if (!receipt?.subscriptionId) {
      return null;
    }

    return this.prisma.subscription.findFirst({
      where: {
        id: receipt.subscriptionId,
        platform,
      },
      select: {
        id: true,
        userId: true,
        packageTier: true,
        expiryDate: true,
      },
    });
  }

  /**
   * Calculate the next expiry date by extending 1 month from current expiry.
   */
  private calculateNextExpiryDate(currentExpiry: Date): Date {
    const newExpiry = new Date(currentExpiry);
    newExpiry.setMonth(newExpiry.getMonth() + 1);
    return newExpiry;
  }

  /**
   * Award monthly Gold allocation for the given package tier.
   * Called on subscription renewal via webhook.
   */
  private async awardMonthlyGold(userId: string, packageTier: string): Promise<void> {
    const packageDef =
      PACKAGE_DEFINITIONS[packageTier as keyof typeof PACKAGE_DEFINITIONS];

    if (!packageDef || packageDef.features.monthlyGold <= 0) {
      return;
    }

    try {
      await this.prisma.$transaction(async (tx) => {
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
            type: "SUBSCRIPTION_ALLOCATION",
            amount: packageDef.features.monthlyGold,
            balance: newBalance,
            description: `${packageDef.name} aylik Gold tahsisi (otomatik yenileme)`,
          },
        });
      });

      this.logger.log(
        `Awarded ${packageDef.features.monthlyGold} monthly Gold to user ${userId} (${packageTier})`,
      );
    } catch (err) {
      this.logger.error(`Failed to award monthly Gold to user ${userId}: ${err}`);
    }
  }

  /**
   * Downgrade a user to FREE tier and deactivate their subscription.
   * Used by webhook handlers for expired/refunded subscriptions.
   */
  private async downgradeSubscriptionToFree(subscriptionId: string, userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          isActive: false,
          autoRenew: false,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { packageTier: "FREE" },
      });
    });
  }

  /**
   * Process expired subscriptions with 3-day grace period.
   * Intended to be called by a scheduled cron job (e.g. every hour).
   *
   * Flow:
   * 1. Subscription expires + autoRenew is false + no grace period set yet
   *    -> Set gracePeriodEnd = expiryDate + 3 days (premium features continue)
   * 2. Grace period has ended
   *    -> Deactivate subscription + downgrade to FREE
   */
  async processExpiredSubscriptions(): Promise<number> {
    const now = new Date();
    const GRACE_PERIOD_DAYS = 3;

    // Phase 1: Find newly expired subscriptions without grace period and assign one
    const newlyExpired = await this.prisma.subscription.findMany({
      where: {
        isActive: true,
        autoRenew: false,
        expiryDate: { lt: now },
        gracePeriodEnd: null,
      },
      select: {
        id: true,
        userId: true,
        packageTier: true,
        expiryDate: true,
      },
    });

    for (const sub of newlyExpired) {
      try {
        const gracePeriodEnd = new Date(sub.expiryDate);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { gracePeriodEnd },
        });

        this.logger.log(
          `Grace period set for subscription ${sub.id}: user ${sub.userId} has until ${gracePeriodEnd.toISOString()}`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to set grace period for subscription ${sub.id}: ${err}`,
        );
      }
    }

    // Phase 2: Find subscriptions where grace period has ended -> downgrade to FREE
    const graceExpired = await this.prisma.subscription.findMany({
      where: {
        isActive: true,
        autoRenew: false,
        gracePeriodEnd: { lt: now },
      },
      select: {
        id: true,
        userId: true,
        packageTier: true,
      },
    });

    let processedCount = 0;

    for (const sub of graceExpired) {
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
            data: { packageTier: "FREE" },
          });
        });

        this.logger.log(
          `Expired subscription ${sub.id}: user ${sub.userId} downgraded from ${sub.packageTier} to FREE (grace period ended)`,
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
  async purchaseOneTime(
    userId: string,
    productId: string,
    platform: string,
    receipt: string,
  ) {
    const product = ONE_TIME_PRODUCTS[productId];
    if (!product) {
      throw new BadRequestException(
        `Geçersiz ürün. Geçerli ürünler: ${Object.keys(ONE_TIME_PRODUCTS).join(", ")}`,
      );
    }

    // Validate receipt
    const platformUpper = platform.toUpperCase() as "APPLE" | "GOOGLE";
    const validation = await this.validatePlatformReceipt(
      platformUpper,
      receipt,
    );
    if (!validation.isValid) {
      throw new BadRequestException("Ödeme makbuzu doğrulanamadı");
    }

    // Prevent receipt replay
    const existingReceipt = await this.prisma.iapReceipt.findUnique({
      where: { transactionId: validation.transactionId },
    });
    if (existingReceipt) {
      throw new BadRequestException("Bu makbuz daha önce kullanılmış");
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
          type: "PURCHASE",
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
  async hasOneTimePurchase(
    userId: string,
    productId: string,
  ): Promise<boolean> {
    const purchase = await this.prisma.goldTransaction.findFirst({
      where: {
        userId,
        referenceId: productId,
        type: "PURCHASE",
        description: {
          contains: ONE_TIME_PRODUCTS[productId]?.descriptionTr ?? "",
        },
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
    platform: "APPLE" | "GOOGLE",
    receipt: string,
    productId?: string,
  ): Promise<ReceiptValidationResult> {
    this.logger.debug(
      `[${platform}] Validating receipt: ${receipt.substring(0, 20)}...`,
    );

    const result = await this.receiptValidator.validateReceipt(
      platform,
      receipt,
      "com.luma.dating",
      productId,
    );

    this.logger.debug(
      `[${platform}] Validation result: valid=${result.isValid}, txn=${result.transactionId}`,
    );

    return result;
  }
}
