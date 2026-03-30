"use strict";
// LUMA V1 — Shared Analytics Constants (Subsystem 19)
// Shared between mobile and backend for consistent event tracking.
// All event names use snake_case. Never track PII (phone, email, real name).
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardMetric = exports.FUNNEL_DEFINITIONS = exports.FunnelName = exports.AnalyticsEvent = exports.AnalyticsEventCategory = void 0;
// ─── Event Categories ────────────────────────────────────────────────────────
exports.AnalyticsEventCategory = {
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
    FUNNEL: 'funnel',
    EXPERIMENT: 'experiment',
    PERFORMANCE: 'performance',
};
// ─── Event Names ─────────────────────────────────────────────────────────────
exports.AnalyticsEvent = {
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
    GOLD_SPENT: 'gold_spent',
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
};
// ─── Funnel Definitions ──────────────────────────────────────────────────────
exports.FunnelName = {
    REGISTRATION: 'registration',
    ONBOARDING: 'onboarding',
    FIRST_MATCH: 'first_match',
    FIRST_MESSAGE: 'first_message',
    CONVERSION: 'conversion',
};
exports.FUNNEL_DEFINITIONS = {
    [exports.FunnelName.REGISTRATION]: [
        { name: 'Phone Entry', event: exports.AnalyticsEvent.OTP_REQUESTED, order: 1 },
        { name: 'OTP Verified', event: exports.AnalyticsEvent.OTP_VERIFIED, order: 2 },
        { name: 'Selfie Done', event: exports.AnalyticsEvent.SELFIE_COMPLETED, order: 3 },
    ],
    [exports.FunnelName.ONBOARDING]: [
        { name: 'Name', event: exports.AnalyticsEvent.ONBOARDING_STEP_COMPLETED, order: 1 },
        { name: 'Birth Date', event: exports.AnalyticsEvent.ONBOARDING_STEP_COMPLETED, order: 2 },
        { name: 'Gender', event: exports.AnalyticsEvent.ONBOARDING_STEP_COMPLETED, order: 3 },
        { name: 'Intention', event: exports.AnalyticsEvent.ONBOARDING_STEP_COMPLETED, order: 4 },
        { name: 'Photos', event: exports.AnalyticsEvent.ONBOARDING_STEP_COMPLETED, order: 5 },
        { name: 'Bio', event: exports.AnalyticsEvent.ONBOARDING_STEP_COMPLETED, order: 6 },
        { name: 'Questions', event: exports.AnalyticsEvent.ONBOARDING_COMPLETED, order: 7 },
    ],
    [exports.FunnelName.FIRST_MATCH]: [
        { name: 'Discovery Viewed', event: exports.AnalyticsEvent.CARD_VIEWED, order: 1 },
        { name: 'First Swipe Right', event: exports.AnalyticsEvent.CARD_LIKED, order: 2 },
        { name: 'Match Created', event: exports.AnalyticsEvent.MATCH_CREATED, order: 3 },
    ],
    [exports.FunnelName.FIRST_MESSAGE]: [
        { name: 'Match Created', event: exports.AnalyticsEvent.MATCH_CREATED, order: 1 },
        { name: 'Conversation Opened', event: exports.AnalyticsEvent.CONVERSATION_OPENED, order: 2 },
        { name: 'First Message', event: exports.AnalyticsEvent.MESSAGE_SENT, order: 3 },
    ],
    [exports.FunnelName.CONVERSION]: [
        { name: 'Payment Screen Viewed', event: exports.AnalyticsEvent.PACKAGE_VIEWED, order: 1 },
        { name: 'Package Selected', event: exports.AnalyticsEvent.PURCHASE_STARTED, order: 2 },
        { name: 'Payment Completed', event: exports.AnalyticsEvent.PURCHASE_COMPLETED, order: 3 },
    ],
};
// ─── Dashboard Metric Keys ───────────────────────────────────────────────────
exports.DashboardMetric = {
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
    GOLD_PURCHASE_FREQUENCY: 'gold_purchase_frequency',
    PACKAGE_TIER_DISTRIBUTION: 'package_tier_distribution',
};
//# sourceMappingURL=analytics.js.map