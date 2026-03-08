// Notification API service — list, mark read, register push device, preferences

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import api from './api';
import { isExpoGo } from '../utils/runtime';

// ─── Types ───────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  totalPages: number;
}

export interface RegisterDeviceRequest {
  pushToken: string;
  platform: 'ios' | 'android';
  deviceId: string;
}

export interface RegisterDeviceResponse {
  registered: boolean;
  deviceId: string;
  platform: string;
}

export interface NotificationPreferences {
  newMatches: boolean;
  messages: boolean;
  badges: boolean;
  system: boolean;
  allDisabled: boolean;
}

export interface PermissionResult {
  granted: boolean;
  status: 'granted' | 'denied' | 'undetermined';
}

// ─── Listener type ───────────────────────────────────────────────────

type NotificationCallback = (notification: {
  title: string;
  body: string;
  data: Record<string, unknown>;
}) => void;

type NotificationTapCallback = (data: Record<string, unknown>) => void;

type CleanupFunction = () => void;

// ─── Configure notification handler (foreground display) ─────────────
// Skip in Expo Go — the native module is not fully available there.

if (!isExpoGo()) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// ─── Mock read state tracker (persists across fetches in dev) ────────
// Tracks which mock notification IDs have been marked as read,
// and whether "mark all read" has been triggered.
const mockReadState = {
  readIds: new Set<string>(),
  allRead: false,
  markRead(ids: string[]) {
    for (const id of ids) this.readIds.add(id);
  },
  markAllRead() {
    this.allRead = true;
  },
  isRead(id: string, defaultRead: boolean): boolean {
    if (this.allRead) return true;
    if (this.readIds.has(id)) return true;
    return defaultRead;
  },
};

// ─── Service ─────────────────────────────────────────────────────────

