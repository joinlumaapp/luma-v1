// Performance monitoring service — tracks API response times, screen render
// times, image load times, and reports slow operations.
// Integrates with analyticsService for centralized reporting.
// Threshold: operations slower than 3000ms are flagged as slow.

import { Platform } from 'react-native';
import { analyticsService } from './analyticsService';
import { AnalyticsEvent } from '@luma/shared';
import type { EventProperties } from '@luma/shared';

// ─── Configuration ───────────────────────────────────────────────────────────

const SLOW_THRESHOLD_MS = 3000;
const API_SLOW_THRESHOLD_MS = 3000;
const RENDER_SLOW_THRESHOLD_MS = 2000;
const IMAGE_SLOW_THRESHOLD_MS = 3000;

// Maximum number of performance entries kept in memory for summary
const MAX_ENTRIES = 200;

// ─── Types ───────────────────────────────────────────────────────────────────

interface PerformanceEntry {
  type: 'api' | 'render' | 'image' | 'custom';
  label: string;
  durationMs: number;
  timestamp: number;
  metadata?: Record<string, string | number | boolean>;
}

interface ActiveTimer {
  label: string;
  type: PerformanceEntry['type'];
  startedAt: number;
  metadata?: Record<string, string | number | boolean>;
}

// ─── Internal State ──────────────────────────────────────────────────────────

const activeTimers = new Map<string, ActiveTimer>();
const entries: PerformanceEntry[] = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addEntry(entry: PerformanceEntry): void {
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) {
    entries.shift();
  }
}

function reportSlowOperation(entry: PerformanceEntry): void {
  let eventName: string;
  let threshold: number;

  switch (entry.type) {
    case 'api':
      eventName = AnalyticsEvent.SLOW_API_CALL;
      threshold = API_SLOW_THRESHOLD_MS;
      break;
    case 'render':
      eventName = AnalyticsEvent.SLOW_SCREEN_RENDER;
      threshold = RENDER_SLOW_THRESHOLD_MS;
      break;
    case 'image':
      eventName = AnalyticsEvent.SLOW_IMAGE_LOAD;
      threshold = IMAGE_SLOW_THRESHOLD_MS;
      break;
    default:
      eventName = AnalyticsEvent.SLOW_API_CALL;
      threshold = SLOW_THRESHOLD_MS;
  }

  if (entry.durationMs >= threshold) {
    const properties: EventProperties = {
      label: entry.label,
      type: entry.type,
      duration_ms: entry.durationMs,
      platform: Platform.OS,
      ...entry.metadata,
    };

    analyticsService.track(eventName, properties);

    if (__DEV__) {
      console.warn(
        `[Performance] SLOW ${entry.type}: ${entry.label} took ${entry.durationMs}ms (threshold: ${threshold}ms)`,
      );
    }
  }
}

// ─── Performance Service ─────────────────────────────────────────────────────

