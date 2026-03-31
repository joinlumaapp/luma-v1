// Social Feed store — Zustand store for Sosyal Akış feature

import { create } from 'zustand';
import {
  socialFeedService,
  type FeedPost,
  type FeedFilter,
  type CreatePostRequest,
} from '../services/socialFeedService';
import { storage } from '../utils/storage';

// ── Persistence keys ──────────────────────────────────────────────
const STORAGE_KEYS = {
  DAILY_POST_COUNT: 'feed.dailyPostCount',
  LAST_POST_DATE: 'feed.lastPostDate',
  DAILY_STORY_COUNT: 'feed.dailyStoryCount',
  LAST_STORY_DATE: 'feed.lastStoryDate',
  DAILY_FOLLOW_COUNT: 'feed.dailyFollowCount',
  LAST_FOLLOW_DATE: 'feed.lastFollowDate',
} as const;

const getToday = (): string => new Date().toISOString().slice(0, 10);

interface SocialFeedState {
  // State
  posts: FeedPost[];
  filter: FeedFilter;
  isLoading: boolean;
  isRefreshing: boolean;
  isCreating: boolean;
  cursor: string | null;
  hasMore: boolean;
  viewedStoryUserIds: Set<string>;

  // Daily post limit (persisted)
  dailyPostCount: number;
  lastPostDate: string | null;

  // Daily story limit (persisted)
  dailyStoryCount: number;
  lastStoryDate: string | null;

  // Daily follow limit (persisted)
  dailyFollowCount: number;
  lastFollowDate: string | null;

  // Actions
  fetchFeed: () => Promise<void>;
  refreshFeed: () => Promise<void>;
  loadMore: () => Promise<void>;
  setFilter: (filter: FeedFilter) => void;
  toggleLike: (postId: string) => Promise<void>;
  toggleFollow: (userId: string) => Promise<void>;
  createPost: (data: CreatePostRequest) => Promise<void>;
  markStoryViewed: (userId: string) => void;

  // Daily limit actions
  incrementDailyPost: () => void;
  resetDailyPostIfNeeded: () => void;
  incrementDailyStory: () => void;
  resetDailyStoryIfNeeded: () => void;
  incrementDailyFollow: () => void;
  resetDailyFollowIfNeeded: () => void;
}

