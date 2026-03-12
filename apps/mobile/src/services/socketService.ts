// LUMA — Real-time WebSocket service
// Singleton Socket.IO client with auto-reconnect, event queue, and connection state tracking.
// Connects to both /chat and /harmony namespaces via a unified API.

import { io, Socket } from 'socket.io-client';
import { APP_CONFIG } from '../constants/config';
import { WS_EVENTS } from '@luma/shared/src/constants/api';

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
  lastActiveAt: string;
}

/** Harmony invite notification */
export interface HarmonyInvitePayload {
  sessionId: string;
  inviterId: string;
  inviterName: string;
  timestamp: string;
}

/** Badge earned notification */
export interface BadgeEarnedPayload {
  badgeId: string;
  name: string;
  icon: string;
  timestamp: string;
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
  [WS_EVENTS.NOTIFICATION_BADGE_EARNED]: BadgeEarnedPayload;
  'user:online': PresencePayload;
  'user:offline': PresencePayload;
  'match:expired': MatchExpiredPayload;
  'chat:error': ServerErrorPayload;
}

// ─── Queued Emit Item ────────────────────────────────────────

interface QueuedEmit {
  event: string;
  data: Record<string, unknown>;
}

// ─── Connection State Listener ───────────────────────────────

type ConnectionStateListener = (state: ConnectionState) => void;

// ─── Socket Service ──────────────────────────────────────────

class SocketService {
  private chatSocket: Socket | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 15;
  private readonly baseReconnectDelay = 1000;
  private readonly maxReconnectDelay = 30000;

  private reconnectCallbacks: Array<() => void> = [];
  private connectionStateListeners: ConnectionStateListener[] = [];
  private pendingEmits: QueuedEmit[] = [];
  private readonly maxPendingEmits = 100;

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

    this.chatSocket = io(`${APP_CONFIG.WS_BASE_URL}/chat`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.baseReconnectDelay,
      reconnectionDelayMax: this.maxReconnectDelay,
      randomizationFactor: 0.5,
      timeout: 15000,
      autoConnect: true,
    });

    this.setupInternalListeners();
  }

  /**
   * Disconnect from the server and clean up all listeners.
   */
  disconnect(): void {
    this.pendingEmits = [];
    this.reconnectCallbacks = [];

    if (this.chatSocket) {
      this.chatSocket.removeAllListeners();
      this.chatSocket.disconnect();
      this.chatSocket = null;
    }

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

  // ─── WebRTC Call Signaling ─────────────────────────────────

  /**
   * Initiate a voice or video call in a Harmony session.
   */
  initiateCall(sessionId: string, callType: CallType): void {
    this.emit(WS_EVENTS.CALL_INITIATE, { sessionId, callType });
  }

  /**
   * Accept an incoming call.
   */
  acceptCall(sessionId: string): void {
    this.emit(WS_EVENTS.CALL_ACCEPT, { sessionId });
  }

  /**
   * Reject an incoming call.
   */
  rejectCall(sessionId: string, reason?: string): void {
    this.emit(WS_EVENTS.CALL_REJECT, { sessionId, reason });
  }

  /**
   * End the current call.
   */
  endCall(sessionId: string): void {
    this.emit(WS_EVENTS.CALL_END, { sessionId });
  }

  /**
   * Send WebRTC SDP offer.
   */
  sendWebRTCOffer(sessionId: string, sdp: string): void {
    this.emit(WS_EVENTS.WEBRTC_OFFER, { sessionId, sdp });
  }

  /**
   * Send WebRTC SDP answer.
   */
  sendWebRTCAnswer(sessionId: string, sdp: string): void {
    this.emit(WS_EVENTS.WEBRTC_ANSWER, { sessionId, sdp });
  }

  /**
   * Send ICE candidate.
   */
  sendICECandidate(sessionId: string, candidate: string): void {
    this.emit(WS_EVENTS.WEBRTC_ICE_CANDIDATE, { sessionId, candidate });
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
      console.warn('[SocketService] Dinleyici eklenemedi - soket bagli degil');
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
      console.warn('[SocketService] Dinleyici eklenemedi - soket bagli degil');
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
        console.warn('[SocketService] Baglanti durumu dinleyici hatasi:', err);
      }
    }
  }

  /**
   * Safely emit an event. Queues the event if the socket is temporarily disconnected.
   */
  private emit(event: string, data: Record<string, unknown>): void {
    if (!this.chatSocket?.connected) {
      if (this.pendingEmits.length < this.maxPendingEmits) {
        this.pendingEmits.push({ event, data });
      } else {
        console.warn('[SocketService] Olay kuyrugu dolu, olay atiliyor:', event);
      }
      console.warn(
        `[SocketService] "${event}" kuyruga eklendi - soket bagli degil (${this.pendingEmits.length} kuyrukta)`,
      );
      return;
    }
    this.chatSocket.emit(event, data);
  }

  /**
   * Flush any events queued while disconnected.
   */
  private flushPendingEmits(): void {
    if (!this.chatSocket?.connected || this.pendingEmits.length === 0) return;

    const pending = [...this.pendingEmits];
    this.pendingEmits = [];
    console.log(`[SocketService] ${pending.length} kuyruklanmis olay gonderiliyor`);

    for (const item of pending) {
      this.chatSocket.emit(item.event, item.data);
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
      console.log(`[SocketService] Baglandi (id: ${this.chatSocket?.id})`);

      // Flush queued events and notify reconnect subscribers
      if (wasReconnect) {
        this.flushPendingEmits();
        for (const callback of this.reconnectCallbacks) {
          try {
            callback();
          } catch (err) {
            console.warn('[SocketService] Yeniden baglanti callback hatasi:', err);
          }
        }
      }
    });

    this.chatSocket.on('disconnect', (reason: string) => {
      console.log(`[SocketService] Baglanti kesildi - sebep: ${reason}`);

      // If server closed connection, set disconnected. Otherwise, set reconnecting.
      if (reason === 'io server disconnect') {
        this.setConnectionState('disconnected');
      } else {
        this.setConnectionState('reconnecting');
      }
    });

    this.chatSocket.io.on('reconnect_attempt', (attempt: number) => {
      this.reconnectAttempts = attempt;
      this.setConnectionState('reconnecting');
      console.log(
        `[SocketService] Yeniden baglanti denemesi ${attempt}/${this.maxReconnectAttempts}`,
      );
    });

    this.chatSocket.io.on('reconnect_failed', () => {
      this.setConnectionState('disconnected');
      console.error('[SocketService] Yeniden baglanti basarisiz - tum denemeler tukendi');
    });

    this.chatSocket.on('connect_error', (error: Error) => {
      this.reconnectAttempts += 1;
      console.warn(
        `[SocketService] Baglanti hatasi (deneme ${this.reconnectAttempts}/${this.maxReconnectAttempts}):`,
        error.message,
      );
    });

    // Server-side errors
    this.chatSocket.on('chat:error', (payload: ServerErrorPayload) => {
      console.error('[SocketService] Sunucu hatasi:', payload.message);
    });
  }
}

// Export singleton instance
export const socketService = new SocketService();