export const notificationService = {
  // ─── Permission & Token ──────────────────────────────────────────

  requestPermission: async (): Promise<PermissionResult> => {
    if (isExpoGo()) {
      if (__DEV__) {
        console.log('[Bildirim] Expo Go — push izni atlanıyor');
      }
      return { granted: false, status: 'undetermined' };
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // Android requires a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Luma',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#D4AF37',
      });
    }

    const granted = finalStatus === 'granted';
    const mappedStatus: PermissionResult['status'] =
      finalStatus === 'granted'
        ? 'granted'
        : finalStatus === 'denied'
          ? 'denied'
          : 'undetermined';

    return { granted, status: mappedStatus };
  },

  getDeviceToken: async (): Promise<string | null> => {
    if (isExpoGo()) {
      if (__DEV__) {
        console.log('[Bildirim] Expo Go — push token atlanıyor');
      }
      return null;
    }

    // Push tokens only work on physical devices
    if (!Device.isDevice) {
      if (__DEV__) {
        console.log('[Bildirim] Emulator — push token alınamaz, placeholder kullanılıyor');
      }
      return `dev_${Platform.OS}_${Date.now()}`;
    }

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      return tokenData.data;
    } catch (error) {
      if (__DEV__) {
        console.error('[Bildirim] Push token alinamadi:', error);
      }
      return null;
    }
  },

  // ─── Device Registration ─────────────────────────────────────────

  registerDevice: async (data: RegisterDeviceRequest): Promise<RegisterDeviceResponse> => {
    const response = await api.post<RegisterDeviceResponse>(
      '/notifications/devices',
      data,
    );
    return response.data;
  },

  unregisterDevice: async (pushToken: string): Promise<{ unregistered: boolean }> => {
    const response = await api.delete<{ unregistered: boolean }>(
      '/notifications/devices',
      { data: { pushToken } },
    );
    return response.data;
  },

  // ─── Notification Listeners ──────────────────────────────────────

  onNotificationReceived: (callback: NotificationCallback): CleanupFunction => {
    if (isExpoGo()) {
      return () => {}; // no-op cleanup
    }
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        callback({
          title: notification.request.content.title ?? '',
          body: notification.request.content.body ?? '',
          data: (notification.request.content.data ?? {}) as Record<string, unknown>,
        });
      },
    );
    return () => subscription.remove();
  },

  onNotificationTapped: (callback: NotificationTapCallback): CleanupFunction => {
    if (isExpoGo()) {
      return () => {}; // no-op cleanup
    }
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
        callback(data);
      },
    );
    return () => subscription.remove();
  },

  // ─── Notification CRUD ───────────────────────────────────────────

  getNotifications: async (page?: number): Promise<NotificationsResponse> => {
    try {
      const response = await api.get<NotificationsResponse>('/notifications', {
        params: page !== undefined ? { page } : undefined,
      });
      return response.data;
    } catch {
      // Mock fallback for development — 7 notification types
      const mockNotifications: Notification[] = [
        {
          id: 'notif-001',
          type: 'PROFILE_LIKE',
          title: 'Yeni Beğeni',
          body: 'Elif profilini beğendi',
          data: { userId: 'bot-001', userName: 'Elif', userPhoto: 'https://i.pravatar.cc/100?img=1' },
          isRead: false,
          createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        },
        {
          id: 'notif-002',
          type: 'NEW_MATCH',
          title: 'Yeni Eşleşme!',
          body: 'Zeynep ile eşleştiniz! Hemen mesaj gönderin.',
          data: { matchId: 'match-002', userId: 'bot-002', userName: 'Zeynep', userPhoto: 'https://i.pravatar.cc/100?img=5' },
          isRead: false,
          createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        },
        {
          id: 'notif-003',
          type: 'NEW_FOLLOWER',
          title: 'Yeni Takipçi',
          body: 'Merve seni takip etmeye başladı',
          data: { userId: 'bot-006', userName: 'Merve', userPhoto: 'https://i.pravatar.cc/100?img=23' },
          isRead: false,
          createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        },
        {
          id: 'notif-004',
          type: 'POST_LIKE',
          title: 'Gönderi Beğenisi',
          body: 'Ayşe gönderini beğendi',
          data: { postId: 'post-001', userId: 'bot-004', userName: 'Ayse', userPhoto: 'https://i.pravatar.cc/100?img=16' },
          isRead: true,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'notif-005',
          type: 'POST_COMMENT',
          title: 'Yeni Yorum',
          body: 'Buse gönderine yorum yaptı: "Harika bir paylaşım!"',
          data: { postId: 'post-002', userId: 'bot-007', userName: 'Buse', userPhoto: 'https://i.pravatar.cc/100?img=25' },
          isRead: false,
          createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'notif-006',
          type: 'COMMENT_REPLY',
          title: 'Yanıt',
          body: 'İpek yorumuna yanıt verdi: "Katılıyorum!"',
          data: { postId: 'post-001', commentId: 'comment-001', userId: 'bot-009', userName: 'Ipek', userPhoto: 'https://i.pravatar.cc/100?img=32' },
          isRead: true,
          createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'notif-007',
          type: 'MESSAGE',
          title: 'Yeni Mesaj',
          body: 'Selin: Merhaba, nasılsın?',
          data: { matchId: 'match-003', userId: 'bot-010', userName: 'Selin', userPhoto: 'https://i.pravatar.cc/100?img=9' },
          isRead: false,
          createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        },
      ];
      // Apply persisted mock read state
      const withReadState = mockNotifications.map((n) => ({
        ...n,
        isRead: mockReadState.isRead(n.id, n.isRead),
      }));
      return {
        notifications: withReadState,
        total: withReadState.length,
        unreadCount: withReadState.filter((n) => !n.isRead).length,
        page: 1,
        totalPages: 1,
      };
    }
  },

  markRead: async (notificationIds: string[]): Promise<{ markedRead: number; unreadCount: number }> => {
    try {
      const response = await api.patch<{ markedRead: number; unreadCount: number }>(
        '/notifications/read',
        { notificationIds },
      );
      return response.data;
    } catch {
      mockReadState.markRead(notificationIds);
      return { markedRead: notificationIds.length, unreadCount: 0 };
    }
  },

  markAllRead: async (): Promise<{ markedRead: number; unreadCount: number }> => {
    try {
      const response = await api.post<{ markedRead: number; unreadCount: number }>(
        '/notifications/mark-all-read',
      );
      return response.data;
    } catch {
      mockReadState.markAllRead();
      return { markedRead: 0, unreadCount: 0 };
    }
  },

  // ─── Preferences ─────────────────────────────────────────────────

  getPreferences: async (): Promise<NotificationPreferences> => {
    const response = await api.get<NotificationPreferences>(
      '/notifications/preferences',
    );
    return response.data;
  },

  updatePreferences: async (
    prefs: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> => {
    const response = await api.patch<NotificationPreferences>(
      '/notifications/preferences',
      prefs,
    );
    return response.data;
  },
};
