// Notification store — Zustand store for notification state
// Enhanced: grouped notifications by type (Yeni Eşleşme, Mesaj, Rozet, etc.)

import { Platform, AppState } from 'react-native';
import { create } from 'zustand';
import { notificationService } from '../services/notificationService';
import { useAuthStore } from './authStore';
import type {
  Notification,
  NotificationPreferences,
} from '../services/notificationService';

export type { Notification, NotificationPreferences };

// ─── Notification Group Types ─────────────────────────────────────

/** Notification group key for section headers */
export type NotificationGroupKey =
  | 'NEW_MATCH'
  | 'LIKE'
  | 'SOCIAL'
  | 'MESSAGE'
  | 'BADGE'
  | 'SYSTEM'
  | 'OTHER';

/** A grouped section with a header title and items */
export interface NotificationGroup {
  key: NotificationGroupKey;
  title: string;
  notifications: Notification[];
  unreadCount: number;
}

/** Map notification type string to a group key */
const getGroupKey = (type: string): NotificationGroupKey => {
  const typeUpper = type.toUpperCase();
  if (typeUpper === 'NEW_MATCH' || typeUpper.includes('MATCH')) return 'NEW_MATCH';
  if (typeUpper === 'PROFILE_LIKE') return 'LIKE';
  if (typeUpper === 'NEW_FOLLOWER' || typeUpper === 'POST_LIKE' || typeUpper === 'POST_COMMENT' || typeUpper === 'COMMENT_REPLY') return 'SOCIAL';
  if (typeUpper === 'MESSAGE' || typeUpper === 'PUSH' || typeUpper.includes('MESAJ')) return 'MESSAGE';
  if (typeUpper === 'BADGE_EARNED' || typeUpper.includes('BADGE') || typeUpper.includes('ROZET')) return 'BADGE';
  if (typeUpper === 'SYSTEM' || typeUpper.includes('SUBSCRIPTION')) return 'SYSTEM';
  return 'OTHER';
};

/** Turkish display titles for each group */
const GROUP_TITLES: Record<NotificationGroupKey, string> = {
  NEW_MATCH: 'Yeni Eşleşme',
  LIKE: 'Beğeniler',
  SOCIAL: 'Sosyal',
  MESSAGE: 'Mesajlar',
  BADGE: 'Rozetler',
  SYSTEM: 'Sistem',
  OTHER: 'Diğer',
};

/** Display order for groups */
const GROUP_ORDER: NotificationGroupKey[] = [
  'NEW_MATCH',
  'LIKE',
  'SOCIAL',
  'MESSAGE',
  'BADGE',
  'SYSTEM',
  'OTHER',
];

// ─── Store Interface ──────────────────────────────────────────────

interface NotificationState {
  // State
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  hasPermission: boolean;
  page: number;
  totalPages: number;
  total: number;

