// useAnalytics — React hook for analytics tracking in screen components
// Provides useScreenTracking for automatic screen view events and
// re-exports the analytics service and event constants for convenience.

import { useEffect, useRef } from 'react';
import { analyticsService, ANALYTICS_EVENTS } from '../services/analyticsService';

/**
 * Auto-track a screen view event when the component mounts.
 * Uses a ref guard to ensure the event fires exactly once per mount.
 *
 * Usage:
 *   useScreenTracking('Discovery');
 */
export function useScreenTracking(screenName: string): void {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!hasTracked.current) {
      analyticsService.trackScreen(screenName);
      hasTracked.current = true;
    }
  }, [screenName]);
}

// Re-export for convenience — screens can import everything from one place
export { analyticsService, ANALYTICS_EVENTS };
