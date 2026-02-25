// LUMA V1 — Moderation Types (Report & Block)

/**
 * Report reasons — 7 categories for user reporting.
 * Maps to Prisma ReportCategory enum.
 */
export enum ReportReason {
  FAKE_PROFILE = 'fake_profile',
  HARASSMENT = 'harassment',
  INAPPROPRIATE_PHOTO = 'inappropriate_photo',
  SPAM = 'spam',
  UNDERAGE = 'underage',
  SCAM = 'scam',
  OTHER = 'other',
}

/**
 * Report status — admin review workflow.
 * Maps to Prisma ReportStatus enum.
 */
export enum ReportStatus {
  PENDING = 'pending',
  REVIEWING = 'reviewing',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
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
export const REPORT_REASON_LABELS_TR: Record<ReportReason, string> = {
  [ReportReason.FAKE_PROFILE]: 'Sahte Profil',
  [ReportReason.HARASSMENT]: 'Taciz',
  [ReportReason.INAPPROPRIATE_PHOTO]: 'Uygunsuz Fotograf',
  [ReportReason.SPAM]: 'Spam',
  [ReportReason.UNDERAGE]: 'Yas Siniri Ihlali',
  [ReportReason.SCAM]: 'Dolandiricilik',
  [ReportReason.OTHER]: 'Diger',
};

/**
 * Turkish descriptions for report reasons.
 */
export const REPORT_REASON_DESCRIPTIONS_TR: Record<ReportReason, string> = {
  [ReportReason.FAKE_PROFILE]: 'Bu profil sahte veya baska birine ait gorunuyor',
  [ReportReason.HARASSMENT]: 'Bu kullanici taciz edici veya tehdit edici davranislar sergiliyor',
  [ReportReason.INAPPROPRIATE_PHOTO]: 'Bu kullanicinin uygunsuz veya muzir fotograflari var',
  [ReportReason.SPAM]: 'Bu kullanici spam veya reklam icerigi gonderiyor',
  [ReportReason.UNDERAGE]: 'Bu kullanici 18 yasindan kucuk gorunuyor',
  [ReportReason.SCAM]: 'Bu kullanici dolandiricilik yaptigina dair suphe uyandiriyor',
  [ReportReason.OTHER]: 'Baska bir sebeple sikayet etmek istiyorum',
};
