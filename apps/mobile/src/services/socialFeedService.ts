// Social Feed API service — fetch, create, and interact with feed posts
// Features: follow system, photo/video/text posts, profanity filter
// Uses real API with mock data fallback for dev mode

import api from './api';
import { devMockOrThrow, assertDevOnly } from '../utils/mockGuard';

// ─── Types ─────────────────────────────────────────────────────

export type FeedFilter = 'ONERILEN' | 'TAKIP';

export type FeedPostType = 'photo' | 'video' | 'text';

export interface FeedPostTypeOption {
  type: FeedPostType;
  emoji: string;
  label: string;
  color: string;
}

export const FEED_POST_TYPES: FeedPostTypeOption[] = [
  { type: 'photo', emoji: '\uD83D\uDCF8', label: 'Fotograf', color: '#8B5CF6' },
  { type: 'video', emoji: '\uD83C\uDFA5', label: 'Video', color: '#EC4899' },
  { type: 'text', emoji: '\u270D\uFE0F', label: 'Yazi', color: '#10B981' },
];

export type IntentionTag = 'SERIOUS_RELATIONSHIP' | 'EXPLORING' | 'NOT_SURE';

export interface IntentionTagOption {
  id: IntentionTag;
  label: string;
  emoji: string;
  color: string;
}

export const INTENTION_TAG_OPTIONS: IntentionTagOption[] = [
  { id: 'SERIOUS_RELATIONSHIP', label: 'Ciddi İlişki', emoji: '\uD83D\uDC8D', color: '#A78BFA' },
  { id: 'EXPLORING', label: 'Keşfediyorum', emoji: '\uD83D\uDC9C', color: '#8B5CF6' },
  { id: 'NOT_SURE', label: 'Arkadaş Arıyorum', emoji: '\uD83D\uDC65', color: '#6366F1' },
];

/** Verification level — controls badge visibility and style */
export type VerificationLevel = 'NONE' | 'VERIFIED' | 'PREMIUM';

export interface FeedPost {
  id: string;
  userId: string;
  userName: string;
  userAge: number;
  userCity: string;
  userAvatarUrl: string;
  isVerified: boolean;
  verificationLevel: VerificationLevel;
  isFollowing: boolean;
  intentionTag: IntentionTag;
  postType: FeedPostType;
  content: string;
  photoUrls: string[];
  videoUrl: string | null;
  likeCount: number;
  isLiked: boolean;
  createdAt: string;
}

export interface CommentReply {
  id: string;
  parentCommentId: string;
  userId: string;
  userName: string;
  userAvatarUrl: string;
  content: string;
  createdAt: string;
}

export interface FeedComment {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl: string;
  content: string;
  createdAt: string;
  likeCount: number;
  isLiked: boolean;
  replies: CommentReply[];
}

export interface CreatePostRequest {
  content: string;
  postType: FeedPostType;
  photoUrls: string[];
  videoUrl?: string | null;
}

export interface FeedResponse {
  posts: FeedPost[];
  nextCursor: string | null;
  hasMore: boolean;
}

// ─── Profanity Filter (Turkish) ──────────────────────────────

const PROFANITY_LIST = [
  'amk', 'aq', 'amq', 'orospu', 'piç', 'pic', 'siktir', 'sikerim',
  'sikeyim', 'siktirgit', 'yarrak', 'yarrак', 'got', 'göt', 'meme',
  'kaltak', 'ibne', 'pezevenk', 'gavat', 'haysiyetsiz', 'şerefsiz',
  'bok', 'boktan', 'gerizekalı', 'salak', 'aptal', 'mal', 'dangalak',
  'puşt', 'kahpe', 'kevaşe', 'fahişe', 'oç', 'oc', 'sg', 'stfu',
  'fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy',
];

// Normalize Turkish chars for matching
const normalizeTr = (text: string): string =>
  text
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');

export const containsProfanity = (text: string): boolean => {
  const normalized = normalizeTr(text);
  // Split into words, also check substrings for common evasions
  const words = normalized.split(/\s+/);
  for (const word of words) {
    const cleanWord = word.replace(/[^a-z0-9]/g, '');
    for (const bad of PROFANITY_LIST) {
      const normalizedBad = normalizeTr(bad);
      if (cleanWord === normalizedBad || cleanWord.includes(normalizedBad)) {
        return true;
      }
    }
  }
  return false;
};

export const PROFANITY_WARNING = 'Paylaşımın uygunsuz içerik barındırıyor. Lütfen saygılı bir dil kullan.';

// ─── Mock Data ────────────────────────────────────────────────

const now = new Date();
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();

