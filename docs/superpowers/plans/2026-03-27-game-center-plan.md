# Game Center (Oyun Merkezi) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Game Center integrated into the Activities tab with lobby system, 8 multiplayer games across 4 categories, real-time WebSocket communication, freemium gating, and post-game connection scoring.

**Architecture:** New `game-room` backend module (NestJS) with WebSocket gateway alongside existing `harmony` module. Mobile side: modular game screens under `screens/activities/gameRoom/` replacing the monolithic 191KB IcebreakerRoomScreen. Shared types in `packages/shared`. Reuses existing `gameMatchStore` connection scoring with new signal weights.

**Tech Stack:** React Native + TypeScript (mobile), NestJS + Prisma + WebSocket (backend), Zustand (state), react-native-reanimated (animations), expo-haptics (feedback)

**Spec:** `docs/superpowers/specs/2026-03-27-game-center-design.md`

---

## File Structure

### Shared Types (packages/shared/)
- Create: `src/types/game-room.ts` — GameRoom types, enums, constants
- Modify: `src/types/index.ts` — Re-export game-room types
- Modify: `src/constants/api.ts` — Add game-room REST routes and WebSocket events

### Database (apps/backend/)
- Modify: `src/prisma/schema.prisma` — Add GameRoom, GameRoomPlayer, GameRoomMessage, GameHistory models
- Create: Migration file via `npx prisma migrate dev`

### Backend Module (apps/backend/src/modules/game-room/)
- Create: `game-room.module.ts` — NestJS module definition
- Create: `game-room.controller.ts` — REST endpoints (list rooms, create room, get room)
- Create: `game-room.service.ts` — Business logic (room CRUD, freemium limits, player management)
- Create: `game-room.gateway.ts` — WebSocket gateway (join, leave, ready, game actions, chat)
- Create: `dto/create-room.dto.ts` — Room creation validation
- Create: `dto/game-action.dto.ts` — Game action validation
- Create: `guards/room-access.guard.ts` — Freemium limit enforcement
- Create: `engines/base-game.engine.ts` — Abstract game engine with shared logic
- Create: `engines/truth-dare.engine.ts` — Truth or Dare game logic
- Create: `engines/would-you-rather.engine.ts` — Would You Rather game logic
- Create: `engines/trivia.engine.ts` — Trivia Quiz game logic
- Create: `engines/emoji-guess.engine.ts` — Emoji Guess game logic
- Create: `engines/word-battle.engine.ts` — Word Battle game logic
- Create: `engines/compatibility.engine.ts` — Compatibility Challenge game logic
- Create: `engines/uno.engine.ts` — UNO game logic
- Create: `engines/okey.engine.ts` — Okey game logic
- Modify: `src/app.module.ts` — Import GameRoomModule

### Mobile - Services & Stores (apps/mobile/src/)
- Create: `services/gameRoomApiService.ts` — REST API calls for game rooms
- Modify: `services/gameRoomService.ts` — Update to use new API structure
- Create: `stores/gameRoomStore.ts` — Zustand store for room state, WebSocket connection
- Modify: `stores/gameMatchStore.ts` — Add new signal weights (sameAnswer, laugh, rematch, profileView)

### Mobile - Game Room Screens (apps/mobile/src/screens/activities/gameRoom/)
- Create: `GameLobbyScreen.tsx` — Lobby with player list, chat, ready button
- Create: `GamePlayScreen.tsx` — Game router that loads correct game component
- Create: `GameResultScreen.tsx` — Results, rankings, connection suggestions

### Mobile - Shared Components (apps/mobile/src/screens/activities/gameRoom/components/)
- Create: `RoomCard.tsx` — Room card for horizontal scroll list
- Create: `PlayerList.tsx` — Player avatars with ready status
- Create: `GameChat.tsx` — In-game chat with freemium limits
- Create: `ScoreBoard.tsx` — Live score display
- Create: `ReactionBar.tsx` — Quick emoji reactions

### Mobile - Game Components (apps/mobile/src/screens/activities/gameRoom/games/)
- Create: `TruthOrDare.tsx` — Wheel spin + question/dare display
- Create: `WouldYouRather.tsx` — Two-choice voting display (NOTE: This was "Two Truths One Lie" in spec but mapped to WouldYouRather game component. The spec lists "Iki Dogru Bir Yalan" as a separate game under Buz Kiricilar)
- Create: `TwoTruthsOneLie.tsx` — Write 3 statements, others guess the lie
- Create: `TriviaQuiz.tsx` — Timed multiple choice questions
- Create: `EmojiGuess.tsx` — Emoji-based guessing game
- Create: `WordBattle.tsx` — Find longest word from letters
- Create: `CompatibilityChallenge.tsx` — Same-answer scoring game
- Create: `UnoGame.tsx` — UNO card game
- Create: `OkeyGame.tsx` — Simplified Okey game

### Mobile - Activities Screen & Navigation
- Modify: `screens/activities/ActivitiesScreen.tsx` — Add Game Rooms section at top
- Modify: `navigation/MainTabNavigator.tsx` — Add GameLobby, GamePlay, GameResult to ActivitiesStack

---

## Task 1: Shared Types & Constants

**Files:**
- Create: `packages/shared/src/types/game-room.ts`
- Modify: `packages/shared/src/types/index.ts`
- Modify: `packages/shared/src/constants/api.ts`

- [ ] **Step 1: Create game-room types file**

```typescript
// packages/shared/src/types/game-room.ts

export enum GameType {
  UNO = 'UNO',
  OKEY = 'OKEY',
  TRUTH_DARE = 'TRUTH_DARE',
  TWO_TRUTHS_ONE_LIE = 'TWO_TRUTHS_ONE_LIE',
  TRIVIA = 'TRIVIA',
  WORD_BATTLE = 'WORD_BATTLE',
  EMOJI_GUESS = 'EMOJI_GUESS',
  COMPATIBILITY = 'COMPATIBILITY',
}

export enum GameCategory {
  CLASSICS = 'CLASSICS',
  ICEBREAKERS = 'ICEBREAKERS',
  COMPETITIONS = 'COMPETITIONS',
  COMPATIBILITY = 'COMPATIBILITY',
}

export enum GameRoomStatus {
  WAITING = 'WAITING',
  READY_CHECK = 'READY_CHECK',
  COUNTDOWN = 'COUNTDOWN',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
  ABANDONED = 'ABANDONED',
}

export enum GameRoomMessageType {
  TEXT = 'TEXT',
  REACTION = 'REACTION',
  SYSTEM = 'SYSTEM',
}

export interface GameRoom {
  id: string;
  creatorId: string;
  gameType: GameType;
  status: GameRoomStatus;
  maxPlayers: number;
  currentPlayers: number;
  isPrivate: boolean;
  roomCode: string | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
}

export interface GameRoomPlayer {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  userPhotoUrl: string | null;
  isReady: boolean;
  isHost: boolean;
  score: number;
  joinedAt: string;
}

export interface GameRoomMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: GameRoomMessageType;
  createdAt: string;
}

export interface GameHistoryEntry {
  id: string;
  roomId: string;
  gameType: GameType;
  winnerId: string | null;
  duration: number;
  playerScores: Record<string, number>;
  connectionScores: Record<string, number>;
  createdAt: string;
}

export interface GameAction {
  type: string;
  payload: Record<string, unknown>;
}

export const GAME_CONFIG: Record<GameType, {
  category: GameCategory;
  minPlayers: number;
  maxPlayers: number;
  durationMinutes: number;
  nameEn: string;
  nameTr: string;
  icon: string;
}> = {
  [GameType.UNO]: {
    category: GameCategory.CLASSICS,
    minPlayers: 2, maxPlayers: 6, durationMinutes: 15,
    nameEn: 'UNO', nameTr: 'UNO', icon: '🃏',
  },
  [GameType.OKEY]: {
    category: GameCategory.CLASSICS,
    minPlayers: 2, maxPlayers: 4, durationMinutes: 20,
    nameEn: 'Okey', nameTr: 'Okey', icon: '🎴',
  },
  [GameType.TRUTH_DARE]: {
    category: GameCategory.ICEBREAKERS,
    minPlayers: 2, maxPlayers: 6, durationMinutes: 10,
    nameEn: 'Truth or Dare', nameTr: 'Dogruluk mu Cesaret mi', icon: '🎡',
  },
  [GameType.TWO_TRUTHS_ONE_LIE]: {
    category: GameCategory.ICEBREAKERS,
    minPlayers: 2, maxPlayers: 6, durationMinutes: 8,
    nameEn: 'Two Truths One Lie', nameTr: 'Iki Dogru Bir Yalan', icon: '🤥',
  },
  [GameType.TRIVIA]: {
    category: GameCategory.COMPETITIONS,
    minPlayers: 2, maxPlayers: 6, durationMinutes: 8,
    nameEn: 'Trivia Quiz', nameTr: 'Bilgi Yarismasi', icon: '🧠',
  },
  [GameType.WORD_BATTLE]: {
    category: GameCategory.COMPETITIONS,
    minPlayers: 2, maxPlayers: 4, durationMinutes: 8,
    nameEn: 'Word Battle', nameTr: 'Kelime Savasi', icon: '📝',
  },
  [GameType.EMOJI_GUESS]: {
    category: GameCategory.COMPETITIONS,
    minPlayers: 2, maxPlayers: 6, durationMinutes: 8,
    nameEn: 'Emoji Guess', nameTr: 'Emoji Tahmin', icon: '😜',
  },
  [GameType.COMPATIBILITY]: {
    category: GameCategory.COMPATIBILITY,
    minPlayers: 2, maxPlayers: 6, durationMinutes: 10,
    nameEn: 'Compatibility Challenge', nameTr: 'Uyumluluk Challenge', icon: '💕',
  },
};

export const GAME_ROOM_CONSTANTS = {
  lobbyTimeoutSeconds: 300,
  countdownSeconds: 5,
  afkWarningSeconds: 60,
  afkKickSeconds: 90,
  freeLimits: {
    dailyGames: 3,
    messagesPerGame: 5,
    dailyRoomCreation: 1,
    connectionSuggestionsPerGame: 1,
  },
  goldLimits: {
    dailyGames: 10,
    messagesPerGame: 20,
    dailyRoomCreation: 5,
    connectionSuggestionsPerGame: 3,
  },
  proLimits: {
    dailyGames: -1,
    messagesPerGame: -1,
    dailyRoomCreation: -1,
    connectionSuggestionsPerGame: -1,
  },
} as const;

export const CATEGORY_GRADIENTS: Record<GameCategory, [string, string]> = {
  [GameCategory.CLASSICS]: ['#FF6B35', '#FF8C42'],
  [GameCategory.ICEBREAKERS]: ['#00C9FF', '#92FE9D'],
  [GameCategory.COMPETITIONS]: ['#FC466B', '#3F5EFB'],
  [GameCategory.COMPATIBILITY]: ['#F857A6', '#FF5858'],
};

export const GAME_REACTIONS = ['😂', '🔥', '👏', '😮', '💕', '❄️'] as const;
```

