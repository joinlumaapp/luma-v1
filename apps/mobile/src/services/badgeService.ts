// Badge API service — list all badges, get user badges, get progress

import api from './api';

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

export const badgeService = {
  // Get all available badges
  getAllBadges: async (): Promise<Badge[]> => {
    const response = await api.get<Badge[]>('/badges');
    return response.data;
  },

  // Get badges earned by current user
  getMyBadges: async (): Promise<UserBadge[]> => {
    const response = await api.get<UserBadge[]>('/badges/me');
    return response.data;
  },

  // Get detailed badge progress for all badges
  getBadgeProgress: async (): Promise<BadgeProgressResponse> => {
    const response = await api.get<BadgeProgressResponse>('/badges/progress');
    return response.data;
  },
};
