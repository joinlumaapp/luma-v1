// useLocation — GPS location hook with 10-minute cache and foreground auto-refresh
// Requests foreground-only location, caches coordinates, and syncs with backend.

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { locationService, type UserCoordinates } from '../services/locationService';

/** Cache duration: 10 minutes in milliseconds */
const LOCATION_CACHE_DURATION_MS = 10 * 60 * 1000;

export interface UseLocationResult {
  latitude: number | null;
  longitude: number | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useLocation = (): UseLocationResult => {
  const [coords, setCoords] = useState<UserCoordinates | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedAt = useRef<number>(0);
  const isFetching = useRef(false);

  const fetchLocation = useCallback(async (force = false) => {
    // Skip if already fetching
    if (isFetching.current) return;

    // Skip if cache is still valid (unless forced)
    const now = Date.now();
    if (!force && coords && now - lastFetchedAt.current < LOCATION_CACHE_DURATION_MS) {
      return;
    }

    isFetching.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // Check permission first
      const hasPermission = await locationService.checkPermission();
      if (!hasPermission) {
        const granted = await locationService.requestPermission();
        if (!granted) {
          setError('Konum izni verilmedi. Yakınındaki kişileri görmek için konum iznine ihtiyacımız var.');
          setIsLoading(false);
          isFetching.current = false;
          return;
        }
      }

      // Get current position and sync with backend
      const location = await locationService.syncLocation();
      if (location) {
        setCoords(location);
        lastFetchedAt.current = Date.now();
        setError(null);
      } else {
        setError('Konum alınamadı. Lütfen konum servislerinizin açık olduğundan emin olun.');
      }
    } catch {
      setError('Konum güncelleme başarısız oldu.');
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [coords]);

  // Initial fetch on mount
  useEffect(() => {
    fetchLocation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh when app comes to foreground
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        // Only refetch if cache has expired
        const now = Date.now();
        if (now - lastFetchedAt.current >= LOCATION_CACHE_DURATION_MS) {
          fetchLocation();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [fetchLocation]);

  const refresh = useCallback(async () => {
    await fetchLocation(true);
  }, [fetchLocation]);

  return {
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
    isLoading,
    error,
    refresh,
  };
};
