import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BadgesService } from '../badges/badges.service';
import { CreateSessionDto, ExtendSessionDto } from './dto';

// Harmony Room constants
const DEFAULT_DURATION_MINUTES = 30; // Free: 30 minutes
const GOLD_PER_EXTENSION = 50; // Gold cost per 15-minute extension block
const EXTENSION_BLOCK_MINUTES = 15;
const MAX_EXTENSION_MINUTES = 60; // Max total extension (4 blocks x 15 min)
const CARDS_PER_SESSION = 5; // Initial cards
const CARDS_PER_EXTENSION = 2; // Extra cards per extension

@Injectable()
export class HarmonyService {
  private readonly logger = new Logger(HarmonyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly badgesService: BadgesService,
  ) {}

  /**
   * Get all Harmony Room sessions for a user.
   * Returns sessions where user is userA or userB, ordered by most recent.
   */
  async getUserSessions(userId: string) {
    const sessions = await this.prisma.harmonySession.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      include: {
        usedCards: {
          include: {
            questionCard: true,
            gameCard: true,
          },
          orderBy: { usedAt: 'asc' },
        },
        match: {
          select: {
            compatibilityScore: true,
            compatibilityLevel: true,
          },
        },
        userA: {
          select: {
            id: true,
            profile: { select: { firstName: true } },
          },
        },
        userB: {
          select: {
            id: true,
            profile: { select: { firstName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      sessions: sessions.map((session) => {
        const cards = session.usedCards.map((uc) => {
          if (uc.questionCard) {
            return {
              type: 'question' as const,
              id: uc.questionCard.id,
              category: uc.questionCard.category,
              textEn: uc.questionCard.textEn,
              textTr: uc.questionCard.textTr,
              usedAt: uc.usedAt,
            };
          }
          return {
            type: 'game' as const,
            id: uc.gameCard!.id,
            nameEn: uc.gameCard!.nameEn,
            nameTr: uc.gameCard!.nameTr,
            descriptionEn: uc.gameCard!.descriptionEn,
            descriptionTr: uc.gameCard!.descriptionTr,
            gameType: uc.gameCard!.gameType,
            usedAt: uc.usedAt,
          };
        });

        return {
          sessionId: session.id,
          matchId: session.matchId,
          userAId: session.userAId,
          userBId: session.userBId,
          userAName: session.userA?.profile?.firstName ?? '',
          userBName: session.userB?.profile?.firstName ?? '',
          status: session.status,
          startedAt: session.startedAt,
          endsAt: session.endsAt,
          actualEndedAt: session.actualEndedAt,
          totalExtensionMinutes: session.totalExtensionMinutes,
          hasVoiceChat: session.hasVoiceChat,
          hasVideoChat: session.hasVideoChat,
          compatibility: session.match,
          cards,
        };
      }),
      total: sessions.length,
    };
  }

  /**
   * Create a new Harmony Room session between matched users.
   * Default duration: 30 minutes free.
   */
  async createSession(userId: string, dto: CreateSessionDto) {
    // Verify match exists and user is a participant
    const match = await this.prisma.match.findUnique({
      where: { id: dto.matchId },
    });

    if (!match || !match.isActive) {
      throw new NotFoundException('Eşleşme bulunamadı veya aktif değil');
    }

    if (match.userAId !== userId && match.userBId !== userId) {
      throw new ForbiddenException('Bu eşleşmenin katılımcısı değilsiniz');
    }

    // Check no active session already exists for this match
    const activeSession = await this.prisma.harmonySession.findFirst({
      where: {
        matchId: dto.matchId,
        status: { in: ['PENDING', 'ACTIVE', 'EXTENDED'] },
      },
    });

    if (activeSession) {
      throw new BadRequestException('Bu eşleşme için zaten aktif bir Harmony Room oturumu var');
    }

    // Tier gating: FREE users cannot create Harmony Room sessions
    const requestingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { packageTier: true },
    });

    if (requestingUser?.packageTier === 'FREE') {
      throw new ForbiddenException(
        'Harmony Room başlatmak için Gold veya üzeri üyelik gereklidir. Davet ile katılabilirsiniz.',
      );
    }

    // 5-minute chat prerequisite: both users must have chatted for at least 5 minutes
    const chatMessages = await this.prisma.chatMessage.findMany({
      where: { matchId: dto.matchId },
      orderBy: { createdAt: 'asc' },
      select: { senderId: true, createdAt: true },
    });

    const senderIds = new Set(chatMessages.map((msg) => msg.senderId));
    const bothUsersSentMessages =
      senderIds.has(match.userAId) && senderIds.has(match.userBId);

    if (!bothUsersSentMessages || chatMessages.length < 2) {
      throw new BadRequestException(
        'Harmony Room için en az 5 dakika sohbet etmeniz gerekiyor.',
      );
    }

    const firstMessageTime = chatMessages[0].createdAt.getTime();
    const lastMessageTime = chatMessages[chatMessages.length - 1].createdAt.getTime();
    const chatDurationMs = lastMessageTime - firstMessageTime;
    const MIN_CHAT_DURATION_MS = 300000; // 5 minutes

    if (chatDurationMs < MIN_CHAT_DURATION_MS) {
      throw new BadRequestException(
        'Harmony Room için en az 5 dakika sohbet etmeniz gerekiyor.',
      );
    }

    // Determine partner
    const partnerId = match.userAId === userId ? match.userBId : match.userAId;

    // Create session
    const now = new Date();
    const endsAt = new Date(now.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000);

    const session = await this.prisma.harmonySession.create({
      data: {
        matchId: dto.matchId,
        userAId: match.userAId,
        userBId: match.userBId,
        status: 'ACTIVE',
        startedAt: now,
        endsAt,
      },
    });

    // Assign initial cards (category-based deck selection or mixed)
    const questionCardWhere: Record<string, unknown> = { isActive: true };
    if (dto.deckCategory) {
      questionCardWhere.category = dto.deckCategory as 'ICEBREAKER' | 'DEEP_CONNECTION' | 'FUN_PLAYFUL';
    }
    const questionCards = await this.prisma.harmonyQuestionCard.findMany({
      where: questionCardWhere,
      orderBy: { order: 'asc' },
    });

    const gameCards = await this.prisma.harmonyGameCard.findMany({
      where: { isActive: true },
    });

    // Pick random cards
    const selectedQuestionCards = this.pickRandom(questionCards, Math.min(CARDS_PER_SESSION - 1, questionCards.length));
    const selectedGameCard = gameCards.length > 0 ? this.pickRandom(gameCards, 1) : [];

    // Create used card records
    const usedCardData = [
      ...selectedQuestionCards.map((card) => ({
        sessionId: session.id,
        questionCardId: card.id,
      })),
      ...selectedGameCard.map((card) => ({
        sessionId: session.id,
        gameCardId: card.id,
      })),
    ];

    if (usedCardData.length > 0) {
      await this.prisma.harmonyUsedCard.createMany({ data: usedCardData });
    }

    // Send notification to partner
    await this.prisma.notification.create({
      data: {
        userId: partnerId,
        type: 'HARMONY_INVITE',
        title: 'Harmony Room Daveti!',
        body: 'Eşleşmeniz sizi Harmony Room\'a davet ediyor. Katılın ve daha yakından tanışın!',
        data: { sessionId: session.id, matchId: dto.matchId },
      },
    });

    // Return session details
    const cards = await this.getSessionCards(session.id);

    return {
      sessionId: session.id,
      matchId: dto.matchId,
      status: session.status,
      startedAt: session.startedAt,
      endsAt: session.endsAt,
      durationMinutes: DEFAULT_DURATION_MINUTES,
      cards,
    };
  }

  /**
   * Get an active Harmony Room session by ID.
   */
  async getSession(userId: string, sessionId: string) {
    const session = await this.prisma.harmonySession.findUnique({
      where: { id: sessionId },
      include: {
        match: {
          select: {
            compatibilityScore: true,
            compatibilityLevel: true,
          },
        },
        userA: {
          select: {
            id: true,
            profile: { select: { firstName: true } },
          },
        },
        userB: {
          select: {
            id: true,
            profile: { select: { firstName: true } },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Harmony Room oturumu bulunamadı');
    }

    if (session.userAId !== userId && session.userBId !== userId) {
      throw new ForbiddenException('Bu oturumun katılımcısı değilsiniz');
    }

    // Check if session has expired
    if (
      session.status === 'ACTIVE' &&
      session.endsAt &&
      session.endsAt < new Date()
    ) {
      await this.prisma.harmonySession.update({
        where: { id: sessionId },
        data: { status: 'ENDED', actualEndedAt: new Date() },
      });
      session.status = 'ENDED';

      // Check chat_master badge for both participants (non-blocking)
      this.badgesService.checkAndAwardBadges(session.userAId, 'harmony').catch((err) => this.logger.warn('Badge check failed', err.message));
      this.badgesService.checkAndAwardBadges(session.userBId, 'harmony').catch((err) => this.logger.warn('Badge check failed', err.message));
    }

    // Get cards and messages
    const [cards, messageCount] = await Promise.all([
      this.getSessionCards(sessionId),
      this.prisma.harmonyMessage.count({ where: { sessionId } }),
    ]);

    // Calculate remaining time
    const remainingMs = session.endsAt
      ? Math.max(0, session.endsAt.getTime() - Date.now())
      : 0;

    return {
      sessionId: session.id,
      matchId: session.matchId,
      userAId: session.userAId,
      userBId: session.userBId,
      userAName: session.userA?.profile?.firstName ?? '',
      userBName: session.userB?.profile?.firstName ?? '',
      status: session.status,
      startedAt: session.startedAt,
      endsAt: session.endsAt,
      remainingSeconds: Math.floor(remainingMs / 1000),
      totalExtensionMinutes: session.totalExtensionMinutes,
      hasVoiceChat: session.hasVoiceChat,
      hasVideoChat: session.hasVideoChat,
      compatibility: session.match,
      messageCount,
      cards,
    };
  }

  /**
   * Extend an active Harmony Room session (costs Gold).
   */
  async extendSession(userId: string, dto: ExtendSessionDto) {
    const session = await this.prisma.harmonySession.findUnique({
      where: { id: dto.sessionId },
    });

    if (!session) {
      throw new NotFoundException('Oturum bulunamadı');
    }

    if (session.userAId !== userId && session.userBId !== userId) {
      throw new ForbiddenException('Bu oturumun katılımcısı değilsiniz');
    }

    if (!['ACTIVE', 'EXTENDED'].includes(session.status)) {
      throw new BadRequestException('Sadece aktif oturumlar uzatılabilir');
    }

    // Check total extension limit
    if (session.totalExtensionMinutes + dto.additionalMinutes > MAX_EXTENSION_MINUTES) {
      throw new BadRequestException(
        `Maksimum uzatma süresi ${MAX_EXTENSION_MINUTES} dakikadır. Kalan: ${MAX_EXTENSION_MINUTES - session.totalExtensionMinutes} dakika.`,
      );
    }

    // Calculate gold cost — block-based pricing (15-min blocks at 50 Gold each)
    const extensionBlocks = Math.ceil(dto.additionalMinutes / EXTENSION_BLOCK_MINUTES);
    const goldCost = extensionBlocks * GOLD_PER_EXTENSION;

    // Check user's gold balance
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { goldBalance: true },
    });

    if (!user || user.goldBalance < goldCost) {
      throw new BadRequestException(
        `Yetersiz Gold bakiye. Gerekli: ${goldCost} Gold, Mevcut: ${user?.goldBalance ?? 0} Gold`,
      );
    }

    // Execute extension in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Deduct gold
      const newBalance = user.goldBalance - goldCost;
      await tx.user.update({
        where: { id: userId },
        data: { goldBalance: newBalance },
      });

      // Record gold transaction
      await tx.goldTransaction.create({
        data: {
          userId,
          type: 'HARMONY_EXTENSION',
          amount: -goldCost,
          balance: newBalance,
          description: `Harmony Room ${dto.additionalMinutes} dakika uzatma`,
          referenceId: dto.sessionId,
        },
      });

      // Record extension
      await tx.harmonyExtension.create({
        data: {
          sessionId: dto.sessionId,
          userId,
          goldSpent: goldCost,
          minutesAdded: dto.additionalMinutes,
        },
      });

      // Extend session time
      const currentEndsAt = session.endsAt ?? new Date();
      const newEndsAt = new Date(
        currentEndsAt.getTime() + dto.additionalMinutes * 60 * 1000,
      );

      const updatedSession = await tx.harmonySession.update({
        where: { id: dto.sessionId },
        data: {
          status: 'EXTENDED',
          endsAt: newEndsAt,
          totalExtensionMinutes: session.totalExtensionMinutes + dto.additionalMinutes,
        },
      });

      return {
        newEndsAt: updatedSession.endsAt,
        newBalance,
      };
    });

    // Add bonus cards for extension
    const questionCards = await this.prisma.harmonyQuestionCard.findMany({
      where: { isActive: true },
    });
    const alreadyUsed = await this.prisma.harmonyUsedCard.findMany({
      where: { sessionId: dto.sessionId },
      select: { questionCardId: true, gameCardId: true },
    });
    const usedIds = new Set([
      ...alreadyUsed.map((c) => c.questionCardId).filter(Boolean),
      ...alreadyUsed.map((c) => c.gameCardId).filter(Boolean),
    ]);
    const available = questionCards.filter((c) => !usedIds.has(c.id));
    const bonusCards = this.pickRandom(available, Math.min(CARDS_PER_EXTENSION, available.length));

    if (bonusCards.length > 0) {
      await this.prisma.harmonyUsedCard.createMany({
        data: bonusCards.map((card) => ({
          sessionId: dto.sessionId,
          questionCardId: card.id,
        })),
      });
    }

    return {
      sessionId: dto.sessionId,
      newExpiresAt: result.newEndsAt,
      goldDeducted: goldCost,
      goldBalance: result.newBalance,
      additionalMinutes: dto.additionalMinutes,
      bonusCardsAdded: bonusCards.length,
    };
  }

  /**
   * Get harmony cards for a session.
   */
  async getCards(userId: string, sessionId: string) {
    const session = await this.prisma.harmonySession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Oturum bulunamadı');
    }

    if (session.userAId !== userId && session.userBId !== userId) {
      throw new ForbiddenException('Bu oturumun katılımcısı değilsiniz');
    }

    return { sessionId, cards: await this.getSessionCards(sessionId) };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private async getSessionCards(sessionId: string) {
    const usedCards = await this.prisma.harmonyUsedCard.findMany({
      where: { sessionId },
      include: {
        questionCard: true,
        gameCard: true,
      },
      orderBy: { usedAt: 'asc' },
    });

    return usedCards.map((uc) => {
      if (uc.questionCard) {
        return {
          type: 'question' as const,
          id: uc.questionCard.id,
          category: uc.questionCard.category,
          textEn: uc.questionCard.textEn,
          textTr: uc.questionCard.textTr,
          usedAt: uc.usedAt,
        };
      }
      return {
        type: 'game' as const,
        id: uc.gameCard!.id,
        nameEn: uc.gameCard!.nameEn,
        nameTr: uc.gameCard!.nameTr,
        descriptionEn: uc.gameCard!.descriptionEn,
        descriptionTr: uc.gameCard!.descriptionTr,
        gameType: uc.gameCard!.gameType,
        usedAt: uc.usedAt,
      };
    });
  }

  private pickRandom<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
}
