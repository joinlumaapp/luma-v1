import { PackageTier } from './user';
import { ReportReason, ReportStatus } from './moderation';
export interface DashboardStats {
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    matchesToday: number;
    pendingReports: number;
    totalRevenue: number;
    activeSubscriptions: number;
    verifiedUsers: number;
}
export interface UserListItem {
    id: string;
    phone: string;
    firstName: string | null;
    gender: string | null;
    city: string | null;
    birthDate: string | null;
    intentionTag: string | null;
    photoUrl: string | null;
    isActive: boolean;
    isVerified: boolean;
    packageTier: PackageTier;
    goldBalance: number;
    reportCount: number;
    matchCount: number;
    createdAt: string;
    deletedAt: string | null;
}
export interface UserDetail {
    id: string;
    phone: string;
    isActive: boolean;
    isSmsVerified: boolean;
    isSelfieVerified: boolean;
    isFullyVerified: boolean;
    packageTier: PackageTier;
    goldBalance: number;
    createdAt: string;
    deletedAt: string | null;
    profile: UserDetailProfile | null;
    photos: UserDetailPhoto[];
    activeSubscription: UserDetailSubscription | null;
    reports: UserDetailReport[];
    badges: UserDetailBadge[];
    stats: UserDetailStats;
}
export interface UserDetailProfile {
    firstName: string;
    birthDate: string;
    gender: string;
    bio: string | null;
    city: string | null;
    country: string | null;
    intentionTag: string;
    lastActiveAt: string | null;
}
export interface UserDetailPhoto {
    id: string;
    url: string;
    thumbnailUrl: string | null;
    order: number;
    isPrimary: boolean;
    isApproved: boolean;
}
export interface UserDetailSubscription {
    id: string;
    packageTier: PackageTier;
    platform: string;
    startDate: string;
    expiryDate: string;
    autoRenew: boolean;
}
export interface UserDetailReport {
    id: string;
    category: string;
    status: string;
    details: string | null;
    reporterName: string;
    createdAt: string;
}
export interface UserDetailBadge {
    id: string;
    name: string;
    earnedAt: string;
}
export interface UserDetailStats {
    totalMatches: number;
    reportsMade: number;
    reportsReceived: number;
    blocksGiven: number;
    blocksReceived: number;
}
export interface ReportListItem {
    id: string;
    category: ReportReason | string;
    status: ReportStatus | string;
    details: string | null;
    reviewNote: string | null;
    reviewedAt: string | null;
    createdAt: string;
    reporter: {
        id: string;
        firstName: string;
    };
    reported: {
        id: string;
        firstName: string;
        isActive: boolean;
        photoUrl: string | null;
    };
}
export declare enum AdminActionType {
    BAN = "ban",
    WARN = "warn",
    VERIFY = "verify",
    UNBAN = "unban"
}
export declare enum AdminReportDecision {
    APPROVE = "approve",
    REJECT = "reject"
}
export declare enum AdminReportAction {
    WARN = "warn",
    BAN = "ban",
    DISMISS = "dismiss"
}
export interface AdminAction {
    action: AdminActionType;
    reason?: string;
}
export interface PaymentListItem {
    id: string;
    type: string;
    amount: number;
    balance: number;
    description: string;
    referenceId: string | null;
    createdAt: string;
    user: {
        id: string;
        phone: string;
        firstName: string | null;
    };
}
export interface AdminAnalytics {
    period: {
        from: string;
        to: string;
    };
    activeUsers: {
        dau: number;
        wau: number;
        mau: number;
    };
    retentionRatio: number;
    newRegistrations: number;
    matchesInPeriod: number;
    revenue: {
        totalGoldPurchased: number;
        transactionCount: number;
    };
    tierDistribution: Array<{
        tier: PackageTier;
        count: number;
    }>;
    verificationRate: number;
}
export interface AnnouncementRequest {
    title: string;
    body: string;
    targetTier?: 'all' | PackageTier;
}
export interface AnnouncementResponse {
    success: boolean;
    targetCount: number;
}
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
//# sourceMappingURL=admin.d.ts.map