export const useSocialFeedStore = create<SocialFeedState>((set, get) => ({
  // Initial state
  posts: [],
  filter: 'ONERILEN',
  isLoading: false,
  isRefreshing: false,
  isCreating: false,
  cursor: null,
  hasMore: false,
  viewedStoryUserIds: new Set<string>(),

  // Hydrate daily limits from persisted storage (sync via cache)
  dailyPostCount: storage.getNumber(STORAGE_KEYS.DAILY_POST_COUNT) ?? 0,
  lastPostDate: storage.getString(STORAGE_KEYS.LAST_POST_DATE),
  dailyStoryCount: storage.getNumber(STORAGE_KEYS.DAILY_STORY_COUNT) ?? 0,
  lastStoryDate: storage.getString(STORAGE_KEYS.LAST_STORY_DATE),

  dailyFollowCount: storage.getNumber(STORAGE_KEYS.DAILY_FOLLOW_COUNT) ?? 0,
  lastFollowDate: storage.getString(STORAGE_KEYS.LAST_FOLLOW_DATE),

  // Actions
  fetchFeed: async () => {
    const { filter } = get();
    set({ isLoading: true });
    try {
      // Service handles TAKIP fallback internally — no double-fetch needed
      const response = await socialFeedService.getFeed(filter, null);
      set({
        posts: response.posts,
        cursor: response.nextCursor,
        hasMore: response.hasMore,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  refreshFeed: async () => {
    const { filter } = get();
    set({ isRefreshing: true });
    try {
      const response = await socialFeedService.getFeed(filter, null);
      set({
        posts: response.posts,
        cursor: response.nextCursor,
        hasMore: response.hasMore,
        isRefreshing: false,
      });
    } catch {
      set({ isRefreshing: false });
    }
  },

  loadMore: async () => {
    const { filter, cursor, hasMore, isLoading } = get();
    if (!hasMore || isLoading) return;
    set({ isLoading: true });
    try {
      const response = await socialFeedService.getFeed(filter, cursor);
      set((state) => ({
        posts: [...state.posts, ...response.posts],
        cursor: response.nextCursor,
        hasMore: response.hasMore,
        isLoading: false,
      }));
    } catch {
      set({ isLoading: false });
    }
  },

  setFilter: (filter: FeedFilter) => {
    const currentPosts = get().posts;
    if (filter === 'TAKIP') {
      // Show followed users' posts immediately from current state
      const followedPosts = currentPosts.filter((p) => p.isFollowing);
      set({ filter, posts: followedPosts, cursor: null, hasMore: false });
    } else {
      set({ filter, posts: [], cursor: null, hasMore: false });
    }
    get().fetchFeed();
  },

  toggleLike: async (postId: string) => {
    // Optimistic update
    set((state) => ({
      posts: state.posts.map((post) =>
        post.id === postId
          ? {
              ...post,
              isLiked: !post.isLiked,
              likeCount: post.isLiked ? post.likeCount - 1 : post.likeCount + 1,
            }
          : post
      ),
    }));
    try {
      await socialFeedService.toggleLike(postId);
    } catch {
      // Revert optimistic update on error
      set((state) => ({
        posts: state.posts.map((post) =>
          post.id === postId
            ? {
                ...post,
                isLiked: !post.isLiked,
                likeCount: post.isLiked ? post.likeCount - 1 : post.likeCount + 1,
              }
            : post
        ),
      }));
    }
  },

  toggleFollow: async (userId: string) => {
    const { filter } = get();
    // Find current follow state from first matching post
    const currentPost = get().posts.find((p) => p.userId === userId);
    const wasFollowing = currentPost?.isFollowing ?? false;

    // Optimistic update: toggle isFollowing flag on all posts by this user
    set((state) => {
      const updatedPosts = state.posts.map((post) =>
        post.userId === userId
          ? { ...post, isFollowing: !wasFollowing }
          : post
      );
      // If on TAKIP tab and unfollowing, remove their posts from view
      if (filter === 'TAKIP' && wasFollowing) {
        return { posts: updatedPosts.filter((p) => p.userId !== userId) };
      }
      return { posts: updatedPosts };
    });

    try {
      await socialFeedService.toggleFollow(userId);
    } catch {
      // Revert on error — re-fetch to get correct state
      get().fetchFeed();
    }
  },

  createPost: async (data: CreatePostRequest) => {
    set({ isCreating: true });
    try {
      const newPost = await socialFeedService.createPost(data);
      set((state) => ({
        posts: [newPost, ...state.posts],
        isCreating: false,
      }));
    } catch {
      set({ isCreating: false });
    }
  },

  markStoryViewed: (userId: string) => {
    set((state) => {
      const next = new Set(state.viewedStoryUserIds);
      next.add(userId);
      return { viewedStoryUserIds: next };
    });
  },

  // ── Daily post limit actions ────────────────────────────────────
  incrementDailyPost: () => {
    const today = getToday();
    const { lastPostDate, dailyPostCount } = get();
    const newCount = lastPostDate === today ? dailyPostCount + 1 : 1;
    set({ dailyPostCount: newCount, lastPostDate: today });
    storage.setNumber(STORAGE_KEYS.DAILY_POST_COUNT, newCount);
    storage.setString(STORAGE_KEYS.LAST_POST_DATE, today);
  },

  resetDailyPostIfNeeded: () => {
    const today = getToday();
    const { lastPostDate } = get();
    if (lastPostDate !== today) {
      set({ dailyPostCount: 0, lastPostDate: today });
      storage.setNumber(STORAGE_KEYS.DAILY_POST_COUNT, 0);
      storage.setString(STORAGE_KEYS.LAST_POST_DATE, today);
    }
  },

  // ── Daily story limit actions ───────────────────────────────────
  incrementDailyStory: () => {
    const today = getToday();
    const { lastStoryDate, dailyStoryCount } = get();
    const newCount = lastStoryDate === today ? dailyStoryCount + 1 : 1;
    set({ dailyStoryCount: newCount, lastStoryDate: today });
    storage.setNumber(STORAGE_KEYS.DAILY_STORY_COUNT, newCount);
    storage.setString(STORAGE_KEYS.LAST_STORY_DATE, today);
  },

  resetDailyStoryIfNeeded: () => {
    const today = getToday();
    const { lastStoryDate } = get();
    if (lastStoryDate !== today) {
      set({ dailyStoryCount: 0, lastStoryDate: today });
      storage.setNumber(STORAGE_KEYS.DAILY_STORY_COUNT, 0);
      storage.setString(STORAGE_KEYS.LAST_STORY_DATE, today);
    }
  },

  // ── Daily follow limit actions ─────────────────────────────────
  incrementDailyFollow: () => {
    const today = getToday();
    const { lastFollowDate, dailyFollowCount } = get();
    const newCount = lastFollowDate === today ? dailyFollowCount + 1 : 1;
    set({ dailyFollowCount: newCount, lastFollowDate: today });
    storage.setNumber(STORAGE_KEYS.DAILY_FOLLOW_COUNT, newCount);
    storage.setString(STORAGE_KEYS.LAST_FOLLOW_DATE, today);
  },

  resetDailyFollowIfNeeded: () => {
    const today = getToday();
    const { lastFollowDate } = get();
    if (lastFollowDate !== today) {
      set({ dailyFollowCount: 0, lastFollowDate: today });
      storage.setNumber(STORAGE_KEYS.DAILY_FOLLOW_COUNT, 0);
      storage.setString(STORAGE_KEYS.LAST_FOLLOW_DATE, today);
    }
  },
}));
