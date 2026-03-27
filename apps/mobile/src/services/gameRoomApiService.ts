// Game Room API service — CRUD operations for game rooms
// Works alongside gameRoomService (legacy table listing) and gameRoomStore (WebSocket state)

import { api } from './api';

// ─── Types ──────────────────────────────────────────────────────────

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

// ─── Service ────────────────────────────────────────────────────────

export const gameRoomApiService = {
  /**
   * List available game rooms, optionally filtered by game type.
   */
  async listRooms(gameType?: string): Promise<{ rooms: GameRoomResponse[]; total: number }> {
    try {
      const params = gameType ? { gameType } : {};
      const response = await api.get('/game-rooms', { params });
      return response.data;
    } catch {
      return { rooms: [], total: 0 };
    }
  },

  /**
   * Create a new game room.
   */
  async createRoom(gameType: string, isPrivate = false): Promise<GameRoomResponse> {
    const response = await api.post('/game-rooms', { gameType, isPrivate });
    return response.data;
  },

  /**
   * Get a single game room by ID.
   */
  async getRoom(roomId: string): Promise<GameRoomResponse> {
    const response = await api.get(`/game-rooms/${roomId}`);
    return response.data;
  },

  /**
   * Get the current user's game history.
   */
  async getMyHistory(): Promise<unknown[]> {
    const response = await api.get('/game-rooms/history');
    return response.data;
  },
};
