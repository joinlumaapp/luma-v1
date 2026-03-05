// Social Feed API service — fetch, create, and interact with feed posts
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
  topic: FeedTopic;
  content: string;
  photoUrls: string[];
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  createdAt: string;
}

export interface CreatePostRequest {
  content: string;
  topic: FeedTopic;
  photoUrls: string[];
}

export interface FeedResponse {
  posts: FeedPost[];
  nextCursor: string | null;
  hasMore: boolean;
}

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
    topic: 'GUNLUK',
    content: 'Bugün sahilde yürüyüş yaptım ve kendi kendime düşündüm: hayatta en çok neye değer veriyorum? Cevap hep aynı: samimi insanlar.',
    photoUrls: [],
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
    topic: 'SORU_CEVAP',
    content: 'İlk buluşmada karşı tarafta en çok neye dikkat edersiniz? Ben göz teması ve dinleme becerisine bakıyorum.',
    photoUrls: [],
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
    topic: 'SEYAHAT',
    content: 'Kapadokya\'da gün doğumu... Balon turu hayatımın en güzel deneyimiydi. Yanınızda doğru insanla her yer cennet.',
    photoUrls: ['https://picsum.photos/seed/cappadocia/600/400'],
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
    topic: 'MUZIK',
    content: 'Yağmurlu bir akşamda Fazıl Say dinlemek... Ruhumu iyileştiren tek şey bu. Müzik seven biri varsa yazışalım!',
    photoUrls: [],
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
    topic: 'BURC',
    content: 'Yay burçları bu hafta aşk konusunda çok şanslı! Venüs geçişi duygusal bağları güçlendiriyor. Kim Yay burcu burada?',
    photoUrls: [],
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
    topic: 'ASK_IPUCU',
    content: 'Bir ilişkide en önemli şey güven değil, güvenin sürdürülebilir olması. Küçük tutarlı davranışlar büyük sözlerden daha değerli.',
    photoUrls: [],
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
    topic: 'GUNLUK',
    content: 'Bugün pilates sonrası kendimi o kadar iyi hissettim ki, pozitif enerji her yere yayıldı. Kendinize iyi bakmayı unutmayın!',
    photoUrls: ['https://picsum.photos/seed/yoga/600/400'],
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
    topic: 'MUZIK',
    content: 'Yeni bir şarkı prodüksiyonu bitirdim! Lo-fi beats + Türk enstrümanları karışımı. Müzikle terapi yapıyorum resmen.',
    photoUrls: [],
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
    topic: 'SORU_CEVAP',
    content: 'Uzun süreli ilişkilerde sıkılmamak için ne yapıyorsunuz? Biz partner ile her ay yeni bir hobi denemeye başladık.',
    photoUrls: [],
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
    topic: 'SEYAHAT',
    content: 'Bu hafta sonu Bolu\'da dağ yürüyüşü yaptık. Doğada vakit geçirmek ilişkiyi güçlendiriyor, tavsiye ederim!',
    photoUrls: ['https://picsum.photos/seed/mountain/600/400'],
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
    topic: 'ASK_IPUCU',
    content: 'Sevgi dili testini yaptınız mı? Partnerinizin sevgi dilini bilmek ilişkide çığır açıyor. Benim dilim kaliteli vakit.',
    photoUrls: [],
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
    topic: 'BURC',
    content: 'Terazi-Aslan uyumu hakkında ne düşünüyorsunuz? Arkadaşım bu ikili çok uyumlu diyor ama ben emin değilim.',
    photoUrls: [],
    likeCount: 58,
    commentCount: 19,
    isLiked: false,
    createdAt: hoursAgo(14),
  },
];

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
      let filtered = [...MOCK_POSTS];
      if (topic) {
        filtered = filtered.filter((p) => p.topic === topic);
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
        topic: data.topic,
        content: data.content,
        photoUrls: data.photoUrls,
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
      // Mock toggle — resolved in store
      return { liked: true, likeCount: 0 };
    }
  },

  // Get mock posts (used by devSeedData)
  getMockPosts: (): FeedPost[] => [...MOCK_POSTS],
};
