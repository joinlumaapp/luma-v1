// WebSocket service for real-time Harmony Room communication
// Uses Socket.IO client to connect to the backend HarmonyGateway (/harmony namespace)

import { io, Socket } from 'socket.io-client';
import { APP_CONFIG } from '../constants/config';

// ─── Event Constants ──────────────────────────────────────────
// Matches the event names defined in harmony.gateway.ts

/** Events emitted FROM client TO server */
export const CLIENT_EVENTS = {
  JOIN: 'harmony:join',
  LEAVE: 'harmony:leave',
  REVEAL_CARD: 'harmony:reveal_card',
  REACT: 'harmony:react',
  SEND_MESSAGE: 'harmony:send_message',
  REQUEST_TIMER: 'harmony:request_timer',
  TYPING: 'harmony:typing',
  MESSAGE_READ: 'harmony:message_read',
  // WebRTC Call Signaling
  CALL_INITIATE: 'harmony:call_initiate',
  CALL_ACCEPT: 'harmony:call_accept',
  CALL_REJECT: 'harmony:call_reject',
  CALL_END: 'harmony:call_end',
  WEBRTC_OFFER: 'harmony:webrtc_offer',
  WEBRTC_ANSWER: 'harmony:webrtc_answer',
  WEBRTC_ICE_CANDIDATE: 'harmony:webrtc_ice_candidate',
} as const;

/** Events received FROM server TO client */
export const SERVER_EVENTS = {
  USER_JOINED: 'harmony:user_joined',
  USER_LEFT: 'harmony:user_left',
  CARD_REVEALED: 'harmony:card_revealed',
  REACTION: 'harmony:reaction',
  MESSAGE: 'harmony:message',
  SESSION_STATE: 'harmony:session_state',
  SESSION_ENDED: 'harmony:session_ended',
  TIMER_SYNC: 'harmony:timer_sync',
  TYPING: 'harmony:typing',
  READ_RECEIPT: 'harmony:read_receipt',
  ERROR: 'harmony:error',
  // WebRTC Call Signaling
  CALL_INITIATE: 'harmony:call_initiate',
  CALL_ACCEPT: 'harmony:call_accept',
  CALL_REJECT: 'harmony:call_reject',
  CALL_END: 'harmony:call_end',
  WEBRTC_OFFER: 'harmony:webrtc_offer',
  WEBRTC_ANSWER: 'harmony:webrtc_answer',
  WEBRTC_ICE_CANDIDATE: 'harmony:webrtc_ice_candidate',
} as const;

// ─── Payload Types ────────────────────────────────────────────

/** Reaction types accepted by the backend */
export type HarmonyReaction = 'love' | 'laugh' | 'think' | 'surprise' | 'agree' | 'disagree';

/** Server -> Client: user joined a session */
export interface UserJoinedPayload {
  userId: string;
  sessionId: string;
  timestamp: string;
}

/** Server -> Client: user left a session */
export interface UserLeftPayload {
  userId: string;
  sessionId: string;
  timestamp: string;
}

/** Server -> Client: a card was revealed */
export interface CardRevealedPayload {
  type: 'question' | 'game';
  id: string;
  revealedBy: string;
  timestamp: string;
  // Question card fields
  category?: string;
  textTr?: string;
  textEn?: string;
  // Game card fields
  nameTr?: string;
  nameEn?: string;
  descriptionTr?: string;
  gameType?: string;
}

/** Server -> Client: reaction broadcast */
export interface ReactionPayload {
  cardId: string;
  reaction: string;
  userId: string;
  timestamp: string;
}

/** Server -> Client: new message in the session */
export interface MessagePayload {
  id: string;
  senderId: string;
  content: string;
  type: 'TEXT' | 'QUESTION_CARD' | 'GAME_CARD' | 'SYSTEM';
  createdAt: string;
}

/** Server -> Client: session state on join */
export interface SessionStatePayload {
  sessionId: string;
  status: string;
  remainingSeconds: number;
  hasVoiceChat: boolean;
  hasVideoChat: boolean;
}

/** Server -> Client: session ended */
export interface SessionEndedPayload {
  sessionId: string;
  reason: string;
}

