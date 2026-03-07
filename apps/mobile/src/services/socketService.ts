// WebSocket service for real-time communication
// Uses Socket.IO client to connect to the backend

import { io, Socket } from 'socket.io-client';
import { APP_CONFIG } from '../constants/config';

// ─── Types ────────────────────────────────────────────────────

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

/** Server -> Client: error */
export interface ErrorPayload {
  message: string;
}

// ─── Event Constants ──────────────────────────────────────────

/** Events emitted FROM client TO server */
export const CLIENT_EVENTS = {
  // WebRTC Call Signaling
  CALL_INITIATE: 'call:initiate',
  CALL_ACCEPT: 'call:accept',
  CALL_REJECT: 'call:reject',
  CALL_END: 'call:end',
  WEBRTC_OFFER: 'call:webrtc_offer',
  WEBRTC_ANSWER: 'call:webrtc_answer',
  WEBRTC_ICE_CANDIDATE: 'call:webrtc_ice_candidate',
} as const;

/** Events received FROM server TO client */
export const SERVER_EVENTS = {
  ERROR: 'error',
  // WebRTC Call Signaling
  CALL_INITIATE: 'call:initiate',
  CALL_ACCEPT: 'call:accept',
  CALL_REJECT: 'call:reject',
  CALL_END: 'call:end',
  WEBRTC_OFFER: 'call:webrtc_offer',
  WEBRTC_ANSWER: 'call:webrtc_answer',
  WEBRTC_ICE_CANDIDATE: 'call:webrtc_ice_candidate',
} as const;

// ─── Socket Service ───────────────────────────────────────────

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectCallbacks: Array<() => void> = [];
  private pendingEmits: Array<{ event: string; data: Record<string, unknown> }> = [];
  private maxPendingEmits = 50;

  /**
   * Connect to the WebSocket gateway.
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

    this.socket = io(APP_CONFIG.WS_BASE_URL, {
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
    this.pendingEmits = [];
    this.reconnectCallbacks = [];
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.reconnectAttempts = 0;
    }
  }

  // ─── WebRTC Call Signaling Emitters ──────────────────────────

  /**
   * Initiate a voice or video call.
   * Backend broadcasts call request to the partner.
   */
  initiateCall(sessionId: string, callType: CallType): void {
    this.emit(CLIENT_EVENTS.CALL_INITIATE, { sessionId, callType });
  }

  /**
   * Accept an incoming call.
   */
  acceptCall(sessionId: string): void {
    this.emit(CLIENT_EVENTS.CALL_ACCEPT, { sessionId });
  }

  /**
   * Reject an incoming call.
   */
  rejectCall(sessionId: string, reason?: string): void {
    this.emit(CLIENT_EVENTS.CALL_REJECT, { sessionId, reason });
  }

  /**
   * End the current call.
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
   */
  on<T = unknown>(event: string, callback: (data: T) => void): () => void {
    this.onEvent(event, callback);
    return () => this.offEvent(event, callback);
  }

  /**
   * Register a listener for a server event.
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
      Object.values(SERVER_EVENTS).forEach((evt) => {
        this.socket?.removeAllListeners(evt);
      });
    }
  }

  // ─── Reconnection Hooks ────────────────────────────────────

  /**
   * Register a callback to be invoked after a successful reconnection.
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
   * Safely emit an event. Queues the event if the socket is temporarily disconnected.
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

    // Listen for server-side errors
    this.socket.on(SERVER_EVENTS.ERROR, (...args: unknown[]) => {
      const payload = args[0] as ErrorPayload;
      console.error('[SocketService] Server error:', payload?.message);
    });
  }
}

// Export singleton instance
export const socketService = new SocketService();
