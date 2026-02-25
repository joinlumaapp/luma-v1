// Analytics service — Mixpanel event tracking with graceful dev/offline fallback
// Production: events sent to Mixpanel via mixpanel-react-native SDK.
// Dev mode (no MIXPANEL_TOKEN): events logged to console only.
// Includes funnel tracking, A/B test assignment, session duration tracking, and batch queue.

import { Mixpanel } from 'mixpanel-react-native';
import { APP_CONFIG } from '../constants/config';

// ─── Types ───────────────────────────────────────────────────────────────────

type EventProperties = Record<string, string | number | boolean | null>;

interface UserProperties {
  userId: string;
  packageTier: string;
  gender?: string;
  ageRange?: string;
  intentionTag?: string;
  isVerified?: boolean;
  profileCompleteness?: number;
}

// ─── Event Name Constants ────────────────────────────────────────────────────

export const ANALYTICS_EVENTS = {
  // Auth
  AUTH_OTP_REQUESTED: 'auth_otp_requested',
  AUTH_OTP_VERIFIED: 'auth_otp_verified',
  AUTH_SELFIE_COMPLETED: 'auth_selfie_completed',
  AUTH_LOGOUT: 'auth_logout',

  // Onboarding
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  ONBOARDING_COMPLETED: 'onboarding_completed',

  // Discovery
  DISCOVERY_CARD_VIEWED: 'discovery_card_viewed',
  DISCOVERY_SWIPE_RIGHT: 'discovery_swipe_right',
  DISCOVERY_SWIPE_LEFT: 'discovery_swipe_left',
  DISCOVERY_SUPER_LIKE: 'discovery_super_like',
  DISCOVERY_UNDO: 'discovery_undo',
  DISCOVERY_DAILY_LIMIT_HIT: 'discovery_daily_limit_hit',
  DISCOVERY_FILTER_CHANGED: 'discovery_filter_changed',

  // Matches
  MATCH_CREATED: 'match_created',
  MATCH_DETAIL_VIEWED: 'match_detail_viewed',
  MATCH_UNMATCHED: 'match_unmatched',

  // Chat
  CHAT_MESSAGE_SENT: 'chat_message_sent',
  CHAT_IMAGE_SENT: 'chat_image_sent',
  CHAT_ICEBREAKER_STARTED: 'chat_icebreaker_started',

  // Harmony
  HARMONY_SESSION_STARTED: 'harmony_session_started',
  HARMONY_SESSION_EXTENDED: 'harmony_session_extended',
  HARMONY_SESSION_ENDED: 'harmony_session_ended',
  HARMONY_CARD_REVEALED: 'harmony_card_revealed',
  HARMONY_REACTION_SENT: 'harmony_reaction_sent',
  HARMONY_MESSAGE_SENT: 'harmony_message_sent',

  // Profile
  PROFILE_PHOTO_UPLOADED: 'profile_photo_uploaded',
  PROFILE_EDITED: 'profile_edited',
  PROFILE_VOICE_INTRO_RECORDED: 'profile_voice_intro_recorded',

  // Compatibility
  COMPATIBILITY_QUESTION_ANSWERED: 'compatibility_question_answered',
  COMPATIBILITY_INSIGHT_VIEWED: 'compatibility_insight_viewed',
  DAILY_QUESTION_ANSWERED: 'daily_question_answered',

  // Payments
  PAYMENT_SCREEN_VIEWED: 'payment_screen_viewed',
  PAYMENT_PACKAGE_SELECTED: 'payment_package_selected',
  PAYMENT_COMPLETED: 'payment_completed',
  PAYMENT_FAILED: 'payment_failed',

  // Engagement
  APP_OPENED: 'app_opened',
  APP_BACKGROUNDED: 'app_backgrounded',
  BADGE_EARNED: 'badge_earned',
  NOTIFICATION_TAPPED: 'notification_tapped',

  // Relationship
  RELATIONSHIP_MODE_ACTIVATED: 'relationship_mode_activated',
  COUPLES_CLUB_JOINED: 'couples_club_joined',

  // Moderation
  REPORT_SUBMITTED: 'report_submitted',
  USER_BLOCKED: 'user_blocked',

  // Screen views
  SCREEN_VIEW: 'screen_view',

  // Funnel
  FUNNEL_STEP: 'funnel_step',

  // A/B Test
  EXPERIMENT_EXPOSURE: 'experiment_exposure',
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

// ─── Funnel Definitions (self-contained -- no shared package build dependency) ─

type FunnelName =
  | 'registration'
  | 'onboarding'
  | 'first_match'
  | 'first_harmony'
  | 'conversion';

interface FunnelStep {
  name: string;
  event: string;
  order: number;
}

const FUNNEL_DEFINITIONS: Record<FunnelName, FunnelStep[]> = {
  registration: [
    { name: 'Phone Entry', event: 'auth_otp_requested', order: 1 },
    { name: 'OTP Verified', event: 'auth_otp_verified', order: 2 },
    { name: 'Selfie Done', event: 'auth_selfie_completed', order: 3 },
  ],
  onboarding: [
    { name: 'Name', event: 'onboarding_step_completed', order: 1 },
    { name: 'Birth Date', event: 'onboarding_step_completed', order: 2 },
    { name: 'Gender', event: 'onboarding_step_completed', order: 3 },
    { name: 'Intention', event: 'onboarding_step_completed', order: 4 },
    { name: 'Photos', event: 'onboarding_step_completed', order: 5 },
    { name: 'Bio', event: 'onboarding_step_completed', order: 6 },
    { name: 'Questions', event: 'onboarding_completed', order: 7 },
  ],
  first_match: [
    { name: 'Discovery Viewed', event: 'discovery_card_viewed', order: 1 },
    { name: 'First Swipe Right', event: 'discovery_swipe_right', order: 2 },
    { name: 'Match Created', event: 'match_created', order: 3 },
  ],
  first_harmony: [
    { name: 'Match Created', event: 'match_created', order: 1 },
    { name: 'Harmony Started', event: 'harmony_session_started', order: 2 },
    { name: 'Harmony Completed', event: 'harmony_session_ended', order: 3 },
  ],
  conversion: [
    { name: 'Payment Screen Viewed', event: 'payment_screen_viewed', order: 1 },
    { name: 'Package Selected', event: 'payment_package_selected', order: 2 },
    { name: 'Payment Completed', event: 'payment_completed', order: 3 },
  ],
};

// ─── A/B Test Types (self-contained) ─────────────────────────────────────────

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

// ─── Mixpanel Instance ──────────────────────────────────────────────────────

let mixpanelInstance: Mixpanel | null = null;

function isMixpanelEnabled(): boolean {
  return mixpanelInstance !== null;
}

// ─── Timed Event Tracking ────────────────────────────────────────────────────

const timedEvents = new Map<string, number>();

// ─── Session Duration Tracking ───────────────────────────────────────────────

let sessionStartTime: number | null = null;

// ─── Funnel State ────────────────────────────────────────────────────────────

const funnelProgress = new Map<FunnelName, number>();

// ─── A/B Test Assignments ────────────────────────────────────────────────────

const experimentAssignments = new Map<string, UserExperimentAssignment>();

// ─── Event Queue (batching for offline support and performance) ──────────────

interface QueuedEvent {
  event: string;
  properties: EventProperties;
  timestamp: number;
}

const eventQueue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL_MS = 5000;
const MAX_QUEUE_SIZE = 20;

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

  if (__DEV__) {
    console.log(`[Analytics] Flushing ${batch.length} events`);
  }

  if (isMixpanelEnabled()) {
    for (const entry of batch) {
      mixpanelInstance!.track(entry.event, entry.properties);
    }
  }
}

