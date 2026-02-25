// Hook for automatic location updates — requests permission on mount,
// syncs location to backend, and refreshes every 15 minutes while app is active.

import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { locationService, type UserCoordinates } from '../services/locationService';

// Refresh interval: 15 minutes in milliseconds
const LOCATION_REFRESH_INTERVAL_MS = 15 * 60 * 1000;

interface UseLocationUpdateResult {
  /** Current user coordinates, null if unavailable or permission denied */
  userLocation: UserCoordinates | null;
  /** Whether location permission has been granted */
  hasPermission: boolean;
  /** Manually trigger a location refresh */
  refreshLocation: () => Promise<void>;
}

export function useLocationUpdate(): UseLocationUpdateResult {
  const [userLocation, setUserLocation] = useState<UserCoordinates | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const syncLocation = useCallback(async () => {
    try {
      const granted = await locationService.checkPermission();
      if (!granted) return;

      const coords = await locationService.syncLocation();
      if (coords) {
        setUserLocation(coords);
      }
    } catch {
      // Silently fail — location is a nice-to-have, not critical
    }
  }, []);

  const refreshLocation = useCallback(async () => {
    await syncLocation();
  }, [syncLocation]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // Request permission on first mount
      const granted = await locationService.requestPermission();
      if (!mounted) return;
      setHasPermission(granted);

      if (granted) {
        // Initial sync
        await syncLocation();
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [syncLocation]);

  // Set up periodic location refresh every 15 minutes
  useEffect(() => {
    if (!hasPermission) return;

    intervalRef.current = setInterval(() => {
      // Only sync when app is in foreground
      if (appStateRef.current === 'active') {
        syncLocation();
      }
    }, LOCATION_REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [hasPermission, syncLocation]);

  // Listen for app state changes — sync when app becomes active
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        hasPermission
      ) {
        // App came to foreground — refresh location
        syncLocation();
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [hasPermission, syncLocation]);

  return {
    userLocation,
    hasPermission,
    refreshLocation,
  };
}
