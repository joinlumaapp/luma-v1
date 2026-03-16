import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import {
  StartIcebreakerDto,
  SubmitIcebreakerAnswerDto,
  IcebreakerGameType,
} from "./dto/icebreaker.dto";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * IcebreakerController — Fun games to break the ice between new matches.
 *
 * 3 Game Types:
 *   - THIS_OR_THAT: "Bu mu O mu?" — pick between 2 options
 *   - TWO_TRUTHS_ONE_LIE: "2 Dogru 1 Yanlis" — guess the lie
 *   - RAPID_FIRE: "Hizli Sorular" — 10 quick fun questions
 *
 * Endpoints:
 *   GET  /chat/icebreaker/:matchId          — Get available games for a match
 *   POST /chat/icebreaker/:matchId/start    — Start a game session
 *   POST /chat/icebreaker/:matchId/answer   — Submit an answer
 *   GET  /chat/icebreaker/:matchId/history  — Get past game sessions with answers
 */
@ApiTags("Chat")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("chat/icebreaker")
export class IcebreakerController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(":matchId")
  @ApiOperation({ summary: "Get available icebreaker games for a match" })
  async getAvailableGames(
    @CurrentUser("sub") userId: string,
    @Param("matchId") matchId: string,
  ) {
    // Verify the user is part of this match
    const match = await this.verifyMatchParticipation(userId, matchId);

    // Return available games with metadata
    const games = [
      {
        type: IcebreakerGameType.THIS_OR_THAT,
        title: "Bu mu O mu?",
        description: "Ikisinden birini sec, eslesmen de secsin!",
        emoji: "\u2696\uFE0F",
        questionCount: 8,
        estimatedMinutes: 3,
        isAvailable: true,
      },
      {
        type: IcebreakerGameType.TWO_TRUTHS_ONE_LIE,
        title: "2 Dogru 1 Yanlis",
        description: "3 sey yaz, partnerin yalani bulsun!",
        emoji: "\uD83E\uDD25",
        questionCount: 3,
        estimatedMinutes: 5,
        isAvailable: true,
      },
      {
        type: IcebreakerGameType.RAPID_FIRE,
        title: "Hizli Sorular",
        description: "10 eglenceli soruya hizlica cevap ver!",
        emoji: "\u26A1",
        questionCount: 10,
        estimatedMinutes: 4,
        isAvailable: true,
      },
    ];

    return {
      matchId: match.id,
      games,
    };
  }

  @Post(":matchId/start")
  @ApiOperation({ summary: "Start an icebreaker game session" })
  async startGame(
    @CurrentUser("sub") userId: string,
    @Param("matchId") matchId: string,
    @Body() dto: StartIcebreakerDto,
  ) {
    const match = await this.verifyMatchParticipation(userId, matchId);

    // Generate questions based on game type
    const questions = this.generateQuestions(dto.gameType);

    // Persist game session to database
    const session = await this.prisma.icebreakerSession.create({
      data: {
        matchId: match.id,
        gameType: dto.gameType,
        status: "active",
      },
    });

    return {
      sessionId: session.id,
      matchId: match.id,
      gameType: dto.gameType,
      questions,
      startedAt: session.createdAt.toISOString(),
      startedBy: userId,
      message: "Oyun baslatildi! Iyi eglenceler!",
    };
  }

  @Post(":matchId/answer")
  @ApiOperation({ summary: "Submit an answer for an icebreaker question" })
  async submitAnswer(
    @CurrentUser("sub") userId: string,
    @Param("matchId") matchId: string,
    @Body() dto: SubmitIcebreakerAnswerDto,
  ) {
    await this.verifyMatchParticipation(userId, matchId);

    // Verify the session exists and belongs to this match
    const session = await this.prisma.icebreakerSession.findFirst({
      where: {
        id: dto.sessionId,
        matchId,
        status: "active",
      },
    });

    if (!session) {
      throw new NotFoundException("Oyun oturumu bulunamadi");
    }

    // Persist answer to database (upsert to handle re-submissions)
    const answer = await this.prisma.icebreakerAnswer.upsert({
      where: {
        sessionId_userId_questionId: {
          sessionId: dto.sessionId,
          userId,
          questionId: dto.questionId,
        },
      },
      update: {
        answer: dto.answer,
      },
      create: {
        sessionId: dto.sessionId,
        userId,
        questionId: dto.questionId,
        answer: dto.answer,
      },
    });

    // Check if partner has also answered this question
    const partnerAnswer = await this.prisma.icebreakerAnswer.findFirst({
      where: {
        sessionId: dto.sessionId,
        questionId: dto.questionId,
        userId: { not: userId },
      },
    });

    const partnerAnswered = !!partnerAnswer;
    const isMatch = partnerAnswered
      ? partnerAnswer.answer === dto.answer
      : null;

    return {
      questionId: dto.questionId,
      answer: dto.answer,
      submittedAt: answer.createdAt.toISOString(),
      partnerAnswered,
      isMatch,
    };
  }

  @Get(":matchId/history")
  @ApiOperation({ summary: "Get past icebreaker game sessions with answers" })
  async getSessionHistory(
    @CurrentUser("sub") userId: string,
    @Param("matchId") matchId: string,
  ) {
    await this.verifyMatchParticipation(userId, matchId);

    const sessions = await this.prisma.icebreakerSession.findMany({
      where: { matchId },
      include: {
        answers: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      matchId,
      sessions: sessions.map((session) => ({
        id: session.id,
        gameType: session.gameType,
        status: session.status,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        answers: session.answers.map((a) => ({
          id: a.id,
          userId: a.userId,
          questionId: a.questionId,
          answer: a.answer,
          createdAt: a.createdAt.toISOString(),
        })),
      })),
      totalSessions: sessions.length,
    };
  }

  // ─── Private Helpers ─────────────────────────────────────────

  private async verifyMatchParticipation(userId: string, matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, userAId: true, userBId: true, isActive: true },
    });

    if (!match) {
      throw new NotFoundException("Eslesme bulunamadi");
    }

    if (match.userAId !== userId && match.userBId !== userId) {
      throw new ForbiddenException("Bu eslesmeye erisim yetkiniz yok");
    }

    if (!match.isActive) {
      throw new BadRequestException("Bu eslesme artik aktif degil");
    }

    return match;
  }

  private generateQuestions(gameType: IcebreakerGameType) {
    switch (gameType) {
      case IcebreakerGameType.THIS_OR_THAT:
        return [
          { id: "tot_1", optionA: "Sabah insani", optionB: "Gece kusu" },
          { id: "tot_2", optionA: "Dag tatili", optionB: "Deniz tatili" },
          { id: "tot_3", optionA: "Film gecesi", optionB: "Konser gecesi" },
          { id: "tot_4", optionA: "Cay", optionB: "Kahve" },
          { id: "tot_5", optionA: "Kitap okumak", optionB: "Podcast dinlemek" },
          { id: "tot_6", optionA: "Pizza", optionB: "Sushi" },
          { id: "tot_7", optionA: "Macera filmi", optionB: "Romantik komedi" },
          { id: "tot_8", optionA: "Sehir hayati", optionB: "Koy hayati" },
        ];
      case IcebreakerGameType.RAPID_FIRE:
        return [
          {
            id: "rf_1",
            question: "En sevdigin yemek?",
            options: ["Kebap", "Makarna", "Sushi", "Pizza"],
          },
          {
            id: "rf_2",
            question: "Hayal tatil yerin?",
            options: ["Paris", "Tokyo", "Bali", "New York"],
          },
          {
            id: "rf_3",
            question: "S\u00FCper g\u00FCc\u00FCn ne olurdu?",
            options: [
              "Ucmak",
              "Teleportasyon",
              "Zaman yolculugu",
              "G\u00F6r\u00FCnmezlik",
            ],
          },
          {
            id: "rf_4",
            question: "Hafta sonu plani?",
            options: [
              "Kafe",
              "Dogada y\u00FCr\u00FCy\u00FCs",
              "Evde film",
              "Arkadaslarla bulusma",
            ],
          },
          {
            id: "rf_5",
            question: "Muzik tarzi?",
            options: ["Pop", "Rock", "Jazz", "Elektronik"],
          },
          {
            id: "rf_6",
            question: "Sabah rutinin?",
            options: [
              "Spor",
              "Kahve + gazete",
              "Son dakika uyanis",
              "Meditasyon",
            ],
          },
          {
            id: "rf_7",
            question: "En iyi hediye?",
            options: ["Deneyim", "Kitap", "Teknoloji", "El yapimi"],
          },
          {
            id: "rf_8",
            question: "Ilk bulus yeri?",
            options: ["Kafe", "Park", "Restoran", "M\u00FCze"],
          },
          {
            id: "rf_9",
            question: "Hayvan?",
            options: ["Kedi", "K\u00F6pek", "Kus", "Balik"],
          },
          {
            id: "rf_10",
            question: "Hobiyi sec!",
            options: ["Resim", "M\u00FCzik", "Yemek yapma", "Seyahat"],
          },
        ];
      case IcebreakerGameType.TWO_TRUTHS_ONE_LIE:
        return [
          {
            id: "ttol_instructions",
            type: "instructions",
            text: "3 sey yaz \u2014 2 dogru, 1 yanlis!",
          },
        ];
      default:
        return [];
    }
  }
}
