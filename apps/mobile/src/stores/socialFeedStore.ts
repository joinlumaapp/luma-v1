// Social Feed store — Zustand store for Sosyal Akış feature

import { create } from 'zustand';
import {
  socialFeedService,
  type FeedPost,
  type FeedFilter,
  type FeedTopic,
  type CreatePostRequest,
} from '../services/socialFeedService';

interface SocialFeedState {
  // State
  posts: FeedPost[];
  filter: FeedFilter;
  selectedTopic: FeedTopic | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isCreating: boolean;
  cursor: string | null;
  hasMore: boolean;

  // Actions
  fetchFeed: () => Promise<void>;
  refreshFeed: () => Promise<void>;
  loadMore: () => Promise<void>;
  setFilter: (filter: FeedFilter) => void;
  setTopic: (topic: FeedTopic | null) => void;
  toggleLike: (postId: string) => Promise<void>;
  toggleFollow: (userId: string) => Promise<void>;
  createPost: (data: CreatePostRequest) => Promise<void>;
  incrementCommentCount: (postId: string) => void;
}

export const useSocialFeedStore = create<SocialFeedState>((set, get) => ({
  // Initial state
  posts: [],
  filter: 'ONERILEN',
  selectedTopic: null,
  isLoading: false,
  isRefreshing: false,
  isCreating: false,
  cursor: null,
  hasMore: false,

  // Actions
  fetchFeed: async () => {
    const { filter, selectedTopic } = get();
    set({ isLoading: true });
    try {
      const response = await socialFeedService.getFeed(filter, selectedTopic, null);
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
    const { filter, selectedTopic } = get();
    set({ isRefreshing: true });
    try {
      const response = await socialFeedService.getFeed(filter, selectedTopic, null);
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
    const { filter, selectedTopic, cursor, hasMore, isLoading } = get();
    if (!hasMore || isLoading) return;
    set({ isLoading: true });
    try {
      const response = await socialFeedService.getFeed(filter, selectedTopic, cursor);
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
    set({ filter, posts: [], cursor: null, hasMore: false });
    get().fetchFeed();
  },

  setTopic: (topic: FeedTopic | null) => {
    set({ selectedTopic: topic, posts: [], cursor: null, hasMore: false });
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
    // Optimistic update
    set((state) => ({
      posts: state.posts.map((post) =>
        post.userId === userId
          ? { ...post, isFollowing: !post.isFollowing }
          : post
      ),
    }));
    try {
      await socialFeedService.toggleFollow(userId);
    } catch {
      // Revert on error
      set((state) => ({
        posts: state.posts.map((post) =>
          post.userId === userId
            ? { ...post, isFollowing: !post.isFollowing }
            : post
        ),
      }));
    }
  },

  incrementCommentCount: (postId: string) => {
    set((state) => ({
      posts: state.posts.map((post) =>
        post.id === postId
          ? { ...post, commentCount: post.commentCount + 1 }
          : post
      ),
    }));
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
}));
