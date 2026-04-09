import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

const REFERRAL_BONUS_JETON = 50;

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Generate a unique referral code for a user.
   * Format: LUMA-XXXX (4 alphanumeric chars)
   */
  async generateReferralCode(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    if (user?.referralCode) {
      return user.referralCode;
    }

    let code: string;
    let attempts = 0;

    do {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let random = "";
      for (let i = 0; i < 4; i++) {
        random += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      code = `LUMA-${random}`;
      attempts++;

      const existing = await this.prisma.user.findUnique({
        where: { referralCode: code },
      });

      if (!existing) break;
    } while (attempts < 10);

    if (attempts >= 10) {
      throw new BadRequestException("Davet kodu oluşturulamadı, tekrar deneyin");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { referralCode: code },
    });

    this.logger.log(`Generated referral code ${code} for user ${userId}`);
    return code;
  }

  /**
   * Claim a referral code — awards 50 jeton to both referrer and new user.
   */
  async claimReferralCode(
    newUserId: string,
    code: string,
  ): Promise<{ referrerName: string; bonusJeton: number }> {
    // Find the referrer by code
    const referrer = await this.prisma.user.findUnique({
      where: { referralCode: code },
      select: {
        id: true,
        profile: { select: { firstName: true } },
      },
    });

    if (!referrer) {
      throw new NotFoundException("Geçersiz davet kodu");
    }

    if (referrer.id === newUserId) {
      throw new BadRequestException("Kendi davet kodunu kullanamazsın");
    }

    // Check if user already used a referral
    const newUser = await this.prisma.user.findUnique({
      where: { id: newUserId },
      select: { referredById: true },
    });

    if (newUser?.referredById) {
      throw new BadRequestException("Zaten bir davet kodu kullandın");
    }

    // Award both users in a transaction
    await this.prisma.$transaction(async (tx) => {
      // Set referredBy
      await tx.user.update({
        where: { id: newUserId },
        data: { referredById: referrer.id },
      });

      // Award referrer
      await tx.user.update({
        where: { id: referrer.id },
        data: { goldBalance: { increment: REFERRAL_BONUS_JETON } },
      });

      // Award new user
      await tx.user.update({
        where: { id: newUserId },
        data: { goldBalance: { increment: REFERRAL_BONUS_JETON } },
      });

      // Get updated balances for transaction records
      const updatedReferrer = await tx.user.findUnique({
        where: { id: referrer.id },
        select: { goldBalance: true },
      });
      const updatedNewUser = await tx.user.findUnique({
        where: { id: newUserId },
        select: { goldBalance: true },
      });

      // Record transactions for both
      await tx.goldTransaction.createMany({
        data: [
          {
            userId: referrer.id,
            amount: REFERRAL_BONUS_JETON,
            balance: updatedReferrer?.goldBalance ?? REFERRAL_BONUS_JETON,
            type: "REFERRAL_BONUS",
            description: "Arkadaş davet ödülü",
          },
          {
            userId: newUserId,
            amount: REFERRAL_BONUS_JETON,
            balance: updatedNewUser?.goldBalance ?? REFERRAL_BONUS_JETON,
            type: "REFERRAL_BONUS",
            description: "Davet kodu ile katılım ödülü",
          },
        ],
      });
    });

    // Notify referrer
    try {
      await this.notificationsService.sendPushNotification(
        referrer.id,
        "Davet Ödülü!",
        `Arkadaşın katıldı! ${REFERRAL_BONUS_JETON} jeton kazandın`,
        { type: "REFERRAL_REWARD" },
        "REFERRAL_REWARD",
      );
    } catch {
      this.logger.warn(`Failed to notify referrer ${referrer.id}`);
    }

    this.logger.log(
      `Referral claimed: ${newUserId} used code ${code} from ${referrer.id}`,
    );

    return {
      referrerName: referrer.profile?.firstName || "Luma kullanıcısı",
      bonusJeton: REFERRAL_BONUS_JETON,
    };
  }

  /**
   * Get referral info for current user.
   */
  async getMyReferralInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
      },
    });

    if (!user) {
      throw new NotFoundException("Kullanıcı bulunamadı");
    }

    // Auto-generate code if doesn't exist
    let referralCode = user.referralCode;
    if (!referralCode) {
      referralCode = await this.generateReferralCode(userId);
    }

    // Fetch referrals separately
    const referrals = await this.prisma.user.findMany({
      where: { referredById: userId },
      select: {
        id: true,
        createdAt: true,
        profile: { select: { firstName: true } },
        photos: { take: 1, select: { url: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      referralCode,
      referralCount: referrals.length,
      totalEarned: referrals.length * REFERRAL_BONUS_JETON,
      referrals: referrals.map((r) => ({
        id: r.id,
        name: r.profile?.firstName || "Kullanıcı",
        avatarUrl: r.photos?.[0]?.url || null,
        joinedAt: r.createdAt,
      })),
    };
  }
}
