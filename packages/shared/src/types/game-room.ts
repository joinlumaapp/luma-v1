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
