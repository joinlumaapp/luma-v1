// Social Feed API service — fetch, create, and interact with feed posts
// Features: follow system, photo/video posts, profanity filter
// Currently uses mock data; will connect to real API when backend is ready

import api from './api';
import { devMockOrThrow, assertDevOnly } from '../utils/mockGuard';
import { getCompatibilityScore } from './compatibilityCalculator';

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
  { type: 'SORU_CEVAP', emoji: '❓', label: 'Soru-Cevap', color: '#3B82F6' },
  { type: 'ASK_IPUCU', emoji: '\uD83D\uDC95', label: 'Aşk İpucu', color: '#EC4899' },
  { type: 'GUNLUK', emoji: '\uD83D\uDCDD', label: 'Günlük', color: '#10B981' },
  { type: 'MUZIK', emoji: '\uD83C\uDFB5', label: 'Müzik', color: '#F59E0B' },
  { type: 'SEYAHAT', emoji: '✈️', label: 'Seyahat', color: '#06B6D4' },
];

export type FeedFilter = 'ONERILEN' | 'TAKIP';

export type FeedPostType = 'photo' | 'video' | 'text' | 'question' | 'music';

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
  { type: 'music', emoji: '\uD83C\uDFB5', label: 'Muzik', color: '#F59E0B' },
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
  userProfession: string | null;
  userVibes: string[];
  userAvatarUrl: string;
  isVerified: boolean;
  verificationLevel: VerificationLevel;
  isFollowing: boolean;
  intentionTag: IntentionTag;
  topic: FeedTopic;
  postType: FeedPostType;
  content: string;
  photoUrls: string[];
  videoUrl: string | null;
  musicTitle: string | null;
  musicArtist: string | null;
  musicCoverUrl: string | null;
  musicMoodTag: string | null;
  distance: number;
  compatibilityScore: number;
  likeCount: number;
  commentCount: number;
  flirtCount: number;
  profileClickCount: number;
  watchTimeMs: number;
  followerCount: number;
  isNewCreator: boolean;
  isLiked: boolean;
  isSaved: boolean;
  createdAt: string;
  currentlyListening: { songTitle: string; artist: string; coverUrl: string | null } | null;
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
  topic: FeedTopic;
  postType: FeedPostType;
  photoUrls: string[];
  videoUrl?: string | null;
  musicTitle?: string | null;
  musicArtist?: string | null;
  musicCoverUrl?: string;
  musicMoodTag?: string;
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
    userProfession: 'Mimar',
    userVibes: ['🌊 Sahil', '📖 Kitap', '🌿 Sakin'],
    userAvatarUrl: 'https://i.pravatar.cc/150?img=1',
    isVerified: true,
    verificationLevel: 'VERIFIED',
    isFollowing: true,
    intentionTag: 'SERIOUS_RELATIONSHIP',
    topic: 'GUNLUK',
    postType: 'text',
    content: 'Bugün sahilde yürüyüş yaptım ve kendi kendime düşündüm: hayatta en çok neye değer veriyorum? Cevap hep aynı: samimi insanlar.',
    photoUrls: [],
    videoUrl: null,
    musicTitle: null,
    musicArtist: null,
    musicCoverUrl: null,
    musicMoodTag: null,
    distance: 3,
    compatibilityScore: 82,
    likeCount: 42,
    commentCount: 8,
    flirtCount: 5,
    profileClickCount: 18,
    watchTimeMs: 4200,
    followerCount: 120,
    isNewCreator: false,
    isLiked: false,
    isSaved: false,
    createdAt: minutesAgo(12),
    currentlyListening: { songTitle: 'Dünyadan Uzak', artist: 'Sezen Aksu', coverUrl: 'https://picsum.photos/seed/sezen/200' },
  },
  {
    id: 'post-002',
    userId: 'bot-002',
    userName: 'Zeynep',
    userAge: 24,
    userCity: 'Ankara',
    userProfession: 'Psikolog',
    userVibes: ['☕ Kahve', '🎭 Tiyatro', '✨ Romantik'],
    userAvatarUrl: 'https://i.pravatar.cc/150?img=5',
    isVerified: true,
    verificationLevel: 'PREMIUM',
    isFollowing: false,
    intentionTag: 'EXPLORING',
    topic: 'SORU_CEVAP',
    postType: 'question',
    content: 'İlk buluşmada karşı tarafta en çok neye dikkat edersiniz? Ben göz teması ve dinleme becerisine bakıyorum.',
    photoUrls: [],
    videoUrl: null,
    musicTitle: null,
    musicArtist: null,
    musicCoverUrl: null,
    musicMoodTag: null,
    distance: 8,
    compatibilityScore: 91,
    likeCount: 67,
    commentCount: 23,
    flirtCount: 14,
    profileClickCount: 45,
    watchTimeMs: 8500,
    followerCount: 340,
    isNewCreator: false,
    isLiked: true,
    isSaved: false,
    createdAt: minutesAgo(35),
    currentlyListening: { songTitle: 'Blinding Lights', artist: 'The Weeknd', coverUrl: 'https://picsum.photos/seed/weeknd/200' },
  },
  {
    id: 'post-003',
    userId: 'bot-006',
    userName: 'Merve',
    userAge: 28,
    userCity: 'İzmir',
    userProfession: 'Fotoğrafçı',
    userVibes: ['✈️ Gezgin', '📸 Fotoğraf', '🌅 Doğa'],
    userAvatarUrl: 'https://i.pravatar.cc/150?img=23',
    isVerified: true,
    verificationLevel: 'VERIFIED',
    isFollowing: true,
    intentionTag: 'SERIOUS_RELATIONSHIP',
    topic: 'SEYAHAT',
    postType: 'photo',
    content: 'Kapadokya\'da gün doğumu... Balon turu hayatımın en güzel deneyimiydi. Yanınızda doğru insanla her yer cennet.',
    photoUrls: ['https://picsum.photos/seed/cappadocia/600/400'],
    videoUrl: null,
    musicTitle: null,
    musicArtist: null,
    musicCoverUrl: null,
    musicMoodTag: null,
    distance: 12,
    compatibilityScore: 78,
    likeCount: 128,
    commentCount: 31,
    flirtCount: 22,
    profileClickCount: 67,
    watchTimeMs: 12000,
    followerCount: 890,
    isNewCreator: false,
    isLiked: false,
    isSaved: false,
    createdAt: hoursAgo(1),
    currentlyListening: null,
  },
  {
    id: 'post-004',
    userId: 'bot-004',
    userName: 'Ayşe',
    userAge: 23,
    userCity: 'Bursa',
    userProfession: 'Öğrenci',
    userVibes: ['🎧 Indie', '🎨 Sanat', '🌿 Sakin'],
    userAvatarUrl: 'https://i.pravatar.cc/150?img=16',
    isVerified: false,
    verificationLevel: 'NONE',
    isFollowing: false,
    intentionTag: 'NOT_SURE',
    topic: 'MUZIK',
    postType: 'music',
    content: 'Yağmurlu bir akşamda Fazıl Say dinlemek... Ruhumu iyileştiren tek şey bu. Müzik seven biri varsa yazışalım!',
    photoUrls: [],
    videoUrl: null,
    musicTitle: 'Black Earth',
    musicArtist: 'Fazıl Say',
    musicCoverUrl: 'https://picsum.photos/seed/fazilsay/200',
    musicMoodTag: '\uD83C\uDF19 Gece',
    distance: 5,
    compatibilityScore: 65,
    likeCount: 53,
    commentCount: 12,
    flirtCount: 2,
    profileClickCount: 8,
    watchTimeMs: 3100,
    followerCount: 45,
    isNewCreator: true,
    isLiked: false,
    isSaved: false,
    createdAt: hoursAgo(2),
    currentlyListening: null,
  },
  {
    id: 'post-005',
    userId: 'bot-005',
    userName: 'Defne',
    userAge: 27,
    userCity: 'Antalya',
    userProfession: 'Yoga Eğitmeni',
    userVibes: ['🔮 Astroloji', '🧘 Yoga', '🔥 Enerjik'],
    userAvatarUrl: 'https://i.pravatar.cc/150?img=20',
    isVerified: false,
    verificationLevel: 'NONE',
    isFollowing: true,
    intentionTag: 'EXPLORING',
    topic: 'BURC',
    postType: 'text',
    content: 'Yay burçları bu hafta aşk konusunda çok şanslı! Venüs geçişi duygusal bağları güçlendiriyor. Kim Yay burcu burada?',
    photoUrls: [],
    videoUrl: null,
    musicTitle: null,
    musicArtist: null,
    musicCoverUrl: null,
    musicMoodTag: null,
    distance: 15,
    compatibilityScore: 73,
    likeCount: 89,
    commentCount: 45,
    flirtCount: 8,
    profileClickCount: 32,
    watchTimeMs: 6200,
    followerCount: 210,
    isNewCreator: false,
    isLiked: true,
    isSaved: false,
    createdAt: hoursAgo(3),
    currentlyListening: { songTitle: 'Firuze', artist: 'Sezen Aksu', coverUrl: 'https://picsum.photos/seed/firuze/200' },
  },
  {
    id: 'post-006',
    userId: 'bot-003',
    userName: 'Selin',
    userAge: 25,
    userCity: 'İstanbul',
    userProfession: 'Avukat',
    userVibes: ['📚 Entelektüel', '🍷 Şarap', '✨ Romantik'],
    userAvatarUrl: 'https://i.pravatar.cc/150?img=9',
    isVerified: true,
    verificationLevel: 'VERIFIED',
    isFollowing: false,
    intentionTag: 'SERIOUS_RELATIONSHIP',
    topic: 'ASK_IPUCU',
    postType: 'question',
    content: 'Bir ilişkide en önemli şey güven değil, güvenin sürdürülebilir olması. Küçük tutarlı davranışlar büyük sözlerden daha değerli.',
    photoUrls: [],
    videoUrl: null,
    musicTitle: null,
    musicArtist: null,
    musicCoverUrl: null,
    musicMoodTag: null,
    distance: 22,
    compatibilityScore: 88,
    likeCount: 156,
    commentCount: 28,
    flirtCount: 18,
    profileClickCount: 52,
    watchTimeMs: 9800,
    followerCount: 560,
    isNewCreator: false,
    isLiked: false,
    isSaved: false,
    createdAt: hoursAgo(4),
    currentlyListening: null,
  },
  {
    id: 'post-007',
    userId: 'bot-008',
    userName: 'Cansu',
    userAge: 22,
    userCity: 'Eskişehir',
    userProfession: 'Diyetisyen',
    userVibes: ['💪 Spor', '🥗 Sağlık', '🌸 Pozitif'],
    userAvatarUrl: 'https://i.pravatar.cc/150?img=29',
    isVerified: false,
    verificationLevel: 'NONE',
    isFollowing: false,
    intentionTag: 'EXPLORING',
    topic: 'GUNLUK',
    postType: 'photo',
    content: 'Bugün pilates sonrası kendimi o kadar iyi hissettim ki, pozitif enerji her yere yayıldı. Kendinize iyi bakmayı unutmayın!',
    photoUrls: ['https://picsum.photos/seed/yoga/600/400'],
    videoUrl: null,
    musicTitle: null,
    musicArtist: null,
    musicCoverUrl: null,
    musicMoodTag: null,
    distance: 7,
    compatibilityScore: 56,
    likeCount: 34,
    commentCount: 6,
    flirtCount: 1,
    profileClickCount: 5,
    watchTimeMs: 2000,
    followerCount: 22,
    isNewCreator: true,
    isLiked: false,
    isSaved: false,
    createdAt: hoursAgo(5),
    currentlyListening: null,
  },
  {
    id: 'post-008',
    userId: 'bot-011',
    userName: 'Naz',
    userAge: 29,
    userCity: 'İstanbul',
    userProfession: 'Müzik Prodüktör',
    userVibes: ['🎵 Müzik', '🌙 Gece', '🔥 Enerjik'],
    userAvatarUrl: 'https://i.pravatar.cc/150?img=38',
    isVerified: false,
    verificationLevel: 'NONE',
    isFollowing: true,
    intentionTag: 'NOT_SURE',
    topic: 'MUZIK',
    postType: 'music',
    content: 'Yeni bir şarkı prodüksiyonu bitirdim! Lo-fi beats + Türk enstrümanları karışımı. Müzikle terapi yapıyorum resmen.',
    photoUrls: [],
    videoUrl: null,
    musicTitle: 'Lo-fi Anatolian',
    musicArtist: 'Naz',
    musicCoverUrl: 'https://picsum.photos/seed/lofi/200',
    musicMoodTag: '\u2728 Mutlu',
    distance: 18,
    compatibilityScore: 71,
    likeCount: 71,
    commentCount: 15,
    flirtCount: 6,
    profileClickCount: 20,
    watchTimeMs: 5500,
    followerCount: 150,
    isNewCreator: false,
    isLiked: false,
    isSaved: false,
    createdAt: hoursAgo(6),
    currentlyListening: null,
  },
  {
    id: 'post-009',
    userId: 'bot-009',
    userName: 'İpek',
    userAge: 30,
    userCity: 'Ankara',
    userProfession: 'Doktor',
    userVibes: ['🏡 Ev', '🍳 Yemek', '💕 Sadık'],
    userAvatarUrl: 'https://i.pravatar.cc/150?img=32',
    isVerified: true,
    verificationLevel: 'PREMIUM',
    isFollowing: false,
    intentionTag: 'SERIOUS_RELATIONSHIP',
    topic: 'SORU_CEVAP',
    postType: 'question',
    content: 'Uzun süreli ilişkilerde sıkılmamak için ne yapıyorsunuz? Biz partner ile her ay yeni bir hobi denemeye başladık.',
    photoUrls: [],
    videoUrl: null,
    musicTitle: null,
    musicArtist: null,
    musicCoverUrl: null,
    musicMoodTag: null,
    distance: 11,
    compatibilityScore: 84,
    likeCount: 93,
    commentCount: 37,
    flirtCount: 11,
    profileClickCount: 38,
    watchTimeMs: 7200,
    followerCount: 420,
    isNewCreator: false,
    isLiked: false,
    isSaved: false,
    createdAt: hoursAgo(8),
    currentlyListening: null,
  },
  {
    id: 'post-010',
    userId: 'bot-010',
    userName: 'Ebru',
    userAge: 25,
    userCity: 'Bolu',
    userProfession: 'Öğretmen',
    userVibes: ['🌿 Doğa', '🐕 Hayvan', '☀️ Pozitif'],
    userAvatarUrl: 'https://i.pravatar.cc/150?img=36',
    isVerified: false,
    verificationLevel: 'NONE',
    isFollowing: true,
    intentionTag: 'EXPLORING',
    topic: 'SEYAHAT',
    postType: 'photo',
    content: 'Bu hafta sonu Bolu\'da dağ yürüyüşü yaptık. Doğada vakit geçirmek ilişkiyi güçlendiriyor, tavsiye ederim!',
    photoUrls: ['https://picsum.photos/seed/mountain/600/400'],
    videoUrl: null,
    musicTitle: null,
    musicArtist: null,
    musicCoverUrl: null,
    musicMoodTag: null,
    distance: 30,
    compatibilityScore: 62,
    likeCount: 45,
    commentCount: 9,
    flirtCount: 3,
    profileClickCount: 11,
    watchTimeMs: 3800,
    followerCount: 75,
    isNewCreator: true,
    isLiked: false,
    isSaved: false,
    createdAt: hoursAgo(10),
    currentlyListening: null,
  },
  {
    id: 'post-011',
    userId: 'bot-012',
    userName: 'Gizem',
    userAge: 27,
    userCity: 'İstanbul',
    userProfession: 'İç Mimar',
    userVibes: ['💎 Şık', '🌹 Romantik', '✨ Zarif'],
    userAvatarUrl: 'https://i.pravatar.cc/150?img=41',
    isVerified: true,
    verificationLevel: 'PREMIUM',
    isFollowing: false,
    intentionTag: 'SERIOUS_RELATIONSHIP',
    topic: 'ASK_IPUCU',
    postType: 'text',
    content: 'Sevgi dili testini yaptınız mı? Partnerinizin sevgi dilini bilmek ilişkide çığır açıyor. Benim dilim kaliteli vakit.',
    photoUrls: [],
    videoUrl: null,
    musicTitle: null,
    musicArtist: null,
    musicCoverUrl: null,
    musicMoodTag: null,
    distance: 9,
    compatibilityScore: 95,
    likeCount: 112,
    commentCount: 42,
    flirtCount: 25,
    profileClickCount: 72,
    watchTimeMs: 14000,
    followerCount: 1200,
    isNewCreator: false,
    isLiked: true,
    isSaved: false,
    createdAt: hoursAgo(12),
    currentlyListening: { songTitle: 'Die With A Smile', artist: 'Lady Gaga & Bruno Mars', coverUrl: 'https://picsum.photos/seed/gaga/200' },
  },
  {
    id: 'post-012',
    userId: 'bot-007',
    userName: 'Buse',
    userAge: 24,
    userCity: 'Konya',
    userProfession: 'Grafik Tasarımcı',
    userVibes: ['🎨 Yaratıcı', '☕ Kahve', '🌙 Huzurlu'],
    userAvatarUrl: 'https://i.pravatar.cc/150?img=25',
    isVerified: true,
    verificationLevel: 'VERIFIED',
    isFollowing: true,
    intentionTag: 'NOT_SURE',
    topic: 'BURC',
    postType: 'text',
    content: 'Terazi-Aslan uyumu hakkında ne düşünüyorsunuz? Arkadaşım bu ikili çok uyumlu diyor ama ben emin değilim.',
    photoUrls: [],
    videoUrl: null,
    musicTitle: null,
    musicArtist: null,
    musicCoverUrl: null,
    musicMoodTag: null,
    distance: 4,
    compatibilityScore: 79,
    likeCount: 58,
    commentCount: 19,
    flirtCount: 4,
    profileClickCount: 14,
    watchTimeMs: 4100,
    followerCount: 95,
    isNewCreator: false,
    isLiked: false,
    isSaved: false,
    createdAt: hoursAgo(14),
    currentlyListening: null,
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
    } catch (error) {
      // Fallback to mock data in dev mode — calculate real compatibility scores
      const currentUserId = 'dev-user-001';
      let filtered = MOCK_POSTS.map((p) => ({
        ...p,
        isFollowing: followedUserIds.has(p.userId),
        compatibilityScore: getCompatibilityScore(currentUserId, p.userId),
      }));
      if (topic) {
        filtered = filtered.filter((p) => p.topic === topic);
      }

      if (filter === 'TAKIP') {
        // ── Takip: only followed users, chronological ──
        filtered = filtered
          .filter((p) => p.isFollowing)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      } else {
        // ── Populer: interaction-weighted ranking with discovery boost ──
        // Score each post based on engagement quality
        const scored = filtered.map((p) => {
          const ageHours = (now.getTime() - new Date(p.createdAt).getTime()) / 3_600_000;
          const recencyDecay = Math.max(0, 1 - ageHours / 48); // decays over 48h

          // Engagement score — flirts weighted 5x, comments 2x, likes 1x
          const engagementScore =
            p.flirtCount * 5 +          // flirts are the primary signal
            p.commentCount * 2 +         // comments = active interaction
            p.likeCount * 1 +            // likes = passive but still engagement
            p.profileClickCount * 1.5 +  // profile clicks = genuine interest
            Math.min(p.watchTimeMs / 1000, 30) * 0.5; // watch time capped at 30s

          // Compatibility + proximity boost
          const relevanceScore =
            p.compatibilityScore * 2 +
            Math.max(0, 100 - p.distance * 2);

          // New creator boost — level the playing field
          const discoveryBoost = p.isNewCreator ? 80 : 0;

          return {
            post: p,
            score: engagementScore * 2 + relevanceScore + recencyDecay * 60 + discoveryBoost,
            isNewCreator: p.isNewCreator,
          };
        });

        // Sort by score descending
        scored.sort((a, b) => b.score - a.score);

        // ── 70/30 mix: high engagement + new creators ──
        const established = scored.filter((s) => !s.isNewCreator);
        const newCreators = scored.filter((s) => s.isNewCreator);
        const mixed: FeedPost[] = [];
        let estIdx = 0;
        let newIdx = 0;
        const total = scored.length;

        for (let i = 0; i < total; i++) {
          // Every ~3rd slot reserved for new creators (30% target)
          if ((i + 1) % 3 === 0 && newIdx < newCreators.length) {
            mixed.push(newCreators[newIdx].post);
            newIdx++;
          } else if (estIdx < established.length) {
            mixed.push(established[estIdx].post);
            estIdx++;
          } else if (newIdx < newCreators.length) {
            mixed.push(newCreators[newIdx].post);
            newIdx++;
          }
        }

        filtered = mixed;
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
      const response = await api.post<FeedPost>('/social-feed', data);
      return response.data;
    } catch (error) {
      return devMockOrThrow(error, {
        id: `post-dev-${Date.now()}`,
        userId: 'dev-user-001',
        userName: 'Sen',
        userAge: 0,
        userCity: '',
        userProfession: null,
        userVibes: [],
        userAvatarUrl: 'https://i.pravatar.cc/150?img=68',
        isVerified: true,
        verificationLevel: 'VERIFIED' as const,
        isFollowing: false,
        intentionTag: 'EXPLORING',
        topic: data.topic,
        postType: data.postType,
        content: data.content,
        photoUrls: data.photoUrls,
        videoUrl: data.videoUrl ?? null,
        musicTitle: data.musicTitle ?? null,
        musicArtist: data.musicArtist ?? null,
        musicCoverUrl: data.musicCoverUrl ?? null,
        musicMoodTag: data.musicMoodTag ?? null,
        distance: 0,
        compatibilityScore: 100,
        likeCount: 0,
        commentCount: 0,
        flirtCount: 0,
        profileClickCount: 0,
        watchTimeMs: 0,
        followerCount: 0,
        isNewCreator: false,
        isLiked: false,
        isSaved: false,
        createdAt: new Date().toISOString(),
        currentlyListening: null,
      }, 'socialFeedService.createPost');
    }
  },

  // Toggle like on a post
  toggleLike: async (postId: string): Promise<{ liked: boolean; likeCount: number }> => {
    try {
      const response = await api.post<{ liked: boolean; likeCount: number }>(
        `/social-feed/${postId}/like`,
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
      const response = await api.get<FeedComment[]>(`/social-feed/${postId}/comments`);
      return response.data;
    } catch (error) {
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
      const response = await api.post<FeedComment>(`/social-feed/${postId}/comments`, { content });
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
        `/social-feed/comments/${commentId}/like`
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
        `/social-feed/${postId}/comments/${commentId}/replies`,
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
    const currentUserId = 'dev-user-001';
    return MOCK_POSTS.map((p) => ({
      ...p,
      compatibilityScore: getCompatibilityScore(currentUserId, p.userId),
    }));
  },
};