- [ ] **Step 2: Update shared types index to re-export**

Add to `packages/shared/src/types/index.ts`:

```typescript
export * from './game-room';
```

- [ ] **Step 3: Add game-room API routes and WebSocket events to constants**

Add to `packages/shared/src/constants/api.ts` in the API_ROUTES object:

```typescript
GAME_ROOM: {
  LIST: '/game-rooms',
  CREATE: '/game-rooms',
  GET: '/game-rooms/:id',
  MY_HISTORY: '/game-rooms/history',
},
```

Add WebSocket events:

```typescript
// Game Room WebSocket Events
GAME_JOIN_ROOM: 'game:join_room',
GAME_LEAVE_ROOM: 'game:leave_room',
GAME_READY: 'game:ready',
GAME_UNREADY: 'game:unready',
GAME_ACTION: 'game:action',
GAME_SEND_MESSAGE: 'game:send_message',
GAME_REACT: 'game:react',
GAME_REMATCH: 'game:rematch',

GAME_ROOM_UPDATED: 'game:room_updated',
GAME_PLAYER_READY: 'game:player_ready',
GAME_COUNTDOWN_START: 'game:countdown_start',
GAME_STARTED: 'game:started',
GAME_TURN: 'game:turn',
GAME_ACTION_RESULT: 'game:action_result',
GAME_SCORE_UPDATE: 'game:score_update',
GAME_MESSAGE: 'game:message',
GAME_REACTION: 'game:reaction',
GAME_FINISHED: 'game:finished',
GAME_CONNECTION_SCORE: 'game:connection_score',
GAME_ERROR: 'game:error',
GAME_AFK_WARNING: 'game:afk_warning',
```

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/types/game-room.ts packages/shared/src/types/index.ts packages/shared/src/constants/api.ts
git commit -m "feat(shared): add game-room types, constants, and API routes"
```

---

## Task 2: Database Schema

**Files:**
- Modify: `apps/backend/src/prisma/schema.prisma`

- [ ] **Step 1: Add GameRoom models to Prisma schema**

Add after the existing Harmony models in `schema.prisma`:

```prisma
// ==========================================
// Game Room Models
// ==========================================

model GameRoom {
  id             String         @id @default(uuid()) @db.Uuid
  creatorId      String         @map("creator_id") @db.Uuid
  gameType       GameType
  status         GameRoomStatus @default(WAITING)
  maxPlayers     Int            @map("max_players")
  currentPlayers Int            @default(0) @map("current_players")
  isPrivate      Boolean        @default(false) @map("is_private")
  roomCode       String?        @map("room_code") @db.VarChar(6)
  createdAt      DateTime       @default(now()) @map("created_at")
  startedAt      DateTime?      @map("started_at")
  endedAt        DateTime?      @map("ended_at")

  creator  User              @relation("GameRoomCreator", fields: [creatorId], references: [id])
  players  GameRoomPlayer[]
  messages GameRoomMessage[]
  history  GameHistory?

  @@index([status, createdAt])
  @@index([creatorId])
  @@index([gameType, status])
  @@map("game_rooms")
}

enum GameType {
  UNO
  OKEY
  TRUTH_DARE
  TWO_TRUTHS_ONE_LIE
  TRIVIA
  WORD_BATTLE
  EMOJI_GUESS
  COMPATIBILITY
}

enum GameRoomStatus {
  WAITING
  READY_CHECK
  COUNTDOWN
  PLAYING
  FINISHED
  CANCELLED
  ABANDONED
}

model GameRoomPlayer {
  id       String    @id @default(uuid()) @db.Uuid
  roomId   String    @map("room_id") @db.Uuid
  userId   String    @map("user_id") @db.Uuid
  isReady  Boolean   @default(false) @map("is_ready")
  isHost   Boolean   @default(false) @map("is_host")
  score    Int       @default(0)
  joinedAt DateTime  @default(now()) @map("joined_at")
  leftAt   DateTime? @map("left_at")

  room GameRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
  user User     @relation("GameRoomPlayerUser", fields: [userId], references: [id])

  @@unique([roomId, userId])
  @@index([userId])
  @@map("game_room_players")
}

model GameRoomMessage {
  id        String              @id @default(uuid()) @db.Uuid
  roomId    String              @map("room_id") @db.Uuid
  senderId  String              @map("sender_id") @db.Uuid
  content   String
  type      GameRoomMessageType @default(TEXT)
  createdAt DateTime            @default(now()) @map("created_at")

  room   GameRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
  sender User     @relation("GameRoomMessageSender", fields: [senderId], references: [id])

  @@index([roomId, createdAt])
  @@map("game_room_messages")
}

enum GameRoomMessageType {
  TEXT
  REACTION
  SYSTEM
}

model GameHistory {
  id               String   @id @default(uuid()) @db.Uuid
  roomId           String   @unique @map("room_id") @db.Uuid
  gameType         GameType @map("game_type")
  winnerId         String?  @map("winner_id") @db.Uuid
  durationSeconds  Int      @map("duration_seconds")
  playerScores     Json     @map("player_scores")
  connectionScores Json     @map("connection_scores")
  createdAt        DateTime @default(now()) @map("created_at")

  room   GameRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
  winner User?    @relation("GameHistoryWinner", fields: [winnerId], references: [id])

  @@index([gameType, createdAt])
  @@index([winnerId])
  @@map("game_histories")
}
```

- [ ] **Step 2: Add User model relations**

Add to the User model in `schema.prisma`:

```prisma
  // Game Room relations
  createdGameRooms   GameRoom[]        @relation("GameRoomCreator")
  gameRoomPlayers    GameRoomPlayer[]  @relation("GameRoomPlayerUser")
  gameRoomMessages   GameRoomMessage[] @relation("GameRoomMessageSender")
  gameHistoryWins    GameHistory[]     @relation("GameHistoryWinner")
```

- [ ] **Step 3: Generate migration**

Run:
```bash
cd apps/backend && npx prisma migrate dev --name add_game_room_tables
```

Expected: Migration created, 4 new tables (game_rooms, game_room_players, game_room_messages, game_histories)

- [ ] **Step 4: Verify generated Prisma client**

Run:
```bash
cd apps/backend && npx prisma generate
```

Expected: Prisma Client generated successfully

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/prisma/schema.prisma apps/backend/src/prisma/migrations/
git commit -m "feat(db): add game room tables - GameRoom, GameRoomPlayer, GameRoomMessage, GameHistory"
```

---

## Task 3: Backend — Game Room Module Foundation

**Files:**
- Create: `apps/backend/src/modules/game-room/game-room.module.ts`
- Create: `apps/backend/src/modules/game-room/dto/create-room.dto.ts`
- Create: `apps/backend/src/modules/game-room/dto/game-action.dto.ts`
- Create: `apps/backend/src/modules/game-room/dto/index.ts`
- Create: `apps/backend/src/modules/game-room/game-room.service.ts`
- Create: `apps/backend/src/modules/game-room/game-room.controller.ts`
- Modify: `apps/backend/src/app.module.ts`

- [ ] **Step 1: Create DTOs**

```typescript
// apps/backend/src/modules/game-room/dto/create-room.dto.ts
import { IsEnum, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomDto {
  @ApiProperty({ enum: ['UNO', 'OKEY', 'TRUTH_DARE', 'TWO_TRUTHS_ONE_LIE', 'TRIVIA', 'WORD_BATTLE', 'EMOJI_GUESS', 'COMPATIBILITY'] })
  @IsEnum(['UNO', 'OKEY', 'TRUTH_DARE', 'TWO_TRUTHS_ONE_LIE', 'TRIVIA', 'WORD_BATTLE', 'EMOJI_GUESS', 'COMPATIBILITY'])
  gameType: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(6)
  roomCode?: string;
}
```

```typescript
// apps/backend/src/modules/game-room/dto/game-action.dto.ts
import { IsString, IsObject, IsNotEmpty } from 'class-validator';

export class GameActionDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsObject()
  payload: Record<string, unknown>;
}
```

