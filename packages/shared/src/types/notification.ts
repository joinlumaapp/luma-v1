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
