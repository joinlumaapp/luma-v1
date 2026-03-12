// useTypingIndicator — Debounced typing indicator hook
// Emits typing events to the server with auto-stop after 3 seconds of inactivity.
// Listens for remote typing events from the conversation partner.

import { useEffect, useRef, useCallback, useState } from 'react';
import { socketService, type ChatTypingPayload } from '../services/socketService';
import { WS_EVENTS } from '@luma/shared/src/constants/api';

/** Duration of inactivity before sending stop-typing (ms) */
const TYPING_TIMEOUT_MS = 3000;

/** Minimum interval between typing emissions to prevent spam (ms) */
const TYPING_THROTTLE_MS = 1000;

interface UseTypingIndicatorOptions {
  /** The match/conversation ID to send typing events for */
  matchId: string;
  /** Whether the hook is active (e.g., only when in chat screen) */
  enabled?: boolean;
}

interface UseTypingIndicatorReturn {
  /** Whether the local user is currently marked as typing */
  isTyping: boolean;
  /** Whether the remote user is currently typing */
  remoteIsTyping: boolean;
  /** Call this on every text input change to trigger typing indicator */
  onTextChange: () => void;
  /** Manually stop typing (e.g., on send or blur) */
  stopTyping: () => void;
}

/**
 * Hook for managing typing indicators in a chat conversation.
 *
 * Usage:
 * ```tsx
 * const { remoteIsTyping, onTextChange, stopTyping } = useTypingIndicator({
 *   matchId: 'match-123',
 * });
 *
 * <TextInput onChangeText={(text) => { setText(text); onTextChange(); }} />
 * <Button onPress={() => { sendMessage(); stopTyping(); }} />
 * ```
 */
export const useTypingIndicator = ({
  matchId,
  enabled = true,
}: UseTypingIndicatorOptions): UseTypingIndicatorReturn => {
  const [isTyping, setIsTyping] = useState(false);
  const [remoteIsTyping, setRemoteIsTyping] = useState(false);

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmitRef = useRef<number>(0);
  const isTypingRef = useRef(false);
  const remoteTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Send typing start event (throttled)
  const emitTypingStart = useCallback(() => {
    if (!enabled) return;

    const now = Date.now();
    if (now - lastEmitRef.current < TYPING_THROTTLE_MS) return;

    lastEmitRef.current = now;
    socketService.sendTyping(matchId);
  }, [matchId, enabled]);

  // Send typing stop event
  const emitTypingStop = useCallback(() => {
    if (!enabled) return;

    socketService.sendStopTyping(matchId);
  }, [matchId, enabled]);

  // Stop typing — clear timeout and emit stop event
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (isTypingRef.current) {
      isTypingRef.current = false;
      setIsTyping(false);
      emitTypingStop();
    }
  }, [emitTypingStop]);

  // Handle text input changes — debounced typing emission
  const onTextChange = useCallback(() => {
    if (!enabled) return;

    // Start typing if not already
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      setIsTyping(true);
    }

    // Emit typing start (throttled)
    emitTypingStart();

    // Reset the auto-stop timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      setIsTyping(false);
      emitTypingStop();
    }, TYPING_TIMEOUT_MS);
  }, [enabled, emitTypingStart, emitTypingStop]);

  // Listen for remote typing events
  useEffect(() => {
    if (!enabled) return;

    const cleanupTypingStart = socketService.onAny(
      WS_EVENTS.CHAT_TYPING,
      (data: unknown) => {
        const payload = data as ChatTypingPayload;
        if (payload.matchId !== matchId) return;

        setRemoteIsTyping(true);

        // Auto-clear remote typing after timeout (in case stop event is lost)
        if (remoteTypingTimeoutRef.current) {
          clearTimeout(remoteTypingTimeoutRef.current);
        }
        remoteTypingTimeoutRef.current = setTimeout(() => {
          setRemoteIsTyping(false);
        }, TYPING_TIMEOUT_MS + 1000); // Extra buffer for network latency
      },
    );

    const cleanupTypingStop = socketService.onAny(
      WS_EVENTS.CHAT_STOP_TYPING,
      (data: unknown) => {
        const payload = data as ChatTypingPayload;
        if (payload.matchId !== matchId) return;

        setRemoteIsTyping(false);

        if (remoteTypingTimeoutRef.current) {
          clearTimeout(remoteTypingTimeoutRef.current);
          remoteTypingTimeoutRef.current = null;
        }
      },
    );

    return () => {
      cleanupTypingStart();
      cleanupTypingStop();
    };
  }, [matchId, enabled]);

  // Cleanup on unmount — send stop typing if active
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (remoteTypingTimeoutRef.current) {
        clearTimeout(remoteTypingTimeoutRef.current);
      }
      if (isTypingRef.current) {
        emitTypingStop();
      }
    };
  }, [emitTypingStop]);

  return {
    isTyping,
    remoteIsTyping,
    onTextChange,
    stopTyping,
  };
};
