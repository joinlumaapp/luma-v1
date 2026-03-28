// LUMA — Real-time WebSocket service
// Singleton Socket.IO client with auto-reconnect, event queue, and connection state tracking.
// Connects to both /chat and /harmony namespaces via a unified API.

import { io, Socket } from 'socket.io-client';
import { APP_CONFIG } from '../constants/config';
import { WS_EVENTS } from '@luma/shared/src/constants/api';
import { logger } from '../utils/logger';

// ─── Manager Event Emitter ───────────────────────────────────
// Socket.IO Manager is not directly importable in this bundler config.
// Define a minimal interface for the reconnection events we listen to.

interface ManagerEventEmitter {
  on(event: 'reconnect_attempt', cb: (attempt: number) => void): void;
  on(event: 'reconnect_failed', cb: () => void): void;
}

// ─── Connection State ────────────────────────────────────────

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

// ─── Payload Types ───────────────────────────────────────────

/** Incoming chat message from server */
export interface ChatMessagePayload {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'GIF' | 'VOICE';
  mediaUrl?: string;
  mediaDuration?: number;
  createdAt: string;
}

/** Read receipt from server */
export interface ChatReadPayload {
  userId: string;
  matchId: string;
  markedAsRead: number;
  timestamp: string;
}

/** Typing indicator from server */
export interface ChatTypingPayload {
  userId: string;
  matchId: string;
  timestamp: string;
}

/** New match notification from server */
export interface NewMatchPayload {
  matchId: string;
  userId: string;
  name: string;
  photoUrl: string;
  compatibilityScore: number;
  timestamp: string;
}

/** Match expired notification */
export interface MatchExpiredPayload {
  matchId: string;
  reason: string;
  timestamp: string;
}

/** User presence update */
export interface PresencePayload {
  userId: string;
  isOnline: boolean;
  lastSeen: string;
}

/** Harmony invite notification */
export interface HarmonyInvitePayload {
  sessionId: string;
  inviterId: string;
  inviterName: string;
  timestamp: string;
}

/** User listening status update */
export interface ListeningPayload {
  songTitle: string;
  artist: string;
  coverUrl: string | null;
  startedAt: string;
}

/** Server error payload */
export interface ServerErrorPayload {
  message: string;
  code?: string;
}

/** WebRTC call types */
export type CallType = 'voice' | 'video';

/** Call initiation payload */
export interface CallInitiatePayload {
  callerId: string;
  callType: CallType;
}

/** Call accept payload */
export interface CallAcceptPayload {
  accepterId: string;
}

/** Call reject payload */
export interface CallRejectPayload {
  rejecterId: string;
  reason?: string;
}

/** Call end payload */
export interface CallEndPayload {
  enderId: string;
}

/** WebRTC SDP offer payload */
export interface WebRTCOfferPayload {
  callerId: string;
  sdp: string;
}

/** WebRTC SDP answer payload */
export interface WebRTCAnswerPayload {
  answererId: string;
  sdp: string;
}

/** ICE candidate payload */
export interface ICECandidatePayload {
  senderId: string;
  candidate: string;
}

// ─── Event Listener Type Map ─────────────────────────────────

/** Type-safe event listener map for server-to-client events */
export interface ServerEventMap {
  [WS_EVENTS.CHAT_MESSAGE]: ChatMessagePayload;
  [WS_EVENTS.CHAT_READ]: ChatReadPayload;
  [WS_EVENTS.CHAT_TYPING]: ChatTypingPayload;
  [WS_EVENTS.CHAT_STOP_TYPING]: ChatTypingPayload;
  [WS_EVENTS.NOTIFICATION_NEW_MATCH]: NewMatchPayload;
  [WS_EVENTS.NOTIFICATION_NEW_MESSAGE]: ChatMessagePayload;
  [WS_EVENTS.NOTIFICATION_HARMONY_INVITE]: HarmonyInvitePayload;
  'user:online': PresencePayload;
  'user:offline': PresencePayload;
  'user:listening': { userId: string; listening: ListeningPayload | null };
  'match:expired': MatchExpiredPayload;
  'chat:error': ServerErrorPayload;
  [WS_EVENTS.CALL_INITIATE]: CallInitiatePayload;
  [WS_EVENTS.CALL_ACCEPT]: CallAcceptPayload;
  [WS_EVENTS.CALL_REJECT]: CallRejectPayload;
  [WS_EVENTS.CALL_END]: CallEndPayload;
  [WS_EVENTS.WEBRTC_OFFER]: WebRTCOfferPayload;
  [WS_EVENTS.WEBRTC_ANSWER]: WebRTCAnswerPayload;
  [WS_EVENTS.WEBRTC_ICE_CANDIDATE]: ICECandidatePayload;
}