/** Server -> Client: timer sync response */
export interface TimerSyncPayload {
  sessionId: string;
  remainingSeconds: number;
  status: string;
}

/** Server -> Client: typing indicator */
export interface TypingPayload {
  userId: string;
  isTyping: boolean;
  timestamp: string;
}

/** Server -> Client: read receipt */
export interface ReadReceiptPayload {
  messageIds: string[];
  readBy: string;
  readAt: string;
}

/** Server -> Client: error */
export interface ErrorPayload {
  message: string;
}

// ─── WebRTC Call Payload Types ──────────────────────────────────

/** Call type: voice-only or voice+video */
export type CallType = 'voice' | 'video';

/** Server -> Client: incoming call initiation */
export interface CallInitiatePayload {
  callerId: string;
  callType: CallType;
}

/** Server -> Client: call accepted */
export interface CallAcceptPayload {
  accepterId: string;
}

/** Server -> Client: call rejected */
export interface CallRejectPayload {
  rejecterId: string;
  reason?: string;
}

/** Server -> Client: call ended */
export interface CallEndPayload {
  enderId: string;
}

/** Server -> Client: WebRTC SDP offer */
export interface WebRTCOfferPayload {
  callerId: string;
  sdp: string;
}

/** Server -> Client: WebRTC SDP answer */
export interface WebRTCAnswerPayload {
  answererId: string;
  sdp: string;
}

/** Server -> Client: ICE candidate */
export interface ICECandidatePayload {
  senderId: string;
  candidate: string;
}

