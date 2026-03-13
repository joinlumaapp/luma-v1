// Story store — Zustand store for Instagram-quality story system
// Manages story feed, creation, viewing state, and interactions

import { create } from 'zustand';
import {
  storyService,
  type Story,
  type StoryUser,
  type StoryOverlay,
  type StoryViewer,
} from '../services/storyService';

interface StoryState {
  // State
  storyUsers: StoryUser[];
  myStories: Story[];
  isLoading: boolean;
  isCreating: boolean;
  seenStoryIds: Set<string>;
  storyViewers: Map<string, StoryViewer[]>;

  // Actions
  fetchStories: () => Promise<void>;
  createStory: (mediaUri: string, mediaType: 'image' | 'video', overlays: StoryOverlay[]) => Promise<void>;
  deleteStory: (storyId: string) => Promise<void>;
  markAsSeen: (storyId: string) => void;
  replyToStory: (storyId: string, message: string) => Promise<void>;
  toggleLike: (storyId: string) => void;
  fetchViewers: (storyId: string) => Promise<void>;
  getOrderedStoryUsers: () => StoryUser[];
}

export const useStoryStore = create<StoryState>((set, get) => ({
  // Initial state
  storyUsers: [],
  myStories: [],
  isLoading: false,
  isCreating: false,
  seenStoryIds: new Set<string>(),
  storyViewers: new Map<string, StoryViewer[]>(),

  // Actions
  fetchStories: async () => {
    set({ isLoading: true });
    try {
      const users = await storyService.getStories();
      const { seenStoryIds } = get();

      // Update hasUnseenStories based on local seen state
      const updatedUsers = users.map((user) => ({
        ...user,
        hasUnseenStories: user.stories.some((s) => !seenStoryIds.has(s.id)),
      }));

      set({
        storyUsers: updatedUsers,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  createStory: async (mediaUri, mediaType, overlays) => {
    set({ isCreating: true });
    try {
      const newStory = await storyService.createStory({
        mediaUri,
        mediaType,
        overlays,
      });
      set((state) => ({
        myStories: [newStory, ...state.myStories],
        isCreating: false,
      }));
    } catch {
      set({ isCreating: false });
    }
  },

  deleteStory: async (storyId) => {
    try {
      await storyService.deleteStory(storyId);
      set((state) => ({
        myStories: state.myStories.filter((s) => s.id !== storyId),
        storyUsers: state.storyUsers.map((user) => ({
          ...user,
          stories: user.stories.filter((s) => s.id !== storyId),
        })),
      }));
    } catch {
      // Silent fail — story may already be deleted
    }
  },

  markAsSeen: (storyId) => {
    const { seenStoryIds } = get();
    if (seenStoryIds.has(storyId)) return;

    const next = new Set(seenStoryIds);
    next.add(storyId);

    // Update storyUsers hasUnseenStories flag
    set((state) => ({
      seenStoryIds: next,
      storyUsers: state.storyUsers.map((user) => ({
        ...user,
        hasUnseenStories: user.stories.some((s) => !next.has(s.id)),
      })),
    }));

    // Fire-and-forget API call
    storyService.markAsViewed(storyId).catch(() => {
      // Non-critical
    });
  },

  replyToStory: async (storyId, message) => {
    await storyService.replyToStory(storyId, message);
  },

  toggleLike: (storyId) => {
    // Optimistic update
    set((state) => ({
      storyUsers: state.storyUsers.map((user) => ({
        ...user,
        stories: user.stories.map((story) =>
          story.id === storyId
            ? {
                ...story,
                isLiked: !story.isLiked,
                likeCount: story.isLiked ? story.likeCount - 1 : story.likeCount + 1,
              }
            : story,
        ),
      })),
    }));

    // Fire-and-forget API call
    storyService.toggleLike(storyId).catch(() => {
      // Revert on error
      set((state) => ({
        storyUsers: state.storyUsers.map((user) => ({
          ...user,
          stories: user.stories.map((story) =>
            story.id === storyId
              ? {
                  ...story,
                  isLiked: !story.isLiked,
                  likeCount: story.isLiked ? story.likeCount - 1 : story.likeCount + 1,
                }
              : story,
          ),
        })),
      }));
    });
  },

  fetchViewers: async (storyId) => {
    try {
      const viewers = await storyService.getStoryViewers(storyId);
      set((state) => {
        const next = new Map(state.storyViewers);
        next.set(storyId, viewers);
        return { storyViewers: next };
      });
    } catch {
      // Silent fail
    }
  },

  getOrderedStoryUsers: () => {
    const { storyUsers } = get();
    // Unseen stories first, then sorted by latest story time
    return [...storyUsers].sort((a, b) => {
      if (a.hasUnseenStories && !b.hasUnseenStories) return -1;
      if (!a.hasUnseenStories && b.hasUnseenStories) return 1;
      return new Date(b.latestStoryAt).getTime() - new Date(a.latestStoryAt).getTime();
    });
  },
}));
