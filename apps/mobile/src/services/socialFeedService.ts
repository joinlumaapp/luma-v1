// Social Feed API service — fetch, create, and interact with feed posts
// Features: follow system, photo/video posts, profanity filter
// Currently uses mock data; will connect to real API when backend is ready

import api from './api';

// ─── Types ─────────────────────────────────────────────────────

export type FeedTopic = 'BURC' | 'SORU_CEVAP' | 'ASK_IPUCU' | 'GUNLUK' | 'MUZIK' | 'SEYAHAT';

export interface FeedTopicOption {
  type: FeedTopic;
  emoji: string;
  label: string;
  color: string;
}

export const FEED_TOPICS: FeedTopicOption[] = [
  { type: 'BURC', emoji: '\uD83D\uDD2E', label: 'Burç', color: '#A78BFA' },
  { type: 'SORU_CEVAP', emoji: '\u2753', label: 'Soru-Cevap', color: '#3B82F6' },
  { type: 'ASK_IPUCU', emoji: '\uD83D\uDC95', label: 'Aşk İpucu', color: '#EC4899' },
  { type: 'GUNLUK', emoji: '\uD83D\uDCDD', label: 'Günlük', color: '#10B981' },
  { type: 'MUZIK', emoji: '\uD83C\uDFB5', label: 'Müzik', color: '#F59E0B' },
  { type: 'SEYAHAT', emoji: '\u2708\uFE0F', label: 'Seyahat', color: '#06B6D4' },
];

export type FeedFilter = 'ONERILEN' | 'GUNCEL' | 'TAKIP';

export interface FeedPost {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl: string;
  isVerified: boolean;
  isFollowing: boolean;
  topic: FeedTopic;
  content: string;
  photoUrls: string[];
  videoUrl: string | null;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
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
}

