import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateRoomDto } from "./dto";

// Max players per game type
const GAME_MAX_PLAYERS: Record<string, number> = {
  UNO: 6,
  OKEY: 4,
  TRUTH_DARE: 6,
  TWO_TRUTHS_ONE_LIE: 6,
  TRIVIA: 6,
  WORD_BATTLE: 4,
  EMOJI_GUESS: 6,
  COMPATIBILITY: 6,
};

// Freemium daily limits
const FREE_DAILY_GAMES = 3;
const FREE_DAILY_ROOM_CREATION = 1;
const GOLD_DAILY_GAMES = 10;
const GOLD_DAILY_ROOM_CREATION = 5;

@Injectable()
export class GameRoomService {
  private readonly logger = new Logger(GameRoomService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List active game rooms (WAITING / READY_CHECK / COUNTDOWN).
   * Optionally filter by gameType.
   */
  async listRooms(filters?: { gameType?: string }) {
    const where: Record<string, unknown> = {
      status: { in: ["WAITING", "READY_CHECK", "COUNTDOWN"] },
    };

    if (filters?.gameType) {
      where.gameType = filters.gameType;
    }

    const rooms = await this.prisma.gameRoom.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            profile: { select: { firstName: true } },
          },
        },
        players: {
          include: {
            user: {
              select: {
                id: true,
                profile: { select: { firstName: true } },
              },
            },
          },
          where: { leftAt: null },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      rooms,
      total: rooms.length,
    };
  }

  /**
   * Create a new game room.
   * Checks daily room creation limit based on user's package tier.
   * Auto-adds creator as host player.
   */
  async createRoom(userId: string, dto: CreateRoomDto) {
    // Check user's package tier for daily creation limit
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { packageTier: true },
    });

    if (!user) {
      throw new NotFoundException("Kullanici bulunamadi");
    }

    // Count rooms created today by this user
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const roomsCreatedToday = await this.prisma.gameRoom.count({
      where: {
        creatorId: userId,
        createdAt: { gte: todayStart },
      },
    });

    // Apply daily creation limits based on tier
    if (user.packageTier === "FREE" && roomsCreatedToday >= FREE_DAILY_ROOM_CREATION) {
      throw new ForbiddenException(
        `Ucretsiz kullanicilar gunluk en fazla ${FREE_DAILY_ROOM_CREATION} oda olusturabilir. Gold veya Pro'ya yukseltin.`,
      );
    }

    if (user.packageTier === "GOLD" && roomsCreatedToday >= GOLD_DAILY_ROOM_CREATION) {
      throw new ForbiddenException(
        `Gold kullanicilar gunluk en fazla ${GOLD_DAILY_ROOM_CREATION} oda olusturabilir. Pro'ya yukseltin.`,
      );
    }

    const maxPlayers = GAME_MAX_PLAYERS[dto.gameType] ?? 6;

    // Create room and add creator as host player in a transaction
    const room = await this.prisma.$transaction(async (tx) => {
      const newRoom = await tx.gameRoom.create({
        data: {
          creatorId: userId,
          gameType: dto.gameType as
            | "UNO"
            | "OKEY"
            | "TRUTH_DARE"
            | "TWO_TRUTHS_ONE_LIE"
            | "TRIVIA"
            | "WORD_BATTLE"
            | "EMOJI_GUESS"
            | "COMPATIBILITY",
          maxPlayers,
          currentPlayers: 1,
          isPrivate: dto.isPrivate ?? false,
          roomCode: dto.roomCode ?? null,
        },
      });

      // Auto-add creator as host player
      await tx.gameRoomPlayer.create({
        data: {
          roomId: newRoom.id,
          userId,
          isHost: true,
          isReady: false,
        },
      });

      return newRoom;
    });

    // Return room with players
    return this.getRoom(room.id);
  }

  /**
   * Get a single room with players, creator, and messages.
   */
  async getRoom(roomId: string) {
    const room = await this.prisma.gameRoom.findUnique({
      where: { id: roomId },
      include: {
        creator: {
          select: {
            id: true,
            profile: { select: { firstName: true } },
          },
        },
        players: {
          include: {
            user: {
              select: {
                id: true,
                profile: { select: { firstName: true } },
              },
            },
          },
          where: { leftAt: null },
          orderBy: { joinedAt: "asc" },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          take: 100,
        },
      },
    });

    if (!room) {
      throw new NotFoundException("Oyun odasi bulunamadi");
    }

    return room;
  }

  /**
   * Join an existing game room.
   * Checks daily game limit and room capacity.
   */
  async joinRoom(userId: string, roomId: string) {
    const room = await this.prisma.gameRoom.findUnique({
      where: { id: roomId },
      include: {
        players: { where: { leftAt: null } },
      },
    });

    if (!room) {
      throw new NotFoundException("Oyun odasi bulunamadi");
    }

    if (room.status !== "WAITING") {
      throw new BadRequestException("Bu odaya artik katilamazsiniz");
    }

    // Check if user already in room
    const existingPlayer = room.players.find((p) => p.userId === userId);
    if (existingPlayer) {
      throw new BadRequestException("Zaten bu odadasiniz");
    }

    // Check room capacity
    if (room.currentPlayers >= room.maxPlayers) {
      throw new BadRequestException("Oda dolu");
    }

    // Check user's daily game limit
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { packageTier: true },
    });

    if (!user) {
      throw new NotFoundException("Kullanici bulunamadi");
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const gamesPlayedToday = await this.prisma.gameRoomPlayer.count({
      where: {
        userId,
        joinedAt: { gte: todayStart },
      },
    });

    if (user.packageTier === "FREE" && gamesPlayedToday >= FREE_DAILY_GAMES) {
      throw new ForbiddenException(
        `Ucretsiz kullanicilar gunluk en fazla ${FREE_DAILY_GAMES} oyuna katilabilir. Gold veya Pro'ya yukseltin.`,
      );
    }

    if (user.packageTier === "GOLD" && gamesPlayedToday >= GOLD_DAILY_GAMES) {
      throw new ForbiddenException(
        `Gold kullanicilar gunluk en fazla ${GOLD_DAILY_GAMES} oyuna katilabilir. Pro'ya yukseltin.`,
      );
    }

    // Add player and update count
    await this.prisma.$transaction(async (tx) => {
      await tx.gameRoomPlayer.create({
        data: {
          roomId,
          userId,
          isHost: false,
          isReady: false,
        },
      });

      await tx.gameRoom.update({
        where: { id: roomId },
        data: { currentPlayers: { increment: 1 } },
      });
    });

    return this.getRoom(roomId);
  }

  /**
   * Leave a game room.
   * Transfers host if needed, cancels room if empty.
   */
  async leaveRoom(userId: string, roomId: string) {
    const room = await this.prisma.gameRoom.findUnique({
      where: { id: roomId },
      include: {
        players: { where: { leftAt: null }, orderBy: { joinedAt: "asc" } },
      },
    });

    if (!room) {
      throw new NotFoundException("Oyun odasi bulunamadi");
    }

    const player = room.players.find((p) => p.userId === userId);
    if (!player) {
      throw new BadRequestException("Bu odada degilsiniz");
    }

    await this.prisma.$transaction(async (tx) => {
      // Mark player as left
      await tx.gameRoomPlayer.update({
        where: { id: player.id },
        data: { leftAt: new Date() },
      });

      const remainingPlayers = room.players.filter((p) => p.userId !== userId);

      if (remainingPlayers.length === 0) {
        // No one left — cancel the room
        await tx.gameRoom.update({
          where: { id: roomId },
          data: { status: "CANCELLED", currentPlayers: 0 },
        });
      } else {
        // Transfer host if the leaving player was host
        if (player.isHost) {
          const newHost = remainingPlayers[0];
          await tx.gameRoomPlayer.update({
            where: { id: newHost.id },
            data: { isHost: true },
          });
        }

        await tx.gameRoom.update({
          where: { id: roomId },
          data: { currentPlayers: { decrement: 1 } },
        });
      }
    });

    return { success: true, roomId };
  }

  /**
   * Toggle player ready status.
   * Returns whether all players (minimum 2) are ready.
   */
  async setReady(userId: string, roomId: string, isReady: boolean) {
    const room = await this.prisma.gameRoom.findUnique({
      where: { id: roomId },
      include: {
        players: { where: { leftAt: null } },
      },
    });

    if (!room) {
      throw new NotFoundException("Oyun odasi bulunamadi");
    }

    const player = room.players.find((p) => p.userId === userId);
    if (!player) {
      throw new BadRequestException("Bu odada degilsiniz");
    }

    await this.prisma.gameRoomPlayer.update({
      where: { id: player.id },
      data: { isReady },
    });

    // Check if all players are ready (minimum 2)
    const updatedPlayers = await this.prisma.gameRoomPlayer.findMany({
      where: { roomId, leftAt: null },
    });

    const allReady =
      updatedPlayers.length >= 2 && updatedPlayers.every((p) => p.isReady);

    return { isReady, allReady, readyCount: updatedPlayers.filter((p) => p.isReady).length, totalPlayers: updatedPlayers.length };
  }

  /**
   * Start the game — update room status to PLAYING.
   */
  async startGame(roomId: string) {
    const room = await this.prisma.gameRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException("Oyun odasi bulunamadi");
    }

    const updatedRoom = await this.prisma.gameRoom.update({
      where: { id: roomId },
      data: { status: "PLAYING", startedAt: new Date() },
    });

    return updatedRoom;
  }

  /**
   * Finish the game — create GameHistory and update room status to FINISHED.
   */
  async finishGame(
    roomId: string,
    winnerId: string | null,
    scores: Record<string, number>,
    connectionScores: Record<string, number>,
    durationSeconds: number,
  ) {
    const room = await this.prisma.gameRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException("Oyun odasi bulunamadi");
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Create game history record
      const history = await tx.gameHistory.create({
        data: {
          roomId,
          gameType: room.gameType,
          winnerId,
          durationSeconds,
          playerScores: scores,
          connectionScores,
        },
      });

      // Update room status
      await tx.gameRoom.update({
        where: { id: roomId },
        data: { status: "FINISHED", endedAt: new Date() },
      });

      // Update individual player scores
      for (const [playerId, score] of Object.entries(scores)) {
        await tx.gameRoomPlayer.updateMany({
          where: { roomId, userId: playerId },
          data: { score },
        });
      }

      return history;
    });

    return result;
  }

  /**
   * Save a chat message in a game room.
   */
  async saveMessage(
    roomId: string,
    senderId: string,
    content: string,
    type: "TEXT" | "REACTION" | "SYSTEM" = "TEXT",
  ) {
    const room = await this.prisma.gameRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException("Oyun odasi bulunamadi");
    }

    const message = await this.prisma.gameRoomMessage.create({
      data: {
        roomId,
        senderId,
        content,
        type,
      },
    });

    return message;
  }

  /**
   * Get a player's game history.
   */
  async getMyHistory(userId: string) {
    const playerRecords = await this.prisma.gameRoomPlayer.findMany({
      where: { userId },
      select: { roomId: true },
    });

    const roomIds = playerRecords.map((r) => r.roomId);

    const histories = await this.prisma.gameHistory.findMany({
      where: { roomId: { in: roomIds } },
      include: {
        room: {
          select: {
            id: true,
            gameType: true,
            createdAt: true,
            currentPlayers: true,
          },
        },
        winner: {
          select: {
            id: true,
            profile: { select: { firstName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      histories,
      total: histories.length,
    };
  }
}
