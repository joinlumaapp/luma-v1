// usePresence — Online presence tracking via WebSocket + HTTP fallback
// Combines real-time WS presence events with HTTP batch polling.
// Also manages app lifecycle heartbeat for the current user.

import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { presenceService, type UserPresence } from '../services/presenceService';
import { socketService, type PresencePayload } from '../services/socketService';

/** Polling interval for batch presence refresh (ms) */
const PRESENCE_POLL_INTERVAL_MS = 60_000;

/**
 * Sends heartbeat on app foreground, goOffline on background.
 * Call once at app root level.
 */
export const usePresenceTracking = (): void => {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    // Initial heartbeat
    presenceService.heartbeat();

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        presenceService.heartbeat();
      }
      if (
        appStateRef.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        presenceService.goOffline();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);
};

/**
 * Fetches and returns presence data for a list of user IDs.
 * Combines HTTP batch polling with real-time WebSocket updates.
 * Re-fetches when userIds change.
 */
export const useUserPresence = (
  userIds: string[],
): Record<string, UserPresence> => {
  const [presence, setPresence] = useState<Record<string, UserPresence>>({});
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch presence via HTTP (initial load + polling)
  const fetchPresence = useCallback(async () => {
    if (userIds.length === 0) return;
    const data = await presenceService.getBatchPresence(userIds);
    setPresence(data);
  }, [userIds]);

  // Initial fetch
  useEffect(() => {
    fetchPresence();
  }, [fetchPresence]);

  // Periodic polling as fallback
  useEffect(() => {
    if (userIds.length === 0) return;

    pollIntervalRef.current = setInterval(() => {
      fetchPresence();
    }, PRESENCE_POLL_INTERVAL_MS);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [userIds, fetchPresence]);

  // Listen for real-time presence updates via WebSocket
  useEffect(() => {
    if (userIds.length === 0) return;

    const userIdSet = new Set(userIds);

    const cleanupOnline = socketService.onAny('user:online', (data: unknown) => {
      const payload = data as PresencePayload;
      if (!userIdSet.has(payload.userId)) return;

      setPresence((prev) => ({
        ...prev,
        [payload.userId]: {
          userId: payload.userId,
          isOnline: true,
          lastActiveAt: payload.lastActiveAt,
        },
      }));
    });

    const cleanupOffline = socketService.onAny('user:offline', (data: unknown) => {
      const payload = data as PresencePayload;
      if (!userIdSet.has(payload.userId)) return;

      setPresence((prev) => ({
        ...prev,
        [payload.userId]: {
          userId: payload.userId,
          isOnline: false,
          lastActiveAt: payload.lastActiveAt,
        },
      }));
    });

    return () => {
      cleanupOnline();
      cleanupOffline();
    };
  }, [userIds]);

  return presence;
};

/**
 * Track online status for a single user.
 * Convenience wrapper around useUserPresence.
 */
export const useSingleUserPresence = (
  userId: string | undefined,
): { isOnline: boolean; lastActiveAt: string | null } => {
  const userIds = userId ? [userId] : [];
  const presence = useUserPresence(userIds);

  if (!userId || !presence[userId]) {
    return { isOnline: false, lastActiveAt: null };
  }

  return {
    isOnline: presence[userId].isOnline,
    lastActiveAt: presence[userId].lastActiveAt,
  };
};
