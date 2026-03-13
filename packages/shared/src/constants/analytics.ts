// LUMA V1 — Shared Analytics Constants (Subsystem 19)
// Shared between mobile and backend for consistent event tracking.
// All event names use snake_case. Never track PII (phone, email, real name).

// ─── Event Categories ────────────────────────────────────────────────────────

export const AnalyticsEventCategory = {
  AUTH: 'auth',
  DISCOVERY: 'discovery',
  MATCH: 'match',
  CHAT: 'chat',
  PROFILE: 'profile',
  COMPATIBILITY: 'compatibility',
  PAYMENT: 'payment',
  ENGAGEMENT: 'engagement',
  RELATIONSHIP: 'relationship',
  MODERATION: 'moderation',
  HARMONY: 'harmony',
  FUNNEL: 'funnel',
  EXPERIMENT: 'experiment',
  PERFORMANCE: 'performance',
} as const;

export type AnalyticsEventCategory =
  (typeof AnalyticsEventCategory)[keyof typeof AnalyticsEventCategory];

// ─── Event Names ─────────────────────────────────────────────────────────────

export const AnalyticsEvent = {
  // Auth
  SIGNUP_STARTED: 'signup_started',
  SIGNUP_COMPLETED: 'signup_completed',
  LOGIN: 'login',
  LOGOUT: 'logout',
  OTP_REQUESTED: 'auth_otp_requested',
  OTP_VERIFIED: 'auth_otp_verified',
  SELFIE_COMPLETED: 'auth_selfie_completed',

  // Onboarding
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  ONBOARDING_COMPLETED: 'onboarding_completed',

  // Discovery
  CARD_VIEWED: 'discovery_card_viewed',
  CARD_LIKED: 'discovery_swipe_right',
  CARD_PASSED: 'discovery_swipe_left',
  CARD_SUPERLIKED: 'discovery_super_like',
  DISCOVERY_UNDO: 'discovery_undo',
  DAILY_PICKS_VIEWED: 'discovery_daily_picks_viewed',
  DAILY_LIMIT_HIT: 'discovery_daily_limit_hit',
  FILTER_CHANGED: 'discovery_filter_changed',
  SUPREME_IMPRESSION: 'supreme_impression',

  // Match
  MATCH_CREATED: 'match_created',
  MATCH_VIEWED: 'match_detail_viewed',
  UNMATCH: 'match_unmatched',

  // Chat
  MESSAGE_SENT: 'chat_message_sent',
  MESSAGE_READ: 'chat_message_read',
  CONVERSATION_OPENED: 'chat_conversation_opened',
  IMAGE_SENT: 'chat_image_sent',
  GIF_SENT: 'chat_gif_sent',
  ICEBREAKER_STARTED: 'chat_icebreaker_started',

  // Profile
  PROFILE_VIEWED: 'profile_viewed',
  PROFILE_EDITED: 'profile_edited',
  PHOTO_UPLOADED: 'profile_photo_uploaded',
  VOICE_INTRO_RECORDED: 'profile_voice_intro_recorded',

  // Compatibility
  QUESTION_ANSWERED: 'compatibility_question_answered',
  INSIGHT_VIEWED: 'compatibility_insight_viewed',
  DAILY_QUESTION_ANSWERED: 'daily_question_answered',

  // Payment
  PACKAGE_VIEWED: 'payment_screen_viewed',
  PURCHASE_STARTED: 'payment_package_selected',
  PURCHASE_COMPLETED: 'payment_completed',
  PURCHASE_FAILED: 'payment_failed',
  JETON_SPENT: 'jeton_spent',

  // Engagement
  APP_OPENED: 'app_opened',
  APP_BACKGROUNDED: 'app_backgrounded',
  SESSION_DURATION: 'session_duration',
  NOTIFICATION_TAPPED: 'notification_tapped',
  BADGE_EARNED: 'badge_earned',
  SCREEN_VIEW: 'screen_view',

  // Relationship
  RELATIONSHIP_MODE_ACTIVATED: 'relationship_mode_activated',
  COUPLES_CLUB_JOINED: 'couples_club_joined',

  // Harmony
  HARMONY_SESSION_STARTED: 'harmony_session_started',
  HARMONY_SESSION_ENDED: 'harmony_session_ended',
  HARMONY_SESSION_EXTENDED: 'harmony_session_extended',
  HARMONY_CARD_REVEALED: 'harmony_card_revealed',
  HARMONY_VOICE_STARTED: 'harmony_voice_started',
  HARMONY_VIDEO_STARTED: 'harmony_video_started',

  // Moderation
  REPORT_SUBMITTED: 'report_submitted',
  USER_BLOCKED: 'user_blocked',

  // Funnel
  FUNNEL_STEP: 'funnel_step',

  // Experiment
  EXPERIMENT_EXPOSURE: 'experiment_exposure',

  // Performance (client-side)
  SLOW_API_CALL: 'perf_slow_api_call',
  SLOW_SCREEN_RENDER: 'perf_slow_screen_render',
  SLOW_IMAGE_LOAD: 'perf_slow_image_load',
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

// ─── Event Property Types ────────────────────────────────────────────────────

export type EventPropertyValue = string | number | boolean | null;
export type EventProperties = Record<string, EventPropertyValue>;

// ─── Funnel Definitions ──────────────────────────────────────────────────────

export const FunnelName = {
  REGISTRATION: 'registration',
  ONBOARDING: 'onboarding',
  FIRST_MATCH: 'first_match',
  FIRST_MESSAGE: 'first_message',
  CONVERSION: 'conversion',
} as const;

export type FunnelName = (typeof FunnelName)[keyof typeof FunnelName];

export interface FunnelStepDefinition {
  name: string;
  event: AnalyticsEventName;
  order: number;
}

export const FUNNEL_DEFINITIONS: Record<FunnelName, FunnelStepDefinition[]> = {
  [FunnelName.REGISTRATION]: [
    { name: 'Phone Entry', event: AnalyticsEvent.OTP_REQUESTED, order: 1 },
    { name: 'OTP Verified', event: AnalyticsEvent.OTP_VERIFIED, order: 2 },
    { name: 'Selfie Done', event: AnalyticsEvent.SELFIE_COMPLETED, order: 3 },
  ],
  [FunnelName.ONBOARDING]: [
    { name: 'Name', event: AnalyticsEvent.ONBOARDING_STEP_COMPLETED, order: 1 },
    { name: 'Birth Date', event: AnalyticsEvent.ONBOARDING_STEP_COMPLETED, order: 2 },
    { name: 'Gender', event: AnalyticsEvent.ONBOARDING_STEP_COMPLETED, order: 3 },
    { name: 'Intention', event: AnalyticsEvent.ONBOARDING_STEP_COMPLETED, order: 4 },
    { name: 'Photos', event: AnalyticsEvent.ONBOARDING_STEP_COMPLETED, order: 5 },
    { name: 'Bio', event: AnalyticsEvent.ONBOARDING_STEP_COMPLETED, order: 6 },
    { name: 'Questions', event: AnalyticsEvent.ONBOARDING_COMPLETED, order: 7 },
  ],
  [FunnelName.FIRST_MATCH]: [
    { name: 'Discovery Viewed', event: AnalyticsEvent.CARD_VIEWED, order: 1 },
    { name: 'First Swipe Right', event: AnalyticsEvent.CARD_LIKED, order: 2 },
    { name: 'Match Created', event: AnalyticsEvent.MATCH_CREATED, order: 3 },
  ],
  [FunnelName.FIRST_MESSAGE]: [
    { name: 'Match Created', event: AnalyticsEvent.MATCH_CREATED, order: 1 },
    { name: 'Conversation Opened', event: AnalyticsEvent.CONVERSATION_OPENED, order: 2 },
    { name: 'First Message', event: AnalyticsEvent.MESSAGE_SENT, order: 3 },
  ],
  [FunnelName.CONVERSION]: [
    { name: 'Payment Screen Viewed', event: AnalyticsEvent.PACKAGE_VIEWED, order: 1 },
    { name: 'Package Selected', event: AnalyticsEvent.PURCHASE_STARTED, order: 2 },
    { name: 'Payment Completed', event: AnalyticsEvent.PURCHASE_COMPLETED, order: 3 },
  ],
};

// ─── Dashboard Metric Keys ───────────────────────────────────────────────────

export const DashboardMetric = {
  DAU: 'dau',
  WAU: 'wau',
  MAU: 'mau',
  NEW_REGISTRATIONS: 'new_registrations',
  VERIFICATION_RATE: 'verification_rate',
  MATCH_RATE: 'match_rate',
  AVG_COMPATIBILITY_SCORE: 'avg_compatibility_score',
  TIME_TO_FIRST_MATCH: 'time_to_first_match',
  FREE_TO_PAID_RATE: 'free_to_paid_rate',
  ARPU: 'arpu',
  SUBSCRIPTION_CHURN: 'subscription_churn',
  DAY1_RETENTION: 'day1_retention',
  DAY7_RETENTION: 'day7_retention',
  DAY30_RETENTION: 'day30_retention',
  AVG_SESSION_DURATION: 'avg_session_duration',
  SWIPES_PER_SESSION: 'swipes_per_session',
  HARMONY_SESSIONS_PER_USER: 'harmony_sessions_per_user',
  MATCH_TO_HARMONY_RATE: 'match_to_harmony_rate',
  JETON_PURCHASE_FREQUENCY: 'jeton_purchase_frequency',
  PACKAGE_TIER_DISTRIBUTION: 'package_tier_distribution',
} as const;

export type DashboardMetric =
  (typeof DashboardMetric)[keyof typeof DashboardMetric];

// ─── Batch Event Payload (client → server) ───────────────────────────────────

export interface AnalyticsEventPayload {
  event: AnalyticsEventName;
  properties: EventProperties;
  timestamp: number;
}

export interface AnalyticsBatchPayload {
  events: AnalyticsEventPayload[];
  sessionId: string;
  platform: 'ios' | 'android';
  appVersion: string;
}

// ─── Dashboard Response ──────────────────────────────────────────────────────

export interface DashboardStatsResponse {
  period: 'day' | 'week' | 'month';
  generatedAt: string;
  metrics: {
    dau: number;
    wau: number;
    mau: number;
    newRegistrations: number;
    verificationRate: number;
    matchRate: number;
    avgCompatibilityScore: number;
    freeToPayRate: number;
    arpu: number;
    subscriptionChurn: number;
    day1Retention: number;
    day7Retention: number;
    day30Retention: number;
    avgSessionDurationMs: number;
    swipesPerSession: number;
    harmonySessionsPerUser: number;
  };
  packageDistribution: {
    free: number;
    gold: number;
    pro: number;
    reserved: number;
  };
}

// ─── Retention Cohort Response ───────────────────────────────────────────────

export interface RetentionCohort {
  cohortDate: string;
  cohortSize: number;
  day1: number;
  day7: number;
  day14: number;
  day30: number;
}

// ─── User Funnel Response ────────────────────────────────────────────────────

export interface UserFunnelResponse {
  funnelName: FunnelName;
  steps: Array<{
    name: string;
    order: number;
    completedAt: string | null;
  }>;
  completionRate: number;
}