```typescript
// apps/backend/src/modules/game-room/dto/index.ts
export { CreateRoomDto } from './create-room.dto';
export { GameActionDto } from './game-action.dto';
```

- [ ] **Step 2: Create game-room service**

```typescript
// apps/backend/src/modules/game-room/game-room.service.ts
import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoomDto } from './dto';
import { GameRoomStatus } from '@prisma/client';

const GAME_MAX_PLAYERS: Record<string, number> = {
  UNO: 6, OKEY: 4, TRUTH_DARE: 6, TWO_TRUTHS_ONE_LIE: 6,
  TRIVIA: 6, WORD_BATTLE: 4, EMOJI_GUESS: 6, COMPATIBILITY: 6,
};

const FREE_DAILY_GAMES = 3;
const FREE_DAILY_ROOM_CREATION = 1;
const GOLD_DAILY_GAMES = 10;
const GOLD_DAILY_ROOM_CREATION = 5;

@Injectable()
export class GameRoomService {
  constructor(private readonly prisma: PrismaService) {}

  async listRooms(filters?: { gameType?: string; status?: string }) {
    const where: Record<string, unknown> = {
      status: { in: ['WAITING', 'READY_CHECK', 'COUNTDOWN'] },
    };
    if (filters?.gameType) where.gameType = filters.gameType;

    const rooms = await this.prisma.gameRoom.findMany({
      where,
      include: {
        creator: { select: { id: true, firstName: true, photos: true } },
        players: {
          where: { leftAt: null },
          include: { user: { select: { id: true, firstName: true, photos: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return { rooms, total: rooms.length };
  }

  async createRoom(userId: string, dto: CreateRoomDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Check daily room creation limit
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayCreatedCount = await this.prisma.gameRoom.count({
      where: { creatorId: userId, createdAt: { gte: todayStart } },
    });

    const dailyLimit = user.packageType === 'PRO' ? -1
      : user.packageType === 'GOLD' ? GOLD_DAILY_ROOM_CREATION
      : FREE_DAILY_ROOM_CREATION;

    if (dailyLimit !== -1 && todayCreatedCount >= dailyLimit) {
      throw new ForbiddenException('Daily room creation limit reached');
    }

    const maxPlayers = GAME_MAX_PLAYERS[dto.gameType] || 6;

    const room = await this.prisma.gameRoom.create({
      data: {
        creatorId: userId,
        gameType: dto.gameType as any,
        maxPlayers,
        currentPlayers: 1,
        isPrivate: dto.isPrivate || false,
        roomCode: dto.isPrivate ? dto.roomCode || this.generateRoomCode() : null,
        players: {
          create: { userId, isHost: true, isReady: false },
        },
      },
      include: {
        players: {
          include: { user: { select: { id: true, firstName: true, photos: true } } },
        },
      },
    });

    return room;
  }

  async getRoom(roomId: string) {
    const room = await this.prisma.gameRoom.findUnique({
      where: { id: roomId },
      include: {
        creator: { select: { id: true, firstName: true, photos: true } },
        players: {
          where: { leftAt: null },
          include: { user: { select: { id: true, firstName: true, photos: true } } },
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });

    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async joinRoom(userId: string, roomId: string) {
    const room = await this.prisma.gameRoom.findUnique({
      where: { id: roomId },
      include: { players: { where: { leftAt: null } } },
    });

    if (!room) throw new NotFoundException('Room not found');
    if (room.status !== 'WAITING') throw new BadRequestException('Room is not accepting players');
    if (room.currentPlayers >= room.maxPlayers) throw new BadRequestException('Room is full');

    // Check daily game limit
    await this.checkDailyGameLimit(userId);

    const existingPlayer = room.players.find(p => p.userId === userId);
    if (existingPlayer) return room;

    return this.prisma.gameRoom.update({
      where: { id: roomId },
      data: {
        currentPlayers: { increment: 1 },
        players: { create: { userId, isHost: false, isReady: false } },
      },
      include: {
        players: {
          where: { leftAt: null },
          include: { user: { select: { id: true, firstName: true, photos: true } } },
        },
      },
    });
  }

  async leaveRoom(userId: string, roomId: string) {
    const room = await this.prisma.gameRoom.findUnique({
      where: { id: roomId },
      include: { players: { where: { leftAt: null }, orderBy: { joinedAt: 'asc' } } },
    });

    if (!room) throw new NotFoundException('Room not found');

    await this.prisma.gameRoomPlayer.updateMany({
      where: { roomId, userId, leftAt: null },
      data: { leftAt: new Date() },
    });

    const remainingPlayers = room.players.filter(p => p.userId !== userId);

    if (remainingPlayers.length === 0) {
      await this.prisma.gameRoom.update({
        where: { id: roomId },
        data: { status: 'CANCELLED', currentPlayers: 0 },
      });
      return null;
    }

    // Transfer host if needed
    const leavingPlayer = room.players.find(p => p.userId === userId);
    if (leavingPlayer?.isHost && remainingPlayers.length > 0) {
      await this.prisma.gameRoomPlayer.update({
        where: { id: remainingPlayers[0].id },
        data: { isHost: true },
      });
    }

    return this.prisma.gameRoom.update({
      where: { id: roomId },
      data: { currentPlayers: { decrement: 1 } },
      include: {
        players: {
          where: { leftAt: null },
          include: { user: { select: { id: true, firstName: true, photos: true } } },
        },
      },
    });
  }

  async setReady(userId: string, roomId: string, isReady: boolean) {
    await this.prisma.gameRoomPlayer.updateMany({
      where: { roomId, userId, leftAt: null },
      data: { isReady },
    });

    const players = await this.prisma.gameRoomPlayer.findMany({
      where: { roomId, leftAt: null },
    });

    const allReady = players.length >= 2 && players.every(p => p.isReady);
    return { allReady, players };
  }

  async startGame(roomId: string) {
    return this.prisma.gameRoom.update({
      where: { id: roomId },
      data: { status: 'PLAYING', startedAt: new Date() },
    });
  }

  async finishGame(roomId: string, winnerId: string | null, playerScores: Record<string, number>, connectionScores: Record<string, number>, durationSeconds: number) {
    const gameType = (await this.prisma.gameRoom.findUnique({ where: { id: roomId } }))?.gameType;

    await this.prisma.$transaction([
      this.prisma.gameRoom.update({
        where: { id: roomId },
        data: { status: 'FINISHED', endedAt: new Date() },
      }),
      this.prisma.gameHistory.create({
        data: {
          roomId,
          gameType: gameType!,
          winnerId,
          durationSeconds,
          playerScores,
          connectionScores,
        },
      }),
    ]);
  }

  async saveMessage(roomId: string, senderId: string, content: string, type: 'TEXT' | 'REACTION' | 'SYSTEM') {
    return this.prisma.gameRoomMessage.create({
      data: { roomId, senderId, content, type },
    });
  }

  async getMyHistory(userId: string) {
    return this.prisma.gameRoomPlayer.findMany({
      where: { userId },
      include: {
        room: {
          include: {
            history: true,
            players: {
              include: { user: { select: { id: true, firstName: true, photos: true } } },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
      take: 50,
    });
  }

  private async checkDailyGameLimit(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.packageType === 'PRO') return;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayGamesCount = await this.prisma.gameRoomPlayer.count({
      where: { userId, joinedAt: { gte: todayStart } },
    });

    const limit = user.packageType === 'GOLD' ? GOLD_DAILY_GAMES : FREE_DAILY_GAMES;
    if (todayGamesCount >= limit) {
      throw new ForbiddenException('Daily game limit reached');
    }
  }

  private generateRoomCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}
```

- [ ] **Step 3: Create game-room controller**

```typescript
// apps/backend/src/modules/game-room/game-room.controller.ts
import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GameRoomService } from './game-room.service';
import { CreateRoomDto } from './dto';

@ApiTags('Game Room')
@ApiBearerAuth()
@Controller('game-rooms')
export class GameRoomController {
  constructor(private readonly gameRoomService: GameRoomService) {}

  @Get()
  @ApiOperation({ summary: 'List active game rooms' })
  listRooms(@Query('gameType') gameType?: string) {
    return this.gameRoomService.listRooms({ gameType });
  }

  @Post()
  @ApiOperation({ summary: 'Create a new game room' })
  createRoom(@CurrentUser('sub') userId: string, @Body() dto: CreateRoomDto) {
    return this.gameRoomService.createRoom(userId, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get my game history' })
  getMyHistory(@CurrentUser('sub') userId: string) {
    return this.gameRoomService.getMyHistory(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get game room details' })
  getRoom(@Param('id') id: string) {
    return this.gameRoomService.getRoom(id);
  }
}
```

- [ ] **Step 4: Create module definition**

```typescript
// apps/backend/src/modules/game-room/game-room.module.ts
import { Module } from '@nestjs/common';
import { GameRoomController } from './game-room.controller';
import { GameRoomService } from './game-room.service';

@Module({
  controllers: [GameRoomController],
  providers: [GameRoomService],
  exports: [GameRoomService],
})
export class GameRoomModule {}
```

- [ ] **Step 5: Register module in app.module.ts**

Add import to `apps/backend/src/app.module.ts`:

```typescript
import { GameRoomModule } from './modules/game-room/game-room.module';
```

