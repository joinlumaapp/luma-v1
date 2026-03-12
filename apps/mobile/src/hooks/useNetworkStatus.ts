// useNetworkStatus — Debounced network state hook using NetInfo
// Returns stable connectivity info, avoids rapid toggling on flaky connections

import { useEffect, useState, useRef, useCallback } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

export interface NetworkStatus {
  /** Whether the device has an active network connection */
  isConnected: boolean;
  /** Whether the internet is actually reachable (null = not yet determined) */
  isInternetReachable: boolean | null;
  /** Connection type: wifi, cellular, none, unknown, etc. */
  connectionType: string;
}

const DEBOUNCE_MS = 1500;

/**
 * Debounced network status hook.
 *
 * Uses a 1.5-second debounce window so rapid network flickers
 * (e.g. switching between wifi and cellular) do not cause UI jitter.
 */
export const useNetworkStatus = (): NetworkStatus => {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: null,
    connectionType: 'unknown',
  });

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestStateRef = useRef<NetInfoState | null>(null);

  const applyState = useCallback((state: NetInfoState) => {
    setStatus({
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable,
      connectionType: state.type,
    });
  }, []);

  useEffect(() => {
    // Fetch initial state immediately (no debounce)
    NetInfo.fetch().then((state) => {
      latestStateRef.current = state;
      applyState(state);
    });

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      latestStateRef.current = state;

      // When coming ONLINE, apply immediately so the user sees fast feedback
      if (state.isConnected) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        applyState(state);
        return;
      }

      // When going OFFLINE, debounce to avoid flicker
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        if (latestStateRef.current) {
          applyState(latestStateRef.current);
        }
        debounceTimerRef.current = null;
      }, DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [applyState]);

  return status;
};
