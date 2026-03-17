// Analytics service — Multi-provider event tracking with offline buffering
// Supports Mixpanel (production), console logging (dev), and server-side batch delivery.
// Features: event batching, offline queue with AsyncStorage persistence,
// funnel tracking, A/B testing, timed events, and session duration.
// Never tracks PII (phone, email, real name) — only opaque IDs and feature data.

import { Platform, AppState } from 'react-native';
import { APP_CONFIG } from '../constants/config';
import { logger } from '../utils/logger';
import {
  AnalyticsEvent,
  type AnalyticsEventName,
  type EventProperties,
  type AnalyticsEventPayload,
  type FunnelName,
  FUNNEL_DEFINITIONS,
} from '@luma/shared';

// Re-export shared event constants for backward compatibility
export { AnalyticsEvent as ANALYTICS_EVENTS } from '@luma/shared';
export type { AnalyticsEventName } from '@luma/shared';

// Lazy-load Mixpanel to avoid Expo Go crash when native module is missing
type MixpanelType = import('mixpanel-react-native').Mixpanel;
let MixpanelClass: (new (token: string, trackAutomaticEvents: boolean) => MixpanelType) | null = null;

// Lazy-load AsyncStorage for offline persistence
type AsyncStorageType = import('@react-native-async-storage/async-storage').AsyncStorageStatic;
let AsyncStorageModule: AsyncStorageType | null = null;

const OFFLINE_QUEUE_KEY = '@luma:analytics:offline_queue';
// ─── Types ───────────────────────────────────────────────────────────────────

interface UserTraits {
  userId: string;
  packageTier: string;
  gender?: string;
  ageRange?: string;
  intentionTag?: string;
  isVerified?: boolean;
  profileCompleteness?: number;
}

interface ExperimentVariant {
  id: string;
  name: string;
  weight: number;
}

interface UserExperimentAssignment {
  experimentId: string;
  variantId: string;
  assignedAt: string;
}

// ─── Analytics Provider Interface ────────────────────────────────────────────

interface AnalyticsProvider {
  name: string;
  initialize(): Promise<void>;
  identify(userId: string, traits: Record<string, string | number | boolean>): void;
  track(event: string, properties: EventProperties): void;
  screen(screenName: string): void;
  setUserProperties(props: Record<string, string | number | boolean>): void;
  reset(): void;
  flush(): void;
}

// ─── Mixpanel Provider ───────────────────────────────────────────────────────

function createMixpanelProvider(token: string): AnalyticsProvider {
  let instance: MixpanelType | null = null;

  return {
    name: 'mixpanel',

    async initialize(): Promise<void> {
      try {
        if (!MixpanelClass) {
          const mod = await import('mixpanel-react-native');
          MixpanelClass = mod.Mixpanel;
        }
        const mp = new MixpanelClass(token, true);
        await mp.init();
        instance = mp;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(`[Analytics:Mixpanel] Init failed: ${message}`);
      }
    },

    identify(userId: string, traits: Record<string, string | number | boolean>): void {
      if (!instance) return;
      instance.identify(userId);
      instance.getPeople().set(traits);
    },

    track(event: string, properties: EventProperties): void {
      if (!instance) return;
      instance.track(event, properties);
    },

    screen(screenName: string): void {
      if (!instance) return;
      instance.track(AnalyticsEvent.SCREEN_VIEW, { screen: screenName });
    },

    setUserProperties(props: Record<string, string | number | boolean>): void {
      if (!instance) return;
      instance.getPeople().set(props);
    },

    reset(): void {
      if (!instance) return;
      instance.reset();
    },

    flush(): void {
      if (!instance) return;
      instance.flush();
    },
  };
}

// ─── Console Provider (dev fallback) ─────────────────────────────────────────

function createConsoleProvider(): AnalyticsProvider {
  return {
    name: 'console',
    async initialize(): Promise<void> {
      logger.log('[Analytics:Console] Initialized (dev mode)');
    },
    identify(userId: string, traits: Record<string, string | number | boolean>): void {
      logger.log('[Analytics] identify:', userId, traits);
    },
    track(event: string, properties: EventProperties): void {
      logger.log(`[Analytics] ${event}`, properties);
    },
    screen(screenName: string): void {
      logger.log(`[Analytics] screen: ${screenName}`);
    },
    setUserProperties(props: Record<string, string | number | boolean>): void {
      logger.log('[Analytics] setUserProperties:', props);
    },
    reset(): void {
      logger.log('[Analytics] reset');
    },
    flush(): void {
      // no-op
    },
  };
}

