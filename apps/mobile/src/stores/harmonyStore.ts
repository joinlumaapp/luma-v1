// Harmony store — Zustand store for Harmony Room state
// Integrates with WebSocket for real-time Harmony Room communication

import { create } from 'zustand';
import { HARMONY_CONFIG } from '../constants/config';
import { harmonyService } from '../services/harmonyService';
import {
  socketService,
  SERVER_EVENTS,
  type CardRevealedPayload,
  type ReactionPayload,
  type MessagePayload,
  type SessionStatePayload,
  type SessionEndedPayload,
  type TimerSyncPayload,
  type UserJoinedPayload,
  type UserLeftPayload,
  type ErrorPayload,
  type TypingPayload,
  type ReadReceiptPayload,
  type HarmonyReaction,
} from '../services/socketService';
import { useAuthStore } from './authStore';
import { analyticsService, ANALYTICS_EVENTS } from '../services/analyticsService';
import type {
  HarmonySessionResponse,
  HarmonyCardResponse,
} from '../services/harmonyService';

export interface HarmonyCard {
  id: string;
  type: 'question' | 'game' | 'challenge';
  text: string;
  isRevealed: boolean;
}

export interface HarmonyMessage {
  id: string;
  text: string;
  sender: 'me' | 'other';
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

export interface CardReaction {
  cardId: string;
  reaction: string;
  userId: string;
  timestamp: string;
}

export interface HarmonySession {
  id: string;
  matchId: string;
  matchName: string;
  status: 'active' | 'scheduled' | 'completed' | 'expired';
  remainingSeconds: number;
  totalMinutes: number;
  extensions: number;
  cards: HarmonyCard[];
  messages: HarmonyMessage[];
  startedAt: string;
  compatibilityScore: number;
}

interface HarmonyState {
  // State
  sessions: HarmonySession[];
  activeSession: HarmonySession | null;
  isLoading: boolean;
  isSocketConnected: boolean;
  isPartnerOnline: boolean;
  isPartnerTyping: boolean;
  lastReaction: CardReaction | null;
  socketError: string | null;
  sessionEndReason: string | null;
  showSessionSummary: boolean;

  // REST API Actions
  fetchSessions: () => Promise<void>;
  createSession: (matchId: string) => Promise<string>;
  getSession: (sessionId: string) => Promise<void>;
  extendSession: (sessionId: string) => Promise<boolean>;

  // WebSocket Lifecycle
  connectSocket: () => void;
  disconnectSocket: () => void;
  joinSession: (sessionId: string) => void;
  leaveSession: (sessionId: string) => void;

  // WebSocket Actions (emitters)
  sendMessage: (sessionId: string, text: string) => void;
  revealCard: (sessionId: string, cardId: string) => void;
  sendReaction: (sessionId: string, cardId: string, reaction: HarmonyReaction) => void;
  requestTimerSync: (sessionId: string) => void;
  sendTypingIndicator: (sessionId: string, isTyping: boolean) => void;
  sendReadReceipt: (sessionId: string, messageIds: string[]) => void;

  // Local State Actions
  tickTimer: () => void;
  endSession: (sessionId: string) => void;
  clearActive: () => void;
  clearSessionEndReason: () => void;
  clearLastReaction: () => void;
  dismissSessionSummary: () => void;