  // Actions
  fetchNotifications: () => Promise<void>;
  markRead: (notificationIds: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  requestPermission: () => Promise<boolean>;
  registerDevice: () => Promise<void>;
  setupForegroundListener: () => () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  // Initial state
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  hasPermission: false,
  page: 1,
  totalPages: 1,
  total: 0,

  // Actions

  fetchNotifications: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) {
      set({ isLoading: false });
      return;
    }
    set({ isLoading: true });
    try {
      const { page } = get();
      const data = await notificationService.getNotifications(page);
      set((state) => {
        const merged =
          page === 1
            ? data.notifications
            : [...state.notifications, ...data.notifications];
        return {
          notifications: merged,
          unreadCount: data.unreadCount,
          total: data.total,
          totalPages: data.totalPages,
          isLoading: false,
        };
      });
    } catch (error) {
      if (__DEV__) {
        console.error('[BildirimStore] Bildirimler alinamadi:', error);
      }
      set({ isLoading: false });
    }
  },

  markRead: async (notificationIds) => {
    try {
      const result = await notificationService.markRead(notificationIds);
      set((state) => {
        const updated = state.notifications.map((n) =>
          notificationIds.includes(n.id) ? { ...n, isRead: true } : n,
        );
        return {
          notifications: updated,
          unreadCount: result.unreadCount,
        };
      });
    } catch (error) {
      if (__DEV__) {
        console.error('[BildirimStore] Okundu olarak isaretlenemedi:', error);
      }
    }
  },

  markAllRead: async () => {
    try {
      await notificationService.markAllRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      if (__DEV__) {
        console.error('[BildirimStore] Tumunu okundu isaretlenemedi:', error);
      }
    }
  },

  loadMore: async () => {
    const { page, totalPages, isLoading } = get();
    if (isLoading || page >= totalPages) return;

    set({ page: page + 1 });
    await get().fetchNotifications();
  },

  refresh: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    set({ page: 1, notifications: [], unreadCount: 0, total: 0, totalPages: 1 });
    await get().fetchNotifications();
  },

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.isRead ? 0 : 1),
      total: state.total + 1,
    })),

  requestPermission: async () => {
    try {
      const result = await notificationService.requestPermission();
      set({ hasPermission: result.granted });
      return result.granted;
    } catch (error) {
      if (__DEV__) {
        console.error('[BildirimStore] Izin istegi basarisiz:', error);
      }
      set({ hasPermission: false });
      return false;
    }
  },

  registerDevice: async () => {
    try {
      const token = await notificationService.getDeviceToken();
      if (!token) {
        if (__DEV__) {
          console.warn('[BildirimStore] Cihaz tokeni alinamadi');
        }
        return;
      }

      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      await notificationService.registerDevice({
        pushToken: token,
        platform: platform as 'ios' | 'android',
        deviceId: `${platform}_${Date.now()}`,
      });

      if (__DEV__) {
        console.log('[BildirimStore] Cihaz basariyla kaydedildi');
      }
    } catch (error) {
      if (__DEV__) {
        console.error('[BildirimStore] Cihaz kaydi basarisiz:', error);
      }
    }
  },

  /**
   * Setup foreground listeners:
   * 1. AppState change → refresh on foreground
   * 2. Real-time push notification received → add to store
   * 3. Notification tapped → could be used for navigation
   * Returns a cleanup function to remove all listeners.
   */
  setupForegroundListener: () => {
    const appStateCleanup = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        get().refresh();
      }
    });

    const notifReceivedCleanup = notificationService.onNotificationReceived(
      (notification) => {
        const notifType = (notification.data?.type as string) || 'SYSTEM';
        get().addNotification({
          id: `push_${Date.now()}`,
          type: notifType,
          title: notification.title,
          body: notification.body,
          data: notification.data,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      },
    );

    const notifTappedCleanup = notificationService.onNotificationTapped(() => {
      get().refresh();
    });

    return () => {
      appStateCleanup.remove();
      notifReceivedCleanup();
      notifTappedCleanup();
    };
  },
}));

// ─── Derived Selectors ─────────────────────────────────────────────

/**
 * Selector that groups notifications by type.
 * Returns an array of NotificationGroup sections ordered by predefined priority.
 * Empty groups are excluded.
 */
export const selectGroupedNotifications = (
  notifications: Notification[]
): NotificationGroup[] => {
  const groupMap = new Map<NotificationGroupKey, Notification[]>();

  // Initialize all groups
  for (const key of GROUP_ORDER) {
    groupMap.set(key, []);
  }

  // Assign each notification to a group
  for (const notif of notifications) {
    const groupKey = getGroupKey(notif.type);
    const group = groupMap.get(groupKey);
    if (group) {
      group.push(notif);
    }
  }

  // Build result — only include non-empty groups
  const result: NotificationGroup[] = [];

  for (const key of GROUP_ORDER) {
    const items = groupMap.get(key) ?? [];
    if (items.length > 0) {
      result.push({
        key,
        title: GROUP_TITLES[key],
        notifications: items,
        unreadCount: items.filter((n) => !n.isRead).length,
      });
    }
  }

  return result;
};

/**
 * Hook to get grouped notifications from the store.
 * Usage: const groups = useGroupedNotifications();
 */
export const useGroupedNotifications = (): NotificationGroup[] => {
  const notifications = useNotificationStore((state) => state.notifications);
  return selectGroupedNotifications(notifications);
};