// ─── Queued Emit Item ────────────────────────────────────────

interface QueuedEmit {
  event: string;
  data: Record<string, unknown>;
  timestamp: number;
}

// ─── Connection State Listener ───────────────────────────────

type ConnectionStateListener = (state: ConnectionState) => void;

// ─── Socket Service ──────────────────────────────────────────

class SocketService {
  private chatSocket: Socket | null = null;
  private harmonySocket: Socket | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 15;
  private readonly baseReconnectDelay = 1000;
  private readonly maxReconnectDelay = 30000;

  private reconnectCallbacks: Array<() => void> = [];
  private connectionStateListeners: ConnectionStateListener[] = [];
  private pendingEmits: QueuedEmit[] = [];
  private pendingHarmonyEmits: QueuedEmit[] = [];
  private readonly maxPendingEmits = 100;
  private currentToken: string | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private readonly heartbeatIntervalMs = 30_000;
  /** Maximum age in ms for queued events before they are discarded */
  private readonly pendingEmitTtlMs = 5 * 60 * 1000;

  // ─── Connection Management ──────────────────────────────────

  /**
   * Connect to the WebSocket server.
   * JWT token is sent via the Socket.IO handshake `auth` option.
   * Uses exponential backoff for reconnection.
   */
  connect(token: string): void {
    // Prevent duplicate connections
    if (this.chatSocket?.connected) {
      return;
    }

    // Clean up any stale socket
    if (this.chatSocket) {
      this.chatSocket.removeAllListeners();
      this.chatSocket.disconnect();
      this.chatSocket = null;
    }

    this.setConnectionState('connecting');
    this.currentToken = token;

    this.chatSocket = io(`${APP_CONFIG.WS_BASE_URL}/chat`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.baseReconnectDelay,
      reconnectionDelayMax: this.maxReconnectDelay,
      timeout: 15000,
      autoConnect: true,
    });

