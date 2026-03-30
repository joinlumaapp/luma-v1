export declare enum NotificationType {
    NEW_MATCH = "NEW_MATCH",
    SUPER_LIKE = "SUPER_LIKE",
    BADGE_EARNED = "BADGE_EARNED",
    SUBSCRIPTION_EXPIRING = "SUBSCRIPTION_EXPIRING",
    SYSTEM = "SYSTEM",
    MATCH_REMOVED = "MATCH_REMOVED",
    NEW_MESSAGE = "NEW_MESSAGE",
    RELATIONSHIP_REQUEST = "RELATIONSHIP_REQUEST",
    POST_LIKE = "POST_LIKE",
    STORY_LIKE = "STORY_LIKE",
    NEW_FOLLOWER = "NEW_FOLLOWER"
}
/**
 * App-level notification action hints.
 * Used in the `data.action` field for client-side deep-link routing.
 */
export declare enum NotificationAction {
    DAILY_PICKS = "daily_picks",
    BOOST_ACTIVE = "boost_active",
    INACTIVE_REMINDER = "inactive_reminder",
    MATCH_EXPIRING = "match_expiring",
    COMPATIBILITY_UPDATE = "compatibility_update",
    ANNOUNCEMENT = "announcement"
}
export interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data: Record<string, string>;
    isRead: boolean;
    createdAt: string;
}
export interface NotificationPreferences {
    newMatches: boolean;
    messages: boolean;
    badges: boolean;
    system: boolean;
    allDisabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    timezone: string;
}
export interface DeviceRegistration {
    userId: string;
    pushToken: string;
    platform: 'ios' | 'android';
    deviceId: string;
}
export interface NotificationPaginatedResponse {
    notifications: Notification[];
    total: number;
    unreadCount: number;
    page: number;
    totalPages: number;
}
/**
 * Result returned by the push notification send flow.
 */
export interface PushSendResult {
    sent: boolean;
    stored: boolean;
    notificationId?: string;
    deviceCount?: number;
    reason?: 'disabled_by_preference' | 'quiet_hours' | 'rate_limited' | 'no_active_devices';
}
/**
 * Result from a batch notification send.
 */
export interface BatchSendResult {
    total: number;
    sent: number;
    failed: number;
    results: Array<{
        userId: string;
        sent: boolean;
        reason?: string;
    }>;
}
//# sourceMappingURL=notification.d.ts.map