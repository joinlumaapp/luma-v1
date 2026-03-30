// Shared analytics types for LUMA — Subsystem 19
// Used by both mobile (event tracking) and backend (aggregation/reporting)

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

// Funnel types are in constants/analytics.ts

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

// RetentionCohort is in constants/analytics.ts

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
  freeToPayConversion: number;
  arpu: number;
  churnRate: number;
}