// ─── Analytics Service ───────────────────────────────────────────────────────

export const analyticsService = {
  /**
   * Initialize analytics provider. Call once at app startup.
   * When MIXPANEL_TOKEN is set, initializes the Mixpanel SDK.
   * Without a token, falls back to console logging in dev mode.
   */
  initialize: async (): Promise<void> => {
    sessionStartTime = Date.now();

    const token = APP_CONFIG.MIXPANEL_TOKEN;
    if (token && token.length > 0) {
      try {
        const mp = new Mixpanel(token, true); // trackAutomaticEvents = true
        await mp.init();
        mixpanelInstance = mp;

        if (__DEV__) {
          console.log('[Analytics] Mixpanel initialized successfully');
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[Analytics] Mixpanel init failed, falling back to dev mode: ${message}`);
        mixpanelInstance = null;
      }
    } else if (__DEV__) {
      console.log('[Analytics] Initialized (dev mode -- events logged to console, no MIXPANEL_TOKEN)');
    }
  },

  /**
   * Identify the current user. Call after login or when user properties change.
   * Sets user-level properties for segmentation and cohort analysis.
   * Never sends PII (phone, email, real name) -- only opaque IDs and feature data.
   */
  identify: (properties: UserProperties): void => {
    if (__DEV__) {
      console.log('[Analytics] Identify:', properties.userId, properties);
    }

    if (isMixpanelEnabled()) {
      mixpanelInstance!.identify(properties.userId);

      // Build a clean properties object, excluding undefined values
      const profileProps: Record<string, string | number | boolean> = {
        packageTier: properties.packageTier,
      };

      if (properties.gender !== undefined) {
        profileProps.gender = properties.gender;
      }
      if (properties.ageRange !== undefined) {
        profileProps.ageRange = properties.ageRange;
      }
      if (properties.intentionTag !== undefined) {
        profileProps.intentionTag = properties.intentionTag;
      }
      if (properties.isVerified !== undefined) {
        profileProps.isVerified = properties.isVerified;
      }
      if (properties.profileCompleteness !== undefined) {
        profileProps.profileCompleteness = properties.profileCompleteness;
      }

      mixpanelInstance!.getPeople().set(profileProps);
    }
  },

  /**
   * Set arbitrary user properties on the Mixpanel People profile.
   * Useful for updating properties outside the identify flow.
   */
  setUserProperties: (props: Record<string, string | number | boolean>): void => {
    if (__DEV__) {
      console.log('[Analytics] Set user properties:', props);
    }

    if (isMixpanelEnabled()) {
      mixpanelInstance!.getPeople().set(props);
    }
  },

  /**
   * Track a named event with optional properties.
   * Events are enriched with timing data and batched for performance.
   * In dev mode without Mixpanel, events are logged to console.
   */
  track: (event: string, properties?: EventProperties): void => {
    const enrichedProperties: EventProperties = { ...properties };

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

    if (__DEV__) {
      console.log(`[Analytics] ${event}`, enrichedProperties);
    }

    // If Mixpanel is live and we are not batching, send directly
    // Otherwise add to the batch queue for offline/deferred delivery
    eventQueue.push({
      event,
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
  trackScreen: (screenName: string): void => {
    analyticsService.track(ANALYTICS_EVENTS.SCREEN_VIEW, { screen: screenName });
  },

  /**
   * Reset analytics identity on logout. Clears user association and all state.
   */
  reset: (): void => {
    timedEvents.clear();
    funnelProgress.clear();
    experimentAssignments.clear();
    eventQueue.length = 0;
    sessionStartTime = null;
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    if (__DEV__) {
      console.log('[Analytics] Reset');
    }

    if (isMixpanelEnabled()) {
      mixpanelInstance!.reset();
    }
  },

  /**
   * Start a timer for an event. When the same event is later tracked via
   * track(), the elapsed time is automatically attached as `duration_ms`.
   */
  timeEvent: (event: string): void => {
    timedEvents.set(event, Date.now());
    if (__DEV__) {
      console.log(`[Analytics] Timer started: ${event}`);
    }
  },

  // ─── Funnel Tracking ────────────────────────────────────────────────────

  /**
   * Track a funnel step. Automatically determines the next expected step
   * based on current funnel progress and fires a typed event.
   */
  trackFunnelStep: (
    funnelName: FunnelName,
    stepName: string,
    properties?: EventProperties,
  ): void => {
    const funnel = FUNNEL_DEFINITIONS[funnelName];
    if (!funnel) return;

    const currentStep = funnelProgress.get(funnelName) ?? 0;
    const step = funnel.find((s) => s.name === stepName);
    if (!step) return;

    // Only advance forward (no duplicates)
    if (step.order <= currentStep) return;

    funnelProgress.set(funnelName, step.order);

    analyticsService.track(ANALYTICS_EVENTS.FUNNEL_STEP, {
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
  resetFunnel: (funnelName: FunnelName): void => {
    funnelProgress.delete(funnelName);
  },

  // ─── A/B Testing ────────────────────────────────────────────────────────

  /**
   * Assign the current user to an experiment variant.
   * Uses deterministic hashing based on userId + experimentId for consistency.
   * Returns the assigned variant ID.
   */
  assignExperiment: (
    experimentId: string,
    variants: ExperimentVariant[],
    userId: string,
  ): string => {
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
    analyticsService.track(ANALYTICS_EVENTS.EXPERIMENT_EXPOSURE, {
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
  getExperimentVariant: (experimentId: string): string | null => {
    return experimentAssignments.get(experimentId)?.variantId ?? null;
  },

  // ─── Flush ──────────────────────────────────────────────────────────────

  /**
   * Manually flush all queued events. Call before app background/exit.
   * Forces immediate delivery of all batched events to Mixpanel.
   */
  flush: (): void => {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    flushEventQueue();

    // Also flush the Mixpanel SDK internal queue
    if (isMixpanelEnabled()) {
      mixpanelInstance!.flush();
    }
  },
};