const MOCK_POSTS: FeedPost[] = [
  {
    id: 'post-001',
    userId: 'bot-001',
    userName: 'Elif',
    userAge: 26,
    userCity: 'İstanbul',
    userAvatarUrl: 'https://i.pravatar.cc/150?img=1',
    isVerified: true,
    verificationLevel: 'VERIFIED',
    isFollowing: true,
    intentionTag: 'SERIOUS_RELATIONSHIP',
    postType: 'text',
    content: 'Bugün sahilde yürüyüş yaptım ve kendi kendime düşündüm: hayatta en çok neye değer veriyorum? Cevap hep aynı: samimi insanlar.',
    photoUrls: [],
    videoUrl: null,
    likeCount: 42,
    isLiked: false,
    createdAt: minutesAgo(12),
  },
  {
    id: 'post-002',
    userId: 'bot-002',
    userName: 'Zeynep',
    userAge: 24,
    userCity: 'Ankara',
    userAvatarUrl: 'https://i.pravatar.cc/150?img=5',
    isVerified: true,
    verificationLevel: 'PREMIUM',
    isFollowing: false,
    intentionTag: 'EXPLORING',
    postType: 'text',
    content: 'İlk buluşmada karşı tarafta en çok neye dikkat edersiniz? Ben göz teması ve dinleme becerisine bakıyorum.',
    photoUrls: [],
    videoUrl: null,
    likeCount: 67,
    isLiked: true,
    createdAt: minutesAgo(35),
  },
  {
    id: 'post-003',
    userId: 'bot-006',
    userName: 'Merve',
    userAge: 28,
    userCity: 'İzmir',
    userAvatarUrl: 'https://i.pravatar.cc/150?img=23',
    isVerified: true,
    verificationLevel: 'VERIFIED',
    isFollowing: true,
    intentionTag: 'SERIOUS_RELATIONSHIP',
    postType: 'photo',
    content: 'Kapadokya\'da gün doğumu... Balon turu hayatımın en güzel deneyimiydi. Yanınızda doğru insanla her yer cennet.',
    photoUrls: ['https://picsum.photos/seed/cappadocia/600/400'],
    videoUrl: null,
    likeCount: 128,
    isLiked: false,
    createdAt: hoursAgo(1),
  },
  {
    id: 'post-004',
    userId: 'bot-004',
    userName: 'Ayşe',
    userAge: 23,
    userCity: 'Bursa',
    userAvatarUrl: 'https://i.pravatar.cc/150?img=16',
    isVerified: false,
    verificationLevel: 'NONE',
    isFollowing: false,
    intentionTag: 'NOT_SURE',
    postType: 'text',
    content: 'Yağmurlu bir akşamda Fazıl Say dinlemek... Ruhumu iyileştiren tek şey bu. Müzik seven biri varsa yazışalım!',
    photoUrls: [],
    videoUrl: null,
    likeCount: 53,
    isLiked: false,
    createdAt: hoursAgo(2),
  },
];

// Track followed user IDs locally for mock
const followedUserIds = new Set<string>(
  MOCK_POSTS.filter((p) => p.isFollowing).map((p) => p.userId),
);

// ─── Service ──────────────────────────────────────────────────

