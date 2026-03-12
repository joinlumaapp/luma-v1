// Badge store — Zustand store for badges & achievements
// Fetches badge progress from API with mock fallback

import { create } from 'zustand';
import { badgeService } from '../services/badgeService';
import type { BadgeProgressItem } from '../services/badgeService';

// Ionicons icon names for each badge
export interface BadgeDisplayData {
  key: string;
  name: string;
  description: string;
  ionicon: string;
  color: string;
  glowColor: string;
  isEarned: boolean;
  earnedAt: string | null;
  progress: number;
  currentValue: number;
  targetValue: number;
  goldReward: number;
}

// Badge visual definitions — maps badgeKey to icon + color
interface BadgeVisualDef {
  ionicon: string;
  color: string;
  glowColor: string;
}

const BADGE_VISUAL_MAP: Record<string, BadgeVisualDef> = {
  first_spark: { ionicon: 'flash', color: '#F59E0B', glowColor: 'rgba(245, 158, 11, 0.35)' },
  chat_master: { ionicon: 'chatbubbles', color: '#3B82F6', glowColor: 'rgba(59, 130, 246, 0.35)' },
  question_explorer: { ionicon: 'help-circle', color: '#8B5CF6', glowColor: 'rgba(139, 92, 246, 0.35)' },
  soul_mate: { ionicon: 'heart-circle', color: '#EC4899', glowColor: 'rgba(236, 72, 153, 0.35)' },
  verified_star: { ionicon: 'checkmark-circle', color: '#10B981', glowColor: 'rgba(16, 185, 129, 0.35)' },
  couple_goal: { ionicon: 'people', color: '#EF4444', glowColor: 'rgba(239, 68, 68, 0.35)' },
  explorer: { ionicon: 'compass', color: '#6366F1', glowColor: 'rgba(99, 102, 241, 0.35)' },
  deep_match: { ionicon: 'layers', color: '#8B5CF6', glowColor: 'rgba(139, 92, 246, 0.35)' },
  new_member: { ionicon: 'sparkles', color: '#F59E0B', glowColor: 'rgba(245, 158, 11, 0.35)' },
  popular: { ionicon: 'flame', color: '#EF4444', glowColor: 'rgba(239, 68, 68, 0.35)' },
  active: { ionicon: 'pulse', color: '#3B82F6', glowColor: 'rgba(59, 130, 246, 0.35)' },
  photo_lover: { ionicon: 'camera', color: '#EC4899', glowColor: 'rgba(236, 72, 153, 0.35)' },
  romantic: { ionicon: 'heart', color: '#F43F5E', glowColor: 'rgba(244, 63, 94, 0.35)' },
  supreme_founder: { ionicon: 'diamond', color: '#FBBF24', glowColor: 'rgba(251, 191, 36, 0.45)' },
  elite_member: { ionicon: 'star', color: '#D97706', glowColor: 'rgba(217, 119, 6, 0.40)' },
};

const DEFAULT_VISUAL: BadgeVisualDef = {
  ionicon: 'ribbon',
  color: '#9CA3AF',
  glowColor: 'rgba(156, 163, 175, 0.3)',
};

interface BadgeState {
  // State
  badges: BadgeDisplayData[];
  isLoading: boolean;
  error: string | null;
  earnedCount: number;
  totalCount: number;

  // Actions
  fetchBadges: () => Promise<void>;
  getBadge: (key: string) => BadgeDisplayData | undefined;
  getEarnedBadges: () => BadgeDisplayData[];
  getRecentlyEarned: (limit?: number) => BadgeDisplayData[];
  getInProgressBadges: () => BadgeDisplayData[];
}

function mapProgressToBadge(item: BadgeProgressItem): BadgeDisplayData {
  const visual = BADGE_VISUAL_MAP[item.badgeKey] ?? DEFAULT_VISUAL;
  return {
    key: item.badgeKey,
    name: item.name,
    description: item.description,
    ionicon: visual.ionicon,
    color: visual.color,
    glowColor: visual.glowColor,
    isEarned: item.isEarned,
    earnedAt: item.earnedAt,
    progress: item.progress,
    currentValue: item.currentValue,
    targetValue: item.targetValue,
    goldReward: item.goldReward,
  };
}

export const useBadgeStore = create<BadgeState>((set, get) => ({
  // Initial state
  badges: [],
  isLoading: false,
  error: null,
  earnedCount: 0,
  totalCount: 0,

  // Actions
  fetchBadges: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await badgeService.getBadgeProgress();
      const mapped = response.badges.map(mapProgressToBadge);
      set({
        badges: mapped,
        earnedCount: response.earned,
        totalCount: response.total,
        isLoading: false,
      });
    } catch {
      set({ error: 'Rozetler yüklenemedi', isLoading: false });
    }
  },

  getBadge: (key: string) => {
    return get().badges.find((b) => b.key === key);
  },

  getEarnedBadges: () => {
    return get().badges.filter((b) => b.isEarned);
  },

  getRecentlyEarned: (limit = 3) => {
    return get()
      .badges
      .filter((b) => b.isEarned && b.earnedAt)
      .sort((a, b) => {
        const dateA = a.earnedAt ? new Date(a.earnedAt).getTime() : 0;
        const dateB = b.earnedAt ? new Date(b.earnedAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, limit);
  },

  getInProgressBadges: () => {
    return get().badges.filter((b) => !b.isEarned && b.progress > 0);
  },
}));
