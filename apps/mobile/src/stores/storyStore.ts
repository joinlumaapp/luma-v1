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

const CURRENT_USER_ID = 'dev-user-001';
const CURRENT_USER_NAME = 'Sen';
const CURRENT_USER_AVATAR = 'https://i.pravatar.cc/150?img=68';

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
      const { seenStoryIds, myStories } = get();

      // Update hasUnseenStories based on local seen state
      const updatedUsers = users.map((user) => ({
        ...user,
        hasUnseenStories: user.stories.some((s) => !seenStoryIds.has(s.id)),
      }));

      // Ensure own stories are included in storyUsers
      const ownEntry = updatedUsers.find((u) => u.userId === CURRENT_USER_ID);
      if (myStories.length > 0 && !ownEntry) {
        // Own user not in fetched list — add them
        updatedUsers.unshift({
          userId: CURRENT_USER_ID,
          userName: CURRENT_USER_NAME,
          userAvatarUrl: CURRENT_USER_AVATAR,
          isFollowing: false,
          stories: myStories,
          hasUnseenStories: false,
          latestStoryAt: myStories[0].createdAt,
        });
      } else if (myStories.length > 0 && ownEntry) {
        // Merge local stories that might not be in the fetched data yet
        const fetchedIds = new Set(ownEntry.stories.map((s) => s.id));
        const missing = myStories.filter((s) => !fetchedIds.has(s.id));
        if (missing.length > 0) {
          ownEntry.stories = [...missing, ...ownEntry.stories];
          ownEntry.latestStoryAt = ownEntry.stories[0].createdAt;
        }
      }

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

      if (__DEV__) {
        console.log('[StoryStore] New story created:', newStory.id, newStory.mediaType);
        console.log('[StoryStore] Current storyUsers count:', get().storyUsers.length);
        console.log('[StoryStore] Current user IDs:', get().storyUsers.map(u => u.userId));
      }

      set((state) => {
        const updatedMyStories = [newStory, ...state.myStories];

        // Update storyUsers — insert into own bubble
        const existingIdx = state.storyUsers.findIndex((u) => u.userId === CURRENT_USER_ID);

        if (__DEV__) {
          console.log('[StoryStore] Own user index in storyUsers:', existingIdx);
        }

        let updatedStoryUsers: StoryUser[];

        if (existingIdx >= 0) {
          // Own entry exists — prepend new story
          updatedStoryUsers = state.storyUsers.map((user, idx) =>
            idx === existingIdx
              ? {
                  ...user,
                  stories: [newStory, ...user.stories],
                  hasUnseenStories: false,
                  latestStoryAt: newStory.createdAt,
                }
              : user,
          );
        } else {
          // No own entry yet — create one at the beginning
          const ownUser: StoryUser = {
            userId: CURRENT_USER_ID,
            userName: CURRENT_USER_NAME,
            userAvatarUrl: CURRENT_USER_AVATAR,
            isFollowing: false,
            stories: [newStory],
            hasUnseenStories: false,
            latestStoryAt: newStory.createdAt,
          };
          updatedStoryUsers = [ownUser, ...state.storyUsers];
        }

        if (__DEV__) {
          console.log('[StoryStore] Updated storyUsers count:', updatedStoryUsers.length);
          const ownEntry = updatedStoryUsers.find(u => u.userId === CURRENT_USER_ID);
          console.log('[StoryStore] Own entry stories count:', ownEntry?.stories.length ?? 0);
        }

        return {
          myStories: updatedMyStories,
          storyUsers: updatedStoryUsers,
          isCreating: false,
        };
      });
    } catch (err) {
      if (__DEV__) console.error('[StoryStore] createStory failed:', err);
      set({ isCreating: false });
      throw new Error('Story creation failed');
    }
  },

  deleteStory: async (storyId) => {
    try {
      await storyService.deleteStory(storyId);
      set((state) => ({
        myStories: state.myStories.filter((s) => s.id !== storyId),
        storyUsers: state.storyUsers
          .map((user) => ({
            ...user,
            stories: user.stories.filter((s) => s.id !== storyId),
          }))
          .filter((user) => user.stories.length > 0), // Remove empty entries
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

    set((state) => ({
      seenStoryIds: next,
      storyUsers: state.storyUsers.map((user) => ({
        ...user,
        hasUnseenStories: user.stories.some((s) => !next.has(s.id)),
      })),
    }));

    storyService.markAsViewed(storyId).catch(() => {});
  },

  replyToStory: async (storyId, message) => {
    await storyService.replyToStory(storyId, message);
  },

  toggleLike: (storyId) => {
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

    storyService.toggleLike(storyId).catch(() => {
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

    // Own stories first, then followed, then suggested (max 3)
    const own = storyUsers.filter((u) => u.userId === CURRENT_USER_ID);
    const followed = storyUsers.filter((u) => u.userId !== CURRENT_USER_ID && u.isFollowing);
    const suggested = storyUsers.filter((u) => u.userId !== CURRENT_USER_ID && u.isSuggested && !u.isFollowing).slice(0, 3);

    // Sort followed: unseen first, then by recency
    followed.sort((a, b) => {
      if (a.hasUnseenStories && !b.hasUnseenStories) return -1;
      if (!a.hasUnseenStories && b.hasUnseenStories) return 1;
      return new Date(b.latestStoryAt).getTime() - new Date(a.latestStoryAt).getTime();
    });

    return [...own, ...followed, ...suggested];
  },
}));
