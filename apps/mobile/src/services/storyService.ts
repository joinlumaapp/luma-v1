// Story API service — Instagram-quality story system for LUMA
// Handles story CRUD, view tracking, and reply functionality
// Currently uses mock data; connects to real API when backend is ready

import api from './api';

// ─── Types ─────────────────────────────────────────────────────

export interface StoryOverlay {
  type: 'text' | 'sticker' | 'drawing';
  /** Normalized position (0-1) relative to story dimensions */
  x: number;
  y: number;
  /** For text overlays */
  content?: string;
  fontSize?: number;
  color?: string;
  /** For sticker overlays */
  emoji?: string;
  /** For drawing overlays — SVG path data */
  pathData?: string;
  brushSize?: number;
  brushColor?: string;
}

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  overlays: StoryOverlay[];
  viewCount: number;
  viewers: StoryViewer[];
  createdAt: string;
  expiresAt: string;
  isLiked: boolean;
  likeCount: number;
}

export interface StoryUser {
  userId: string;
  userName: string;
  userAvatarUrl: string;
  stories: Story[];
  hasUnseenStories: boolean;
  latestStoryAt: string;
}

export interface StoryViewer {
  userId: string;
  userName: string;
  userAvatarUrl: string;
  viewedAt: string;
}

export interface CreateStoryRequest {
  mediaUri: string;
  mediaType: 'image' | 'video';
  overlays: StoryOverlay[];
}

export interface StoryReplyRequest {
  storyId: string;
  message: string;
}

// ─── Mock Data ────────────────────────────────────────────────

const now = new Date();
const hoursAgo = (h: number): string =>
  new Date(now.getTime() - h * 3_600_000).toISOString();
const hoursFromNow = (h: number): string =>
  new Date(now.getTime() + h * 3_600_000).toISOString();

const MOCK_STORY_USERS: StoryUser[] = [
  {
    userId: 'bot-001',
    userName: 'Elif',
    userAvatarUrl: 'https://i.pravatar.cc/150?img=1',
    hasUnseenStories: true,
    latestStoryAt: hoursAgo(1),
    stories: [
      {
        id: 'story-001',
        userId: 'bot-001',
        userName: 'Elif',
        userAvatarUrl: 'https://i.pravatar.cc/150?img=1',
        mediaUrl: 'https://picsum.photos/seed/elif1/1080/1920',
        mediaType: 'image',
        overlays: [
          { type: 'text', x: 0.5, y: 0.4, content: 'Sahilde harika bir gun', fontSize: 24, color: '#FFFFFF' },
        ],
        viewCount: 34,
        viewers: [],
        createdAt: hoursAgo(2),
        expiresAt: hoursFromNow(22),
        isLiked: false,
        likeCount: 12,
      },
      {
        id: 'story-002',
        userId: 'bot-001',
        userName: 'Elif',
        userAvatarUrl: 'https://i.pravatar.cc/150?img=1',
        mediaUrl: 'https://picsum.photos/seed/elif2/1080/1920',
        mediaType: 'image',
        overlays: [],
        viewCount: 28,
        viewers: [],
        createdAt: hoursAgo(1),
        expiresAt: hoursFromNow(23),
        isLiked: false,
        likeCount: 8,
      },
    ],
  },
  {
    userId: 'bot-006',
    userName: 'Merve',
    userAvatarUrl: 'https://i.pravatar.cc/150?img=23',
    hasUnseenStories: true,
    latestStoryAt: hoursAgo(3),
    stories: [
      {
        id: 'story-003',
        userId: 'bot-006',
        userName: 'Merve',
        userAvatarUrl: 'https://i.pravatar.cc/150?img=23',
        mediaUrl: 'https://picsum.photos/seed/merve1/1080/1920',
        mediaType: 'image',
        overlays: [
          { type: 'sticker', x: 0.8, y: 0.2, emoji: '\u2764\uFE0F' },
        ],
        viewCount: 56,
        viewers: [],
        createdAt: hoursAgo(3),
        expiresAt: hoursFromNow(21),
        isLiked: true,
        likeCount: 23,
      },
    ],
  },
  {
    userId: 'bot-005',
    userName: 'Defne',
    userAvatarUrl: 'https://i.pravatar.cc/150?img=20',
    hasUnseenStories: false,
    latestStoryAt: hoursAgo(8),
    stories: [
      {
        id: 'story-004',
        userId: 'bot-005',
        userName: 'Defne',
        userAvatarUrl: 'https://i.pravatar.cc/150?img=20',
        mediaUrl: 'https://picsum.photos/seed/defne1/1080/1920',
        mediaType: 'image',
        overlays: [],
        viewCount: 42,
        viewers: [],
        createdAt: hoursAgo(8),
        expiresAt: hoursFromNow(16),
        isLiked: false,
        likeCount: 15,
      },
    ],
  },
  {
    userId: 'bot-007',
    userName: 'Buse',
    userAvatarUrl: 'https://i.pravatar.cc/150?img=25',
    hasUnseenStories: true,
    latestStoryAt: hoursAgo(5),
    stories: [
      {
        id: 'story-005',
        userId: 'bot-007',
        userName: 'Buse',
        userAvatarUrl: 'https://i.pravatar.cc/150?img=25',
        mediaUrl: 'https://picsum.photos/seed/buse1/1080/1920',
        mediaType: 'image',
        overlays: [
          { type: 'text', x: 0.5, y: 0.7, content: 'Kahve zamani', fontSize: 20, color: '#FCD34D' },
        ],
        viewCount: 19,
        viewers: [],
        createdAt: hoursAgo(5),
        expiresAt: hoursFromNow(19),
        isLiked: false,
        likeCount: 7,
      },
    ],
  },
  {
    userId: 'bot-010',
    userName: 'Ebru',
    userAvatarUrl: 'https://i.pravatar.cc/150?img=36',
    hasUnseenStories: true,
    latestStoryAt: hoursAgo(4),
    stories: [
      {
        id: 'story-006',
        userId: 'bot-010',
        userName: 'Ebru',
        userAvatarUrl: 'https://i.pravatar.cc/150?img=36',
        mediaUrl: 'https://picsum.photos/seed/ebru1/1080/1920',
        mediaType: 'image',
        overlays: [],
        viewCount: 31,
        viewers: [],
        createdAt: hoursAgo(4),
        expiresAt: hoursFromNow(20),
        isLiked: false,
        likeCount: 11,
      },
      {
        id: 'story-007',
        userId: 'bot-010',
        userName: 'Ebru',
        userAvatarUrl: 'https://i.pravatar.cc/150?img=36',
        mediaUrl: 'https://picsum.photos/seed/ebru2/1080/1920',
        mediaType: 'image',
        overlays: [
          { type: 'text', x: 0.5, y: 0.3, content: 'Dag yuruyusu', fontSize: 22, color: '#FFFFFF' },
        ],
        viewCount: 25,
        viewers: [],
        createdAt: hoursAgo(2),
        expiresAt: hoursFromNow(22),
        isLiked: false,
        likeCount: 9,
      },
    ],
  },
];

