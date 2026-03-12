// Network store — Zustand store for connectivity monitoring via NetInfo
// Debounced offline detection to avoid UI flicker on flaky connections

import { create } from 'zustand';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

/** Debounce delay for going offline (ms). Going online is immediate. */
const OFFLINE_DEBOUNCE_MS = 1500;

interface NetworkState {
  /** Whether the device has an active network connection */
  isConnected: boolean;
  /** Whether the internet is actually reachable (null = unknown) */
  isInternetReachable: boolean | null;
  /** Connection type: wifi, cellular, none, unknown, etc. */
  connectionType: string;
  /** Whether we were previously offline (for reconnection detection) */
  wasOffline: boolean;

  // Actions
  /** Start listening to network state changes; returns unsubscribe function */
  startMonitoring: () => () => void;
  /** Clear the wasOffline flag after handling reconnection */
  clearWasOffline: () => void;
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export const useNetworkStore = create<NetworkState>((set, get) => ({
  isConnected: true,
  isInternetReachable: true,
  connectionType: 'unknown',
  wasOffline: false,

  startMonitoring: () => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const prev = get();
      const isNowConnected = state.isConnected ?? false;

      if (isNowConnected) {
        // Going online — apply immediately for fast UX feedback
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }

        set({
          isConnected: true,
          isInternetReachable: state.isInternetReachable,
          connectionType: state.type,
          // Keep wasOffline true if it was already set — consumer must clear it
          wasOffline: prev.wasOffline,
        });
      } else {
        // Going offline — debounce to avoid flicker
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        debounceTimer = setTimeout(() => {
          set({
            isConnected: false,
            isInternetReachable: false,
            connectionType: state.type,
            wasOffline: true,
          });
          debounceTimer = null;
        }, OFFLINE_DEBOUNCE_MS);
      }
    });

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      unsubscribe();
    };
  },

  clearWasOffline: () => {
    set({ wasOffline: false });
  },
}));
