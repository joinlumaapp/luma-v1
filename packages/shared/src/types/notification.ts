// LUMA V1 — Notification Types

// Matches Prisma NotificationType enum + app-level extensions
export enum NotificationType {
  // Prisma-backed types
  NEW_MATCH = 'NEW_MATCH',
  SUPER_LIKE = 'SUPER_LIKE',
  HARMONY_INVITE = 'HARMONY_INVITE',
  HARMONY_REMINDER = 'HARMONY_REMINDER',
  BADGE_EARNED = 'BADGE_EARNED',
  SUBSCRIPTION_EXPIRING = 'SUBSCRIPTION_EXPIRING',
  SYSTEM = 'SYSTEM',
  MATCH_REMOVED = 'MATCH_REMOVED',
  // App-level push notification types (not persisted in DB)
  NEW_MESSAGE = 'NEW_MESSAGE',
  RELATIONSHIP_REQUEST = 'RELATIONSHIP_REQUEST',
}

/**
 * App-level notification action hints.
 * Used in the `data.action` field for client-side deep-link routing.
 */
export enum NotificationAction {
  DAILY_PICKS = 'daily_picks',
  BOOST_ACTIVE = 'boost_active',
  INACTIVE_REMINDER = 'inactive_reminder',
  MATCH_EXPIRING = 'match_expiring',
  COMPATIBILITY_UPDATE = 'compatibility_update',
  ANNOUNCEMENT = 'announcement',
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
  harmonyInvites: boolean;
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