// Track seen story IDs locally for mock
const seenStoryIds = new Set<string>();

// ─── Service ──────────────────────────────────────────────────

export const storyService = {
  /** Fetch all active stories (within 24h) from matched/followed users */
  getStories: async (): Promise<StoryUser[]> => {
    try {
      const response = await api.get<StoryUser[]>('/stories');
      return response.data;
    } catch {
      // Fallback to mock data
      return MOCK_STORY_USERS.map((user) => ({
        ...user,
        hasUnseenStories: user.stories.some((s) => !seenStoryIds.has(s.id)),
      }));
    }
  },

  /** Create a new story with media and overlays */
  createStory: async (data: CreateStoryRequest): Promise<Story> => {
    try {
      const formData = new FormData();
      formData.append('media', {
        uri: data.mediaUri,
        type: data.mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
        name: `story_${Date.now()}.${data.mediaType === 'video' ? 'mp4' : 'jpg'}`,
      } as unknown as Blob);
      formData.append('overlays', JSON.stringify(data.overlays));

      const response = await api.post<Story>('/stories', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch {
      // Mock story creation
      const story: Story = {
        id: `story-dev-${Date.now()}`,
        userId: 'dev-user-001',
        userName: 'Sen',
        userAvatarUrl: 'https://i.pravatar.cc/150?img=68',
        mediaUrl: data.mediaUri,
        mediaType: data.mediaType,
        overlays: data.overlays,
        viewCount: 0,
        viewers: [],
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isLiked: false,
        likeCount: 0,
      };
      return story;
    }
  },

  /** Delete own story */
  deleteStory: async (storyId: string): Promise<void> => {
    try {
      await api.delete(`/stories/${storyId}`);
    } catch {
      // Mock deletion — no-op in dev
    }
  },

  /** Get list of users who viewed a story */
  getStoryViewers: async (storyId: string): Promise<StoryViewer[]> => {
    try {
      const response = await api.get<StoryViewer[]>(`/stories/${storyId}/viewers`);
      return response.data;
    } catch {
      // Mock viewers
      return [
        {
          userId: 'bot-002',
          userName: 'Zeynep',
          userAvatarUrl: 'https://i.pravatar.cc/150?img=5',
          viewedAt: new Date(Date.now() - 30 * 60_000).toISOString(),
        },
        {
          userId: 'bot-003',
          userName: 'Selin',
          userAvatarUrl: 'https://i.pravatar.cc/150?img=9',
          viewedAt: new Date(Date.now() - 45 * 60_000).toISOString(),
        },
      ];
    }
  },

  /** Mark a story as viewed */
  markAsViewed: async (storyId: string): Promise<void> => {
    seenStoryIds.add(storyId);
    try {
      await api.post(`/stories/${storyId}/view`);
    } catch {
      // Non-critical — local tracking is sufficient
    }
  },

  /** Reply to a story — creates a chat message with story context */
  replyToStory: async (storyId: string, message: string): Promise<void> => {
    try {
      await api.post(`/stories/${storyId}/reply`, { message });
    } catch {
      // Mock reply — no-op in dev
    }
  },

  /** Like/unlike a story */
  toggleLike: async (storyId: string): Promise<{ liked: boolean; likeCount: number }> => {
    try {
      const response = await api.post<{ liked: boolean; likeCount: number }>(
        `/stories/${storyId}/like`,
      );
      return response.data;
    } catch {
      return { liked: true, likeCount: 0 };
    }
  },
};
