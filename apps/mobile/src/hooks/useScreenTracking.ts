// Auto screen tracking hook — integrates with React Navigation
// Tracks screen views and time spent on each screen automatically.
// Usage: call useScreenTracking(navigationRef) in your root App component.

import { useCallback, useRef } from 'react';
import type { NavigationContainerRef, NavigationState } from '@react-navigation/native';
import { analyticsService } from '../services/analyticsService';
import { AnalyticsEvent } from '@luma/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScreenTimeEntry {
  screenName: string;
  enteredAt: number;
}

// ─── Helper: Extract Active Screen Name ──────────────────────────────────────

function getActiveRouteName(state: NavigationState | undefined): string | undefined {
  if (!state || state.routes.length === 0) return undefined;

  const route = state.routes[state.index];

  // If this route has nested state, recurse into it
  if (route.state) {
    return getActiveRouteName(route.state as NavigationState);
  }

  return route.name;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Automatically tracks screen views when the navigation state changes.
 * Also calculates time spent on each screen and reports it.
 *
 * @returns onStateChange callback and onReady callback for NavigationContainer
 *
 * @example
 * ```tsx
 * const navigationRef = useNavigationContainerRef();
 * const { onStateChange, onReady } = useScreenTracking(navigationRef);
 *
 * return (
 *   <NavigationContainer
 *     ref={navigationRef}
 *     onStateChange={onStateChange}
 *     onReady={onReady}
 *   >
 *     {children}
 *   </NavigationContainer>
 * );
 * ```
 */
export function useScreenTracking(
  navigationRef: React.RefObject<NavigationContainerRef<Record<string, undefined>>>,
) {
  const currentScreen = useRef<ScreenTimeEntry | null>(null);
  const isReady = useRef(false);

  const trackScreenTime = useCallback((previousScreen: ScreenTimeEntry) => {
    const timeSpentMs = Date.now() - previousScreen.enteredAt;

    // Only track if user spent more than 500ms on the screen
    // (skip accidental navigations / quick transitions)
    if (timeSpentMs > 500) {
      analyticsService.track(AnalyticsEvent.SESSION_DURATION, {
        screen: previousScreen.screenName,
        time_spent_ms: timeSpentMs,
        time_spent_seconds: Math.round(timeSpentMs / 1000),
      });
    }
  }, []);

  const onStateChange = useCallback(() => {
    if (!isReady.current || !navigationRef.current) return;

    const currentState = navigationRef.current.getRootState();
    const newScreenName = getActiveRouteName(currentState);

    if (!newScreenName) return;

    // Skip if we are on the same screen
    if (currentScreen.current?.screenName === newScreenName) return;

    // Track time spent on previous screen
    if (currentScreen.current) {
      trackScreenTime(currentScreen.current);
    }

    // Track new screen view
    analyticsService.screen(newScreenName);

    // Start timing the new screen
    currentScreen.current = {
      screenName: newScreenName,
      enteredAt: Date.now(),
    };
  }, [navigationRef, trackScreenTime]);

  const onReady = useCallback(() => {
    isReady.current = true;

    // Track the initial screen
    if (navigationRef.current) {
      const currentState = navigationRef.current.getRootState();
      const screenName = getActiveRouteName(currentState);

      if (screenName) {
        analyticsService.screen(screenName);
        currentScreen.current = {
          screenName,
          enteredAt: Date.now(),
        };
      }
    }
  }, [navigationRef]);

  return { onStateChange, onReady };
}

export default useScreenTracking;