    this.setupInternalListeners();
  }

  /**
   * Disconnect from the server and clean up all listeners.
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.pendingEmits = [];
    this.pendingHarmonyEmits = [];
    this.reconnectCallbacks = [];

    if (this.chatSocket) {
      this.chatSocket.removeAllListeners();
      this.chatSocket.disconnect();
      this.chatSocket = null;
    }

    this.disconnectHarmony();

    this.currentToken = null;
    this.reconnectAttempts = 0;
    this.setConnectionState('disconnected');
  }

  /**
   * Reconnect with a fresh token (e.g., after token refresh).
   */
  reconnectWithToken(token: string): void {
    this.disconnect();
    this.connect(token);
  }

  // ─── Chat Emitters ─────────────────────────────────────────

  /**
   * Join a conversation room to receive real-time messages.
   */
  joinConversation(matchId: string): void {
    this.emit(WS_EVENTS.CHAT_JOIN, { matchId });
  }

  /**
   * Leave a conversation room.
   */
  leaveConversation(matchId: string): void {
    this.emit(WS_EVENTS.CHAT_LEAVE, { matchId });
  }

  /**
   * Send a chat message to a conversation.
   */
  sendMessage(matchId: string, content: string, type: 'TEXT' | 'IMAGE' | 'GIF' | 'VOICE' = 'TEXT', mediaUrl?: string): void {
    this.emit(WS_EVENTS.CHAT_MESSAGE, { matchId, content, type, mediaUrl });
  }

  /**
   * Send typing indicator for a conversation.
   */
  sendTyping(matchId: string): void {
    this.emit(WS_EVENTS.CHAT_TYPING, { matchId });
  }

  /**
   * Send stop-typing indicator for a conversation.
   */
  sendStopTyping(matchId: string): void {
    this.emit(WS_EVENTS.CHAT_STOP_TYPING, { matchId });
  }

  /**
   * Mark messages in a conversation as read.
   */
  markRead(matchId: string): void {
    this.emit(WS_EVENTS.CHAT_READ, { matchId });
  }

  // ─── Harmony Room Connection ─────────────────────────────────

  /**
   * Connect to the Harmony namespace for real-time room interactions.
   */
  connectHarmony(): void {
    if (this.harmonySocket?.connected) return;

    if (!this.currentToken) {
      logger.warn('[SocketService] Harmony baglantisi icin token gerekli');
      return;
    }

    if (this.harmonySocket) {
      this.harmonySocket.removeAllListeners();
      this.harmonySocket.disconnect();
      this.harmonySocket = null;
    }

    this.harmonySocket = io(`${APP_CONFIG.WS_BASE_URL}/harmony`, {
      auth: { token: this.currentToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.baseReconnectDelay,
      reconnectionDelayMax: this.maxReconnectDelay,
      timeout: 15000,
      autoConnect: true,
    });

    this.harmonySocket.on('connect', () => {
      logger.log(`[SocketService] Harmony baglandi (id: ${this.harmonySocket?.id})`);
      this.flushPendingHarmonyEmits();
    });

    this.harmonySocket.on('disconnect', (reason) => {
      logger.log(`[SocketService] Harmony baglanti kesildi: ${reason}`);
    });

    this.harmonySocket.on('connect_error', (error) => {
      logger.warn('[SocketService] Harmony baglanti hatasi:', (error as Error).message);
    });
  }

  /**
   * Disconnect from the Harmony namespace.
   */
  disconnectHarmony(): void {
    this.pendingHarmonyEmits = [];
    if (this.harmonySocket) {
      this.harmonySocket.removeAllListeners();
      this.harmonySocket.disconnect();
      this.harmonySocket = null;
    }
  }

  /**
   * Register a listener on the Harmony socket.
   */
  onHarmony(event: string, callback: (data: unknown) => void): () => void {
    if (!this.harmonySocket) {
      logger.warn('[SocketService] Harmony dinleyici eklenemedi - soket bagli degil');
      return () => {};
    }
    this.harmonySocket.on(event, callback);
    return () => {
      this.harmonySocket?.off(event, callback);
    };
  }

  // ─── Harmony Room Emitters ─────────────────────────────────

  joinHarmonySession(sessionId: string): void {
    this.emitHarmony(WS_EVENTS.HARMONY_JOIN, { sessionId });
  }

  leaveHarmonySession(sessionId: string): void {
    this.emitHarmony(WS_EVENTS.HARMONY_LEAVE, { sessionId });
  }

  sendHarmonyMessage(sessionId: string, content: string): void {
    this.emitHarmony(WS_EVENTS.HARMONY_SEND_MESSAGE, { sessionId, content });
  }

  revealHarmonyCard(sessionId: string, cardId: string): void {
    this.emitHarmony(WS_EVENTS.HARMONY_REVEAL_CARD, { sessionId, cardId });
  }

  sendHarmonyReaction(sessionId: string, cardId: string, reaction: string): void {
    this.emitHarmony(WS_EVENTS.HARMONY_REACT, { sessionId, cardId, reaction });
  }

  requestHarmonyTimer(sessionId: string): void {
    this.emitHarmony(WS_EVENTS.HARMONY_REQUEST_TIMER, { sessionId });
  }

  // ─── WebRTC Call Signaling (via Harmony namespace) ─────────

  initiateCall(sessionId: string, callType: CallType): void {
    this.emitHarmony(WS_EVENTS.CALL_INITIATE, { sessionId, callType });
  }

  acceptCall(sessionId: string): void {
    this.emitHarmony(WS_EVENTS.CALL_ACCEPT, { sessionId });
  }

  rejectCall(sessionId: string, reason?: string): void {
    this.emitHarmony(WS_EVENTS.CALL_REJECT, { sessionId, reason });
  }

  endCall(sessionId: string): void {
    this.emitHarmony(WS_EVENTS.CALL_END, { sessionId });
  }

  sendWebRTCOffer(sessionId: string, sdp: string): void {
    this.emitHarmony(WS_EVENTS.WEBRTC_OFFER, { sessionId, sdp });
  }

  sendWebRTCAnswer(sessionId: string, sdp: string): void {
    this.emitHarmony(WS_EVENTS.WEBRTC_ANSWER, { sessionId, sdp });
  }

  sendICECandidate(sessionId: string, candidate: string): void {
    this.emitHarmony(WS_EVENTS.WEBRTC_ICE_CANDIDATE, { sessionId, candidate });
  }

  // ─── Event Listener Management ─────────────────────────────

  /**
   * Register a type-safe listener for a server event.
   * Returns a cleanup function to remove the listener.
   */
  on<K extends keyof ServerEventMap>(
    event: K,
    callback: (data: ServerEventMap[K]) => void,
  ): () => void {
    if (!this.chatSocket) {
      logger.warn('[SocketService] Dinleyici eklenemedi - soket bagli degil');
      return () => {};
    }
    this.chatSocket.on(event as string, callback as (...args: unknown[]) => void);
    return () => {
      this.chatSocket?.off(event as string, callback as (...args: unknown[]) => void);
    };
  }

  /**
   * Register a listener for any event (untyped, for edge cases).
   * Returns a cleanup function.
   */
  onAny(event: string, callback: (data: unknown) => void): () => void {
    if (!this.chatSocket) {
      logger.warn('[SocketService] Dinleyici eklenemedi - soket bagli degil');
      return () => {};
    }
    this.chatSocket.on(event, callback);
    return () => {
      this.chatSocket?.off(event, callback);
    };
  }

  /**
   * Remove all listeners for a specific event, or all custom events if none specified.
   */
  removeAllListeners(event?: string): void {
    if (!this.chatSocket) return;

    if (event) {
      this.chatSocket.removeAllListeners(event);
    } else {
      // Remove listeners for all WS_EVENTS (but not internal socket.io events)
      const wsEventValues = Object.values(WS_EVENTS);
      for (const evt of wsEventValues) {
        this.chatSocket.removeAllListeners(evt);
      }
      // Also remove custom presence events
      this.chatSocket.removeAllListeners('user:online');
      this.chatSocket.removeAllListeners('user:offline');
      this.chatSocket.removeAllListeners('user:listening');
      this.chatSocket.removeAllListeners('match:expired');
      this.chatSocket.removeAllListeners('chat:error');
    }
  }

  // ─── Reconnection Hooks ────────────────────────────────────

  /**
   * Register a callback invoked after successful reconnection.
   * Returns a cleanup function.
   */
  onReconnect(callback: () => void): () => void {
    this.reconnectCallbacks.push(callback);
    return () => {
      this.reconnectCallbacks = this.reconnectCallbacks.filter((cb) => cb !== callback);
    };
  }

  // ─── Connection State ──────────────────────────────────────

  /**
   * Get current connection state.
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if socket is currently connected.
   */
  isConnected(): boolean {
    return this.chatSocket?.connected ?? false;
  }

  /**
   * Get the socket ID (useful for debugging).
   */
  getSocketId(): string | undefined {
    return this.chatSocket?.id;
  }

  /**
   * Subscribe to connection state changes.
   * Returns a cleanup function.
   */
  onConnectionStateChange(listener: ConnectionStateListener): () => void {
    this.connectionStateListeners.push(listener);
    return () => {
      this.connectionStateListeners = this.connectionStateListeners.filter(
        (l) => l !== listener,
      );
    };
  }

  // ─── Internal Helpers ──────────────────────────────────────

  /**
   * Update connection state and notify all listeners.
   */
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState === state) return;
    this.connectionState = state;

    for (const listener of this.connectionStateListeners) {
      try {
        listener(state);
      } catch (err) {
        logger.warn('[SocketService] Baglanti durumu dinleyici hatasi:', err);
      }
    }
  }

  /**
   * Safely emit an event. Queues the event if the socket is temporarily disconnected.
   */
  private emit(event: string, data: Record<string, unknown>): void {
    if (!this.chatSocket?.connected) {
      if (this.pendingEmits.length < this.maxPendingEmits) {
        this.pendingEmits.push({ event, data, timestamp: Date.now() });
      } else {
        logger.warn('[SocketService] Olay kuyrugu dolu, olay atiliyor:', event);
      }
      logger.warn(
        `[SocketService] "${event}" kuyruga eklendi - soket bagli degil (${this.pendingEmits.length} kuyrukta)`,
      );
      return;
    }
    this.chatSocket.emit(event, data);
  }

  /**
   * Safely emit an event on the Harmony socket. Queues if disconnected.
   */
  private emitHarmony(event: string, data: Record<string, unknown>): void {
    if (!this.harmonySocket?.connected) {
      if (this.pendingHarmonyEmits.length < this.maxPendingEmits) {
        this.pendingHarmonyEmits.push({ event, data, timestamp: Date.now() });
      }
      logger.warn(`[SocketService] Harmony "${event}" kuyruga eklendi`);
      return;
    }
    this.harmonySocket.emit(event, data);
  }

  /**
   * Flush queued Harmony events after reconnection.
   * Events older than 5 minutes are discarded (stale data).
   */
  private flushPendingHarmonyEmits(): void {
    if (!this.harmonySocket?.connected || this.pendingHarmonyEmits.length === 0) return;
    const now = Date.now();
    const pending = [...this.pendingHarmonyEmits];
    this.pendingHarmonyEmits = [];
    for (const item of pending) {
      if (now - item.timestamp > this.pendingEmitTtlMs) {
        continue;
      }
      this.harmonySocket.emit(item.event, item.data);
    }
  }

  /**
   * Flush any events queued while disconnected.
   * Events older than 5 minutes are discarded (stale data).
   */
  private flushPendingEmits(): void {
    if (!this.chatSocket?.connected || this.pendingEmits.length === 0) return;

    const now = Date.now();
    const pending = [...this.pendingEmits];
    this.pendingEmits = [];

    let sent = 0;
    let expired = 0;
    for (const item of pending) {
      if (now - item.timestamp > this.pendingEmitTtlMs) {
        expired++;
        continue;
      }
      this.chatSocket.emit(item.event, item.data);
      sent++;
    }

    if (expired > 0) {
      logger.log(`[SocketService] ${expired} suresi dolmus olay atildi`);
    }
    logger.log(`[SocketService] ${sent} kuyruklanmis olay gonderildi`);
  }

  /**
   * Start periodic heartbeat to keep server-side presence alive.
   * Sends a 'heartbeat' event every 30 seconds.
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.chatSocket?.connected) {
        this.chatSocket.emit('heartbeat');
      }
    }, this.heartbeatIntervalMs);
  }

  /**
   * Stop the heartbeat interval.
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Setup internal connection lifecycle listeners.
   */
  private setupInternalListeners(): void {
    if (!this.chatSocket) return;

    this.chatSocket.on('connect', () => {
      const wasReconnect = this.reconnectAttempts > 0;
      this.reconnectAttempts = 0;
      this.setConnectionState('connected');
      logger.log(`[SocketService] Baglandi (id: ${this.chatSocket?.id})`);

      // Start heartbeat interval to keep presence alive in Redis
      this.startHeartbeat();

      // Flush queued events and notify reconnect subscribers
      if (wasReconnect) {
        this.flushPendingEmits();
        for (const callback of this.reconnectCallbacks) {
          try {
            callback();
          } catch (err) {
            logger.warn('[SocketService] Yeniden baglanti callback hatasi:', err);
          }
        }
      }
    });

    this.chatSocket.on('disconnect', (reason) => {
      logger.log(`[SocketService] Baglanti kesildi - sebep: ${reason}`);

      // Stop heartbeat on any disconnection
      this.stopHeartbeat();

      if (reason === 'io server disconnect') {
        // Server explicitly closed the connection — Socket.IO will NOT auto-reconnect.
        // Schedule a manual reconnect with the current token.
        this.setConnectionState('reconnecting');
        if (this.currentToken) {
          const token = this.currentToken;
          setTimeout(() => {
            this.connect(token);
          }, 2000);
        } else {
          this.setConnectionState('disconnected');
        }
      } else {
        // Transport close, ping timeout, etc. — Socket.IO handles reconnect automatically.
        this.setConnectionState('reconnecting');
      }
    });

    const manager = this.chatSocket.io as unknown as ManagerEventEmitter;

    manager.on('reconnect_attempt', (attempt: number) => {
      this.reconnectAttempts = attempt;
      this.setConnectionState('reconnecting');
      logger.log(
        `[SocketService] Yeniden baglanti denemesi ${attempt}/${this.maxReconnectAttempts}`,
      );
    });

    manager.on('reconnect_failed', () => {
      this.setConnectionState('disconnected');
      logger.error('[SocketService] Yeniden baglanti basarisiz - tum denemeler tukendi');
    });

    this.chatSocket.on('connect_error', (error) => {
      this.reconnectAttempts += 1;
      logger.warn(
        `[SocketService] Baglanti hatasi (deneme ${this.reconnectAttempts}/${this.maxReconnectAttempts}):`,
        (error as Error).message,
      );
    });

    // Server-side errors
    this.chatSocket.on('chat:error' as string, (...args: unknown[]) => {
      const payload = args[0] as ServerErrorPayload;
      logger.error('[SocketService] Sunucu hatasi:', payload.message);
    });
  }
}

// Export singleton instance
export const socketService = new SocketService();
