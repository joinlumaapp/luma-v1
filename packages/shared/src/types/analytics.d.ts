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
export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed';
export interface ExperimentVariant {
    id: string;
    name: string;
    weight: number;
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
export type RetentionPeriod = 'd1' | 'd7' | 'd14' | 'd30';
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
//# sourceMappingURL=analytics.d.ts.map