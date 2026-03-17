// useSocket — React hook for managing WebSocket lifecycle
// Connects on app foreground, disconnects on background.
// Auto-reconnects on network restore via NetInfo.

import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { logger } from '../utils/logger';
import {
  socketService,
  type ConnectionState,
} from '../services/socketService';
import { useAuthStore } from '../stores/authStore';

interface UseSocketReturn {
  /** Current WebSocket connection state */
  connectionState: ConnectionState;
  /** Whether the socket is connected and ready */
  isConnected: boolean;
  /** Manually trigger reconnection */
  reconnect: () => void;
}

/**
 * Main socket lifecycle hook. Should be called once at the app root level.
 *
 * Behavior:
 * - Connects when authenticated and app is in foreground
 * - Disconnects when app moves to background
 * - Reconnects automatically when network is restored
 * - Reconnects with fresh token after token refresh
 */
export const useSocket = (): UseSocketReturn => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isNetworkAvailableRef = useRef(true);
  const hasConnectedRef = useRef(false);

  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Connect to WebSocket
  const connectSocket = useCallback(() => {
    if (!accessToken || !isAuthenticated) return;
    if (socketService.isConnected()) return;

    socketService.connect(accessToken);
    hasConnectedRef.current = true;
  }, [accessToken, isAuthenticated]);

  // Disconnect from WebSocket
  const disconnectSocket = useCallback(() => {
    if (!hasConnectedRef.current) return;
    socketService.disconnect();
    hasConnectedRef.current = false;
  }, []);

  // Manual reconnect
  const reconnect = useCallback(() => {
    if (!accessToken || !isAuthenticated) return;
    socketService.reconnectWithToken(accessToken);
  }, [accessToken, isAuthenticated]);

  // Subscribe to connection state changes
  useEffect(() => {
    const cleanup = socketService.onConnectionStateChange(setConnectionState);
    return cleanup;
  }, []);

  // Connect when authenticated and token is available
  useEffect(() => {
    if (isAuthenticated && accessToken && appStateRef.current === 'active') {
      connectSocket();
    }

    return () => {
      // Disconnect when auth state changes (e.g., logout)
      if (!isAuthenticated) {
        disconnectSocket();
      }
    };
  }, [isAuthenticated, accessToken, connectSocket, disconnectSocket]);

  // AppState listener — foreground/background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const wasBackground = appStateRef.current.match(/inactive|background/);
      const isNowForeground = nextAppState === 'active';
      const wasActive = appStateRef.current === 'active';
      const isNowBackground = nextAppState.match(/inactive|background/);

      if (wasBackground && isNowForeground) {
        // App came to foreground — reconnect if authenticated
        if (isAuthenticated && accessToken && isNetworkAvailableRef.current) {
          connectSocket();
        }
      }

      if (wasActive && isNowBackground) {
        // App went to background — disconnect to save resources
        disconnectSocket();
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, accessToken, connectSocket, disconnectSocket]);

  // NetInfo listener — reconnect on network restore
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const wasOffline = !isNetworkAvailableRef.current;
      const isOnline = state.isConnected ?? false;
      isNetworkAvailableRef.current = isOnline;

      if (wasOffline && isOnline) {
        // Network restored — reconnect if authenticated and in foreground
        if (
          isAuthenticated &&
          accessToken &&
          appStateRef.current === 'active'
        ) {
          logger.log('[useSocket] Ag baglantisi geri geldi, yeniden baglaniliyor');
          socketService.reconnectWithToken(accessToken);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, accessToken]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, [disconnectSocket]);

  return {
    connectionState,
    isConnected: connectionState === 'connected',
    reconnect,
  };
};