  // WebSocket Event Handlers (internal, called by listener setup)
  _handleCardRevealed: (payload: CardRevealedPayload) => void;
  _handleReaction: (payload: ReactionPayload) => void;
  _handleMessage: (payload: MessagePayload) => void;
  _handleSessionState: (payload: SessionStatePayload) => void;
  _handleTimerSync: (payload: TimerSyncPayload) => void;
  _handleSessionEnded: (payload: SessionEndedPayload) => void;
  _handleUserJoined: (payload: UserJoinedPayload) => void;
  _handleUserLeft: (payload: UserLeftPayload) => void;
  _handleSocketError: (payload: ErrorPayload) => void;
  _handleTyping: (payload: TypingPayload) => void;
  _handleReadReceipt: (payload: ReadReceiptPayload) => void;
  _setupSocketListeners: () => void;
  _teardownSocketListeners: () => void;
}

// Transform backend card to store HarmonyCard
const mapCardResponse = (card: HarmonyCardResponse): HarmonyCard => ({
  id: card.id,
  type: card.type,
  text: card.text,
  isRevealed: false,
});

// Transform backend session to store HarmonySession
const mapSessionResponse = (
  session: HarmonySessionResponse,
  cards: HarmonyCard[] = [],
  messages: HarmonyMessage[] = []
): HarmonySession => ({
  id: session.id,
  matchId: session.matchId,
  matchName: session.matchName,
  status: session.status,
  remainingSeconds: session.remainingSeconds,
  totalMinutes: session.totalMinutes,
  extensions: session.extensions,
  cards,
  messages,
  startedAt: session.startedAt,
  compatibilityScore: session.compatibilityScore,
});

/**
 * Get the current user's ID from the auth store.
 * Used to determine message sender (me vs. other).
 */
const getCurrentUserId = (): string | null => {
  return useAuthStore.getState().user?.id ?? null;
};

export const useHarmonyStore = create<HarmonyState>((set, get) => ({
  // Initial state
  sessions: [],
  activeSession: null,
  isLoading: false,
  isSocketConnected: false,
  isPartnerOnline: false,
  isPartnerTyping: false,
  lastReaction: null,
  socketError: null,
  sessionEndReason: null,
  showSessionSummary: false,

  // ─── REST API Actions ──────────────────────────────────────────

  fetchSessions: async () => {
    set({ isLoading: true });
    try {
      const sessionsData = await harmonyService.getSessions();
      const sessions = sessionsData.map((s) => mapSessionResponse(s));
      set({ sessions, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createSession: async (matchId) => {
    set({ isLoading: true });
    try {
      const response = await harmonyService.createSession({ matchId });
      const cards = response.cards
        ? response.cards.map(mapCardResponse)
        : [];
      const newSession = mapSessionResponse(response, cards);

      analyticsService.track(ANALYTICS_EVENTS.HARMONY_SESSION_STARTED, {
        sessionId: newSession.id,
        matchId,
      });
      analyticsService.timeEvent(ANALYTICS_EVENTS.HARMONY_SESSION_ENDED);

      set((state) => ({
        sessions: [newSession, ...state.sessions],
        activeSession: newSession,
        isLoading: false,
      }));
      return newSession.id;
    } catch {
      set({ isLoading: false });
      throw new Error('Harmony Room oluşturulamadı');
    }
  },

  getSession: async (sessionId) => {
    set({ isLoading: true });
    try {
      const sessionData = await harmonyService.getSession(sessionId);
      const cardsData = await harmonyService.getCards(sessionId);
      const cards = cardsData.map(mapCardResponse);

      // Preserve existing messages for this session if we already have them
      const existingSession = get().sessions.find((s) => s.id === sessionId);
      const messages = existingSession?.messages ?? [];

      const session = mapSessionResponse(sessionData, cards, messages);

      set((state) => ({
        activeSession: session,
        sessions: state.sessions.map((s) =>
          s.id === sessionId ? session : s
        ),
        isLoading: false,
      }));
    } catch {
      set({ isLoading: false });
    }
  },

  extendSession: async (sessionId) => {
    const { activeSession } = get();
    if (!activeSession || activeSession.id !== sessionId) return false;
    if (activeSession.extensions >= HARMONY_CONFIG.MAX_EXTENSIONS) return false;

    try {
      const response = await harmonyService.extendSession(sessionId);
      if (!response.success) return false;

      set({
        activeSession: {
          ...activeSession,
          remainingSeconds: response.newRemainingSeconds,
          extensions: response.extensionCount,
          totalMinutes:
            activeSession.totalMinutes + HARMONY_CONFIG.EXTENSION_DURATION_MINUTES,
        },
      });
      return true;
    } catch {
      return false;
    }
  },

  // ─── WebSocket Lifecycle ───────────────────────────────────────

  /**
   * Connect to the Harmony WebSocket gateway.
   * Reads the JWT token from the auth store and passes it to the socket service.
   */
  connectSocket: () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) {
      console.warn('[HarmonyStore] Bağlantı için token gerekli');
      set({ socketError: 'Kimlik doğrulama bilgisi bulunamadı' });
      return;
    }

    socketService.connect(token);
    get()._setupSocketListeners();

    // Setup reconnection handler: re-register listeners and mark connected
    socketService.setReconnectCallback((sessionId: string) => {
      console.log(`[HarmonyStore] Reconnected — re-setting up listeners for session ${sessionId}`);
      get()._setupSocketListeners();
      set({ isSocketConnected: true, socketError: null });
    });

    set({ isSocketConnected: true, socketError: null });
  },

  /**
   * Disconnect from the Harmony WebSocket gateway.
   * Cleans up all event listeners before disconnecting.
   */
  disconnectSocket: () => {
    const { activeSession } = get();

    // Leave the session room before disconnecting
    if (activeSession) {
      socketService.leaveSession(activeSession.id);
    }

    get()._teardownSocketListeners();
    socketService.disconnect();
    set({
      isSocketConnected: false,
      isPartnerOnline: false,
      isPartnerTyping: false,
      socketError: null,
    });
  },

  /**
   * Join a Harmony Room session via WebSocket.
   * The backend validates participation and sends back session_state.
   */
  joinSession: (sessionId) => {
    if (!socketService.isConnected()) {
      get().connectSocket();
    }
    socketService.joinSession(sessionId);
    // Request initial timer sync for reconnection scenarios
    socketService.requestTimerSync(sessionId);
  },

  /**
   * Leave a Harmony Room session via WebSocket.
   * Notifies partner before leaving the Socket.IO room.
   */
  leaveSession: (sessionId) => {
    socketService.leaveSession(sessionId);
    set({ isPartnerOnline: false });
  },

  // ─── WebSocket Emitters ────────────────────────────────────────

  /**
   * Send a text message via WebSocket.
   * The message is added to local state optimistically.
   * The server will broadcast it back (including to sender); we deduplicate by ID.
   */
  sendMessage: (sessionId, text) => {
    const { activeSession } = get();
    if (!activeSession) return;

    // Emit via WebSocket — the server persists and broadcasts
    socketService.sendMessage(sessionId, text);

    // Optimistic local add with a temporary ID
    const optimisticMessage: HarmonyMessage = {
      id: `optimistic_${Date.now()}`,
      text,
      sender: 'me',
      status: 'sent',
      timestamp: new Date().toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    set({
      activeSession: {
        ...activeSession,
        messages: [...activeSession.messages, optimisticMessage],
      },
    });
  },

  /**
   * Reveal a card via WebSocket.
   * The server validates and broadcasts the reveal to the room.
   */
  revealCard: (sessionId, cardId) => {
    const { activeSession } = get();
    if (!activeSession) return;

    // Emit via WebSocket
    socketService.revealCard(sessionId, cardId);

    // Optimistic local reveal
    set({
      activeSession: {
        ...activeSession,
        cards: activeSession.cards.map((card) =>
          card.id === cardId ? { ...card, isRevealed: true } : card
        ),
      },
    });
  },

  /**
   * Send a reaction to a card via WebSocket.
   * Valid reactions: love, laugh, think, surprise, agree, disagree
   */
  sendReaction: (sessionId, cardId, reaction) => {
    socketService.sendReaction(sessionId, cardId, reaction);
  },

  /**
   * Request the current timer state from the server.
   * Useful for reconnection sync.
   */
  requestTimerSync: (sessionId) => {
    socketService.requestTimerSync(sessionId);
  },

  /**
   * Emit typing indicator to the partner.
   */
  sendTypingIndicator: (sessionId, isTyping) => {
    socketService.sendTypingIndicator(sessionId, isTyping);
  },

  /**
   * Send read receipts for viewed messages.
   */
  sendReadReceipt: (sessionId, messageIds) => {
    socketService.sendReadReceipt(sessionId, messageIds);
  },

  // ─── Local State Actions ───────────────────────────────────────

  tickTimer: () => {
    const { activeSession } = get();
    if (!activeSession || activeSession.status !== 'active') return;

    const newRemaining = Math.max(0, activeSession.remainingSeconds - 1);
    set({
      activeSession: {
        ...activeSession,
        remainingSeconds: newRemaining,
        status: newRemaining <= 0 ? 'expired' : 'active',
      },
    });
  },

  endSession: (sessionId) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, status: 'completed' as const } : s
      ),
      activeSession:
        state.activeSession?.id === sessionId
          ? { ...state.activeSession, status: 'completed' as const }
          : state.activeSession,
    }));
  },

