// GameMatchStore — Tracks interaction signals during game sessions
// Calculates connection scores and suggests post-game matches

import { create } from 'zustand';

// ─── Interaction Signals ─────────────────────────────────────────

export interface PlayerInteraction {
  userId: string;
  name: string;
  avatarUrl: string;
  age: number;
  isVerified: boolean;
  // Signals
  messageCount: number;
  reactionCount: number;
  directReplies: number;
  timeInRoomSeconds: number;
  turnsPlayed: number;
  emojisUsed: number;
  voiceMinutes: number;
}

export interface GameConnectionResult {
  userId: string;
  name: string;
  avatarUrl: string;
  age: number;
  isVerified: boolean;
  connectionScore: number;
  highlights: string[];
  level: 'strong' | 'good' | 'mild';
}

// ─── Scoring weights ─────────────────────────────────────────────

const WEIGHTS = {
  messageCount: 3,
  reactionCount: 2,
  directReplies: 5,
  timeInRoomSeconds: 0.02,
  turnsPlayed: 1,
  emojisUsed: 1.5,
  voiceMinutes: 8,
};

const MAX_SCORE = 100;

function calculateConnectionScore(interaction: PlayerInteraction): number {
  const raw =
    interaction.messageCount * WEIGHTS.messageCount +
    interaction.reactionCount * WEIGHTS.reactionCount +
    interaction.directReplies * WEIGHTS.directReplies +
    interaction.timeInRoomSeconds * WEIGHTS.timeInRoomSeconds +
    interaction.turnsPlayed * WEIGHTS.turnsPlayed +
    interaction.emojisUsed * WEIGHTS.emojisUsed +
    interaction.voiceMinutes * WEIGHTS.voiceMinutes;

  // Normalize to 0-100
  return Math.min(MAX_SCORE, Math.round(raw));
}

function generateHighlights(interaction: PlayerInteraction, hasPlayedBefore: boolean): string[] {
  const highlights: string[] = [];

  if (hasPlayedBefore) {
    highlights.push('Daha once birlikte oynadiniz!');
  }
  if (interaction.directReplies >= 5) {
    highlights.push('Birbirinize cok yanit verdiniz');
  } else if (interaction.directReplies >= 3) {
    highlights.push('Birbirinize karsilikli yanit verdiniz');
  }
  if (interaction.messageCount >= 10) {
    highlights.push(`${interaction.messageCount} mesaj paylastiniz`);
  } else if (interaction.messageCount >= 5) {
    highlights.push('Sohbet ettiniz');
  }
  if (interaction.reactionCount >= 5) {
    highlights.push('Cok fazla reaksiyon gonderdiniz');
  }
  if (interaction.voiceMinutes >= 2) {
    highlights.push(`${interaction.voiceMinutes} dk sesli sohbet ettiniz`);
  }
  if (interaction.timeInRoomSeconds >= 600) {
    highlights.push(`${Math.round(interaction.timeInRoomSeconds / 60)} dk birlikte vakit gecirdiniz`);
  }
  if (interaction.emojisUsed >= 5) {
    highlights.push('Cok eglenmis gorunuyorsunuz!');
  }

  if (highlights.length === 0) {
    highlights.push('Oyunda birlikte vakit gecirdiniz');
  }

  return highlights.slice(0, 3);
}

function getConnectionLevel(score: number): 'strong' | 'good' | 'mild' {
  if (score >= 60) return 'strong';
  if (score >= 30) return 'good';
  return 'mild';
}

// ─── Game History Entry ─────────────────────────────────────────

export interface GameHistoryEntry {
  sessionId: string;
  gameType: string;
  playedAt: string;
  topConnection: { userId: string; name: string; score: number } | null;
}

// ─── Store ───────────────────────────────────────────────────────

type AnyGameType = 'uno' | 'board' | 'okey' | 'truth_dare' | 'would_you_rather' | 'quick_quiz' | 'emoji_guess' | 'word_battle' | 'icebreaker';

interface GameMatchState {
  // Current session tracking
  sessionId: string | null;
  gameType: AnyGameType | null;
  interactions: Map<string, PlayerInteraction>;
  sessionStartTime: number | null;

  // Post-game results
  results: GameConnectionResult[];
  showResults: boolean;

  // Game history — tracks who you've played with before
  gameHistory: GameHistoryEntry[];
  playedWithUsers: Set<string>;

  // Actions
  startSession: (sessionId: string, gameType: AnyGameType) => void;
  endSession: () => void;
  trackMessage: (userId: string, isDirectReply: boolean) => void;
  trackReaction: (userId: string) => void;
  trackEmoji: (userId: string) => void;
  trackVoice: (userId: string, minutes: number) => void;
  trackTurn: (userId: string) => void;
  trackQuestionAnswer: (userId: string) => void;
  trackPlayerSelection: (userId: string) => void;
  addPlayer: (player: { userId: string; name: string; avatarUrl: string; age: number; isVerified: boolean }) => void;
  removePlayer: (userId: string) => void;
  calculateResults: () => void;
  dismissResults: () => void;
  hasPlayedWith: (userId: string) => boolean;
  reset: () => void;
}

