// Discovery API service — feed, swipe, undo, and super like operations

import api from './api';

export interface FeedCard {
  userId: string;
  firstName: string;
  age: number;
  city: string;
  bio: string;
  intentionTag: string;
  compatibility: {
    score: number;
    level: string;
  } | null;
  photos: Array<{ url: string; thumbnailUrl: string }>;
  isVerified?: boolean;
  isSelfieVerified: boolean;
  isFullyVerified: boolean;
  voiceIntroUrl?: string;
  feedScore?: number;
  /** Distance to this user in km (null if location unavailable) */
  distanceKm?: number | null;
  /** Badge keys earned by this user (e.g. ["first_spark", "verified_star"]) */
  earnedBadges?: string[];
  /** User-selected interest tags */
  interestTags?: string[];
  /** 1-line Turkish compatibility explanation */
  compatExplanation?: string | null;
  /** Top 3 strong compatibility categories (Turkish labels) */
  strongCategories?: string[];
  /** Last active timestamp for online status */
  lastActiveAt?: string;
  /** Lifestyle details */
  height?: number | null;
  smoking?: string;
  sports?: string;
  children?: string;
  job?: string;
  education?: string;
}

export interface FeedResponse {
  cards: FeedCard[];
  remaining: number;
  dailyLimit: number;
  totalCandidates: number;
}

export interface SwipeRequest {
  targetUserId: string;
  direction: 'like' | 'pass' | 'super_like';
  comment?: string; // optional comment attached to LIKE
}

export interface SwipeResponse {
  direction: string;
  isMatch: boolean;
  matchId?: string;
  animationType?: 'normal' | 'super_compatibility';
  swipeId?: string;
}

export interface UndoSwipeResponse {
  undone: boolean;
  targetUserId: string;
}

export interface FeedFilters {
  genderPreference?: 'male' | 'female' | 'all';
  minAge?: number;
  maxAge?: number;
  maxDistance?: number;
  intentionTags?: string[];
}

// ─── Likes You ─────────────────────────────────────────────────

export interface LikeYouCard {
  userId: string;
  firstName: string;
  age: number;
  photoUrl: string;
  compatibilityPercent: number;
  likedAt: string;
  comment: string | null;
  /** Distance in km (optional hint for blurred cards) */
  distanceKm?: number;
  /** Number of shared interest tags */
  sharedInterests?: number;
}

export interface LikesYouResponse {
  likes: LikeYouCard[];
  total: number;
  isBlurred: boolean; // true for Free users, false for Gold+
}

// ─── Daily Picks ───────────────────────────────────────────────

export interface DailyPickCard {
  userId: string;
  firstName: string;
  age: number;
  city: string;
  bio: string;
  photoUrl: string;
  compatibilityPercent: number;
  compatExplanation?: string | null;
  intentionTag: string;
  isViewed: boolean;
}

export interface DailyPicksResponse {
  picks: DailyPickCard[];
  refreshesAt: string; // ISO timestamp of next refresh
  totalAvailable: number; // 3 for Free, 10 for Gold+
}

// ─── Login Streak ──────────────────────────────────────────────

export interface LoginStreakResponse {
  currentStreak: number;
  longestStreak: number;
  goldAwarded: number;
  milestoneReached: boolean;
  milestoneName?: string; // e.g. "1 Hafta", "2 Hafta", "1 Ay"
}

// ─── Profile Boost ─────────────────────────────────────────────

export interface BoostStatusResponse {
  isActive: boolean;
  endsAt?: string;
  remainingSeconds?: number;
}

export interface ActivateBoostResponse {
  success: boolean;
  endsAt: string;
  goldDeducted: number;
  goldBalance: number;
}

// ─── Profile Prompts ───────────────────────────────────────────

export interface ProfilePrompt {
  id?: string;
  question: string;
  answer: string;
  order: number;
}

// ─── Weekly Report ────────────────────────────────────────────