export interface CreatePostRequest {
  content: string;
  topic: FeedTopic;
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
    userAvatarUrl: 'https://i.pravatar.cc/150?img=1',
    isVerified: true,
    isFollowing: true,
    topic: 'GUNLUK',
    content: 'Bugün sahilde yürüyüş yaptım ve kendi kendime düşündüm: hayatta en çok neye değer veriyorum? Cevap hep aynı: samimi insanlar.',
    photoUrls: [],
    videoUrl: null,
    likeCount: 42,
    commentCount: 8,
    isLiked: false,
    createdAt: minutesAgo(12),
  },
  {
    id: 'post-002',
    userId: 'bot-002',
    userName: 'Zeynep',
    userAvatarUrl: 'https://i.pravatar.cc/150?img=5',
    isVerified: true,
    isFollowing: false,
    topic: 'SORU_CEVAP',
    content: 'İlk buluşmada karşı tarafta en çok neye dikkat edersiniz? Ben göz teması ve dinleme becerisine bakıyorum.',
    photoUrls: [],
    videoUrl: null,
    likeCount: 67,
    commentCount: 23,
    isLiked: true,
    createdAt: minutesAgo(35),
  },
  {
    id: 'post-003',
    userId: 'bot-006',
    userName: 'Merve',
    userAvatarUrl: 'https://i.pravatar.cc/150?img=23',
    isVerified: true,
    isFollowing: true,
    topic: 'SEYAHAT',
    content: 'Kapadokya\'da gün doğumu... Balon turu hayatımın en güzel deneyimiydi. Yanınızda doğru insanla her yer cennet.',
    photoUrls: ['https://picsum.photos/seed/cappadocia/600/400'],
    videoUrl: null,
    likeCount: 128,
    commentCount: 31,
    isLiked: false,
    createdAt: hoursAgo(1),
  },
  {
    id: 'post-004',
    userId: 'bot-004',
    userName: 'Ayşe',
    userAvatarUrl: 'https://i.pravatar.cc/150?img=16',
    isVerified: true,
    isFollowing: false,
    topic: 'MUZIK',
    content: 'Yağmurlu bir akşamda Fazıl Say dinlemek... Ruhumu iyileştiren tek şey bu. Müzik seven biri varsa yazışalım!',
    photoUrls: [],
    videoUrl: null,
    likeCount: 53,
    commentCount: 12,
    isLiked: false,
    createdAt: hoursAgo(2),
  },
  {
    id: 'post-005',
    userId: 'bot-005',
    userName: 'Defne',
    userAvatarUrl: 'https://i.pravatar.cc/150?img=20',
    isVerified: false,
    isFollowing: true,
    topic: 'BURC',
    content: 'Yay burçları bu hafta aşk konusunda çok şanslı! Venüs geçişi duygusal bağları güçlendiriyor. Kim Yay burcu burada?',
    photoUrls: [],
    videoUrl: null,
    likeCount: 89,
    commentCount: 45,
    isLiked: true,
    createdAt: hoursAgo(3),
  },
  {
    id: 'post-006',
    userId: 'bot-003',
    userName: 'Selin',
    userAvatarUrl: 'https://i.pravatar.cc/150?img=9',
    isVerified: false,
    isFollowing: false,
    topic: 'ASK_IPUCU',
    content: 'Bir ilişkide en önemli şey güven değil, güvenin sürdürülebilir olması. Küçük tutarlı davranışlar büyük sözlerden daha değerli.',
    photoUrls: [],
    videoUrl: null,
    likeCount: 156,
    commentCount: 28,
    isLiked: false,
    createdAt: hoursAgo(4),
  },
  {
    id: 'post-007',
    userId: 'bot-008',
    userName: 'Cansu',
    userAvatarUrl: 'https://i.pravatar.cc/150?img=29',
    isVerified: false,
    isFollowing: false,
    topic: 'GUNLUK',
    content: 'Bugün pilates sonrası kendimi o kadar iyi hissettim ki, pozitif enerji her yere yayıldı. Kendinize iyi bakmayı unutmayın!',
    photoUrls: ['https://picsum.photos/seed/yoga/600/400'],
    videoUrl: null,
    likeCount: 34,
    commentCount: 6,
    isLiked: false,
    createdAt: hoursAgo(5),
  },
  {
    id: 'post-008',
    userId: 'bot-011',
    userName: 'Naz',
    userAvatarUrl: 'https://i.pravatar.cc/150?img=38',
    isVerified: false,
    isFollowing: true,
    topic: 'MUZIK',
    content: 'Yeni bir şarkı prodüksiyonu bitirdim! Lo-fi beats + Türk enstrümanları karışımı. Müzikle terapi yapıyorum resmen.',
    photoUrls: [],
    videoUrl: null,
    likeCount: 71,
    commentCount: 15,
    isLiked: false,
    createdAt: hoursAgo(6),
  },
  {
    id: 'post-009',
    userId: 'bot-009',
    userName: 'İpek',
    userAvatarUrl: 'https://i.pravatar.cc/150?img=32',
    isVerified: true,
    isFollowing: false,
    topic: 'SORU_CEVAP',
    content: 'Uzun süreli ilişkilerde sıkılmamak için ne yapıyorsunuz? Biz partner ile her ay yeni bir hobi denemeye başladık.',
    photoUrls: [],
    videoUrl: null,
    likeCount: 93,
    commentCount: 37,
    isLiked: false,
    createdAt: hoursAgo(8),
  },
  {
    id: 'post-010',
    userId: 'bot-010',
    userName: 'Ebru',
    userAvatarUrl: 'https://i.pravatar.cc/150?img=36',
    isVerified: false,
    isFollowing: true,
    topic: 'SEYAHAT',
    content: 'Bu hafta sonu Bolu\'da dağ yürüyüşü yaptık. Doğada vakit geçirmek ilişkiyi güçlendiriyor, tavsiye ederim!',
    photoUrls: ['https://picsum.photos/seed/mountain/600/400'],
    videoUrl: null,
    likeCount: 45,
    commentCount: 9,
    isLiked: false,
    createdAt: hoursAgo(10),
  },
  {
    id: 'post-011',
    userId: 'bot-012',
    userName: 'Gizem',
    userAvatarUrl: 'https://i.pravatar.cc/150?img=41',
    isVerified: true,
    isFollowing: false,
    topic: 'ASK_IPUCU',
    content: 'Sevgi dili testini yaptınız mı? Partnerinizin sevgi dilini bilmek ilişkide çığır açıyor. Benim dilim kaliteli vakit.',
    photoUrls: [],
    videoUrl: null,
    likeCount: 112,
    commentCount: 42,
    isLiked: true,
    createdAt: hoursAgo(12),
  },
  {
    id: 'post-012',
    userId: 'bot-007',
    userName: 'Buse',
    userAvatarUrl: 'https://i.pravatar.cc/150?img=25',
    isVerified: true,
    isFollowing: true,
    topic: 'BURC',
    content: 'Terazi-Aslan uyumu hakkında ne düşünüyorsunuz? Arkadaşım bu ikili çok uyumlu diyor ama ben emin değilim.',
    photoUrls: [],
    videoUrl: null,
    likeCount: 58,
    commentCount: 19,
    isLiked: false,
    createdAt: hoursAgo(14),
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
    topic: FeedTopic | null,
    cursor: string | null,
  ): Promise<FeedResponse> => {
    try {
      const response = await api.get<FeedResponse>('/social-feed', {
        params: { filter, topic, cursor },
      });
      return response.data;
    } catch {
      // Fallback to mock data in dev mode
      let filtered = MOCK_POSTS.map((p) => ({
        ...p,
        isFollowing: followedUserIds.has(p.userId),
      }));
      if (topic) {
        filtered = filtered.filter((p) => p.topic === topic);
      }
      if (filter === 'TAKIP') {
        filtered = filtered.filter((p) => p.isFollowing);
      }
      if (filter === 'GUNCEL') {
        filtered = [...filtered].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      }
      return {
        posts: filtered,
        nextCursor: null,
        hasMore: false,
      };
    }
  },

  // Create a new post
  createPost: async (data: CreatePostRequest): Promise<FeedPost> => {
    try {
      const response = await api.post<FeedPost>('/social-feed', data);
      return response.data;
    } catch {
      // Mock post creation
      return {
        id: `post-dev-${Date.now()}`,
        userId: 'dev-user-001',
        userName: 'Sen',
        userAvatarUrl: 'https://i.pravatar.cc/150?img=68',
        isVerified: true,
        isFollowing: false,
        topic: data.topic,
        content: data.content,
        photoUrls: data.photoUrls,
        videoUrl: data.videoUrl ?? null,
        likeCount: 0,
        commentCount: 0,
        isLiked: false,
        createdAt: new Date().toISOString(),
      };
    }
  },

  // Toggle like on a post
  toggleLike: async (postId: string): Promise<{ liked: boolean; likeCount: number }> => {
    try {
      const response = await api.post<{ liked: boolean; likeCount: number }>(
        `/social-feed/${postId}/like`,
      );
      return response.data;
    } catch {
      return { liked: true, likeCount: 0 };
    }
  },

  // Follow / unfollow a user
  toggleFollow: async (userId: string): Promise<{ isFollowing: boolean }> => {
    try {
      const response = await api.post<{ isFollowing: boolean }>(`/users/${userId}/follow`);
      return response.data;
    } catch {
      // Mock toggle
      const wasFollowing = followedUserIds.has(userId);
      if (wasFollowing) {
        followedUserIds.delete(userId);
      } else {
        followedUserIds.add(userId);
      }
      return { isFollowing: !wasFollowing };
    }
  },

  // Get comments for a post
  getComments: async (postId: string): Promise<FeedComment[]> => {
    try {
      const response = await api.get<FeedComment[]>(`/social-feed/${postId}/comments`);
      return response.data;
    } catch {
      const commentCount = MOCK_POSTS.find((p) => p.id === postId)?.commentCount ?? 3;
      const count = Math.min(commentCount, 5);
      const mockComments: FeedComment[] = [];
      const names = ['Deniz', 'Ceren', 'Ela', 'Sude', 'Ece'];
      const texts = [
        'Çok güzel bir paylaşım, katılıyorum!',
        'Ben de aynı şekilde düşünüyorum.',
        'Harika bir bakış açısı, teşekkürler!',
        'Bu konuda çok haklısın.',
        'Kesinlikle, bunu herkesin bilmesi lazım.',
      ];
      for (let i = 0; i < count; i++) {
        mockComments.push({
          id: `comment-${postId}-${i}`,
          userId: `bot-comment-${i}`,
          userName: names[i % names.length],
          userAvatarUrl: `https://i.pravatar.cc/150?img=${50 + i}`,
          content: texts[i % texts.length],
          createdAt: minutesAgo((i + 1) * 15),
          likeCount: Math.floor(Math.random() * 20),
          isLiked: false,
        });
      }
      return mockComments;
    }
  },

  // Add a comment to a post
  addComment: async (postId: string, content: string): Promise<FeedComment> => {
    try {
      const response = await api.post<FeedComment>(`/social-feed/${postId}/comments`, { content });
      return response.data;
    } catch {
      return {
        id: `comment-dev-${Date.now()}`,
        userId: 'dev-user-001',
        userName: 'Sen',
        userAvatarUrl: 'https://i.pravatar.cc/150?img=68',
        content,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        isLiked: false,
      };
    }
  },

  // Get mock posts (used by devSeedData)
  getMockPosts: (): FeedPost[] => [...MOCK_POSTS],
};
