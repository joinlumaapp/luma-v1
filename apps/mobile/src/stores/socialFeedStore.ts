// Social Feed store — Zustand store for Sosyal Akış feature

import { create } from 'zustand';
import {
  socialFeedService,
  type FeedPost,
  type FeedFilter,
  type CreatePostRequest,
} from '../services/socialFeedService';

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

  // Actions
  fetchFeed: () => Promise<void>;
  refreshFeed: () => Promise<void>;
  loadMore: () => Promise<void>;
  setFilter: (filter: FeedFilter) => void;
  toggleLike: (postId: string) => Promise<void>;
  toggleFollow: (userId: string) => Promise<void>;
  createPost: (data: CreatePostRequest) => Promise<void>;
  markStoryViewed: (userId: string) => void;
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

  // Actions
  fetchFeed: async () => {
    const { filter } = get();
    set({ isLoading: true });
    try {
      const response = await socialFeedService.getFeed(filter, null);
      let posts = response.posts;

      // For TAKIP: if API returned empty but we have follow state, use Popüler data filtered
      if (filter === 'TAKIP' && posts.length === 0) {
        const allResponse = await socialFeedService.getFeed('ONERILEN', null);
        posts = allResponse.posts.filter((p) => p.isFollowing);
      }

      set({
        posts,
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
}));
