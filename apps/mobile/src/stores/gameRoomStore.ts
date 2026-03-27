// GameRoomStore — Real-time game room state with Socket.IO WebSocket connection
// Manages room listing, lobby state, in-game state, and WebSocket lifecycle

import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { APP_CONFIG } from '../constants/config';
import { gameRoomApiService, type GameRoomResponse } from '../services/gameRoomApiService';

// ─── Types ──────────────────────────────────────────────────────────

interface GameRoomState {
  // Room listing
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
  createRoom: (gameType: string, isPrivate?: boolean) => Promise<void>;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  setReady: (isReady: boolean) => void;
  sendMessage: (content: string) => void;
  sendReaction: (emoji: string) => void;
  sendGameAction: (type: string, payload: Record<string, unknown>) => void;
  sendGameFinished: (
    winnerId: string | null,
    playerScores: Record<string, number>,
    connectionScores: Record<string, number>,
    durationSeconds: number,
  ) => void;
  requestRematch: () => void;
  connectSocket: (userId: string, token: string) => void;
  disconnectSocket: () => void;
  reset: () => void;
}

// ─── Store ──────────────────────────────────────────────────────────

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
      const data = await gameRoomApiService.listRooms(gameType);
      set({ rooms: data.rooms, isLoadingRooms: false });
    } catch {
      set({ isLoadingRooms: false });
    }
  },

  createRoom: async (gameType: string, isPrivate = false) => {
    const room = await gameRoomApiService.createRoom(gameType, isPrivate);
    set({ currentRoom: room, isInLobby: true, isPlaying: false });

    // Auto-join the created room via WebSocket
    const { socket } = get();
    if (socket?.connected) {
      socket.emit('game:join_room', { roomId: room.id });
    }
  },

  joinRoom: (roomId: string) => {
    const { socket } = get();
    if (socket?.connected) {
      socket.emit('game:join_room', { roomId });
      set({ isInLobby: true, isPlaying: false });
    }
  },

  leaveRoom: () => {
    const { socket, currentRoom } = get();
    if (socket?.connected && currentRoom) {
      socket.emit('game:leave_room', { roomId: currentRoom.id });
    }
    set({ currentRoom: null, isInLobby: false, isPlaying: false });
  },

  setReady: (isReady: boolean) => {
    const { socket, currentRoom } = get();
    if (socket?.connected && currentRoom) {
      const event = isReady ? 'game:ready' : 'game:unready';
      socket.emit(event, { roomId: currentRoom.id });
    }
  },

  sendMessage: (content: string) => {
    const { socket, currentRoom } = get();
    if (socket?.connected && currentRoom) {
      socket.emit('game:send_message', { roomId: currentRoom.id, content });
    }
  },

  sendReaction: (emoji: string) => {
    const { socket, currentRoom } = get();
    if (socket?.connected && currentRoom) {
      socket.emit('game:react', { roomId: currentRoom.id, emoji });
    }
  },

  sendGameAction: (type: string, payload: Record<string, unknown>) => {
    const { socket, currentRoom } = get();
    if (socket?.connected && currentRoom) {
      socket.emit('game:action', { roomId: currentRoom.id, type, payload });
    }
  },

  sendGameFinished: (
    winnerId: string | null,
    playerScores: Record<string, number>,
    connectionScores: Record<string, number>,
    durationSeconds: number,
  ) => {
    const { socket, currentRoom } = get();
    if (socket?.connected && currentRoom) {
      socket.emit('game:finished', {
        roomId: currentRoom.id,
        winnerId,
        playerScores,
        connectionScores,
        durationSeconds,
      });
    }
  },

  requestRematch: () => {
    const { socket, currentRoom } = get();
    if (socket?.connected && currentRoom) {
      socket.emit('game:rematch', { roomId: currentRoom.id });
    }
  },

  connectSocket: (userId: string, token: string) => {
    // Prevent duplicate connections
    const existing = get().socket;
    if (existing?.connected) return;

    // Clean up stale socket
    if (existing) {
      existing.removeAllListeners();
      existing.disconnect();
    }

    const socketUrl = APP_CONFIG.WS_BASE_URL || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

    const socket = io(`${socketUrl}/game-room`, {
      auth: { token, userId },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 15000,
      timeout: 15000,
      autoConnect: true,
    });

    // ─── WebSocket Listeners ──────────────────────────────────

    socket.on('connect', () => {
      if (__DEV__) {
        console.log(`[GameRoomStore] Socket baglandi (id: ${socket.id})`);
      }
    });

    socket.on('disconnect', (reason) => {
      if (__DEV__) {
        console.log(`[GameRoomStore] Socket baglanti kesildi: ${reason}`);
      }
    });

    socket.on('connect_error', (error) => {
      if (__DEV__) {
        console.warn('[GameRoomStore] Socket baglanti hatasi:', error.message);
      }
    });

    socket.on('game:room_updated', (data: GameRoomResponse) => {
      set({ currentRoom: data });
    });

    socket.on('game:player_ready', (data: { userId: string; isReady: boolean }) => {
      const { currentRoom } = get();
      if (!currentRoom) return;

      const updatedPlayers = currentRoom.players.map((p) =>
        p.userId === data.userId ? { ...p, isReady: data.isReady } : p,
      );
      set({ currentRoom: { ...currentRoom, players: updatedPlayers } });
    });

    socket.on('game:started', () => {
      set({ isPlaying: true, isInLobby: false });
    });

    socket.on('game:finished', () => {
      set({ isPlaying: false });
    });

    socket.on('game:error', (data: { message: string; code?: string }) => {
      console.warn('[GameRoomStore] Sunucu hatasi:', data.message, data.code);
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
    }
    set({ socket: null });
  },

  reset: () => {
    const { socket } = get();
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
    }
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
