// Game Room service — fetches available game tables/rooms from the API
// Falls back to mock data in development when the API is unavailable

import api from './api';
import { devMockOrThrow } from '../utils/mockGuard';

// ─── Types ──────────────────────────────────────────────────────────

type GameType = 'uno' | 'board' | 'okey';

export interface GameTablePlayer {
  name: string;
  initial: string;
}

export interface GameTable {
  id: string;
  gameType: GameType;
  name: string;
  players: GameTablePlayer[];
  maxPlayers: number;
  spectators: number;
  timeLeft: number;
  isStarted: boolean;
}

interface GameTablesResponse {
  tables: GameTable[];
  total: number;
}

// ─── Mock Data (dev fallback only) ──────────────────────────────────

const MOCK_TABLES: GameTable[] = [
  {
    id: 't1', gameType: 'uno', name: 'UNO Turnuvası',
    players: [{ name: 'Elif', initial: 'E' }, { name: 'Burak', initial: 'B' }, { name: 'Selin', initial: 'S' }],
    maxPlayers: 4, spectators: 8, timeLeft: 1245, isStarted: true,
  },
  {
    id: 't2', gameType: 'okey', name: 'Okey Klasik',
    players: [{ name: 'Kaan', initial: 'K' }, { name: 'Deniz', initial: 'D' }],
    maxPlayers: 4, spectators: 3, timeLeft: 0, isStarted: false,
  },
  {
    id: 't3', gameType: 'board', name: 'Board Night',
    players: [{ name: 'Merve', initial: 'M' }, { name: 'Can', initial: 'C' }, { name: 'Ari', initial: 'A' }, { name: 'Zeynep', initial: 'Z' }],
    maxPlayers: 4, spectators: 12, timeLeft: 820, isStarted: true,
  },
  {
    id: 't4', gameType: 'uno', name: 'Acemi Masası',
    players: [{ name: 'Ali', initial: 'A' }],
    maxPlayers: 4, spectators: 0, timeLeft: 0, isStarted: false,
  },
  {
    id: 't5', gameType: 'okey', name: 'Okey Pro',
    players: [],
    maxPlayers: 4, spectators: 0, timeLeft: 0, isStarted: false,
  },
];

// ─── Service ────────────────────────────────────────────────────────

export const gameRoomService = {
  /**
   * Fetch the list of available game tables/rooms.
   * Uses GET /harmony/sessions with a game-tables filter.
   */
  getGameTables: async (): Promise<GameTablesResponse> => {
    try {
      const response = await api.get<GameTablesResponse>('/harmony/sessions', {
        params: { type: 'game_room' },
      });
      return response.data;
    } catch (error) {
      return devMockOrThrow(
        error,
        { tables: MOCK_TABLES, total: MOCK_TABLES.length },
        'gameRoomService.getGameTables',
      );
    }
  },

  /**
   * Get a single game table by ID.
   */
  getGameTableById: async (tableId: string): Promise<GameTable | null> => {
    try {
      const response = await api.get<GameTable>(`/harmony/sessions/${tableId}`);
      return response.data;
    } catch (error) {
      const found = MOCK_TABLES.find((t) => t.id === tableId) ?? null;
      return devMockOrThrow(error, found, 'gameRoomService.getGameTableById');
    }
  },
};
