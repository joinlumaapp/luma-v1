// Badge API service — list all badges, get user badges, get progress

import api from './api';
import { devMockOrThrow } from '../utils/mockGuard';

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  category: string;
  criteria: string;
}

export interface UserBadge {
  id: string;
  badge: Badge;
  earnedAt: string;
}

export interface BadgeProgressItem {
  badgeKey: string;
  name: string;
  description: string;
  iconUrl: string | null;
  isEarned: boolean;
  earnedAt: string | null;
  progress: number;       // 0-100
  currentValue: number;
  targetValue: number;
  goldReward: number;
}

export interface BadgeProgressResponse {
  badges: BadgeProgressItem[];
  total: number;
  earned: number;
}

// Mock badge progress data (15 badges total: 8 original + 5 new + 2 supreme)
const MOCK_BADGE_PROGRESS: BadgeProgressItem[] = [
  { badgeKey: 'first_spark', name: 'İlk Kıvılcım', description: 'İlk eşleşmeni yap', iconUrl: null, isEarned: true, earnedAt: '2026-02-15T10:00:00Z', progress: 100, currentValue: 1, targetValue: 1, goldReward: 10 },
  { badgeKey: 'chat_master', name: 'Sohbet Ustası', description: '5 eşleşme oluştur', iconUrl: null, isEarned: false, earnedAt: null, progress: 60, currentValue: 3, targetValue: 5, goldReward: 20 },
  { badgeKey: 'question_explorer', name: 'Merak Uzmanı', description: 'Tüm soru kartlarını keşfet', iconUrl: null, isEarned: false, earnedAt: null, progress: 40, currentValue: 18, targetValue: 45, goldReward: 30 },
  { badgeKey: 'soul_mate', name: 'Ruh İkizi', description: 'Süper uyumluluk eşleşmesi bul', iconUrl: null, isEarned: false, earnedAt: null, progress: 0, currentValue: 0, targetValue: 1, goldReward: 50 },
  { badgeKey: 'verified_star', name: 'Doğrulanmış Yıldız', description: 'Selfie doğrulamasını tamamla', iconUrl: null, isEarned: true, earnedAt: '2026-02-20T14:00:00Z', progress: 100, currentValue: 1, targetValue: 1, goldReward: 15 },
  { badgeKey: 'couple_goal', name: 'Çift Hedefi', description: 'İlişki modunu aktifleştir', iconUrl: null, isEarned: false, earnedAt: null, progress: 0, currentValue: 0, targetValue: 1, goldReward: 25 },
  { badgeKey: 'explorer', name: 'Kaşif', description: '50 profil keşfet', iconUrl: null, isEarned: false, earnedAt: null, progress: 56, currentValue: 28, targetValue: 50, goldReward: 20 },
  { badgeKey: 'deep_match', name: 'Derin Uyum', description: '45 soruyu tamamla', iconUrl: null, isEarned: false, earnedAt: null, progress: 44, currentValue: 20, targetValue: 45, goldReward: 40 },
  { badgeKey: 'new_member', name: 'Yeni Üye', description: 'Uygulamaya kayıt ol', iconUrl: null, isEarned: true, earnedAt: '2026-02-10T08:00:00Z', progress: 100, currentValue: 1, targetValue: 1, goldReward: 5 },
  { badgeKey: 'popular', name: 'Popüler', description: 'Bir paylaşımda 50+ beğeni veya 7 günde 100+ toplam beğeni al', iconUrl: null, isEarned: false, earnedAt: null, progress: 34, currentValue: 34, targetValue: 100, goldReward: 30 },
  { badgeKey: 'active', name: 'Aktif', description: '10+ paylaşım yap veya 7 gün üst üste aktif ol', iconUrl: null, isEarned: false, earnedAt: null, progress: 70, currentValue: 7, targetValue: 10, goldReward: 20 },
  { badgeKey: 'photo_lover', name: 'Fotoğraf Tutkunu', description: '14 günde 5+ fotoğraf paylaşımı yap', iconUrl: null, isEarned: false, earnedAt: null, progress: 40, currentValue: 2, targetValue: 5, goldReward: 15 },
  { badgeKey: 'romantic', name: 'Romantik', description: '14 günde 3+ yazı/soru paylaş ve 20+ beğeni al', iconUrl: null, isEarned: false, earnedAt: null, progress: 33, currentValue: 1, targetValue: 3, goldReward: 25 },
  { badgeKey: 'supreme_founder', name: 'Supreme Kurucu', description: 'Supreme üyelik ile topluluğun kurucu üyesi ol', iconUrl: null, isEarned: true, earnedAt: '2026-02-10T08:00:00Z', progress: 100, currentValue: 1, targetValue: 1, goldReward: 100 },
  { badgeKey: 'elite_member', name: 'Elite Üye', description: 'Supreme üyelik ile elit statüye eriş', iconUrl: null, isEarned: true, earnedAt: '2026-02-10T08:00:00Z', progress: 100, currentValue: 1, targetValue: 1, goldReward: 75 },
];

export const badgeService = {
  // Get all available badges
  getAllBadges: async (): Promise<Badge[]> => {
    try {
      const response = await api.get<Badge[]>('/badges');
      return response.data;
    } catch (error) {
      return devMockOrThrow(error, MOCK_BADGE_PROGRESS.map((b) => ({
        id: b.badgeKey,
        name: b.name,
        description: b.description,
        iconUrl: b.iconUrl ?? '',
        category: 'social',
        criteria: b.description,
      })), 'badgeService.getAllBadges');
    }
  },

  // Get badges earned by current user
  getMyBadges: async (): Promise<UserBadge[]> => {
    try {
      const response = await api.get<UserBadge[]>('/badges/me');
      return response.data;
    } catch (error) {
      return devMockOrThrow(error, MOCK_BADGE_PROGRESS
        .filter((b) => b.isEarned)
        .map((b) => ({
          id: b.badgeKey,
          badge: {
            id: b.badgeKey,
            name: b.name,
            description: b.description,
            iconUrl: b.iconUrl ?? '',
            category: 'social',
            criteria: b.description,
          },
          earnedAt: b.earnedAt ?? new Date().toISOString(),
        })), 'badgeService.getMyBadges');
    }
  },

  // Get detailed badge progress for all badges
  getBadgeProgress: async (): Promise<BadgeProgressResponse> => {
    try {
      const response = await api.get<BadgeProgressResponse>('/badges/progress');
      return response.data;
    } catch (error) {
      return devMockOrThrow(error, {
        badges: MOCK_BADGE_PROGRESS,
        total: MOCK_BADGE_PROGRESS.length,
        earned: MOCK_BADGE_PROGRESS.filter((b) => b.isEarned).length,
      }, 'badgeService.getBadgeProgress');
    }
  },
};
