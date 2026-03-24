// Activity service — API calls for activities/events system
// Users can create and join real-life activities with 2-6 participants

import api from './api';
import { devMockOrThrow } from '../utils/mockGuard';

// ─── Interfaces ────────────────────────────────────────────────────

export type ActivityType =
  | 'coffee'
  | 'dinner'
  | 'drinks'
  | 'outdoor'
  | 'sport'
  | 'culture'
  | 'travel'
  | 'flirt'
  | 'gaming'
  | 'workshop'
  | 'other';

export interface ActivityParticipant {
  userId: string;
  firstName: string;
  photoUrl: string | null;
  joinedAt: string;
}

export interface Activity {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorPhotoUrl: string | null;
  title: string;
  description: string;
  activityType: ActivityType;
  location: string;
  dateTime: string;
  maxParticipants: number;
  participants: ActivityParticipant[];
  isExpired: boolean;
  isCancelled: boolean;
  createdAt: string;
  distanceKm: number;
}

export interface CreateActivityRequest {
  title: string;
  description: string;
  activityType: ActivityType;
  location: string;
  dateTime: string;
  maxParticipants: number;
}

interface ActivitiesResponse {
  activities: Activity[];
  total: number;
}

// ─── Activity Type Labels (Turkish) ───────────────────────────────

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  coffee: 'Kahve & Sohbet',
  dinner: 'Yemek',
  drinks: 'Gece & Eglence',
  outdoor: 'Acik Hava',
  sport: 'Spor & Aktivite',
  culture: 'Kultur / Sanat',
  travel: 'Gezi',
  flirt: 'Flort & Tanisma',
  gaming: 'Oyun Bulusmasi',
  workshop: 'Workshop & Hobi',
  other: 'Diger',
};

export const ACTIVITY_TYPE_ICONS: Record<ActivityType, string> = {
  coffee: '\u2615',
  dinner: '\uD83C\uDF7D\uFE0F',
  drinks: '\uD83C\uDF7B',
  outdoor: '\uD83C\uDF3F',
  sport: '\uD83C\uDFC3',
  culture: '\uD83C\uDFA8',
  travel: '\u2708\uFE0F',
  flirt: '\uD83D\uDC95',
  gaming: '\uD83C\uDFAE',
  workshop: '\uD83D\uDEE0\uFE0F',
  other: '\uD83C\uDFAF',
};

// ─── Mock Data ────────────────────────────────────────────────────

const MOCK_ACTIVITIES: Activity[] = [
  {
    id: 'act1',
    creatorId: 'u1',
    creatorName: 'Elif',
    creatorPhotoUrl: null,
    title: "Karaköy'de kahve içelim",
    description: 'Cumartesi öğleden sonra Karaköy civarında güzel bir kafede buluşalım. Sohbet edelim, tanışalım!',
    activityType: 'coffee',
    location: 'Karaköy, İstanbul',
    dateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    maxParticipants: 4,
    participants: [
      { userId: 'u1', firstName: 'Elif', photoUrl: null, joinedAt: new Date(Date.now() - 3600000).toISOString() },
    ],
    isExpired: false,
    isCancelled: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    distanceKm: 2.3,
  },
  {
    id: 'act2',
    creatorId: 'u2',
    creatorName: 'Kaan',
    creatorPhotoUrl: null,
    title: 'Belgrad Ormanı yürüyüşü',
    description: 'Pazar sabahı doğa yürüyüşü yapalım. Tempolu yürüyüş, yaklaşık 8km.',
    activityType: 'outdoor',
    location: 'Belgrad Ormanı, İstanbul',
    dateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    maxParticipants: 6,
    participants: [
      { userId: 'u2', firstName: 'Kaan', photoUrl: null, joinedAt: new Date(Date.now() - 7200000).toISOString() },
      { userId: 'u3', firstName: 'Selin', photoUrl: null, joinedAt: new Date(Date.now() - 5400000).toISOString() },
    ],
    isExpired: false,
    isCancelled: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    distanceKm: 8.1,
  },
  {
    id: 'act3',
    creatorId: 'u4',
    creatorName: 'Merve',
    creatorPhotoUrl: null,
    title: 'Cuma akşamı yemek',
    description: "Kadıköy'de güzel bir restoranda buluşalım. Mekanı birlikte seçeriz.",
    activityType: 'dinner',
    location: 'Kadıköy, İstanbul',
    dateTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    maxParticipants: 4,
    participants: [
      { userId: 'u4', firstName: 'Merve', photoUrl: null, joinedAt: new Date(Date.now() - 10800000).toISOString() },
      { userId: 'u5', firstName: 'Deniz', photoUrl: null, joinedAt: new Date(Date.now() - 9000000).toISOString() },
      { userId: 'u6', firstName: 'Ece', photoUrl: null, joinedAt: new Date(Date.now() - 7200000).toISOString() },
    ],
    isExpired: false,
    isCancelled: false,
    createdAt: new Date(Date.now() - 10800000).toISOString(),
    distanceKm: 4.5,
  },
  {
    id: 'act4',
    creatorId: 'u7',
    creatorName: 'Burak',
    creatorPhotoUrl: null,
    title: 'Tenis maçı',
    description: 'Çiftler tenis oynayalım. Seviye fark etmez, eğlenmek için!',
    activityType: 'sport',
    location: 'Levent, İstanbul',
    dateTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    maxParticipants: 4,
    participants: [
      { userId: 'u7', firstName: 'Burak', photoUrl: null, joinedAt: new Date(Date.now() - 14400000).toISOString() },
    ],
    isExpired: false,
    isCancelled: false,
    createdAt: new Date(Date.now() - 14400000).toISOString(),
    distanceKm: 5.2,
  },
  {
    id: 'act5',
    creatorId: 'u8',
    creatorName: 'Zeynep',
    creatorPhotoUrl: null,
    title: 'Müze gezisi — İstanbul Modern',
    description: 'Yeni sergiyi birlikte gezelim. Sanatla ilgilenen herkesi bekliyorum!',
    activityType: 'culture',
    location: 'Beyoğlu, İstanbul',
    dateTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    maxParticipants: 3,
    participants: [
      { userId: 'u8', firstName: 'Zeynep', photoUrl: null, joinedAt: new Date(Date.now() - 18000000).toISOString() },
      { userId: 'u9', firstName: 'Ali', photoUrl: null, joinedAt: new Date(Date.now() - 14400000).toISOString() },
    ],
    isExpired: false,
    isCancelled: false,
    createdAt: new Date(Date.now() - 18000000).toISOString(),
    distanceKm: 3.1,
  },
];