Add `GameRoomModule` to the imports array after `HarmonyModule`.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/game-room/ apps/backend/src/app.module.ts
git commit -m "feat(backend): add game-room module with REST API — rooms CRUD, freemium limits, player management"
```

---

## Task 4: Backend — WebSocket Gateway

**Files:**
- Create: `apps/backend/src/modules/game-room/game-room.gateway.ts`
- Modify: `apps/backend/src/modules/game-room/game-room.module.ts`

- [ ] **Step 1: Create WebSocket gateway**

```typescript
// apps/backend/src/modules/game-room/game-room.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { GameRoomService } from './game-room.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  namespace: '/game-room',
  cors: { origin: process.env.CORS_ORIGINS || '*', credentials: true },
  pingInterval: 25000,
  pingTimeout: 20000,
})
export class GameRoomGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(GameRoomGateway.name);

  private userSockets = new Map<string, Set<string>>();
  private socketRooms = new Map<string, string>();
  private countdownTimers = new Map<string, NodeJS.Timeout>();
  private afkTimers = new Map<string, NodeJS.Timeout>();
  private gameStates = new Map<string, Record<string, unknown>>();

  constructor(private readonly gameRoomService: GameRoomService) {}

  async handleConnection(socket: AuthenticatedSocket) {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        socket.disconnect();
        return;
      }
      // In production, verify JWT and extract userId
      // For now, accept userId from handshake auth
      const userId = socket.handshake.auth?.userId;
      if (!userId) {
        socket.disconnect();
        return;
      }
      socket.userId = userId;

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

      this.logger.log(`User ${userId} connected (socket: ${socket.id})`);
    } catch {
      socket.disconnect();
    }
  }

  async handleDisconnect(socket: AuthenticatedSocket) {
    const userId = socket.userId;
    if (!userId) return;

    this.userSockets.get(userId)?.delete(socket.id);
    if (this.userSockets.get(userId)?.size === 0) {
      this.userSockets.delete(userId);
    }

    const roomId = this.socketRooms.get(socket.id);
    if (roomId) {
      await this.handleLeaveRoom(socket, { roomId });
    }
    this.socketRooms.delete(socket.id);
  }

  @SubscribeMessage('game:join_room')
  async handleJoinRoom(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = socket.userId;
    if (!userId) return;

    try {
      const room = await this.gameRoomService.joinRoom(userId, data.roomId);
      socket.join(`room:${data.roomId}`);
      this.socketRooms.set(socket.id, data.roomId);

      this.server.to(`room:${data.roomId}`).emit('game:room_updated', { room });
      this.resetAfkTimer(userId, data.roomId);
    } catch (error: any) {
      socket.emit('game:error', { message: error.message });
    }
  }

  @SubscribeMessage('game:leave_room')
  async handleLeaveRoom(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = socket.userId;
    if (!userId) return;

    try {
      const room = await this.gameRoomService.leaveRoom(userId, data.roomId);
      socket.leave(`room:${data.roomId}`);
      this.socketRooms.delete(socket.id);
      this.clearAfkTimer(userId);

      if (room) {
        this.server.to(`room:${data.roomId}`).emit('game:room_updated', { room });
      }
    } catch (error: any) {
      socket.emit('game:error', { message: error.message });
    }
  }

  @SubscribeMessage('game:ready')
  async handleReady(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = socket.userId;
    if (!userId) return;

    try {
      const { allReady, players } = await this.gameRoomService.setReady(userId, data.roomId, true);

      this.server.to(`room:${data.roomId}`).emit('game:player_ready', { userId, isReady: true, players });

      if (allReady) {
        this.startCountdown(data.roomId);
      }
    } catch (error: any) {
      socket.emit('game:error', { message: error.message });
    }
  }

  @SubscribeMessage('game:unready')
  async handleUnready(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = socket.userId;
    if (!userId) return;

    await this.gameRoomService.setReady(userId, data.roomId, false);
    this.cancelCountdown(data.roomId);

    this.server.to(`room:${data.roomId}`).emit('game:player_ready', { userId, isReady: false });
  }

  @SubscribeMessage('game:action')
  async handleGameAction(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; type: string; payload: Record<string, unknown> },
  ) {
    const userId = socket.userId;
    if (!userId) return;

    this.resetAfkTimer(userId, data.roomId);

    // Game action is processed by the game engine on the client side for now
    // Server broadcasts action to all players in the room
    this.server.to(`room:${data.roomId}`).emit('game:action_result', {
      userId,
      type: data.type,
      payload: data.payload,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('game:send_message')
  async handleMessage(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; content: string },
  ) {
    const userId = socket.userId;
    if (!userId) return;

    try {
      const message = await this.gameRoomService.saveMessage(data.roomId, userId, data.content, 'TEXT');
      this.server.to(`room:${data.roomId}`).emit('game:message', message);
      this.resetAfkTimer(userId, data.roomId);
    } catch (error: any) {
      socket.emit('game:error', { message: error.message });
    }
  }

  @SubscribeMessage('game:react')
  async handleReaction(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; emoji: string },
  ) {
    const userId = socket.userId;
    if (!userId) return;

    this.server.to(`room:${data.roomId}`).emit('game:reaction', {
      userId,
      emoji: data.emoji,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('game:score_update')
  async handleScoreUpdate(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; scores: Record<string, number> },
  ) {
    this.server.to(`room:${data.roomId}`).emit('game:score_update', { scores: data.scores });
  }

  @SubscribeMessage('game:finished')
  async handleGameFinished(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: {
      roomId: string;
      winnerId: string | null;
      playerScores: Record<string, number>;
      connectionScores: Record<string, number>;
      durationSeconds: number;
    },
  ) {
    try {
      await this.gameRoomService.finishGame(
        data.roomId,
        data.winnerId,
        data.playerScores,
        data.connectionScores,
        data.durationSeconds,
      );

      this.server.to(`room:${data.roomId}`).emit('game:finished', {
        winnerId: data.winnerId,
        playerScores: data.playerScores,
        connectionScores: data.connectionScores,
      });
    } catch (error: any) {
      socket.emit('game:error', { message: error.message });
    }
  }

  @SubscribeMessage('game:rematch')
  async handleRematch(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = socket.userId;
    if (!userId) return;

    this.server.to(`room:${data.roomId}`).emit('game:rematch', { userId });
  }

  private startCountdown(roomId: string) {
    this.cancelCountdown(roomId);

    let count = 5;
    this.server.to(`room:${roomId}`).emit('game:countdown_start', { seconds: count });

    const timer = setInterval(async () => {
      count--;
      if (count <= 0) {
        clearInterval(timer);
        this.countdownTimers.delete(roomId);

        await this.gameRoomService.startGame(roomId);
        this.server.to(`room:${roomId}`).emit('game:started', { roomId });
      }
    }, 1000);

    this.countdownTimers.set(roomId, timer);
  }

  private cancelCountdown(roomId: string) {
    const timer = this.countdownTimers.get(roomId);
    if (timer) {
      clearInterval(timer);
      this.countdownTimers.delete(roomId);
    }
  }

  private resetAfkTimer(userId: string, roomId: string) {
    this.clearAfkTimer(userId);

    const warningTimer = setTimeout(() => {
      const sockets = this.userSockets.get(userId);
      sockets?.forEach(socketId => {
        this.server.to(socketId).emit('game:afk_warning', { roomId, secondsLeft: 30 });
      });

      const kickTimer = setTimeout(async () => {
        const sockets = this.userSockets.get(userId);
        if (sockets) {
          for (const socketId of sockets) {
            const socket = this.server.sockets.sockets.get(socketId) as AuthenticatedSocket;
            if (socket) {
              await this.handleLeaveRoom(socket, { roomId });
            }
          }
        }
      }, 30000);

      this.afkTimers.set(`${userId}:kick`, kickTimer);
    }, 60000);

    this.afkTimers.set(userId, warningTimer);
  }

  private clearAfkTimer(userId: string) {
    const timer = this.afkTimers.get(userId);
    if (timer) clearTimeout(timer);
    this.afkTimers.delete(userId);

    const kickTimer = this.afkTimers.get(`${userId}:kick`);
    if (kickTimer) clearTimeout(kickTimer);
    this.afkTimers.delete(`${userId}:kick`);
  }
}
```

- [ ] **Step 2: Update module to include gateway**

```typescript
// apps/backend/src/modules/game-room/game-room.module.ts
import { Module } from '@nestjs/common';
import { GameRoomController } from './game-room.controller';
import { GameRoomService } from './game-room.service';
import { GameRoomGateway } from './game-room.gateway';

@Module({
  controllers: [GameRoomController],
  providers: [GameRoomService, GameRoomGateway],
  exports: [GameRoomService, GameRoomGateway],
})
export class GameRoomModule {}
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/game-room/
git commit -m "feat(backend): add game-room WebSocket gateway — join, leave, ready, actions, chat, AFK management"
```

---

## Task 5: Mobile — Game Room Store & API Service

**Files:**
- Create: `apps/mobile/src/services/gameRoomApiService.ts`
- Create: `apps/mobile/src/stores/gameRoomStore.ts`
- Modify: `apps/mobile/src/stores/gameMatchStore.ts`

- [ ] **Step 1: Create API service**

```typescript
// apps/mobile/src/services/gameRoomApiService.ts
import { api } from './api';

export interface GameRoomResponse {
  id: string;
  creatorId: string;
  gameType: string;
  status: string;
  maxPlayers: number;
  currentPlayers: number;
  isPrivate: boolean;
  roomCode: string | null;
  createdAt: string;
  startedAt: string | null;
  players: Array<{
    id: string;
    userId: string;
    isReady: boolean;
    isHost: boolean;
    score: number;
    user: { id: string; firstName: string; photos: Array<{ url: string }> };
  }>;
}

export const gameRoomApiService = {
  async listRooms(gameType?: string): Promise<{ rooms: GameRoomResponse[]; total: number }> {
    try {
      const params = gameType ? { gameType } : {};
      const response = await api.get('/game-rooms', { params });
      return response.data;
    } catch {
      return { rooms: [], total: 0 };
    }
  },

  async createRoom(gameType: string, isPrivate = false): Promise<GameRoomResponse> {
    const response = await api.post('/game-rooms', { gameType, isPrivate });
    return response.data;
  },

  async getRoom(roomId: string): Promise<GameRoomResponse> {
    const response = await api.get(`/game-rooms/${roomId}`);
    return response.data;
  },

  async getMyHistory(): Promise<unknown[]> {
    const response = await api.get('/game-rooms/history');
    return response.data;
  },
};
```

- [ ] **Step 2: Create Zustand game room store**

```typescript
// apps/mobile/src/stores/gameRoomStore.ts
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { gameRoomApiService, GameRoomResponse } from '../services/gameRoomApiService';

interface GameRoomState {
  // Room list
  rooms: GameRoomResponse[];
  isLoadingRooms: boolean;

  // Current room
  currentRoom: GameRoomResponse | null;
  isInLobby: boolean;
  isPlaying: boolean;

  // WebSocket
  socket: Socket | null;

  // Actions
  fetchRooms: (gameType?: string) => Promise<void>;
  createRoom: (gameType: string, isPrivate?: boolean) => Promise<GameRoomResponse | null>;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  setReady: (isReady: boolean) => void;
  sendMessage: (content: string) => void;
  sendReaction: (emoji: string) => void;
  sendGameAction: (type: string, payload: Record<string, unknown>) => void;
  sendGameFinished: (winnerId: string | null, playerScores: Record<string, number>, connectionScores: Record<string, number>, durationSeconds: number) => void;
  requestRematch: () => void;
  connectSocket: (userId: string, token: string) => void;
  disconnectSocket: () => void;
  reset: () => void;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const useGameRoomStore = create<GameRoomState>((set, get) => ({
  rooms: [],
  isLoadingRooms: false,
  currentRoom: null,
  isInLobby: false,
  isPlaying: false,
  socket: null,

  fetchRooms: async (gameType?: string) => {
    set({ isLoadingRooms: true });
    try {
      const { rooms } = await gameRoomApiService.listRooms(gameType);
      set({ rooms });
    } finally {
      set({ isLoadingRooms: false });
    }
  },

  createRoom: async (gameType: string, isPrivate = false) => {
    try {
      const room = await gameRoomApiService.createRoom(gameType, isPrivate);
      set({ currentRoom: room, isInLobby: true });
      get().socket?.emit('game:join_room', { roomId: room.id });
      return room;
    } catch {
      return null;
    }
  },

  joinRoom: (roomId: string) => {
    const socket = get().socket;
    if (!socket) return;
    socket.emit('game:join_room', { roomId });
    set({ isInLobby: true });
  },

  leaveRoom: () => {
    const { socket, currentRoom } = get();
    if (!socket || !currentRoom) return;
    socket.emit('game:leave_room', { roomId: currentRoom.id });
    set({ currentRoom: null, isInLobby: false, isPlaying: false });
  },

  setReady: (isReady: boolean) => {
    const { socket, currentRoom } = get();
    if (!socket || !currentRoom) return;
    socket.emit(isReady ? 'game:ready' : 'game:unready', { roomId: currentRoom.id });
  },

  sendMessage: (content: string) => {
    const { socket, currentRoom } = get();
    if (!socket || !currentRoom) return;
    socket.emit('game:send_message', { roomId: currentRoom.id, content });
  },

  sendReaction: (emoji: string) => {
    const { socket, currentRoom } = get();
    if (!socket || !currentRoom) return;
    socket.emit('game:react', { roomId: currentRoom.id, emoji });
  },

  sendGameAction: (type: string, payload: Record<string, unknown>) => {
    const { socket, currentRoom } = get();
    if (!socket || !currentRoom) return;
    socket.emit('game:action', { roomId: currentRoom.id, type, payload });
  },

  sendGameFinished: (winnerId, playerScores, connectionScores, durationSeconds) => {
    const { socket, currentRoom } = get();
    if (!socket || !currentRoom) return;
    socket.emit('game:finished', { roomId: currentRoom.id, winnerId, playerScores, connectionScores, durationSeconds });
  },

  requestRematch: () => {
    const { socket, currentRoom } = get();
    if (!socket || !currentRoom) return;
    socket.emit('game:rematch', { roomId: currentRoom.id });
  },

  connectSocket: (userId: string, token: string) => {
    const existingSocket = get().socket;
    if (existingSocket?.connected) return;

    const socket = io(`${API_URL}/game-room`, {
      auth: { token, userId },
      transports: ['websocket'],
    });

    socket.on('game:room_updated', (data: { room: GameRoomResponse }) => {
      set({ currentRoom: data.room });
    });

    socket.on('game:player_ready', (data: { userId: string; isReady: boolean }) => {
      const room = get().currentRoom;
      if (!room) return;
      const updatedPlayers = room.players.map(p =>
        p.userId === data.userId ? { ...p, isReady: data.isReady } : p,
      );
      set({ currentRoom: { ...room, players: updatedPlayers } });
    });

    socket.on('game:countdown_start', () => {
      // Handled in UI component
    });

    socket.on('game:started', () => {
      set({ isPlaying: true, isInLobby: false });
    });

    socket.on('game:finished', () => {
      set({ isPlaying: false });
    });

    socket.on('game:error', (data: { message: string }) => {
      console.warn('Game room error:', data.message);
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },

  reset: () => {
    get().disconnectSocket();
    set({
      rooms: [],
      isLoadingRooms: false,
      currentRoom: null,
      isInLobby: false,
      isPlaying: false,
      socket: null,
    });
  },
}));
```

- [ ] **Step 3: Add new signal weights to gameMatchStore**

Add to `apps/mobile/src/stores/gameMatchStore.ts` in the `SIGNAL_WEIGHTS` object (or equivalent scoring section):

```typescript
// Add these new weights alongside existing ones:
sameAnswer: 4,       // Same answer in compatibility
laughReaction: 3,     // Laughed at each other
rematchRequest: 10,   // Requested rematch
profileView: 6,       // Viewed profile
```

And add corresponding tracker methods:

```typescript
trackSameAnswer: (userId: string) => {
  // increment directReplies by 4 (using sameAnswer weight)
  const state = get();
  const player = state.currentSession?.playerInteractions.get(userId);
  if (player) {
    player.directReplies += 4;
  }
},
trackRematch: (userId: string) => {
  const state = get();
  const player = state.currentSession?.playerInteractions.get(userId);
  if (player) {
    player.directReplies += 10;
  }
},
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/services/gameRoomApiService.ts apps/mobile/src/stores/gameRoomStore.ts apps/mobile/src/stores/gameMatchStore.ts
git commit -m "feat(mobile): add game room API service, Zustand store with WebSocket, and enhanced connection scoring"
```

---

## Task 6: Mobile — Shared Game Components

**Files:**
- Create: `apps/mobile/src/screens/activities/gameRoom/components/RoomCard.tsx`
- Create: `apps/mobile/src/screens/activities/gameRoom/components/PlayerList.tsx`
- Create: `apps/mobile/src/screens/activities/gameRoom/components/GameChat.tsx`
- Create: `apps/mobile/src/screens/activities/gameRoom/components/ScoreBoard.tsx`
- Create: `apps/mobile/src/screens/activities/gameRoom/components/ReactionBar.tsx`

- [ ] **Step 1: Create RoomCard component**

```typescript
// apps/mobile/src/screens/activities/gameRoom/components/RoomCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GAME_CONFIG, CATEGORY_GRADIENTS, GameType, GameCategory } from '@luma/shared';

interface RoomCardProps {
  id: string;
  gameType: GameType;
  currentPlayers: number;
  maxPlayers: number;
  status: string;
  creatorName: string;
  onPress: (roomId: string) => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({
  id, gameType, currentPlayers, maxPlayers, status, creatorName, onPress,
}) => {
  const config = GAME_CONFIG[gameType];
  const gradient = CATEGORY_GRADIENTS[config.category];
  const isFull = currentPlayers >= maxPlayers;
  const isPlaying = status === 'PLAYING';

  const statusColor = isPlaying ? '#EF4444' : isFull ? '#EAB308' : '#22C55E';
  const statusText = isPlaying ? 'Oyunda' : isFull ? 'Dolu' : 'Katil';

  return (
    <TouchableOpacity onPress={() => onPress(id)} activeOpacity={0.8}>
      <LinearGradient colors={gradient} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={styles.icon}>{config.icon}</Text>
        <Text style={styles.name} numberOfLines={1}>{config.nameTr}</Text>
        <Text style={styles.creator}>{creatorName}</Text>

        <View style={styles.playerRow}>
          {Array.from({ length: maxPlayers }).map((_, i) => (
            <View key={i} style={[styles.seat, i < currentPlayers && styles.seatFilled]} />
          ))}
        </View>
        <Text style={styles.playerCount}>{currentPlayers}/{maxPlayers}</Text>

        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 140,
    height: 180,
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
  },
  icon: { fontSize: 28, marginBottom: 4 },
  name: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2 },
  creator: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 8 },
  playerRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  seat: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  seatFilled: { backgroundColor: '#fff' },
  playerCount: { fontSize: 11, color: 'rgba(255,255,255,0.9)', marginBottom: 8 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: { fontSize: 10, fontWeight: '700', color: '#fff' },
});
```

- [ ] **Step 2: Create PlayerList component**

```typescript
// apps/mobile/src/screens/activities/gameRoom/components/PlayerList.tsx
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface Player {
  userId: string;
  isReady: boolean;
  isHost: boolean;
  user: { firstName: string; photos: Array<{ url: string }> };
}

interface PlayerListProps {
  players: Player[];
  maxPlayers: number;
}

export const PlayerList: React.FC<PlayerListProps> = ({ players, maxPlayers }) => {
  const emptySeats = maxPlayers - players.length;

  return (
    <View style={styles.container}>
      {players.map(player => (
        <View key={player.userId} style={styles.playerItem}>
          <View style={styles.avatarContainer}>
            {player.user.photos?.[0] ? (
              <Image source={{ uri: player.user.photos[0].url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.initial}>{player.user.firstName[0]}</Text>
              </View>
            )}
            {player.isHost && (
              <View style={styles.hostBadge}><Text style={styles.hostText}>👑</Text></View>
            )}
          </View>
          <Text style={styles.name} numberOfLines={1}>{player.user.firstName}</Text>
          <Text style={styles.status}>
            {player.isReady ? '✅ Hazir' : '⏳ Bekliyor'}
          </Text>
        </View>
      ))}
      {Array.from({ length: emptySeats }).map((_, i) => (
        <View key={`empty-${i}`} style={styles.playerItem}>
          <View style={[styles.avatar, styles.emptyAvatar]}>
            <Text style={styles.emptyText}>?</Text>
          </View>
          <Text style={styles.emptyName}>Bos koltuk</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' },
  playerItem: { alignItems: 'center', width: 80 },
  avatarContainer: { position: 'relative', marginBottom: 4 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: { backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' },
  initial: { color: '#fff', fontSize: 20, fontWeight: '700' },
  hostBadge: { position: 'absolute', top: -4, right: -4 },
  hostText: { fontSize: 16 },
  name: { fontSize: 13, fontWeight: '600', color: '#fff', textAlign: 'center' },
  status: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  emptyAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
    borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
  },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 20 },
  emptyName: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
});
```

- [ ] **Step 3: Create GameChat component**

```typescript
// apps/mobile/src/screens/activities/gameRoom/components/GameChat.tsx
import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  type: string;
  createdAt: string;
}

interface GameChatProps {
  messages: ChatMessage[];
  onSend: (content: string) => void;
  messageCount: number;
  messageLimit: number;
  isDisabled?: boolean;
}

export const GameChat: React.FC<GameChatProps> = ({
  messages, onSend, messageCount, messageLimit, isDisabled,
}) => {
  const [text, setText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const isLimitReached = messageLimit !== -1 && messageCount >= messageLimit;

  const handleSend = () => {
    if (!text.trim() || isLimitReached || isDisabled) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        inverted
        style={styles.messageList}
        renderItem={({ item }) => (
          <View style={styles.messageRow}>
            <Text style={styles.senderName}>{item.senderName}:</Text>
            <Text style={styles.messageText}>{item.content}</Text>
          </View>
        )}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={isLimitReached ? 'Mesaj limiti doldu' : 'Mesaj yaz...'}
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleSend}
          editable={!isLimitReached && !isDisabled}
          maxLength={200}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!text.trim() || isLimitReached}
          style={[styles.sendBtn, (!text.trim() || isLimitReached) && styles.sendBtnDisabled]}
        >
          <Text style={styles.sendText}>Gonder</Text>
        </TouchableOpacity>
      </View>
      {messageLimit !== -1 && (
        <Text style={styles.limitText}>{messageCount}/{messageLimit} mesaj</Text>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { maxHeight: 200 },
  messageList: { maxHeight: 140, paddingHorizontal: 12 },
  messageRow: { flexDirection: 'row', marginBottom: 4 },
  senderName: { fontSize: 12, fontWeight: '700', color: '#3B82F6', marginRight: 4 },
  messageText: { fontSize: 12, color: '#E0E0E0', flex: 1 },
  inputRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  input: {
    flex: 1, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14, color: '#fff', fontSize: 13,
  },
  sendBtn: {
    height: 36, paddingHorizontal: 16, borderRadius: 18,
    backgroundColor: '#3B82F6', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  limitText: { fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'right', paddingRight: 12 },
});
```

- [ ] **Step 4: Create ScoreBoard component**

```typescript
// apps/mobile/src/screens/activities/gameRoom/components/ScoreBoard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PlayerScore {
  userId: string;
  name: string;
  score: number;
  photoUrl: string | null;
}

interface ScoreBoardProps {
  scores: PlayerScore[];
  currentUserId: string;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({ scores, currentUserId }) => {
  const sorted = [...scores].sort((a, b) => b.score - a.score);

  return (
    <View style={styles.container}>
      {sorted.map((player, index) => {
        const isMe = player.userId === currentUserId;
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;

        return (
          <View key={player.userId} style={[styles.row, isMe && styles.rowMe]}>
            <Text style={styles.medal}>{medal}</Text>
            <Text style={[styles.name, isMe && styles.nameMe]} numberOfLines={1}>
              {isMe ? 'Sen' : player.name}
            </Text>
            <Text style={[styles.score, isMe && styles.scoreMe]}>{player.score} pt</Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8 },
  rowMe: { backgroundColor: 'rgba(59,130,246,0.2)', borderRadius: 8 },
  medal: { fontSize: 16, width: 28 },
  name: { flex: 1, fontSize: 13, color: '#E0E0E0' },
  nameMe: { fontWeight: '700', color: '#fff' },
  score: { fontSize: 13, fontWeight: '600', color: '#A0A0A0' },
  scoreMe: { color: '#3B82F6' },
});
```

- [ ] **Step 5: Create ReactionBar component**

```typescript
// apps/mobile/src/screens/activities/gameRoom/components/ReactionBar.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

const REACTIONS = ['😂', '🔥', '👏', '😮', '💕', '❄️'];

interface ReactionBarProps {
  onReact: (emoji: string) => void;
}

export const ReactionBar: React.FC<ReactionBarProps> = ({ onReact }) => {
  const handlePress = (emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReact(emoji);
  };

  return (
    <View style={styles.container}>
      {REACTIONS.map(emoji => (
        <TouchableOpacity key={emoji} onPress={() => handlePress(emoji)} style={styles.button}>
          <Text style={styles.emoji}>{emoji}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingVertical: 8 },
  button: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  emoji: { fontSize: 22 },
});
```

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/screens/activities/gameRoom/components/
git commit -m "feat(mobile): add shared game room components — RoomCard, PlayerList, GameChat, ScoreBoard, ReactionBar"
```

---

## Task 7: Mobile — Lobby, Play Router & Result Screens

**Files:**
- Create: `apps/mobile/src/screens/activities/gameRoom/GameLobbyScreen.tsx`
- Create: `apps/mobile/src/screens/activities/gameRoom/GamePlayScreen.tsx`
- Create: `apps/mobile/src/screens/activities/gameRoom/GameResultScreen.tsx`

- [ ] **Step 1: Create GameLobbyScreen**

```typescript
// apps/mobile/src/screens/activities/gameRoom/GameLobbyScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useGameRoomStore } from '../../../stores/gameRoomStore';
import { GAME_CONFIG, CATEGORY_GRADIENTS, GameType } from '@luma/shared';
import { PlayerList } from './components/PlayerList';
import { GameChat } from './components/GameChat';

type LobbyRouteParams = { GameLobby: { roomId: string; gameType: string } };

export const GameLobbyScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<LobbyRouteParams, 'GameLobby'>>();
  const { roomId, gameType } = route.params;

  const { currentRoom, leaveRoom, setReady, sendMessage, socket } = useGameRoomStore();
  const [messages, setMessages] = useState<Array<{ id: string; senderId: string; senderName: string; content: string; type: string; createdAt: string }>>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);

  const config = GAME_CONFIG[gameType as GameType];
  const gradient = CATEGORY_GRADIENTS[config.category];

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg: any) => {
      setMessages(prev => [msg, ...prev]);
    };

    const handleCountdown = (data: { seconds: number }) => {
      setCountdown(data.seconds);
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const handleStarted = () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate('GamePlay' as never, { roomId, gameType } as never);
    };

    socket.on('game:message', handleMessage);
    socket.on('game:countdown_start', handleCountdown);
    socket.on('game:started', handleStarted);

    return () => {
      socket.off('game:message', handleMessage);
      socket.off('game:countdown_start', handleCountdown);
      socket.off('game:started', handleStarted);
    };
  }, [socket, roomId, gameType, navigation]);

  const handleReady = () => {
    const newReady = !isReady;
    setIsReady(newReady);
    setReady(newReady);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleLeave = () => {
    Alert.alert('Odadan Cik', 'Emin misin?', [
      { text: 'Iptal', style: 'cancel' },
      { text: 'Cik', style: 'destructive', onPress: () => { leaveRoom(); navigation.goBack(); } },
    ]);
  };

  const handleSendMessage = (content: string) => {
    sendMessage(content);
    setMessageCount(prev => prev + 1);
  };

  if (!currentRoom) return null;

  return (
    <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleLeave} style={styles.backBtn}>
            <Text style={styles.backText}>🚪 Cik</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerIcon}>{config.icon}</Text>
            <Text style={styles.headerTitle}>{config.nameTr}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.playerCountText}>
              {currentRoom.currentPlayers}/{currentRoom.maxPlayers}
            </Text>
          </View>
        </View>

        {/* Countdown overlay */}
        {countdown !== null && (
          <View style={styles.countdownOverlay}>
            <Text style={styles.countdownNumber}>{countdown}</Text>
            <Text style={styles.countdownText}>Oyun basliyor!</Text>
          </View>
        )}

        {/* Players */}
        <View style={styles.playersSection}>
          <PlayerList players={currentRoom.players} maxPlayers={currentRoom.maxPlayers} />
        </View>

        {/* Chat */}
        <View style={styles.chatSection}>
          <GameChat
            messages={messages}
            onSend={handleSendMessage}
            messageCount={messageCount}
            messageLimit={5}
          />
        </View>

        {/* Ready button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity onPress={handleReady} style={styles.readyBtn}>
            <LinearGradient
              colors={isReady ? ['#EF4444', '#DC2626'] : ['#22C55E', '#16A34A']}
              style={styles.readyGradient}
            >
              <Text style={styles.readyText}>
                {isReady ? '❌ Vazgec' : '✅ Hazirim'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.hintText}>
            Herkes hazir olunca oyun baslar (min 2 oyuncu)
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 8 },
  backText: { color: '#EF4444', fontSize: 14, fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  headerIcon: { fontSize: 24 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerRight: {},
  playerCountText: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  countdownOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 100, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  countdownNumber: { fontSize: 96, fontWeight: '900', color: '#fff' },
  countdownText: { fontSize: 18, color: 'rgba(255,255,255,0.8)', marginTop: 8 },
  playersSection: { flex: 1, justifyContent: 'center', paddingHorizontal: 16 },
  chatSection: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  bottomBar: { padding: 16, alignItems: 'center' },
  readyBtn: { width: '100%', borderRadius: 16, overflow: 'hidden' },
  readyGradient: { paddingVertical: 16, alignItems: 'center' },
  readyText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  hintText: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 8 },
});
```

- [ ] **Step 2: Create GamePlayScreen (router)**

```typescript
// apps/mobile/src/screens/activities/gameRoom/GamePlayScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { TruthOrDare } from './games/TruthOrDare';
import { TwoTruthsOneLie } from './games/TwoTruthsOneLie';
import { TriviaQuiz } from './games/TriviaQuiz';
import { WordBattle } from './games/WordBattle';
import { EmojiGuess } from './games/EmojiGuess';
import { CompatibilityChallenge } from './games/CompatibilityChallenge';
import { UnoGame } from './games/UnoGame';
import { OkeyGame } from './games/OkeyGame';

type PlayRouteParams = { GamePlay: { roomId: string; gameType: string } };

const GAME_COMPONENTS: Record<string, React.FC<{ roomId: string }>> = {
  TRUTH_DARE: TruthOrDare,
  TWO_TRUTHS_ONE_LIE: TwoTruthsOneLie,
  TRIVIA: TriviaQuiz,
  WORD_BATTLE: WordBattle,
  EMOJI_GUESS: EmojiGuess,
  COMPATIBILITY: CompatibilityChallenge,
  UNO: UnoGame,
  OKEY: OkeyGame,
};

export const GamePlayScreen: React.FC = () => {
  const route = useRoute<RouteProp<PlayRouteParams, 'GamePlay'>>();
  const { roomId, gameType } = route.params;

  const GameComponent = GAME_COMPONENTS[gameType];

  if (!GameComponent) {
    return (
      <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.container}>
        <SafeAreaView style={styles.center}>
          <Text style={styles.errorText}>Oyun bulunamadi: {gameType}</Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return <GameComponent roomId={roomId} />;
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#EF4444', fontSize: 16 },
});
```

- [ ] **Step 3: Create GameResultScreen**

```typescript
// apps/mobile/src/screens/activities/gameRoom/GameResultScreen.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useGameMatchStore, GameConnectionResult } from '../../../stores/gameMatchStore';

type ResultRouteParams = {
  GameResult: {
    roomId: string;
    playerScores: Record<string, number>;
  };
};

const CONNECTION_LEVELS = {
  strong: { emoji: '🔥', title: 'Harika anlastiniz!', gradient: ['#10B981', '#059669'] as [string, string] },
  good: { emoji: '✨', title: 'Guzel bir baglanti!', gradient: ['#8B5CF6', '#7C3AED'] as [string, string] },
  mild: { emoji: '👋', title: 'Tanismaya deger!', gradient: ['#3B82F6', '#1D4ED8'] as [string, string] },
};

export const GameResultScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ResultRouteParams, 'GameResult'>>();
  const { playerScores } = route.params;
  const { calculateResults } = useGameMatchStore();

  const connectionResults = calculateResults();
  const sortedScores = Object.entries(playerScores).sort(([, a], [, b]) => b - a);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const renderConnectionCard = ({ item, index }: { item: GameConnectionResult; index: number }) => {
    const level = CONNECTION_LEVELS[item.level];
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 150,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View style={[styles.connectionCard, { opacity: fadeAnim }]}>
        <LinearGradient colors={level.gradient} style={styles.connectionGradient}>
          <Text style={styles.connectionEmoji}>{level.emoji}</Text>
          <Text style={styles.connectionName}>{item.name}, {item.age}</Text>
          <Text style={styles.connectionTitle}>{level.title}</Text>
          <Text style={styles.connectionScore}>%{item.connectionScore} uyum</Text>
          <View style={styles.connectionActions}>
            <TouchableOpacity style={styles.actionBtn}>
              <Text style={styles.actionText}>💬 Mesaj</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnPrimary}>
              <Text style={styles.actionTextPrimary}>👋 Baglan</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  return (
    <LinearGradient colors={['#1A1A2E', '#16213E']} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <Text style={styles.title}>🏆 Oyun Bitti!</Text>

        {/* Rankings */}
        <View style={styles.rankings}>
          {sortedScores.map(([userId, score], index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            return (
              <View key={userId} style={styles.rankRow}>
                <Text style={styles.medal}>{medal}</Text>
                <Text style={styles.rankName}>{userId}</Text>
                <Text style={styles.rankScore}>{score} pt</Text>
              </View>
            );
          })}
        </View>

        {/* Connection suggestions */}
        {connectionResults.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>💕 Gucllu Baglantilar</Text>
            <FlatList
              data={connectionResults.filter(r => r.level !== 'mild' || r.connectionScore >= 40)}
              keyExtractor={item => item.userId}
              renderItem={renderConnectionCard}
              style={styles.connectionList}
            />
          </>
        )}

        {/* Bottom actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>🏠 Lobiye Don</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Activities' as never)}
            style={styles.primaryBtn}
          >
            <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={styles.primaryGradient}>
              <Text style={styles.primaryBtnText}>🔄 Baska Oda</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 16 },
  title: { fontSize: 28, fontWeight: '900', color: '#fff', textAlign: 'center', marginVertical: 16 },
  rankings: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 12, marginBottom: 20,
  },
  rankRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  medal: { fontSize: 20, width: 36 },
  rankName: { flex: 1, fontSize: 15, color: '#E0E0E0', fontWeight: '600' },
  rankScore: { fontSize: 15, fontWeight: '700', color: '#3B82F6' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 12 },
  connectionList: { flex: 1 },
  connectionCard: { marginBottom: 12 },
  connectionGradient: { borderRadius: 16, padding: 16, alignItems: 'center' },
  connectionEmoji: { fontSize: 36, marginBottom: 4 },
  connectionName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  connectionTitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginBottom: 4 },
  connectionScore: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 12 },
  connectionActions: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  actionText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  actionBtnPrimary: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#fff',
  },
  actionTextPrimary: { color: '#1A1A2E', fontWeight: '700', fontSize: 14 },
  bottomActions: { flexDirection: 'row', gap: 12, paddingVertical: 16 },
  secondaryBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center',
  },
  secondaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  primaryBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  primaryGradient: { paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/screens/activities/gameRoom/GameLobbyScreen.tsx apps/mobile/src/screens/activities/gameRoom/GamePlayScreen.tsx apps/mobile/src/screens/activities/gameRoom/GameResultScreen.tsx
git commit -m "feat(mobile): add GameLobby, GamePlay router, and GameResult screens"
```

---

## Task 8: Mobile — Game Implementations (Icebreakers)

**Files:**
- Create: `apps/mobile/src/screens/activities/gameRoom/games/TruthOrDare.tsx`
- Create: `apps/mobile/src/screens/activities/gameRoom/games/TwoTruthsOneLie.tsx`

- [ ] **Step 1: Create Truth or Dare game**

This is a complete game component with wheel spin, question/dare display, and turn management. Due to length, create the file with:

- Wheel spin animation (react-native-reanimated withTiming rotation)
- Question bank: 30 Turkish truth questions (flirty/fun), 20 dare challenges
- Turn-based logic: current player spins → gets truth or dare → answers/completes → next player
- Pas button (2 per day for free users)
- Score: +10 for answering truth, +15 for completing dare
- Integrates with gameRoomStore for WebSocket actions and gameMatchStore for tracking

Key structure:
```typescript
// apps/mobile/src/screens/activities/gameRoom/games/TruthOrDare.tsx
const TRUTHS_TR = [
  'En utanc verici ilk bulusma anin ne?',
  'Bir kisiye soyledigin en buyuk yalan ne?',
  'Hayatinda en cok pisman oldugun sey ne?',
  // ... 27 more
];

const DARES_TR = [
  'Simdi bir selfie cek ve goster',
  'Son atan mesajini oku',
  'En sevdigin sarki parcasini soyle',
  // ... 17 more
];
```

Full component with wheel, timer, turn management, score tracking, and WebSocket integration.

- [ ] **Step 2: Create Two Truths One Lie game**

```typescript
// apps/mobile/src/screens/activities/gameRoom/games/TwoTruthsOneLie.tsx
```

Key structure:
- Current player writes 3 statements (2 true, 1 lie) via TextInput
- Other players vote on which is the lie
- 30s writing time, 20s voting time
- Score: +10 for correct guess, +5 per player fooled
- Reveal animation showing correct answer

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/screens/activities/gameRoom/games/TruthOrDare.tsx apps/mobile/src/screens/activities/gameRoom/games/TwoTruthsOneLie.tsx
git commit -m "feat(mobile): add Truth or Dare and Two Truths One Lie game components"
```

---

## Task 9: Mobile — Game Implementations (Competitions)

**Files:**
- Create: `apps/mobile/src/screens/activities/gameRoom/games/TriviaQuiz.tsx`
- Create: `apps/mobile/src/screens/activities/gameRoom/games/WordBattle.tsx`
- Create: `apps/mobile/src/screens/activities/gameRoom/games/EmojiGuess.tsx`

- [ ] **Step 1: Create Trivia Quiz game**

Key structure:
- 10 rounds, 4 categories (Genel Kultur, Sinema, Muzik, Ask & Iliskiler, Turkiye)
- 15s per question, 4 multiple choice answers
- Faster correct answer = more points (15 base + time bonus up to 10)
- Question bank: 50+ Turkish trivia questions with answers
- Progress bar, answer reveal animation, score update

- [ ] **Step 2: Create Word Battle game**

Key structure:
- Random 7 Turkish letters shown
- 30s to type longest valid word from those letters
- Turkish word validation (basic dictionary check)
- Score: word length × 5 points
- 8 rounds

- [ ] **Step 3: Create Emoji Guess game**

Key structure:
- Turn-based: describer picks category (Film, Sarki, Unlu), enters emoji sequence
- Others type guesses in chat-style input
- 45s per round, first correct guess wins
- Score: +15 first correct, +10 describer if someone guesses
- Category selection UI + emoji keyboard focus

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/screens/activities/gameRoom/games/TriviaQuiz.tsx apps/mobile/src/screens/activities/gameRoom/games/WordBattle.tsx apps/mobile/src/screens/activities/gameRoom/games/EmojiGuess.tsx
git commit -m "feat(mobile): add Trivia Quiz, Word Battle, and Emoji Guess game components"
```

---

## Task 10: Mobile — Game Implementations (Compatibility + Classics)

**Files:**
- Create: `apps/mobile/src/screens/activities/gameRoom/games/CompatibilityChallenge.tsx`
- Create: `apps/mobile/src/screens/activities/gameRoom/games/UnoGame.tsx`
- Create: `apps/mobile/src/screens/activities/gameRoom/games/OkeyGame.tsx`

- [ ] **Step 1: Create Compatibility Challenge game**

Key structure:
- 10 binary questions ("Dag mi Deniz mi?", "Sabahci mi Gececi mi?")
- All players answer simultaneously (10s per question)
- After all answer, reveal who matched
- Score: +10 per matching pair
- End: Show compatibility percentage between each pair
- Turkish question bank: 20+ ikili tercih sorusu

- [ ] **Step 2: Create UNO game**

Key structure:
- Card system: 4 colors (Red, Blue, Green, Yellow) × values (0-9, Skip, Reverse, +2) + Wild, Wild+4
- Each player starts with 7 cards
- Turn-based: play matching card or draw
- Special cards: Skip, Reverse, +2, Wild (color change), Wild+4
- "UNO!" button when 1 card left (penalty if caught without calling)
- Card dealing, playing, drawing animations
- This is the most complex game — detailed card rendering, hand management, play validation

- [ ] **Step 3: Create Okey game (simplified)**

Key structure:
- Simplified Turkish Okey: 4 colors, numbers 1-13
- 2-4 players, each gets 14 tiles (15 for dealer)
- Goal: form sets (same number, different colors) or runs (consecutive numbers, same color)
- Draw from pile or discard pile, discard one tile
- First to complete all sets/runs wins
- Tile rendering, hand organization, set validation

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/screens/activities/gameRoom/games/CompatibilityChallenge.tsx apps/mobile/src/screens/activities/gameRoom/games/UnoGame.tsx apps/mobile/src/screens/activities/gameRoom/games/OkeyGame.tsx
git commit -m "feat(mobile): add Compatibility Challenge, UNO, and Okey game components"
```

---

## Task 11: Mobile — Activities Screen Integration

**Files:**
- Modify: `apps/mobile/src/screens/activities/ActivitiesScreen.tsx`

- [ ] **Step 1: Add Game Rooms section to Activities screen**

Add at the top of the ActivitiesScreen, above the existing activities feed:

1. Import `useGameRoomStore`, `RoomCard`, `GAME_CONFIG`, `GameCategory`, `CATEGORY_GRADIENTS`
2. Add state for selected category filter
3. Add `useEffect` to fetch rooms on mount
4. Add horizontal ScrollView section with:
   - Section title "🎮 Oyun Odalari"
   - Category filter chips (Tumumu, Klasikler, Buz Kirici, Yarisma, Uyumluluk)
   - Horizontal FlatList of RoomCard components
   - "Oda Olustur" FAB button
5. Room creation modal/action sheet for selecting game type
6. Navigation to GameLobbyScreen on room card press

Key additions to the existing component:
```typescript
// Add before the existing activities feed section
const { rooms, fetchRooms, createRoom, connectSocket } = useGameRoomStore();
const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

useEffect(() => {
  fetchRooms();
  // Connect WebSocket (get userId and token from auth store)
  connectSocket(userId, token);
}, []);

// Filter rooms by category
const filteredRooms = selectedCategory === 'ALL'
  ? rooms
  : rooms.filter(r => GAME_CONFIG[r.gameType as GameType]?.category === selectedCategory);
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/screens/activities/ActivitiesScreen.tsx
git commit -m "feat(mobile): integrate Game Rooms section into Activities screen with category filters"
```

---

## Task 12: Mobile — Navigation Integration

**Files:**
- Modify: `apps/mobile/src/navigation/MainTabNavigator.tsx`

- [ ] **Step 1: Add game room screens to navigation**

Add imports:
```typescript
import { GameLobbyScreen } from '../screens/activities/gameRoom/GameLobbyScreen';
import { GamePlayScreen } from '../screens/activities/gameRoom/GamePlayScreen';
import { GameResultScreen } from '../screens/activities/gameRoom/GameResultScreen';
```

Add to `ActivitiesStackParamList`:
```typescript
GameLobby: { roomId: string; gameType: string };
GamePlay: { roomId: string; gameType: string };
GameResult: { roomId: string; playerScores: Record<string, number> };
```

Add screens to ActivitiesStack:
```typescript
<Stack.Screen name="GameLobby" component={GameLobbyScreen} options={{ headerShown: false }} />
<Stack.Screen name="GamePlay" component={GamePlayScreen} options={{ headerShown: false, gestureEnabled: false }} />
<Stack.Screen name="GameResult" component={GameResultScreen} options={{ headerShown: false }} />
```

Note: `gestureEnabled: false` on GamePlay prevents accidental back swipe during gameplay.

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/navigation/MainTabNavigator.tsx
git commit -m "feat(mobile): add game room screens to Activities navigation stack"
```

---

## Task 13: Integration Test & Cleanup

- [ ] **Step 1: Verify TypeScript compilation**

Run:
```bash
cd packages/shared && npx tsc --noEmit
cd apps/backend && npx tsc --noEmit
cd apps/mobile && npx tsc --noEmit
```

Fix any type errors that surface.

- [ ] **Step 2: Verify backend starts**

Run:
```bash
cd apps/backend && npm run start:dev
```

Expected: Server starts without errors, game-room endpoints visible in Swagger at /api

- [ ] **Step 3: Verify mobile compiles**

Run:
```bash
cd apps/mobile && npx expo start
```

Expected: Metro bundler starts, no compilation errors

- [ ] **Step 4: Final commit with any fixes**

```bash
git add -A
git commit -m "fix: resolve TypeScript errors and integration issues in game center"
```

---

## Execution Order Summary

| Task | Description | Dependencies | Estimated Complexity |
|------|-------------|-------------|---------------------|
| 1 | Shared Types & Constants | None | Low |
| 2 | Database Schema | Task 1 | Low |
| 3 | Backend Module Foundation | Task 1, 2 | Medium |
| 4 | Backend WebSocket Gateway | Task 3 | Medium |
| 5 | Mobile Store & API Service | Task 1 | Medium |
| 6 | Mobile Shared Components | Task 5 | Medium |
| 7 | Mobile Lobby/Play/Result Screens | Task 5, 6 | High |
| 8 | Games: Icebreakers | Task 7 | Medium |
| 9 | Games: Competitions | Task 7 | Medium |
| 10 | Games: Compatibility + Classics | Task 7 | High |
| 11 | Activities Screen Integration | Task 5, 6 | Medium |
| 12 | Navigation Integration | Task 7 | Low |
| 13 | Integration Test & Cleanup | All | Low |

**Parallelizable groups:**
- Tasks 3-4 (backend) can run in parallel with Tasks 5-6 (mobile foundation)
- Tasks 8, 9, 10 (game implementations) can run in parallel with each other
- Task 11 and 12 can run in parallel