  clearActive: () =>
    set({ activeSession: null, isPartnerOnline: false, isPartnerTyping: false, sessionEndReason: null, showSessionSummary: false }),

  clearSessionEndReason: () =>
    set({ sessionEndReason: null }),

  clearLastReaction: () =>
    set({ lastReaction: null }),

  dismissSessionSummary: () =>
    set({ showSessionSummary: false }),

  // ─── WebSocket Event Handlers ──────────────────────────────────
  // These are called by the socket listeners when the server emits events.

  /**
   * Handle a card being revealed by either user.
   * Updates the card's isRevealed state and, for partner reveals, adds the card content.
   */
  _handleCardRevealed: (payload: CardRevealedPayload) => {
    const { activeSession } = get();
    if (!activeSession) return;

    const existingCard = activeSession.cards.find((c) => c.id === payload.id);

    if (existingCard) {
      // Card already in our list — just mark as revealed
      set({
        activeSession: {
          ...activeSession,
          cards: activeSession.cards.map((card) =>
            card.id === payload.id ? { ...card, isRevealed: true } : card
          ),
        },
      });
    } else {
      // Card revealed by partner that we don't have locally yet — add it
      const newCard: HarmonyCard = {
        id: payload.id,
        type: payload.type,
        text: payload.textTr ?? payload.nameTr ?? '',
        isRevealed: true,
      };

      set({
        activeSession: {
          ...activeSession,
          cards: [...activeSession.cards, newCard],
        },
      });
    }
  },