export const performanceService = {
  /**
   * Start a performance timer for a labeled operation.
   * Call endTimer() with the same key to record the duration.
   *
   * @param key Unique key for this timer (e.g., 'api:/discovery/feed')
   * @param type Category of the operation
   * @param metadata Optional extra properties to attach to the entry
   */
  startTimer(
    key: string,
    type: PerformanceEntry['type'],
    metadata?: Record<string, string | number | boolean>,
  ): void {
    activeTimers.set(key, {
      label: key,
      type,
      startedAt: Date.now(),
      metadata,
    });
  },

  /**
   * End a previously started timer and record the duration.
   * Automatically reports slow operations to analytics.
   *
   * @returns Duration in ms, or -1 if the timer was not found
   */
  endTimer(key: string): number {
    const timer = activeTimers.get(key);
    if (!timer) {
      if (__DEV__) {
        console.warn(`[Performance] Timer not found: ${key}`);
      }
      return -1;
    }

    activeTimers.delete(key);
    const durationMs = Date.now() - timer.startedAt;

    const entry: PerformanceEntry = {
      type: timer.type,
      label: timer.label,
      durationMs,
      timestamp: Date.now(),
      metadata: timer.metadata,
    };

    addEntry(entry);
    reportSlowOperation(entry);

    if (__DEV__) {
      console.log(`[Performance] ${timer.type}: ${timer.label} — ${durationMs}ms`);
    }

    return durationMs;
  },

  // ─── Convenience Methods ─────────────────────────────────────────────

  /**
   * Track an API call performance. Wraps startTimer/endTimer.
   * Use in API interceptors or service methods.
   *
   * @param url API endpoint URL
   * @param method HTTP method
   * @returns A stop function that records the duration
   */
  trackApiCall(url: string, method: string): () => number {
    const key = `api:${method}:${url}`;
    performanceService.startTimer(key, 'api', {
      url,
      method: method.toUpperCase(),
    });
    return () => performanceService.endTimer(key);
  },

  /**
   * Track screen render performance.
   * Call at the beginning of a screen mount, stop when fully rendered.
   *
   * @param screenName Screen name
   * @returns A stop function that records the duration
   */
  trackScreenRender(screenName: string): () => number {
    const key = `render:${screenName}:${Date.now()}`;
    performanceService.startTimer(key, 'render', { screen: screenName });
    return () => performanceService.endTimer(key);
  },

  /**
   * Track image load performance.
   *
   * @param imageUrl Image URL (will be truncated for privacy)
   * @returns A stop function that records the duration
   */
  trackImageLoad(imageUrl: string): () => number {
    // Truncate URL to avoid PII leaks — keep only the last path segment
    const urlParts = imageUrl.split('/');
    const safeLabel = urlParts[urlParts.length - 1] ?? 'unknown';
    const key = `image:${safeLabel}:${Date.now()}`;
    performanceService.startTimer(key, 'image', { image_label: safeLabel });
    return () => performanceService.endTimer(key);
  },

  /**
   * Record an already-measured duration directly (no timer needed).
   */
  recordDuration(
    label: string,
    type: PerformanceEntry['type'],
    durationMs: number,
    metadata?: Record<string, string | number | boolean>,
  ): void {
    const entry: PerformanceEntry = {
      type,
      label,
      durationMs,
      timestamp: Date.now(),
      metadata,
    };

    addEntry(entry);
    reportSlowOperation(entry);
  },

  // ─── Summary & Debug ─────────────────────────────────────────────────

  /**
   * Get performance summary for debugging.
   * Returns average durations grouped by type.
   */
  getSummary(): Record<string, { count: number; avgMs: number; maxMs: number; slowCount: number }> {
    const groups: Record<string, { count: number; totalMs: number; maxMs: number; slowCount: number }> = {};

    for (const entry of entries) {
      if (!groups[entry.type]) {
        groups[entry.type] = { count: 0, totalMs: 0, maxMs: 0, slowCount: 0 };
      }
      const group = groups[entry.type];
      group.count += 1;
      group.totalMs += entry.durationMs;
      if (entry.durationMs > group.maxMs) {
        group.maxMs = entry.durationMs;
      }
      if (entry.durationMs >= SLOW_THRESHOLD_MS) {
        group.slowCount += 1;
      }
    }

    const summary: Record<string, { count: number; avgMs: number; maxMs: number; slowCount: number }> = {};
    for (const [type, group] of Object.entries(groups)) {
      summary[type] = {
        count: group.count,
        avgMs: Math.round(group.totalMs / group.count),
        maxMs: group.maxMs,
        slowCount: group.slowCount,
      };
    }

    return summary;
  },

  /**
   * Get recent performance entries (for debug UI).
   */
  getRecentEntries(limit: number = 50): readonly PerformanceEntry[] {
    return entries.slice(-limit);
  },

  /**
   * Clear all stored entries and active timers.
   */
  clear(): void {
    activeTimers.clear();
    entries.length = 0;
  },
};