// ─── Internal State ──────────────────────────────────────────────────────────

const providers: AnalyticsProvider[] = [];
let isInitialized = false;

// Event batching
const eventQueue: AnalyticsEventPayload[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL_MS = 30_000; // 30 seconds
const MAX_QUEUE_SIZE = 20;

// Timed events
const timedEvents = new Map<string, number>();

// Session tracking
let sessionId = '';
let sessionStartTime: number | null = null;

// Funnel state
const funnelProgress = new Map<FunnelName, number>();

// A/B test assignments
const experimentAssignments = new Map<string, UserExperimentAssignment>();

// Offline flag
let isOffline = false;

// ─── Offline Persistence Helpers ─────────────────────────────────────────────

async function loadAsyncStorage(): Promise<void> {
  if (AsyncStorageModule) return;
  try {
    const mod = await import('@react-native-async-storage/async-storage');
    AsyncStorageModule = mod.default;
  } catch {
    // AsyncStorage not available — offline persistence disabled
  }
}

async function persistOfflineQueue(events: AnalyticsEventPayload[]): Promise<void> {
  await loadAsyncStorage();
  if (!AsyncStorageModule) return;
  try {
    const existing = await AsyncStorageModule.getItem(OFFLINE_QUEUE_KEY);
    const stored: AnalyticsEventPayload[] = existing ? JSON.parse(existing) : [];
    const merged = [...stored, ...events].slice(-500); // Cap at 500 events
    await AsyncStorageModule.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(merged));
  } catch {
    // Silently fail — analytics should never crash the app
  }
}

async function loadOfflineQueue(): Promise<AnalyticsEventPayload[]> {
  await loadAsyncStorage();
  if (!AsyncStorageModule) return [];
  try {
    const data = await AsyncStorageModule.getItem(OFFLINE_QUEUE_KEY);
    if (data) {
      await AsyncStorageModule.removeItem(OFFLINE_QUEUE_KEY);
      return JSON.parse(data);
    }
  } catch {
    // Silently fail
  }
  return [];
}

function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

// ─── Batch Flush Logic ───────────────────────────────────────────────────────

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushEventQueue();
    flushTimer = null;
  }, FLUSH_INTERVAL_MS);
}

function flushEventQueue(): void {
  if (eventQueue.length === 0) return;
  const batch = eventQueue.splice(0);

  if (isOffline) {
    // Store offline — will be sent when connectivity returns
    persistOfflineQueue(batch);
    return;
  }

  if (__DEV__) {
    console.log(`[Analytics] Flushing ${batch.length} events`);
  }

  // Send to all providers
  for (const entry of batch) {
    for (const provider of providers) {
      provider.track(entry.event, entry.properties);
    }
  }

  // Also send batch to server endpoint for server-side analytics
  sendBatchToServer(batch);
}

async function sendBatchToServer(events: AnalyticsEventPayload[]): Promise<void> {
  try {
    const { api } = await import('./api');
    await api.post('/analytics/events', {
      events,
      sessionId,
      platform: Platform.OS as 'ios' | 'android',
      appVersion: APP_CONFIG.APP_VERSION ?? '1.0.0',
    });
  } catch {
    // Server delivery failed — persist for retry
    persistOfflineQueue(events);
  }
}

// ─── App State Listener (background/foreground) ──────────────────────────────

let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

function setupAppStateListener(): void {
  if (appStateSubscription) return;
  appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      // Flush events when app goes to background
      analyticsService.track(AnalyticsEvent.APP_BACKGROUNDED, {
        session_duration_ms: sessionStartTime ? Date.now() - sessionStartTime : 0,
      });
      analyticsService.flush();
    } else if (nextAppState === 'active') {
      analyticsService.track(AnalyticsEvent.APP_OPENED, {});
    }
  });
}

