/**
 * Report reasons — 7 categories for user reporting.
 * Maps to Prisma ReportCategory enum.
 */
export declare enum ReportReason {
    FAKE_PROFILE = "FAKE_PROFILE",
    HARASSMENT = "HARASSMENT",
    INAPPROPRIATE_PHOTO = "INAPPROPRIATE_PHOTO",
    SPAM = "SPAM",
    UNDERAGE = "UNDERAGE",
    SCAM = "SCAM",
    OTHER = "OTHER"
}
/**
 * Report status — admin review workflow.
 * Maps to Prisma ReportStatus enum.
 */
export declare enum ReportStatus {
    PENDING = "PENDING",
    REVIEWING = "REVIEWING",
    RESOLVED = "RESOLVED",
    DISMISSED = "DISMISSED"
}
/**
 * Report request payload.
 */
export interface ReportRequest {
    reportedUserId: string;
    reason: ReportReason;
    details?: string;
}
/**
 * Report response.
 */
export interface ReportResponse {
    id: string;
    reportedUserId: string;
    reason: ReportReason;
    status: ReportStatus;
    createdAt: string;
}
/**
 * Block request payload.
 */
export interface BlockRequest {
    blockedUserId: string;
}
/**
 * Block response.
 */
export interface BlockResponse {
    blocked: boolean;
    blockedUserId: string;
    createdAt: string;
}
/**
 * Unblock response.
 */
export interface UnblockResponse {
    unblocked: boolean;
    unblockedUserId: string;
}
/**
 * Blocked user summary (for blocked list).
 */
export interface BlockedUser {
    userId: string;
    firstName: string;
    photoUrl: string | null;
    blockedAt: string;
}
/**
 * Blocked users list response.
 */
export interface BlockedUsersResponse {
    blockedUsers: BlockedUser[];
    total: number;
}
/**
 * Turkish labels for report reasons (App Store requirement).
 */
export declare const REPORT_REASON_LABELS_TR: Record<ReportReason, string>;
/**
 * Turkish descriptions for report reasons.
 */
export declare const REPORT_REASON_DESCRIPTIONS_TR: Record<ReportReason, string>;
//# sourceMappingURL=moderation.d.ts.map