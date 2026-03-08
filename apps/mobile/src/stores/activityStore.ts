// Activity store — Zustand store for activities/events state

import { create } from 'zustand';
import { activityService } from '../services/activityService';
import type { Activity, CreateActivityRequest } from '../services/activityService';

interface ActivityState {
  // State
  activities: Activity[];
  isLoading: boolean;
  totalCount: number;

  // Actions
  fetchActivities: () => Promise<void>;
  createActivity: (data: CreateActivityRequest) => Promise<Activity | null>;
  joinActivity: (activityId: string) => Promise<boolean>;
  leaveActivity: (activityId: string) => Promise<void>;
  cancelActivity: (activityId: string) => Promise<void>;
}

export const useActivityStore = create<ActivityState>((set, _get) => ({
  // Initial state
  activities: [],
  isLoading: false,
  totalCount: 0,

  // Actions
  fetchActivities: async () => {
    set({ isLoading: true });
    try {
      const response = await activityService.getActivities();
      const active = response.activities.filter((a) => !a.isExpired && !a.isCancelled);
      set({
        activities: active,
        totalCount: response.total,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  createActivity: async (data) => {
    try {
      const activity = await activityService.createActivity(data);
      set((state) => ({
        activities: [activity, ...state.activities],
        totalCount: state.totalCount + 1,
      }));
      return activity;
    } catch {
      return null;
    }
  },

  joinActivity: async (activityId) => {
    try {
      const result = await activityService.joinActivity(activityId);
      if (result.joined) {
        set((state) => ({
          activities: state.activities.map((a) => {
            if (a.id !== activityId) return a;
            // Prevent duplicate participant entries
            const alreadyJoined = a.participants.some((p) => p.userId === 'current_user');
            if (alreadyJoined) return a;
            return {
              ...a,
              participants: [
                ...a.participants,
                { userId: 'current_user', firstName: 'Sen', photoUrl: null, joinedAt: new Date().toISOString() },
              ],
            };
          }),
        }));
      }
      return result.joined;
    } catch {
      return false;
    }
  },

  leaveActivity: async (activityId) => {
    try {
      await activityService.leaveActivity(activityId);
      set((state) => ({
        activities: state.activities.map((a) =>
          a.id === activityId
            ? {
                ...a,
                participants: a.participants.filter((p) => p.userId !== 'current_user'),
              }
            : a,
        ),
      }));
    } catch {
      // Silent fail
    }
  },

  cancelActivity: async (activityId) => {
    try {
      await activityService.cancelActivity(activityId);
      set((state) => ({
        activities: state.activities.filter((a) => a.id !== activityId),
        totalCount: state.totalCount - 1,
      }));
    } catch {
      // Silent fail
    }
  },
}));