  /**
   * Handle a reaction broadcast from the server.
   * Stores the latest reaction for UI animation display.
   */
  _handleReaction: (payload: ReactionPayload) => {
    set({
      lastReaction: {
        cardId: payload.cardId,
        reaction: payload.reaction,
        userId: payload.userId,
        timestamp: payload.timestamp,
      },
    });
  },

  /**
   * Handle an incoming message from the server.
   * Deduplicates against optimistic messages from sendMessage().
   */
  _handleMessage: (payload: MessagePayload) => {
    const { activeSession } = get();
    if (!activeSession) return;

    const currentUserId = getCurrentUserId();
    const isMine = payload.senderId === currentUserId;

    // If this is our own message, replace the optimistic entry with the real one
    if (isMine) {
      // Check if we already have this message (optimistic add)
      const hasOptimistic = activeSession.messages.some(
        (m) => m.id.startsWith('optimistic_') && m.text === payload.content
      );

      if (hasOptimistic) {
        // Replace the first matching optimistic message with the real one
        let replaced = false;
        const updatedMessages = activeSession.messages.map((m) => {
          if (!replaced && m.id.startsWith('optimistic_') && m.text === payload.content) {
            replaced = true;
            return {
              id: payload.id,
              text: payload.content,
              sender: 'me' as const,
              status: 'delivered' as const,
              timestamp: new Date(payload.createdAt).toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit',
              }),
            };
          }
          return m;
        });

        set({
          activeSession: {
            ...activeSession,
            messages: updatedMessages,
          },
        });
        return;
      }
    }

    // For partner messages (or our own that weren't optimistically added)
    const alreadyExists = activeSession.messages.some((m) => m.id === payload.id);
    if (alreadyExists) return;

    const newMessage: HarmonyMessage = {
      id: payload.id,
      text: payload.content,
      sender: isMine ? 'me' : 'other',
      status: isMine ? 'delivered' : 'delivered',
      timestamp: new Date(payload.createdAt).toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    set({
      activeSession: {
        ...activeSession,
        messages: [...activeSession.messages, newMessage],
      },
    });
  },

  /**
   * Handle session state sent by server upon joining.
   * Syncs the session status and remaining time.
   */
  _handleSessionState: (payload: SessionStatePayload) => {
    const { activeSession } = get();
    if (!activeSession || activeSession.id !== payload.sessionId) return;

    // Map backend status to our local status
    const statusMap: Record<string, HarmonySession['status']> = {
      PENDING: 'scheduled',
      ACTIVE: 'active',
      EXTENDED: 'active',
      ENDED: 'completed',
      CANCELLED: 'completed',
    };

    set({
      activeSession: {
        ...activeSession,
        status: statusMap[payload.status] ?? activeSession.status,
        remainingSeconds: payload.remainingSeconds,
      },
    });
  },

  /**
   * Handle timer sync from the server.
   * Corrects local timer drift.
   */
  _handleTimerSync: (payload: TimerSyncPayload) => {
    const { activeSession } = get();
    if (!activeSession || activeSession.id !== payload.sessionId) return;

    const statusMap: Record<string, HarmonySession['status']> = {
      PENDING: 'scheduled',
      ACTIVE: 'active',
      EXTENDED: 'active',
      ENDED: 'completed',
      CANCELLED: 'completed',
    };

    set({
      activeSession: {
        ...activeSession,
        remainingSeconds: payload.remainingSeconds,
        status: statusMap[payload.status] ?? activeSession.status,
      },
    });
  },

  /**
   * Handle session ended notification from the server.
   * Marks the session as expired and stores the reason for the UI.
   */
  _handleSessionEnded: (payload: SessionEndedPayload) => {
    const { activeSession } = get();
    if (!activeSession || activeSession.id !== payload.sessionId) return;

    set((state) => ({
      activeSession: {
        ...activeSession,
        status: 'expired' as const,
        remainingSeconds: 0,
      },
      sessions: state.sessions.map((s) =>
        s.id === payload.sessionId
          ? { ...s, status: 'expired' as const, remainingSeconds: 0 }
          : s
      ),
      sessionEndReason: payload.reason,
      showSessionSummary: true,
      isPartnerTyping: false,
    }));
  },

  /**
   * Handle partner joining the session.
   */
  _handleUserJoined: (payload: UserJoinedPayload) => {
    const currentUserId = getCurrentUserId();
    if (payload.userId !== currentUserId) {
      set({ isPartnerOnline: true });
    }
  },

  /**
   * Handle partner leaving the session.
   */
  _handleUserLeft: (payload: UserLeftPayload) => {
    const currentUserId = getCurrentUserId();
    if (payload.userId !== currentUserId) {
      set({ isPartnerOnline: false });
    }
  },

  /**
   * Handle WebSocket errors from the server.
   */
  _handleSocketError: (payload: ErrorPayload) => {
    set({ socketError: payload.message });
  },

  /**
   * Handle typing indicator from partner.
   * Sets isPartnerTyping state for the UI to display.
   */
  _handleTyping: (payload: TypingPayload) => {
    const currentUserId = getCurrentUserId();
    if (payload.userId === currentUserId) return; // Ignore our own typing events
    set({ isPartnerTyping: payload.isTyping });
  },

  /**
   * Handle read receipt from partner.
   * Updates message status to 'read' for the specified messages.
   */
  _handleReadReceipt: (payload: ReadReceiptPayload) => {
    const { activeSession } = get();
    if (!activeSession) return;

    const readMessageIds = new Set(payload.messageIds);
    const updatedMessages = activeSession.messages.map((msg) =>
      readMessageIds.has(msg.id) && msg.sender === 'me'
        ? { ...msg, status: 'read' as const }
        : msg
    );

    set({
      activeSession: {
        ...activeSession,
        messages: updatedMessages,
      },
    });
  },

  // ─── Listener Setup / Teardown ─────────────────────────────────

  /**
   * Register all WebSocket event listeners.
   * Called when the socket connects.
   */
  _setupSocketListeners: () => {
    const state = get();

    socketService.onEvent<CardRevealedPayload>(
      SERVER_EVENTS.CARD_REVEALED,
      state._handleCardRevealed
    );
    socketService.onEvent<ReactionPayload>(
      SERVER_EVENTS.REACTION,
      state._handleReaction
    );
    socketService.onEvent<MessagePayload>(
      SERVER_EVENTS.MESSAGE,
      state._handleMessage
    );
    socketService.onEvent<SessionStatePayload>(
      SERVER_EVENTS.SESSION_STATE,
      state._handleSessionState
    );
    socketService.onEvent<TimerSyncPayload>(
      SERVER_EVENTS.TIMER_SYNC,
      state._handleTimerSync
    );
    socketService.onEvent<SessionEndedPayload>(
      SERVER_EVENTS.SESSION_ENDED,
      state._handleSessionEnded
    );
    socketService.onEvent<UserJoinedPayload>(
      SERVER_EVENTS.USER_JOINED,
      state._handleUserJoined
    );
    socketService.onEvent<UserLeftPayload>(
      SERVER_EVENTS.USER_LEFT,
      state._handleUserLeft
    );
    socketService.onEvent<ErrorPayload>(
      SERVER_EVENTS.ERROR,
      state._handleSocketError
    );
    socketService.onEvent<TypingPayload>(
      SERVER_EVENTS.TYPING,
      state._handleTyping
    );
    socketService.onEvent<ReadReceiptPayload>(
      SERVER_EVENTS.READ_RECEIPT,
      state._handleReadReceipt
    );
  },

  /**
   * Remove all WebSocket event listeners.
   * Called before disconnecting to prevent memory leaks.
   */
  _teardownSocketListeners: () => {
    socketService.removeAllListeners();
  },
}));