// ─── Service ───────────────────────────────────────────────────────

export const activityService = {
  getActivities: async (): Promise<ActivitiesResponse> => {
    try {
      const response = await api.get<ActivitiesResponse>('/activities');
      return response.data;
    } catch (error) {
      return devMockOrThrow(error, { activities: MOCK_ACTIVITIES, total: MOCK_ACTIVITIES.length }, 'activityService.getActivities');
    }
  },

  getActivityById: async (activityId: string): Promise<Activity> => {
    try {
      const response = await api.get<Activity>(`/activities/${activityId}`);
      return response.data;
    } catch (error) {
      const found = MOCK_ACTIVITIES.find((a) => a.id === activityId);
      if (!found) throw new Error('Activity not found');
      return devMockOrThrow(error, found, 'activityService.getActivityById');
    }
  },

  createActivity: async (data: CreateActivityRequest): Promise<Activity> => {
    try {
      const response = await api.post<Activity>('/activities', data);
      return response.data;
    } catch (error) {
      const newActivity: Activity = {
        id: `act_${Date.now()}`,
        creatorId: 'current_user',
        creatorName: 'Sen',
        creatorPhotoUrl: null,
        title: data.title,
        description: data.description,
        activityType: data.activityType,
        location: data.location,
        dateTime: data.dateTime,
        maxParticipants: data.maxParticipants,
        participants: [
          { userId: 'current_user', firstName: 'Sen', photoUrl: null, joinedAt: new Date().toISOString() },
        ],
        isExpired: false,
        isCancelled: false,
        createdAt: new Date().toISOString(),
        distanceKm: 0,
      };
      return devMockOrThrow(error, newActivity, 'activityService.createActivity');
    }
  },

  joinActivity: async (activityId: string): Promise<{ joined: boolean }> => {
    try {
      const response = await api.post<{ joined: boolean }>(
        `/activities/${activityId}/join`,
      );
      return response.data;
    } catch (error) {
      return devMockOrThrow(error, { joined: true }, 'activityService.joinActivity');
    }
  },

  leaveActivity: async (activityId: string): Promise<void> => {
    try {
      await api.post(`/activities/${activityId}/leave`);
    } catch (error) {
      devMockOrThrow(error, undefined, 'activityService.leaveActivity');
    }
  },

  cancelActivity: async (activityId: string): Promise<void> => {
    try {
      await api.delete(`/activities/${activityId}`);
    } catch (error) {
      devMockOrThrow(error, undefined, 'activityService.cancelActivity');
    }
  },
};
