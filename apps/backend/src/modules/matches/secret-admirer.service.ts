import { Injectable, BadRequestException } from "@nestjs/common";

const SECRET_ADMIRER_CONFIG = {
  COST_GOLD: 75,
  EXTRA_GUESS_COST: 25,
  FREE_GUESSES: 3,
  EXPIRY_HOURS: 48,
  FREE_SENDS_PER_MONTH: {
    FREE: 0,
    GOLD: 1,
    PRO: 3,
    RESERVED: 999999,
  } as Record<string, number>,
};

@Injectable()
export class SecretAdmirerService {
  /**
   * Send a secret admirer challenge to another user.
   * The receiver must guess who sent it from a pool of 3 candidates.
   */
  async send(
    senderId: string,
    receiverId: string,
    tier: string,
  ): Promise<{ id: string; costGold: number }> {
    const freeAllowance =
      SECRET_ADMIRER_CONFIG.FREE_SENDS_PER_MONTH[tier] || 0;

    // TODO: Check monthly usage from DB
    // const sentThisMonth = await this.prisma.secretAdmirer.count({
    //   where: { senderId, createdAt: { gte: startOfMonth } },
    // });
    const sentThisMonth = 0;

    const costGold =
      sentThisMonth < freeAllowance ? 0 : SECRET_ADMIRER_CONFIG.COST_GOLD;

    // TODO: Select 2 random decoy users from DB
    // const decoys = await this.prisma.user.findMany({
    //   where: { id: { notIn: [senderId, receiverId] }, isActive: true },
    //   take: 2,
    //   orderBy: { createdAt: 'desc' },
    // });

    // TODO: Create SecretAdmirer record in DB
    // const admirer = await this.prisma.secretAdmirer.create({
    //   data: {
    //     senderId,
    //     receiverId,
    //     candidates: [senderId, decoy1.id, decoy2.id],
    //     maxGuesses: SECRET_ADMIRER_CONFIG.FREE_GUESSES,
    //     expiresAt: new Date(Date.now() + SECRET_ADMIRER_CONFIG.EXPIRY_HOURS * 60 * 60 * 1000),
    //   },
    // });

    const id = `sa_${Date.now()}`;

    return { id, costGold };
  }

  /**
   * Guess which user sent the secret admirer challenge.
   * Returns whether the guess was correct and remaining guesses.
   */
  async guess(
    admirerId: string,
    receiverId: string,
    guessedUserId: string,
  ): Promise<{
    correct: boolean;
    matchCreated: boolean;
    guessesRemaining: number;
  }> {
    // TODO: Fetch admirer from DB, verify receiverId matches
    // const admirer = await this.prisma.secretAdmirer.findUnique({
    //   where: { id: admirerId },
    // });
    // if (!admirer || admirer.receiverId !== receiverId) {
    //   throw new BadRequestException('Gizli hayran bulunamadı');
    // }

    // TODO: Check guesses remaining
    // if (admirer.guessesUsed >= admirer.maxGuesses) {
    //   throw new BadRequestException('Tahmin hakkınız kalmadı');
    // }

    // TODO: If correct, create Match and update status
    // if (guessedUserId === admirer.senderId) {
    //   await this.prisma.match.create({ ... });
    //   await this.prisma.secretAdmirer.update({ where: { id: admirerId }, data: { status: 'GUESSED_CORRECT' } });
    //   return { correct: true, matchCreated: true, guessesRemaining: 0 };
    // }

    // TODO: If wrong, decrement guesses
    // await this.prisma.secretAdmirer.update({
    //   where: { id: admirerId },
    //   data: { guessesUsed: { increment: 1 } },
    // });

    return { correct: false, matchCreated: false, guessesRemaining: 2 };
  }

  /**
   * Get all pending secret admirer challenges received by the user.
   */
  async getReceived(userId: string): Promise<any[]> {
    // TODO: Fetch pending secret admirers for this user
    // return this.prisma.secretAdmirer.findMany({
    //   where: { receiverId: userId, status: 'PENDING', expiresAt: { gt: new Date() } },
    //   orderBy: { createdAt: 'desc' },
    // });

    return [];
  }
}