// ─── Analytics Service ───────────────────────────────────────────────────────

export const analyticsService = {
  /**
   * Initialize analytics providers. Call once at app startup.
   * Sets up Mixpanel (if token available), console logging in dev,
   * restores offline queue, and starts session tracking.
   */
  async initialize(): Promise<void> {
    if (isInitialized) return;

    sessionId = generateSessionId();
    sessionStartTime = Date.now();

    // Set up providers
    const token = APP_CONFIG.MIXPANEL_TOKEN;
    if (token && token.length > 0) {
      const mixpanel = createMixpanelProvider(token);
      await mixpanel.initialize();
      providers.push(mixpanel);
    }

    if (__DEV__) {
      const consoleProvider = createConsoleProvider();
      await consoleProvider.initialize();
      providers.push(consoleProvider);
    }

    // Restore any events queued while offline
    const offlineEvents = await loadOfflineQueue();
    if (offlineEvents.length > 0) {
      if (__DEV__) {
        console.log(`[Analytics] Restoring ${offlineEvents.length} offline events`);
      }
      eventQueue.push(...offlineEvents);
      scheduleFlush();
    }

    setupAppStateListener();
    isInitialized = true;

    if (__DEV__) {
      console.log(`[Analytics] Initialized with ${providers.length} provider(s)`);
    }
  },

  /**
   * Identify the current user. Call after login or when user properties change.
   * Sets user-level properties for segmentation and cohort analysis.
   * Never sends PII (phone, email, real name) -- only opaque IDs and feature data.
   */
  identify(properties: UserTraits): void {
    const traits: Record<string, string | number | boolean> = {
      packageTier: properties.packageTier,
    };

    if (properties.gender !== undefined) traits.gender = properties.gender;
    if (properties.ageRange !== undefined) traits.ageRange = properties.ageRange;
    if (properties.intentionTag !== undefined) traits.intentionTag = properties.intentionTag;
    if (properties.isVerified !== undefined) traits.isVerified = properties.isVerified;
    if (properties.profileCompleteness !== undefined) {
      traits.profileCompleteness = properties.profileCompleteness;
    }

    for (const provider of providers) {
      provider.identify(properties.userId, traits);
    }
  },

  /**
   * Track a named event with optional properties.
   * Events are enriched with timing data and batched for performance.
   * In dev mode without Mixpanel, events are logged to console.
   */
  track(event: string, properties?: EventProperties): void {
    const enrichedProperties: EventProperties = {
      ...properties,
      _session_id: sessionId,
      _platform: Platform.OS,
    };

    // Attach timed event duration if available
    const startTime = timedEvents.get(event);
    if (startTime) {
      enrichedProperties.duration_ms = Date.now() - startTime;
      timedEvents.delete(event);
    }

    // Attach session duration
    if (sessionStartTime) {
      enrichedProperties.session_duration_ms = Date.now() - sessionStartTime;
    }

    // Add to batch queue
    eventQueue.push({
      event: event as AnalyticsEventName,
      properties: enrichedProperties,
      timestamp: Date.now(),
    });

    // Flush immediately if queue is full, otherwise schedule
    if (eventQueue.length >= MAX_QUEUE_SIZE) {
      flushEventQueue();
    } else {
      scheduleFlush();
    }
  },

  /**
   * Track a screen view event. Convenience wrapper around track().
   */
  screen(screenName: string): void {
    analyticsService.track(AnalyticsEvent.SCREEN_VIEW, { screen: screenName });
    for (const provider of providers) {
      provider.screen(screenName);
    }
  },

  /**
   * Alias for screen() — backward compatibility.
   */
  trackScreen(screenName: string): void {
    analyticsService.screen(screenName);
  },

  /**
   * Set arbitrary user properties on analytics profiles.
   * Useful for updating properties outside the identify flow.
   */
  setUserProperties(props: Record<string, string | number | boolean>): void {
    for (const provider of providers) {
      provider.setUserProperties(props);
    }
  },

  /**
   * Reset analytics identity on logout. Clears user association and all state.
   */
  reset(): void {
    timedEvents.clear();
    funnelProgress.clear();
    experimentAssignments.clear();
    eventQueue.length = 0;
    sessionStartTime = null;
    sessionId = '';

    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }

    for (const provider of providers) {
      provider.reset();
    }
  },

  /**
   * Start a timer for an event. When the same event is later tracked via
   * track(), the elapsed time is automatically attached as `duration_ms`.
   */
  timeEvent(event: string): void {
    timedEvents.set(event, Date.now());
    if (__DEV__) {
      console.log(`[Analytics] Timer started: ${event}`);
    }
  },

  /**
   * Notify analytics service of connectivity change.
   * When coming back online, flushes the offline queue.
   */
  setOnlineStatus(online: boolean): void {
    const wasOffline = isOffline;
    isOffline = !online;

    if (wasOffline && online) {
      // Came back online — flush any queued events
      loadOfflineQueue().then((offlineEvents) => {
        if (offlineEvents.length > 0) {
          eventQueue.push(...offlineEvents);
        }
        flushEventQueue();
      });
    }
  },

  // ─── Funnel Tracking ────────────────────────────────────────────────────

  /**
   * Track a funnel step. Automatically determines the next expected step
   * based on current funnel progress and fires a typed event.
   */
  trackFunnelStep(
    funnelName: FunnelName,
    stepName: string,
    properties?: EventProperties,
  ): void {
    const funnel = FUNNEL_DEFINITIONS[funnelName];
    if (!funnel) return;

    const currentStep = funnelProgress.get(funnelName) ?? 0;
    const step = funnel.find((s) => s.name === stepName);
    if (!step) return;

    // Only advance forward (no duplicates)
    if (step.order <= currentStep) return;

    funnelProgress.set(funnelName, step.order);

    analyticsService.track(AnalyticsEvent.FUNNEL_STEP, {
      funnel: funnelName,
      step_name: stepName,
      step_order: step.order,
      total_steps: funnel.length,
      ...properties,
    });
  },

  /**
   * Reset progress for a specific funnel (e.g., on retry).
   */
  resetFunnel(funnelName: FunnelName): void {
    funnelProgress.delete(funnelName);
  },

  // ─── A/B Testing ────────────────────────────────────────────────────────

  /**
   * Assign the current user to an experiment variant.
   * Uses deterministic hashing based on userId + experimentId for consistency.
   * Returns the assigned variant ID.
   */
  assignExperiment(
    experimentId: string,
    variants: ExperimentVariant[],
    userId: string,
  ): string {
    // Check if already assigned
    const existing = experimentAssignments.get(experimentId);
    if (existing) return existing.variantId;

    // Deterministic assignment: hash(userId + experimentId) mod 100
    let hash = 0;
    const seed = `${userId}:${experimentId}`;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
    }
    const bucket = Math.abs(hash) % 100;

    // Walk through variants by weight
    let cumulative = 0;
    let assignedVariant = variants[0];
    for (const variant of variants) {
      cumulative += variant.weight;
      if (bucket < cumulative) {
        assignedVariant = variant;
        break;
      }
    }

    const assignment: UserExperimentAssignment = {
      experimentId,
      variantId: assignedVariant.id,
      assignedAt: new Date().toISOString(),
    };

    experimentAssignments.set(experimentId, assignment);

    // Track the exposure event
    analyticsService.track(AnalyticsEvent.EXPERIMENT_EXPOSURE, {
      experiment_id: experimentId,
      variant_id: assignedVariant.id,
      variant_name: assignedVariant.name,
    });

    return assignedVariant.id;
  },

  /**
   * Get the current variant assignment for an experiment.
   * Returns null if the user has not been assigned yet.
   */
  getExperimentVariant(experimentId: string): string | null {
    return experimentAssignments.get(experimentId)?.variantId ?? null;
  },

  // ─── Flush ──────────────────────────────────────────────────────────────

  /**
   * Manually flush all queued events. Call before app background/exit.
   * Forces immediate delivery of all batched events.
   */
  flush(): void {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    flushEventQueue();

    for (const provider of providers) {
      provider.flush();
    }
  },

  /**
   * Get the current session ID for correlation.
   */
  getSessionId(): string {
    return sessionId;
  },
};
