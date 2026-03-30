export declare const AnalyticsEventCategory: {
    readonly AUTH: "auth";
    readonly DISCOVERY: "discovery";
    readonly MATCH: "match";
    readonly CHAT: "chat";
    readonly PROFILE: "profile";
    readonly COMPATIBILITY: "compatibility";
    readonly PAYMENT: "payment";
    readonly ENGAGEMENT: "engagement";
    readonly RELATIONSHIP: "relationship";
    readonly MODERATION: "moderation";
    readonly FUNNEL: "funnel";
    readonly EXPERIMENT: "experiment";
    readonly PERFORMANCE: "performance";
};
export type AnalyticsEventCategory = (typeof AnalyticsEventCategory)[keyof typeof AnalyticsEventCategory];
export declare const AnalyticsEvent: {
    readonly SIGNUP_STARTED: "signup_started";
    readonly SIGNUP_COMPLETED: "signup_completed";
    readonly LOGIN: "login";
    readonly LOGOUT: "logout";
    readonly OTP_REQUESTED: "auth_otp_requested";
    readonly OTP_VERIFIED: "auth_otp_verified";
    readonly SELFIE_COMPLETED: "auth_selfie_completed";
    readonly ONBOARDING_STEP_COMPLETED: "onboarding_step_completed";
    readonly ONBOARDING_COMPLETED: "onboarding_completed";
    readonly CARD_VIEWED: "discovery_card_viewed";
    readonly CARD_LIKED: "discovery_swipe_right";
    readonly CARD_PASSED: "discovery_swipe_left";
    readonly CARD_SUPERLIKED: "discovery_super_like";
    readonly DISCOVERY_UNDO: "discovery_undo";
    readonly DAILY_PICKS_VIEWED: "discovery_daily_picks_viewed";
    readonly DAILY_LIMIT_HIT: "discovery_daily_limit_hit";
    readonly FILTER_CHANGED: "discovery_filter_changed";
    readonly SUPREME_IMPRESSION: "supreme_impression";
    readonly MATCH_CREATED: "match_created";
    readonly MATCH_VIEWED: "match_detail_viewed";
    readonly UNMATCH: "match_unmatched";
    readonly MESSAGE_SENT: "chat_message_sent";
    readonly MESSAGE_READ: "chat_message_read";
    readonly CONVERSATION_OPENED: "chat_conversation_opened";
    readonly IMAGE_SENT: "chat_image_sent";
    readonly GIF_SENT: "chat_gif_sent";
    readonly ICEBREAKER_STARTED: "chat_icebreaker_started";
    readonly PROFILE_VIEWED: "profile_viewed";
    readonly PROFILE_EDITED: "profile_edited";
    readonly PHOTO_UPLOADED: "profile_photo_uploaded";
    readonly VOICE_INTRO_RECORDED: "profile_voice_intro_recorded";
    readonly QUESTION_ANSWERED: "compatibility_question_answered";
    readonly INSIGHT_VIEWED: "compatibility_insight_viewed";
    readonly DAILY_QUESTION_ANSWERED: "daily_question_answered";
    readonly PACKAGE_VIEWED: "payment_screen_viewed";
    readonly PURCHASE_STARTED: "payment_package_selected";
    readonly PURCHASE_COMPLETED: "payment_completed";
    readonly PURCHASE_FAILED: "payment_failed";
    readonly GOLD_SPENT: "gold_spent";
    readonly APP_OPENED: "app_opened";
    readonly APP_BACKGROUNDED: "app_backgrounded";
    readonly SESSION_DURATION: "session_duration";
    readonly NOTIFICATION_TAPPED: "notification_tapped";
    readonly BADGE_EARNED: "badge_earned";
    readonly SCREEN_VIEW: "screen_view";
    readonly RELATIONSHIP_MODE_ACTIVATED: "relationship_mode_activated";
    readonly COUPLES_CLUB_JOINED: "couples_club_joined";
    readonly REPORT_SUBMITTED: "report_submitted";
    readonly USER_BLOCKED: "user_blocked";
    readonly FUNNEL_STEP: "funnel_step";
    readonly EXPERIMENT_EXPOSURE: "experiment_exposure";
    readonly SLOW_API_CALL: "perf_slow_api_call";
    readonly SLOW_SCREEN_RENDER: "perf_slow_screen_render";
    readonly SLOW_IMAGE_LOAD: "perf_slow_image_load";
};
export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];
export type EventPropertyValue = string | number | boolean | null;
export type EventProperties = Record<string, EventPropertyValue>;
export declare const FunnelName: {
    readonly REGISTRATION: "registration";
    readonly ONBOARDING: "onboarding";
    readonly FIRST_MATCH: "first_match";
    readonly FIRST_MESSAGE: "first_message";
    readonly CONVERSION: "conversion";
};
export type FunnelName = (typeof FunnelName)[keyof typeof FunnelName];
export interface FunnelStepDefinition {
    name: string;
    event: AnalyticsEventName;
    order: number;
}
export declare const FUNNEL_DEFINITIONS: Record<FunnelName, FunnelStepDefinition[]>;
export declare const DashboardMetric: {
    readonly DAU: "dau";
    readonly WAU: "wau";
    readonly MAU: "mau";
    readonly NEW_REGISTRATIONS: "new_registrations";
    readonly VERIFICATION_RATE: "verification_rate";
    readonly MATCH_RATE: "match_rate";
    readonly AVG_COMPATIBILITY_SCORE: "avg_compatibility_score";
    readonly TIME_TO_FIRST_MATCH: "time_to_first_match";
    readonly FREE_TO_PAID_RATE: "free_to_paid_rate";
    readonly ARPU: "arpu";
    readonly SUBSCRIPTION_CHURN: "subscription_churn";
    readonly DAY1_RETENTION: "day1_retention";
    readonly DAY7_RETENTION: "day7_retention";
    readonly DAY30_RETENTION: "day30_retention";
    readonly AVG_SESSION_DURATION: "avg_session_duration";
    readonly SWIPES_PER_SESSION: "swipes_per_session";
    readonly GOLD_PURCHASE_FREQUENCY: "gold_purchase_frequency";
    readonly PACKAGE_TIER_DISTRIBUTION: "package_tier_distribution";
};
export type DashboardMetric = (typeof DashboardMetric)[keyof typeof DashboardMetric];
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
    };
    packageDistribution: {
        free: number;
        gold: number;
        pro: number;
        reserved: number;
    };
}
export interface RetentionCohort {
    cohortDate: string;
    cohortSize: number;
    day1: number;
    day7: number;
    day14: number;
    day30: number;
}
export interface UserFunnelResponse {
    funnelName: FunnelName;
    steps: Array<{
        name: string;
        order: number;
        completedAt: string | null;
    }>;
    completionRate: number;
}
//# sourceMappingURL=analytics.d.ts.map