export interface WeeklyReportResponse {
  weekStart: string;
  totalSwipes: number;
  totalLikes: number;
  totalMatches: number;
  avgCompatibility: number;
  topCategory: string | null;
  messagesExchanged: number;
  mostActiveDay: string | null;
  likeRate: number;
  insights: string[];
}

// ─── Profile Coach ────────────────────────────────────────────

export interface ProfileCoachTip {
  category: string;
  tip: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ProfileCoachResponse {
  tips: ProfileCoachTip[];
  profileStrength: number;
}

// ─── Personality Types ────────────────────────────────────────

export interface PersonalityResponse {
  mbtiType: string | null;
  enneagramType: string | null;
}

// ─── Mock Data (fallback when API is unavailable) ────────────

const MOCK_CARDS: FeedCard[] = [
  {
    userId: 'mock-1',
    firstName: 'Elif',
    age: 26,
    city: 'İstanbul',
    bio: 'Kitap kurdu, kahve bağımlısı. Hayatı keşfetmeyi seven biri.',
    intentionTag: 'serious_relationship',
    compatibility: { score: 92, level: 'super' },
    photos: [
      { url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=260&fit=crop' },
      { url: 'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?w=200&h=260&fit=crop' },
      { url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=260&fit=crop' },
      { url: 'https://images.unsplash.com/photo-1517365830460-955ce3ccd263?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1517365830460-955ce3ccd263?w=200&h=260&fit=crop' },
    ],
    isVerified: true,
    isSelfieVerified: true,
    isFullyVerified: true,
    distanceKm: 3.2,
    earnedBadges: ['first_spark', 'verified_star'],
    interestTags: ['reading', 'coffee', 'travel'],
    compatExplanation: 'Benzer yaşam değerleri ve iletişim tarzı',
    strongCategories: ['İletişim', 'Değerler', 'Yaşam Tarzı'],
    height: 168,
    smoking: 'İçmez',
    sports: 'Yoga',
    children: 'İstemiyor',
    job: 'Editör',
    education: 'İstanbul Üniversitesi',
  },
  {
    userId: 'mock-2',
    firstName: 'Zeynep',
    age: 24,
    city: 'Ankara',
    bio: 'Müzik ve sanat hayatımın merkezinde. Gitar çalıyorum.',
    intentionTag: 'exploring',
    compatibility: { score: 85, level: 'normal' },
    photos: [
      { url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=260&fit=crop' },
      { url: 'https://images.unsplash.com/photo-1496440737103-cd596325d314?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1496440737103-cd596325d314?w=200&h=260&fit=crop' },
      { url: 'https://images.unsplash.com/photo-1515023115894-bacee46dfc8e?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1515023115894-bacee46dfc8e?w=200&h=260&fit=crop' },
      { url: 'https://images.unsplash.com/photo-1504730030853-eff311f57d3c?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1504730030853-eff311f57d3c?w=200&h=260&fit=crop' },
    ],
    isVerified: true,
    isSelfieVerified: true,
    isFullyVerified: false,
    distanceKm: 5.7,
    earnedBadges: ['music_lover'],
    interestTags: ['music', 'art', 'guitar'],
    compatExplanation: 'Güçlü uyum alanları mevcut',
    strongCategories: ['Hobiler', 'Sanat', 'Sosyallik'],
    height: 165,
    smoking: 'Sosyal içici',
    sports: 'Dans',
    job: 'Müzisyen',
    education: 'Hacettepe Üniversitesi',
  },
  {
    userId: 'mock-3',
    firstName: 'Defne',
    age: 28,
    city: 'İzmir',
    bio: 'Doğa yürüyüşleri, yoga ve sağlıklı yaşam tutkunu.',
    intentionTag: 'serious_relationship',
    compatibility: { score: 78, level: 'normal' },
    photos: [
      { url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=260&fit=crop' },
      { url: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=200&h=260&fit=crop' },
      { url: 'https://images.unsplash.com/photo-1464863979621-258859e62245?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1464863979621-258859e62245?w=200&h=260&fit=crop' },
      { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=260&fit=crop' },
      { url: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=260&fit=crop' },
    ],
    isVerified: false,
    isSelfieVerified: true,
    isFullyVerified: false,
    distanceKm: 12.4,
    earnedBadges: [],
    interestTags: ['hiking', 'yoga', 'cooking'],
    compatExplanation: 'Ortak ilgi alanları keşfedilecek',
    strongCategories: ['Sağlık', 'Doğa'],
    height: 172,
    smoking: 'İçmez',
    sports: 'Koşu, Yoga',
    children: 'Belki ileride',
    job: 'Diyetisyen',
    education: 'Ege Üniversitesi',
  },
  {
    userId: 'mock-4',
    firstName: 'Selin',
    age: 25,
    city: 'İstanbul',
    bio: 'Yazılımcı, kedileri sever. Film önerileri konusunda iddialıyım.',
    intentionTag: 'not_sure',
    compatibility: { score: 88, level: 'normal' },
    photos: [
      { url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=200&h=260&fit=crop' },
      { url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=260&fit=crop' },
      { url: 'https://images.unsplash.com/photo-1521566652839-697aa473761a?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1521566652839-697aa473761a?w=200&h=260&fit=crop' },
      { url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=260&fit=crop' },
    ],
    isVerified: true,
    isSelfieVerified: true,
    isFullyVerified: true,
    distanceKm: 1.8,
    earnedBadges: ['tech_savvy', 'first_spark'],
    interestTags: ['technology', 'movies', 'cats'],
    compatExplanation: 'Düşünce yapısı ve humor uyumu yüksek',
    strongCategories: ['Humor', 'Teknoloji', 'Eğlence'],
    height: 163,
    smoking: 'İçmez',
    children: 'İstemiyor',
    job: 'Yazılım Geliştirici',
    education: 'ODTÜ',
  },
  {
    userId: 'mock-5',
    firstName: 'Cansu',
    age: 27,
    city: 'Bursa',
    bio: 'Fotoğrafçılık, seyahat ve yeni lezzetler keşfetmek benim işim.',
    intentionTag: 'exploring',
    compatibility: { score: 73, level: 'normal' },
    photos: [
      { url: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=200&h=260&fit=crop' },
      { url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&h=260&fit=crop' },
      { url: 'https://images.unsplash.com/photo-1485893086445-ed75865251e0?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1485893086445-ed75865251e0?w=200&h=260&fit=crop' },
    ],
    isVerified: false,
    isSelfieVerified: false,
    isFullyVerified: false,
    distanceKm: 8.3,
    earnedBadges: [],
    interestTags: ['photography', 'travel', 'food'],
    compatExplanation: 'Keşfedilecek farklılıklar var',
    strongCategories: ['Macera', 'Yemek'],
    height: 170,
    smoking: 'Sosyal içici',
    sports: 'Yüzme',
    job: 'Fotoğrafçı',
  },
  {
    userId: 'mock-6',
    firstName: 'Ayşe',
    age: 23,
    city: 'İstanbul',
    bio: 'Psikoloji öğrencisi. İnsanları anlamak en büyük tutkum.',
    intentionTag: 'serious_relationship',
    compatibility: { score: 95, level: 'super' },
    photos: [
      { url: 'https://images.unsplash.com/photo-1502767089025-6572583495f9?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1502767089025-6572583495f9?w=200&h=260&fit=crop' },
      { url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=260&fit=crop' },
      { url: 'https://images.unsplash.com/photo-1529232356377-57971f020a94?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1529232356377-57971f020a94?w=200&h=260&fit=crop' },
      { url: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=200&h=260&fit=crop' },
      { url: 'https://images.unsplash.com/photo-1523264653568-d38213651a53?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1523264653568-d38213651a53?w=200&h=260&fit=crop' },
    ],
    isVerified: true,
    isSelfieVerified: true,
    isFullyVerified: true,
    distanceKm: 2.1,
    earnedBadges: ['verified_star', 'deep_thinker'],
    interestTags: ['psychology', 'reading', 'meditation'],
    compatExplanation: 'Çok güçlü düşünce ve değer uyumu',
    strongCategories: ['Değerler', 'İletişim', 'Empati'],
    height: 160,
    smoking: 'İçmez',
    children: 'İstiyor',
    job: 'Psikolog Adayı',
    education: 'Boğaziçi Üniversitesi',
  },
  {
    userId: 'mock-7',
    firstName: 'Dila',
    age: 26,
    city: 'Antalya',
    bio: 'Deniz, güneş ve spor. Hayatı dolu dolu yaşıyorum.',
    intentionTag: 'exploring',
    compatibility: { score: 81, level: 'normal' },
    photos: [
      { url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=260&fit=crop' },
      { url: 'https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=200&h=260&fit=crop' },
      { url: 'https://images.unsplash.com/photo-1513379733131-47fc74b45fc7?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1513379733131-47fc74b45fc7?w=200&h=260&fit=crop' },
      { url: 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=200&h=260&fit=crop' },
    ],
    isVerified: true,
    isSelfieVerified: true,
    isFullyVerified: false,
    distanceKm: 6.5,
    earnedBadges: ['sports_fan'],
    interestTags: ['swimming', 'fitness', 'beach'],
    compatExplanation: 'Aktif yaşam tarzı ortak noktanız',
    strongCategories: ['Spor', 'Enerji', 'Sosyallik'],
    height: 174,
    smoking: 'İçmez',
    sports: 'Yüzme, Fitness',
    children: 'Belki ileride',
    job: 'Spor Eğitmeni',
  },
  {
    userId: 'mock-8',
    firstName: 'Melis',
    age: 29,
    city: 'İstanbul',
    bio: 'Mimar. Tasarım, estetik ve yaratıcılık benim dünyam.',
    intentionTag: 'serious_relationship',
    compatibility: { score: 87, level: 'normal' },
    photos: [
      { url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=260&fit=crop' },
      { url: 'https://images.unsplash.com/photo-1514315384763-ba401779410f?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1514315384763-ba401779410f?w=200&h=260&fit=crop' },
      { url: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=200&h=260&fit=crop' },
      { url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&h=800&fit=crop', thumbnailUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=260&fit=crop' },
    ],
    isVerified: true,
    isSelfieVerified: true,
    isFullyVerified: true,
    distanceKm: 4.0,
    earnedBadges: ['creative_mind', 'verified_star'],
    interestTags: ['architecture', 'design', 'art'],
    compatExplanation: 'Estetik anlayışı ve vizyon uyumu',
    strongCategories: ['Yaratıcılık', 'Vizyon', 'Estetik'],
    height: 171,
    smoking: 'İçmez',
    sports: 'Pilates',
    job: 'Mimar',
    education: 'İTÜ',
  },
];

// Mock activity timestamps: some online, some recently active, some hours ago
const MOCK_ACTIVITY_OFFSETS_MS: Record<string, number> = {
  'mock-1': 60 * 1000,           // 1 min ago (online)
  'mock-2': 5 * 60 * 1000,       // 5 min ago
  'mock-3': 30 * 60 * 1000,      // 30 min ago
  'mock-4': 90 * 1000,           // 1.5 min ago (online)
  'mock-5': 2 * 60 * 60 * 1000,  // 2 hours ago
  'mock-6': 45 * 1000,           // 45 sec ago (online)
  'mock-7': 6 * 60 * 60 * 1000,  // 6 hours ago
  'mock-8': 15 * 60 * 1000,      // 15 min ago
};

const getMockFeedResponse = (): FeedResponse => ({
  cards: MOCK_CARDS.map((card) => ({
    ...card,
    lastActiveAt: new Date(Date.now() - (MOCK_ACTIVITY_OFFSETS_MS[card.userId] ?? 3600000)).toISOString(),
  })),
  remaining: 15,
  dailyLimit: 20,
  totalCandidates: MOCK_CARDS.length,
});

// Mock incoming likes — users who liked the current user (distinct from matches)
const now = new Date();
const mockHoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();

const MOCK_INCOMING_LIKES: LikeYouCard[] = [
  {
    userId: 'bot-003',
    firstName: 'Selin',
    age: 25,
    photoUrl: 'https://i.pravatar.cc/400?img=9',
    compatibilityPercent: 88,
    likedAt: mockHoursAgo(1),
    comment: 'Profilin çok samimi, tanışmak isterim!',
    distanceKm: 1.2,
    sharedInterests: 4,
  },
  {
    userId: 'bot-005',
    firstName: 'Defne',
    age: 24,
    photoUrl: 'https://i.pravatar.cc/400?img=20',
    compatibilityPercent: 73,
    likedAt: mockHoursAgo(3),
    comment: null,
    distanceKm: 3.5,
    sharedInterests: 2,
  },
  {
    userId: 'bot-008',
    firstName: 'Cansu',
    age: 23,
    photoUrl: 'https://i.pravatar.cc/400?img=29',
    compatibilityPercent: 56,
    likedAt: mockHoursAgo(5),
    comment: null,
    distanceKm: 8.1,
    sharedInterests: 1,
  },
  {
    userId: 'bot-010',
    firstName: 'Ebru',
    age: 30,
    photoUrl: 'https://i.pravatar.cc/400?img=36',
    compatibilityPercent: 71,
    likedAt: mockHoursAgo(8),
    comment: 'Ortak ilgi alanlarımız çok fazla!',
    distanceKm: 0.8,
    sharedInterests: 5,
  },
  {
    userId: 'bot-011',
    firstName: 'Naz',
    age: 22,
    photoUrl: 'https://i.pravatar.cc/400?img=38',
    compatibilityPercent: 68,
    likedAt: mockHoursAgo(12),
    comment: null,
    distanceKm: 5.3,
    sharedInterests: 3,
  },
  {
    userId: 'bot-013',
    firstName: 'Yağmur',
    age: 24,
    photoUrl: 'https://i.pravatar.cc/400?img=44',
    compatibilityPercent: 62,
    likedAt: mockHoursAgo(18),
    comment: 'Satranç oynayan birini arıyordum!',
    distanceKm: 12.4,
    sharedInterests: 2,
  },
  {
    userId: 'bot-014',
    firstName: 'İrem',
    age: 28,
    photoUrl: 'https://i.pravatar.cc/400?img=47',
    compatibilityPercent: 58,
    likedAt: mockHoursAgo(24),
    comment: null,
    distanceKm: 15.7,
    sharedInterests: 1,
  },
  {
    userId: 'bot-015',
    firstName: 'Deniz',
    age: 26,
    photoUrl: 'https://i.pravatar.cc/400?img=49',
    compatibilityPercent: 91,
    likedAt: mockHoursAgo(2),
    comment: null,
    distanceKm: 2.1,
    sharedInterests: 6,
  },
];

export const discoveryService = {
  // Get discovery feed
  getFeed: async (filters?: FeedFilters): Promise<FeedResponse> => {
    try {
      const response = await api.get<FeedResponse>('/discovery/feed', {
        params: filters,
      });
      return response.data;
    } catch {
      // Fallback to mock data when API is unavailable
      return getMockFeedResponse();
    }
  },

  // Swipe on a profile (like, pass, or super_like)
  swipe: async (data: SwipeRequest): Promise<SwipeResponse> => {
    try {
      const response = await api.post<SwipeResponse>('/discovery/swipe', data);
      return response.data;
    } catch {
      // Mock swipe response — simulate occasional matches on likes
      const isLike = data.direction === 'like' || data.direction === 'super_like';
      const isMatch = isLike && Math.random() < 0.25;
      return {
        direction: data.direction,
        isMatch,
        matchId: isMatch ? `mock-match-${Date.now()}` : undefined,
        animationType: 'normal',
      };
    }
  },

  // Undo last swipe within 5-second window
  undoSwipe: async (): Promise<UndoSwipeResponse> => {
    try {
      const response = await api.post<UndoSwipeResponse>('/discovery/undo');
      return response.data;
    } catch {
      return { undone: true, targetUserId: '' };
    }
  },

  // ── Likes You (Gold+ feature) ──────────────────────────────
  getLikesYou: async (): Promise<LikesYouResponse> => {
    try {
      const response = await api.get<LikesYouResponse>('/discovery/likes-you');
      return response.data;
    } catch {
      // Fallback to mock incoming likes when API is unavailable
      return {
        likes: MOCK_INCOMING_LIKES,
        total: MOCK_INCOMING_LIKES.length,
        isBlurred: false,
      };
    }
  },

  // ── Daily Picks ────────────────────────────────────────────
  getDailyPicks: async (): Promise<DailyPicksResponse> => {
    const response = await api.get<DailyPicksResponse>('/discovery/daily-picks');
    return response.data;
  },

  markDailyPickViewed: async (pickedUserId: string): Promise<void> => {
    await api.patch(`/discovery/daily-picks/${pickedUserId}/view`);
  },

  // ── Login Streak ───────────────────────────────────────────
  recordLogin: async (): Promise<LoginStreakResponse> => {
    try {
      const response = await api.post<LoginStreakResponse>('/profiles/login-streak');
      return response.data;
    } catch {
      return { currentStreak: 1, longestStreak: 1, goldAwarded: 0, milestoneReached: false };
    }
  },

  // ── Profile Boost ──────────────────────────────────────────
  getBoostStatus: async (): Promise<BoostStatusResponse> => {
    try {
      const response = await api.get<BoostStatusResponse>('/profiles/boost/status');
      return response.data;
    } catch {
      return { isActive: false };
    }
  },

  activateBoost: async (durationMinutes: number = 30): Promise<ActivateBoostResponse> => {
    try {
      const response = await api.post<ActivateBoostResponse>('/profiles/boost', { durationMinutes });
      return response.data;
    } catch {
      const goldCosts: Record<number, number> = { 30: 50, 120: 120, 1440: 250 };
      const cost = goldCosts[durationMinutes] ?? 50;
      return {
        success: true,
        endsAt: new Date(Date.now() + durationMinutes * 60 * 1000).toISOString(),
        goldDeducted: cost,
        goldBalance: 500 - cost,
      };
    }
  },

  // ── Profile Prompts ────────────────────────────────────────
  getPrompts: async (userId: string): Promise<ProfilePrompt[]> => {
    const response = await api.get<ProfilePrompt[]>(`/profiles/${userId}/prompts`);
    return response.data;
  },

  savePrompts: async (prompts: ProfilePrompt[]): Promise<ProfilePrompt[]> => {
    const response = await api.post<ProfilePrompt[]>('/profiles/prompts', { prompts });
    return response.data;
  },

  // ── Incognito Mode ──────────────────────────────────────────
  toggleIncognito: async (enabled: boolean): Promise<{ isIncognito: boolean }> => {
    const response = await api.patch<{ isIncognito: boolean }>('/profiles/incognito', { enabled });
    return response.data;
  },

  // ── Weekly Report ─────────────────────────────────────────
  getWeeklyReport: async (): Promise<WeeklyReportResponse> => {
    const response = await api.get<WeeklyReportResponse>('/discovery/weekly-report');
    return response.data;
  },

  // ── Profile Coach ─────────────────────────────────────────
  getProfileCoachTips: async (): Promise<ProfileCoachResponse> => {
    const response = await api.get<ProfileCoachResponse>('/profiles/coach');
    return response.data;
  },

  // ── Personality Types ─────────────────────────────────────
  updatePersonality: async (
    mbtiType?: string,
    enneagramType?: string
  ): Promise<PersonalityResponse> => {
    const response = await api.patch<PersonalityResponse>('/profiles/personality', {
      mbtiType,
      enneagramType,
    });
    return response.data;
  },
};
