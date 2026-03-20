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

function generateHighlights(interaction: PlayerInteraction): string[] {
  const highlights: string[] = [];

  if (interaction.messageCount >= 10) {
    highlights.push(`${interaction.messageCount} mesaj paylastiniz`);
  }
  if (interaction.directReplies >= 3) {
    highlights.push('Birbirinize cok yanit verdiniz');
  }
  if (interaction.reactionCount >= 5) {
    highlights.push('Cok fazla reaksiyon gonderdiniz');
  }
  if (interaction.voiceMinutes >= 2) {
    highlights.push(`${interaction.voiceMinutes} dakika sesli sohbet ettiniz`);
  }
  if (interaction.timeInRoomSeconds >= 600) {
    highlights.push(`${Math.round(interaction.timeInRoomSeconds / 60)} dakika birlikte vakit gecirdiniz`);
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

// ─── Store ───────────────────────────────────────────────────────

interface GameMatchState {
  // Current session tracking
  sessionId: string | null;
  gameType: 'uno' | 'board' | 'okey' | null;
  interactions: Map<string, PlayerInteraction>;
  sessionStartTime: number | null;

  // Post-game results
  results: GameConnectionResult[];
  showResults: boolean;

  // Actions
  startSession: (sessionId: string, gameType: 'uno' | 'board' | 'okey') => void;
  endSession: () => void;
  trackMessage: (userId: string, isDirectReply: boolean) => void;
  trackReaction: (userId: string) => void;
  trackEmoji: (userId: string) => void;
  trackVoice: (userId: string, minutes: number) => void;
  trackTurn: (userId: string) => void;
  addPlayer: (player: { userId: string; name: string; avatarUrl: string; age: number; isVerified: boolean }) => void;
  removePlayer: (userId: string) => void;
  calculateResults: () => void;
  dismissResults: () => void;
  reset: () => void;
}

export const useGameMatchStore = create<GameMatchState>((set, get) => ({
  sessionId: null,
  gameType: null,
  interactions: new Map(),
  sessionStartTime: null,
  results: [],
  showResults: false,

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
    get().calculateResults();
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

  calculateResults: () => {
    const { interactions, sessionStartTime } = get();
    const now = Date.now();
    const sessionDuration = sessionStartTime ? (now - sessionStartTime) / 1000 : 0;

    const results: GameConnectionResult[] = [];

    for (const [, player] of interactions) {
      const interaction = {
        ...player,
        timeInRoomSeconds: sessionDuration,
      };

      const score = calculateConnectionScore(interaction);
      const highlights = generateHighlights(interaction);
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
    });
  },
}));