export const socialFeedService = {
  // Fetch feed posts with filter and pagination
  getFeed: async (
    filter: FeedFilter,
    cursor: string | null,
  ): Promise<FeedResponse> => {
    try {
      const response = await api.get<FeedResponse>('/posts', {
        params: { filter, cursor },
      });
      return response.data;
    } catch (error) {
      // Fallback to mock data in dev mode
      let filtered = MOCK_POSTS.map((p) => ({
        ...p,
        isFollowing: followedUserIds.has(p.userId),
      }));

      if (filter === 'TAKIP') {
        // ── Takip: only followed users, chronological ──
        filtered = filtered
          .filter((p) => p.isFollowing)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      } else {
        // ── Populer: sort by likes + recency ──
        filtered = filtered.sort((a, b) => {
          const ageA = (now.getTime() - new Date(a.createdAt).getTime()) / 3_600_000;
          const ageB = (now.getTime() - new Date(b.createdAt).getTime()) / 3_600_000;
          const scoreA = a.likeCount + Math.max(0, 1 - ageA / 48) * 60;
          const scoreB = b.likeCount + Math.max(0, 1 - ageB / 48) * 60;
          return scoreB - scoreA;
        });
      }

      return devMockOrThrow(error, {
        posts: filtered,
        nextCursor: null,
        hasMore: false,
      }, 'socialFeedService.getFeed');
    }
  },

  // Create a new post
  createPost: async (data: CreatePostRequest): Promise<FeedPost> => {
    try {
      const response = await api.post<FeedPost>('/posts', data);
      return response.data;
    } catch (error) {
      const mockPost: FeedPost = {
        id: `post-dev-${Date.now()}`,
        userId: 'dev-user-001',
        userName: 'Sen',
        userAge: 0,
        userCity: '',
        userAvatarUrl: 'https://i.pravatar.cc/150?img=68',
        isVerified: true,
        verificationLevel: 'VERIFIED' as const,
        isFollowing: false,
        intentionTag: 'EXPLORING',
        postType: data.postType,
        content: data.content,
        photoUrls: data.photoUrls,
        videoUrl: data.videoUrl ?? null,
        likeCount: 0,
        isLiked: false,
        createdAt: new Date().toISOString(),
      };
      // Add to mock array so it persists across re-fetches
      MOCK_POSTS.unshift(mockPost);
      return devMockOrThrow(error, mockPost, 'socialFeedService.createPost');
    }
  },

  // Toggle like on a post
  toggleLike: async (postId: string): Promise<{ liked: boolean; likeCount: number }> => {
    try {
      const response = await api.post<{ liked: boolean; likeCount: number }>(
        `/posts/${postId}/like`,
      );
      return response.data;
    } catch (error) {
      return devMockOrThrow(error, { liked: true, likeCount: 0 }, 'socialFeedService.toggleLike');
    }
  },

  // Follow / unfollow a user
  toggleFollow: async (userId: string): Promise<{ isFollowing: boolean }> => {
    try {
      const response = await api.post<{ isFollowing: boolean }>(`/users/${userId}/follow`);
      return response.data;
    } catch (error) {
      // Mock toggle
      const wasFollowing = followedUserIds.has(userId);
      if (wasFollowing) {
        followedUserIds.delete(userId);
      } else {
        followedUserIds.add(userId);
      }
      return devMockOrThrow(error, { isFollowing: !wasFollowing }, 'socialFeedService.toggleFollow');
    }
  },

  // Get comments for a post
  getComments: async (postId: string): Promise<FeedComment[]> => {
    try {
      const response = await api.get<FeedComment[]>(`/posts/${postId}/comments`);
      return response.data;
    } catch (error) {
      const count = Math.min(3, 5);
      const mockComments: FeedComment[] = [];
      const names = ['Deniz', 'Ceren', 'Ela', 'Sude', 'Ece'];
      const texts = [
        'Çok güzel bir paylaşım, katılıyorum!',
        'Ben de aynı şekilde düşünüyorum.',
        'Harika bir bakış açısı, teşekkürler!',
        'Bu konuda çok haklısın.',
        'Kesinlikle, bunu herkesin bilmesi lazım.',
      ];
      const replyTexts = [
        'Kesinlikle katılıyorum!',
        'Çok doğru söylüyorsun.',
        'Ben de öyle düşünüyorum.',
      ];
      for (let i = 0; i < count; i++) {
        const commentId = `comment-${postId}-${i}`;
        const replies: import('./socialFeedService').CommentReply[] = i === 0
          ? [{
              id: `reply-${postId}-0-0`,
              parentCommentId: commentId,
              userId: 'bot-comment-reply-0',
              userName: 'Sude',
              userAvatarUrl: 'https://i.pravatar.cc/150?img=53',
              content: replyTexts[0],
              createdAt: minutesAgo((i + 1) * 10),
            }]
          : [];
        mockComments.push({
          id: commentId,
          userId: `bot-comment-${i}`,
          userName: names[i % names.length],
          userAvatarUrl: `https://i.pravatar.cc/150?img=${50 + i}`,
          content: texts[i % texts.length],
          createdAt: minutesAgo((i + 1) * 15),
          likeCount: Math.floor(Math.random() * 20),
          isLiked: false,
          replies,
        });
      }
      return devMockOrThrow(error, mockComments, 'socialFeedService.getComments');
    }
  },

  // Add a comment to a post
  addComment: async (postId: string, content: string): Promise<FeedComment> => {
    try {
      const response = await api.post<FeedComment>(`/posts/${postId}/comments`, { content });
      return response.data;
    } catch (error) {
      return devMockOrThrow(error, {
        id: `comment-dev-${Date.now()}`,
        userId: 'dev-user-001',
        userName: 'Sen',
        userAvatarUrl: 'https://i.pravatar.cc/150?img=68',
        content,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        isLiked: false,
        replies: [],
      }, 'socialFeedService.addComment');
    }
  },

  // Like/unlike a comment
  likeComment: async (commentId: string): Promise<{ likeCount: number; isLiked: boolean }> => {
    try {
      const response = await api.post<{ likeCount: number; isLiked: boolean }>(
        `/posts/comments/${commentId}/like`
      );
      return response.data;
    } catch (error) {
      return devMockOrThrow(error, { likeCount: 0, isLiked: true }, 'socialFeedService.likeComment');
    }
  },

  // Reply to a comment
  replyToComment: async (
    postId: string,
    commentId: string,
    content: string
  ): Promise<CommentReply> => {
    try {
      const response = await api.post<CommentReply>(
        `/posts/${postId}/comments/${commentId}/replies`,
        { content }
      );
      return response.data;
    } catch (error) {
      return devMockOrThrow(error, {
        id: `reply-dev-${Date.now()}`,
        parentCommentId: commentId,
        userId: 'dev-user-001',
        userName: 'Sen',
        userAvatarUrl: 'https://i.pravatar.cc/150?img=68',
        content,
        createdAt: new Date().toISOString(),
      }, 'socialFeedService.replyToComment');
    }
  },

  // Get mock posts (used by devSeedData)
  getMockPosts: (): FeedPost[] => {
    assertDevOnly('socialFeedService.getMockPosts');
    return [...MOCK_POSTS];
  },
};
