// Shared analytics types for LUMA — Subsystem 19
// Used by both mobile (event tracking) and backend (aggregation/reporting)

// ─── Event Categories ────────────────────────────────────────────────────────

export type AnalyticsEventCategory =
  | 'auth'
  | 'onboarding'
  | 'discovery'
  | 'match'
  | 'chat'
  | 'harmony'
  | 'profile'
  | 'payment'
  | 'engagement'
  | 'navigation'
  | 'compatibility'
  | 'relationship'
  | 'moderation';

// ─── Typed Event Payloads ────────────────────────────────────────────────────

export interface AuthOtpRequestedPayload {
  countryCode: string;
}

export interface AuthOtpVerifiedPayload {
  isNewUser: boolean;
}

export interface OnboardingStepPayload {
  step: number;
  stepName: string;
  totalSteps: number;
}

export interface DiscoverySwipePayload {
  cardId: string;
  compatibilityScore?: number;
}

export interface MatchCreatedPayload {
  matchId: string;
  profileId: string;
  compatibilityScore?: number;
}

export interface ChatMessagePayload {
  matchId: string;
  messageType?: 'text' | 'image';
}

export interface HarmonySessionPayload {
  sessionId: string;
  matchId?: string;
}

export interface HarmonySessionEndedPayload {
  sessionId: string;
  durationMinutes: number;
  cardsRevealed: number;
  messagesExchanged: number;
}

export interface PaymentPayload {
  packageTier?: string;
  amount?: number;
  currency?: string;
}

export interface ScreenViewPayload {
  screen: string;
  previousScreen?: string;
}

export interface ProfileEditPayload {
  field: string;
}

export interface CompatibilityPayload {
  questionId?: number;
  answerId?: number;
}

// ─── Funnel Definitions ──────────────────────────────────────────────────────

export type FunnelName =
  | 'registration'
  | 'onboarding'
  | 'first_match'
  | 'first_harmony'
  | 'conversion';

export interface FunnelStep {
  name: string;
  event: string;
  order: number;
}

export const FUNNEL_DEFINITIONS: Record<FunnelName, FunnelStep[]> = {
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

// ─── A/B Test Types ──────────────────────────────────────────────────────────

export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed';

export interface ExperimentVariant {
  id: string;
  name: string;
  weight: number; // 0-100, must sum to 100 across variants
}

export interface Experiment {
  id: string;
  name: string;
  description: string;
  status: ExperimentStatus;
  variants: ExperimentVariant[];
  targetMetric: string;
  startDate?: string;
  endDate?: string;
}

export interface UserExperimentAssignment {
  experimentId: string;
  variantId: string;
  assignedAt: string;
}

// ─── Retention Metrics ───────────────────────────────────────────────────────

export type RetentionPeriod = 'd1' | 'd7' | 'd14' | 'd30';

export interface RetentionCohort {
  cohortDate: string;
  totalUsers: number;
  retained: Record<RetentionPeriod, number>;
}

// ─── KPI Summary ─────────────────────────────────────────────────────────────

export interface KpiSummary {
  period: 'daily' | 'weekly' | 'monthly';
  date: string;
  dau: number;
  wau: number;
  mau: number;
  newRegistrations: number;
  verificationRate: number;
  matchRate: number;
  avgCompatibilityScore: number;
  avgSessionDuration: number;
  harmonySessions: number;
  freeToPayConversion: number;
  arpu: number;
  churnRate: number;
}