// ─── Socket Service ───────────────────────────────────────────

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectCallbacks: Array<() => void> = [];
  private pendingEmits: Array<{ event: string; data: Record<string, unknown> }> = [];
  private maxPendingEmits = 50;

  /** Session ID to auto-rejoin after reconnection */
  private activeSessionId: string | null = null;

  /** Callback invoked when auto-rejoin fires after reconnection */
  private onReconnectCallback: ((sessionId: string) => void) | null = null;

  /**
   * Connect to the Harmony WebSocket gateway.
   * JWT token is sent via the Socket.IO handshake `auth` option.
   */
  connect(token: string): void {
    // Prevent duplicate connections
    if (this.socket?.connected) {
      return;
    }

    // Disconnect any stale socket before creating a new one
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.socket = io(`${APP_CONFIG.WS_BASE_URL}/harmony`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 15000,
      autoConnect: true,
    });

    this.setupInternalListeners();
  }

  /**
   * Disconnect from the server and clean up all listeners.
   */
  disconnect(): void {
    this.activeSessionId = null;
    this.onReconnectCallback = null;
    this.pendingEmits = [];
    this.reconnectCallbacks = [];
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.reconnectAttempts = 0;
    }
  }

  /**
   * Set a callback that fires when the socket auto-reconnects
   * while an active session is tracked. The callback receives the sessionId
   * so the caller can re-join the session room and re-sync timer.
   */
  setReconnectCallback(callback: ((sessionId: string) => void) | null): void {
    this.onReconnectCallback = callback;
  }

  // ─── Client -> Server Emitters ──────────────────────────────

  /**
   * Join a Harmony Room session.
   * The backend validates participation and activates pending sessions.
   * Tracks the session ID for auto-rejoin after reconnection.
   */
  joinSession(sessionId: string): void {
    this.activeSessionId = sessionId;
    this.emit(CLIENT_EVENTS.JOIN, { sessionId });
  }

  /**
   * Leave a Harmony Room session.
   * Notifies the partner before leaving the Socket.IO room.
   * Clears the active session tracking.
   */
  leaveSession(sessionId: string): void {
    this.activeSessionId = null;
    this.emit(CLIENT_EVENTS.LEAVE, { sessionId });
  }

  /**
   * Reveal a card in the Harmony Room.
   * Backend verifies card ownership and broadcasts to the room.
   */
  revealCard(sessionId: string, cardId: string): void {
    this.emit(CLIENT_EVENTS.REVEAL_CARD, { sessionId, cardId });
  }

  /**
   * Send a reaction to a card.
   * Valid reactions: love, laugh, think, surprise, agree, disagree
   */
  sendReaction(sessionId: string, cardId: string, reaction: HarmonyReaction): void {
    this.emit(CLIENT_EVENTS.REACT, { sessionId, cardId, reaction });
  }

  /**
   * Send a text message in the Harmony Room.
   * Backend persists the message and broadcasts to the room.
   */
  sendMessage(sessionId: string, content: string, type?: 'TEXT' | 'QUESTION_CARD' | 'GAME_CARD' | 'SYSTEM'): void {
    this.emit(CLIENT_EVENTS.SEND_MESSAGE, { sessionId, content, type });
  }

  /**
   * Request the current timer state from the server.
   * Useful for reconnection sync — server responds with harmony:timer_sync.
   */
  requestTimerSync(sessionId: string): void {
    this.emit(CLIENT_EVENTS.REQUEST_TIMER, { sessionId });
  }

  /**
   * Emit typing indicator to the session room.
   * isTyping: true when user starts typing, false when they stop.
   */
  sendTypingIndicator(sessionId: string, isTyping: boolean): void {
    this.emit(CLIENT_EVENTS.TYPING, { sessionId, isTyping });
  }

  /**
   * Send read receipt for viewed messages.
   * Notifies the partner that messages have been read.
   */
  sendReadReceipt(sessionId: string, messageIds: string[]): void {
    this.emit(CLIENT_EVENTS.MESSAGE_READ, { sessionId, messageIds });
  }

  // ─── WebRTC Call Signaling Emitters ──────────────────────────

  /**
   * Initiate a voice or video call in the Harmony Room.
   * Backend broadcasts call request to the partner.
   */
  initiateCall(sessionId: string, callType: CallType): void {
    this.emit(CLIENT_EVENTS.CALL_INITIATE, { sessionId, callType });
  }

  /**
   * Accept an incoming call.
   * Backend notifies the caller that the call was accepted.
   */
  acceptCall(sessionId: string): void {
    this.emit(CLIENT_EVENTS.CALL_ACCEPT, { sessionId });
  }

  /**
   * Reject an incoming call.
   * Backend notifies the caller that the call was rejected.
   */
  rejectCall(sessionId: string, reason?: string): void {
    this.emit(CLIENT_EVENTS.CALL_REJECT, { sessionId, reason });
  }

  /**
   * End the current call.
   * Backend notifies the partner that the call has ended.
   */
  endCall(sessionId: string): void {
    this.emit(CLIENT_EVENTS.CALL_END, { sessionId });
  }

  /**
   * Send WebRTC SDP offer to the partner via the signaling server.
   */
  sendWebRTCOffer(sessionId: string, sdp: string): void {
    this.emit(CLIENT_EVENTS.WEBRTC_OFFER, { sessionId, sdp });
  }

  /**
   * Send WebRTC SDP answer to the partner via the signaling server.
   */
  sendWebRTCAnswer(sessionId: string, sdp: string): void {
    this.emit(CLIENT_EVENTS.WEBRTC_ANSWER, { sessionId, sdp });
  }

  /**
   * Send ICE candidate to the partner via the signaling server.
   */
  sendICECandidate(sessionId: string, candidate: string): void {
    this.emit(CLIENT_EVENTS.WEBRTC_ICE_CANDIDATE, { sessionId, candidate });
  }

  // ─── Event Listener Management ──────────────────────────────

  /**
   * Register a listener for a server event and return a cleanup function.
   * Preferred for use in services that manage their own listener lifecycle.
   *
   * @returns A cleanup function that removes the listener.
   *
   * @example
   * const cleanup = socketService.on('harmony:call_initiate', (data) => { ... });
   * cleanup(); // removes the listener
   */
  on<T = unknown>(event: string, callback: (data: T) => void): () => void {
    this.onEvent(event, callback);
    return () => this.offEvent(event, callback);
  }

  /**
   * Register a listener for a server event.
   * Use SERVER_EVENTS constants for type-safe event names.
   *
   * @example
   * socketService.onEvent(SERVER_EVENTS.MESSAGE, (data: MessagePayload) => { ... });
   */
  onEvent<T = unknown>(event: string, callback: (data: T) => void): void {
    if (!this.socket) {
      console.warn('[SocketService] Cannot add listener — socket not connected');
      return;
    }
    this.socket.on(event, callback as (...args: unknown[]) => void);
  }

  /**
   * Remove a previously registered listener for a server event.
   */
  offEvent<T = unknown>(event: string, callback: (data: T) => void): void {
    if (!this.socket) {
      return;
    }
    this.socket.off(event, callback as (...args: unknown[]) => void);
  }

  /**
   * Remove all listeners for a specific event, or all events if no event is specified.
   */
  removeAllListeners(event?: string): void {
    if (!this.socket) {
      return;
    }
    if (event) {
      this.socket.removeAllListeners(event);
    } else {
      // Only remove Harmony-related listeners, keep internal ones
      Object.values(SERVER_EVENTS).forEach((evt) => {
        this.socket?.removeAllListeners(evt);
      });
    }
  }

  // ─── Reconnection Hooks ────────────────────────────────────

  /**
   * Register a callback to be invoked after a successful reconnection.
   * Useful for re-joining rooms (Harmony sessions, chat conversations).
   * Returns a cleanup function.
   */
  onReconnect(callback: () => void): () => void {
    this.reconnectCallbacks.push(callback);
    return () => {
      this.reconnectCallbacks = this.reconnectCallbacks.filter((cb) => cb !== callback);
    };
  }

  // ─── Connection Status ──────────────────────────────────────

  /**
   * Check if the socket is currently connected.
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get the underlying Socket.IO socket ID (useful for debugging).
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // ─── Internal Helpers ───────────────────────────────────────

  /**
   * Safely emit an event. Queues the event if the socket is temporarily disconnected
   * (up to maxPendingEmits). The queue is flushed on reconnection.
   */
  private emit(event: string, data: Record<string, unknown>): void {
    if (!this.socket?.connected) {
      if (this.pendingEmits.length < this.maxPendingEmits) {
        this.pendingEmits.push({ event, data });
      }
      console.warn(`[SocketService] Queued "${event}" — socket not connected (${this.pendingEmits.length} queued)`);
      return;
    }
    this.socket.emit(event, data);
  }

  /**
   * Flush any events that were queued while disconnected.
   */
  private flushPendingEmits(): void {
    if (!this.socket?.connected || this.pendingEmits.length === 0) return;

    const pending = [...this.pendingEmits];
    this.pendingEmits = [];
    console.log(`[SocketService] Flushing ${pending.length} queued events`);

    for (const item of pending) {
      this.socket.emit(item.event, item.data);
    }
  }

  /**
   * Setup internal connection lifecycle listeners for logging and reconnect tracking.
   */
  private setupInternalListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      const wasReconnect = this.reconnectAttempts > 0;
      this.reconnectAttempts = 0;
      console.log(`[SocketService] Connected (id: ${this.socket?.id})`);

      // Auto-rejoin active session after reconnection
      if (wasReconnect && this.activeSessionId) {
        console.log(`[SocketService] Reconnected — auto-rejoining session ${this.activeSessionId}`);
        this.socket?.emit(CLIENT_EVENTS.JOIN, { sessionId: this.activeSessionId });
        this.socket?.emit(CLIENT_EVENTS.REQUEST_TIMER, { sessionId: this.activeSessionId });
        if (this.onReconnectCallback) {
          this.onReconnectCallback(this.activeSessionId);
        }
      }

      // Flush queued events and notify generic reconnect subscribers
      if (wasReconnect) {
        this.flushPendingEmits();
        for (const callback of this.reconnectCallbacks) {
          try {
            callback();
          } catch (err) {
            console.warn('[SocketService] Reconnect callback error:', err);
          }
        }
      }
    });

    this.socket.on('disconnect', (...args: unknown[]) => {
      console.log(`[SocketService] Disconnected — reason: ${args[0]}`);
    });

    this.socket.on('connect_error', (...args: unknown[]) => {
      this.reconnectAttempts += 1;
      const error = args[0] as Error;
      console.warn(
        `[SocketService] Connection error (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}):`,
        error?.message,
      );
    });

    // Listen for server-side auth errors
    this.socket.on(SERVER_EVENTS.ERROR, (...args: unknown[]) => {
      const payload = args[0] as ErrorPayload;
      console.error('[SocketService] Server error:', payload?.message);
    });
  }
}

// Export singleton instance
export const socketService = new SocketService();