export const useGameMatchStore = create<GameMatchState>((set, get) => ({
  sessionId: null,
  gameType: null,
  interactions: new Map(),
  sessionStartTime: null,
  results: [],
  showResults: false,
  gameHistory: [],
  playedWithUsers: new Set(),

  startSession: (sessionId, gameType) => {
    set({
      sessionId,
      gameType,
      interactions: new Map(),
      sessionStartTime: Date.now(),
      results: [],
      showResults: false,
    });
  },

  endSession: () => {
    const { sessionId, gameType, interactions } = get();
    get().calculateResults();

    // Record game history
    if (sessionId && gameType) {
      const results = get().results;
      const topConnection = results.length > 0
        ? { userId: results[0].userId, name: results[0].name, score: results[0].connectionScore }
        : null;

      const entry: GameHistoryEntry = {
        sessionId,
        gameType,
        playedAt: new Date().toISOString(),
        topConnection,
      };

      // Track all players we've played with
      const newPlayedWith = new Set(get().playedWithUsers);
      for (const [userId] of interactions) {
        newPlayedWith.add(userId);
      }

      set((state) => ({
        gameHistory: [entry, ...state.gameHistory].slice(0, 50),
        playedWithUsers: newPlayedWith,
      }));
    }
  },

  addPlayer: (player) => {
    const { interactions } = get();
    const updated = new Map(interactions);
    if (!updated.has(player.userId)) {
      updated.set(player.userId, {
        ...player,
        messageCount: 0,
        reactionCount: 0,
        directReplies: 0,
        timeInRoomSeconds: 0,
        turnsPlayed: 0,
        emojisUsed: 0,
        voiceMinutes: 0,
      });
    }
    set({ interactions: updated });
  },

  removePlayer: (userId) => {
    const { interactions } = get();
    const updated = new Map(interactions);
    updated.delete(userId);
    set({ interactions: updated });
  },

  trackMessage: (userId, isDirectReply) => {
    const { interactions } = get();
    const player = interactions.get(userId);
    if (!player) return;
    const updated = new Map(interactions);
    updated.set(userId, {
      ...player,
      messageCount: player.messageCount + 1,
      directReplies: player.directReplies + (isDirectReply ? 1 : 0),
    });
    set({ interactions: updated });
  },

  trackReaction: (userId) => {
    const { interactions } = get();
    const player = interactions.get(userId);
    if (!player) return;
    const updated = new Map(interactions);
    updated.set(userId, { ...player, reactionCount: player.reactionCount + 1 });
    set({ interactions: updated });
  },

  trackEmoji: (userId) => {
    const { interactions } = get();
    const player = interactions.get(userId);
    if (!player) return;
    const updated = new Map(interactions);
    updated.set(userId, { ...player, emojisUsed: player.emojisUsed + 1 });
    set({ interactions: updated });
  },

  trackVoice: (userId, minutes) => {
    const { interactions } = get();
    const player = interactions.get(userId);
    if (!player) return;
    const updated = new Map(interactions);
    updated.set(userId, { ...player, voiceMinutes: player.voiceMinutes + minutes });
    set({ interactions: updated });
  },

  trackTurn: (userId) => {
    const { interactions } = get();
    const player = interactions.get(userId);
    if (!player) return;
    const updated = new Map(interactions);
    updated.set(userId, { ...player, turnsPlayed: player.turnsPlayed + 1 });
    set({ interactions: updated });
  },

  trackQuestionAnswer: (userId) => {
    // Answering each other's prompts — strong signal
    const { interactions } = get();
    const player = interactions.get(userId);
    if (!player) return;
    const updated = new Map(interactions);
    updated.set(userId, { ...player, directReplies: player.directReplies + 2 });
    set({ interactions: updated });
  },

  trackPlayerSelection: (userId) => {
    // Selecting a player in game choices — strongest signal
    const { interactions } = get();
    const player = interactions.get(userId);
    if (!player) return;
    const updated = new Map(interactions);
    updated.set(userId, { ...player, directReplies: player.directReplies + 3, reactionCount: player.reactionCount + 1 });
    set({ interactions: updated });
  },

  hasPlayedWith: (userId) => {
    return get().playedWithUsers.has(userId);
  },

  calculateResults: () => {
    const { interactions, sessionStartTime, playedWithUsers } = get();
    const now = Date.now();
    const sessionDuration = sessionStartTime ? (now - sessionStartTime) / 1000 : 0;

    const results: GameConnectionResult[] = [];

    for (const [, player] of interactions) {
      const interaction = {
        ...player,
        timeInRoomSeconds: sessionDuration,
      };

      let score = calculateConnectionScore(interaction);
      // Boost score if played together before — returning players have stronger connection
      const hasPlayedBefore = playedWithUsers.has(player.userId);
      if (hasPlayedBefore) {
        score = Math.min(MAX_SCORE, score + 10);
      }
      const highlights = generateHighlights(interaction, hasPlayedBefore);
      const level = getConnectionLevel(score);

      // Only suggest connections with meaningful interaction
      if (score >= 15) {
        results.push({
          userId: player.userId,
          name: player.name,
          avatarUrl: player.avatarUrl,
          age: player.age,
          isVerified: player.isVerified,
          connectionScore: score,
          highlights,
          level,
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.connectionScore - a.connectionScore);

    set({ results, showResults: results.length > 0 });
  },

  dismissResults: () => {
    set({ showResults: false });
  },

  reset: () => {
    set({
      sessionId: null,
      gameType: null,
      interactions: new Map(),
      sessionStartTime: null,
      results: [],
      showResults: false,
      // Note: gameHistory and playedWithUsers are NOT reset — they persist across sessions
    });
  },
}));
