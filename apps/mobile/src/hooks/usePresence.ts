// usePresence — tracks app foreground/background state and sends heartbeat
// Also provides a hook to fetch batch presence for a list of user IDs

import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { presenceService, type UserPresence } from '../services/presenceService';

/**
 * Sends heartbeat on app foreground, goOffline on background.
 * Call once at app root level.
 */
export const usePresenceTracking = (): void => {
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    // Initial heartbeat
    presenceService.heartbeat();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
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
 * Re-fetches when userIds change.
 */
export const useUserPresence = (
  userIds: string[],
): Record<string, UserPresence> => {
  const [presence, setPresence] = useState<Record<string, UserPresence>>({});

  const fetchPresence = useCallback(async () => {
    if (userIds.length === 0) return;
    const data = await presenceService.getBatchPresence(userIds);
    setPresence(data);
  }, [userIds]);

  useEffect(() => {
    fetchPresence();
  }, [fetchPresence]);

  return presence;
};
