// Network store — Zustand store for connectivity monitoring via NetInfo

import { create } from 'zustand';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

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

export const useNetworkStore = create<NetworkState>((set, get) => ({
  isConnected: true,
  isInternetReachable: true,
  connectionType: 'unknown',
  wasOffline: false,

  startMonitoring: () => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const prev = get();
      const isConnected = state.isConnected ?? false;

      // wasOffline tracks whether we were previously disconnected so consumers
      // can trigger reconnection flows. It becomes true when we lose connection
      // and stays true until the consumer reads and clears it after reconnecting.
      const wasOffline = !isConnected ? true : prev.wasOffline;

      set({
        isConnected,
        isInternetReachable: state.isInternetReachable,
        connectionType: state.type,
        wasOffline,
      });
    });
    return unsubscribe;
  },

  clearWasOffline: () => {
    set({ wasOffline: false });
  },
}));
