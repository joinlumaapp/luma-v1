// NetworkProvider — Wraps the app to manage network state, offline queue, and WebSocket reconnection
// Automatically shows OfflineBanner and flushes offline queue on reconnect

import React, { useEffect, useRef, createContext, useContext } from 'react';
import { useNetworkStore } from '../stores/networkStore';
import { useAuthStore } from '../stores/authStore';
import { socketService } from '../services/socketService';
import { offlineQueue } from '../services/offlineQueue';
import { api } from '../services/api';
import { requestQueue } from '../services/requestQueue';
import { OfflineBanner } from '../components/common/OfflineBanner';

// ── Context ──────────────────────────────────────────────────────────

interface NetworkContextValue {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string;
}

const NetworkContext = createContext<NetworkContextValue>({
  isConnected: true,
  isInternetReachable: null,
  connectionType: 'unknown',
});

/**
 * Hook to read network status from the nearest NetworkProvider.
 * Prefer this over directly subscribing to the store when inside React components.
 */
export const useNetworkContext = (): NetworkContextValue => useContext(NetworkContext);

// ── Provider ─────────────────────────────────────────────────────────

interface NetworkProviderProps {
  children: React.ReactNode;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ children }) => {
  const isConnected = useNetworkStore((s) => s.isConnected);
  const isInternetReachable = useNetworkStore((s) => s.isInternetReachable);
  const connectionType = useNetworkStore((s) => s.connectionType);
  const wasOffline = useNetworkStore((s) => s.wasOffline);
  const clearWasOffline = useNetworkStore((s) => s.clearWasOffline);
  const startMonitoring = useNetworkStore((s) => s.startMonitoring);
  const setPendingActionCount = useNetworkStore((s) => s.setPendingActionCount);

  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const hasInitializedRef = useRef(false);

  // Start network monitoring and load persisted offline queue
  useEffect(() => {
    const unsubscribe = startMonitoring();

    // Load persisted offline queue and sync pending count
    offlineQueue.init().then(() => {
      setPendingActionCount(offlineQueue.getQueueSize());
    });

    hasInitializedRef.current = true;

    return () => {
      unsubscribe();
    };
  }, [startMonitoring, setPendingActionCount]);

  // Handle reconnection: flush queues, reconnect WebSocket
  useEffect(() => {
    if (!hasInitializedRef.current) return;
    if (!isConnected || !wasOffline) return;

    const handleReconnection = async () => {
      if (__DEV__) {
        console.log('[NetworkProvider] Baglanti geri geldi, kuyruklar isleniyor...');
      }

      // 1. Flush the legacy requestQueue
      try {
        await requestQueue.flush(api);
      } catch {
        if (__DEV__) {
          console.warn('[NetworkProvider] requestQueue flush hatasi');
        }
      }

      // 2. Process the persistent offlineQueue
      try {
        const result = await offlineQueue.processQueue(api);
        setPendingActionCount(result.remaining);
      } catch {
        if (__DEV__) {
          console.warn('[NetworkProvider] offlineQueue processQueue hatasi');
        }
      }

      // 3. Reconnect WebSocket if authenticated
      if (isAuthenticated && accessToken) {
        if (__DEV__) {
          console.log('[NetworkProvider] WebSocket yeniden baglaniliyor');
        }
        socketService.reconnectWithToken(accessToken);
      }

      // 4. Clear the wasOffline flag
      clearWasOffline();
    };

    handleReconnection();
  }, [isConnected, wasOffline, isAuthenticated, accessToken, clearWasOffline]);

  const contextValue: NetworkContextValue = {
    isConnected,
    isInternetReachable,
    connectionType,
  };

  return (
    <NetworkContext.Provider value={contextValue}>
      {children}
      <OfflineBanner />
    </NetworkContext.Provider>
  );
};
