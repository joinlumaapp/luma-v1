// Dev seed data — populates all stores with realistic Turkish bot profiles
// Only used in __DEV__ mode for testing the app without a backend

import { useDiscoveryStore } from '../stores/discoveryStore';
import { useMatchStore } from '../stores/matchStore';
import { useChatStore } from '../stores/chatStore';
import type { ReactionEmoji } from '../services/chatService';
import { useHarmonyStore } from '../stores/harmonyStore';
import { useProfileStore } from '../stores/profileStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useCrossedPathsStore } from '../stores/crossedPathsStore';
import { useSocialFeedStore } from '../stores/socialFeedStore';
import { socialFeedService } from '../services/socialFeedService';

// ── Helper: generate timestamps ─────────────────────────────────────
const now = new Date();
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();

// ── Discovery Profiles (15 bot profiles to swipe) ───────────────────
const discoveryProfiles = [
  {
    id: 'bot-001',
    name: 'Elif',
    age: 25,
    city: 'İstanbul',
    compatibilityPercent: 94,
    photoUrls: ['https://i.pravatar.cc/400?img=1'],
    bio: 'Kitap kurdu, kahve bağımlısı. Hafta sonları Prens Adaları\'nda bisiklet sürmek benim için terapi.',
    intentionTag: 'Ciddi İlişki',
    isVerified: true,
    distanceKm: 2.3,
    earnedBadges: ['verified_star', 'social_butterfly'],
    interestTags: ['books', 'coffee', 'travel', 'nature'],
  },
  {
    id: 'bot-002',
    name: 'Zeynep',
    age: 27,
    city: 'İstanbul',
    compatibilityPercent: 91,
    photoUrls: ['https://i.pravatar.cc/400?img=5'],
    bio: 'Yazılım mühendisi, yoga tutkunu. İyi bir sohbet, iyi bir kahve ve iyi bir kitap — hayatın anlamı bu.',
    intentionTag: 'Ciddi İlişki',
    isVerified: true,
    distanceKm: 4.1,
    earnedBadges: ['verified_star'],
    interestTags: ['technology', 'yoga', 'coffee', 'books'],
  },
  {
    id: 'bot-003',
    name: 'Selin',
    age: 24,
    city: 'İstanbul',
    compatibilityPercent: 88,
    photoUrls: ['https://i.pravatar.cc/400?img=9'],
    bio: 'Grafik tasarımcı, fotoğrafçılık meraklısı. Her gece yeni bir dizi başlatıp yarısında bırakıyorum.',
    intentionTag: 'Keşfediyorum',
    isVerified: false,
    distanceKm: 7.5,
    earnedBadges: [],
    interestTags: ['art', 'photography', 'movies'],
  },
  {
    id: 'bot-004',
    name: 'Ayşe',
    age: 28,
    city: 'Ankara',
    compatibilityPercent: 86,
    photoUrls: ['https://i.pravatar.cc/400?img=16'],
    bio: 'Doktor adayı, müzik dinlemeden çalışamam. Konser planlarım her zaman vardır.',
    intentionTag: 'Ciddi İlişki',
    isVerified: true,
    distanceKm: 12.0,
    earnedBadges: ['verified_star', 'early_bird'],
    interestTags: ['music', 'books', 'yoga'],
  },
  {
    id: 'bot-005',
    name: 'Defne',
    age: 23,
    city: 'İstanbul',
    compatibilityPercent: 85,
    photoUrls: ['https://i.pravatar.cc/400?img=20'],
    bio: 'Üniversite son sınıf, psikoloji okuyor. İnsanları anlamak en büyük hobim.',
    intentionTag: 'Emin Değilim',
    isVerified: false,
    distanceKm: 3.2,
    earnedBadges: [],
    interestTags: ['books', 'movies', 'coffee'],
  },
  {
    id: 'bot-006',
    name: 'Merve',
    age: 26,
    city: 'İstanbul',
    compatibilityPercent: 82,
    photoUrls: ['https://i.pravatar.cc/400?img=23'],
    bio: 'Dijital pazarlama uzmanı, seyahat blogcusu. 30 ülke gezdim, hedefim 50!',
    intentionTag: 'Keşfediyorum',
    isVerified: true,
    distanceKm: 5.8,
    earnedBadges: ['globe_trotter'],
    interestTags: ['travel', 'photography', 'cooking', 'fashion'],
  },
  {
    id: 'bot-007',
    name: 'Buse',
    age: 29,
    city: 'İzmir',
    compatibilityPercent: 79,
    photoUrls: ['https://i.pravatar.cc/400?img=25'],
    bio: 'Mimarlık ofisinde çalışıyorum. Kedi annesi x3. Pazar kahvaltılarını çok ciddiye alıyorum.',
    intentionTag: 'Ciddi İlişki',
    isVerified: true,
    distanceKm: 8.4,
    earnedBadges: ['verified_star'],
    interestTags: ['art', 'animals', 'cooking', 'coffee'],
  },
  {
    id: 'bot-008',
    name: 'Cansu',
    age: 25,
    city: 'İstanbul',
    compatibilityPercent: 76,
    photoUrls: ['https://i.pravatar.cc/400?img=29'],
    bio: 'Pilates eğitmeni, vegan mutfak deneyicisi. Pozitif enerji benim ikinci adım.',
    intentionTag: 'Keşfediyorum',
    isVerified: false,
    distanceKm: 6.1,
    earnedBadges: [],
    interestTags: ['yoga', 'cooking', 'nature', 'dance'],
  },
  {
    id: 'bot-009',
    name: 'İpek',
    age: 27,
    city: 'İstanbul',
    compatibilityPercent: 73,
    photoUrls: ['https://i.pravatar.cc/400?img=32'],
    bio: 'Avukat, kitap kulüpleri beni hayata bağlayan şey. Caz müziği olmadan bir gün bile geçirmem.',
    intentionTag: 'Ciddi İlişki',
    isVerified: true,
    distanceKm: 9.2,
    earnedBadges: ['bookworm'],
    interestTags: ['books', 'music', 'coffee'],
  },
  {
    id: 'bot-010',
    name: 'Ebru',
    age: 30,
    city: 'İstanbul',
    compatibilityPercent: 71,
    photoUrls: ['https://i.pravatar.cc/400?img=36'],
    bio: 'Öğretmen, çocuklarla çalışmak beni çok mutlu ediyor. Hafta sonları dağ yürüyüşü yapıyorum.',
    intentionTag: 'Ciddi İlişki',
    isVerified: false,
    distanceKm: 11.3,
    earnedBadges: [],
    interestTags: ['hiking', 'nature', 'books'],
  },
  {
    id: 'bot-011',
    name: 'Naz',
    age: 22,
    city: 'İstanbul',
    compatibilityPercent: 68,
    photoUrls: ['https://i.pravatar.cc/400?img=38'],
    bio: 'Müzik prodüksiyonu yapıyorum. Gitar çalmak ve yeni soundlar keşfetmek hayatım.',
    intentionTag: 'Emin Değilim',
    isVerified: false,
    distanceKm: 4.7,
    earnedBadges: [],
    interestTags: ['music', 'technology', 'gaming'],
  },
  {
    id: 'bot-012',
    name: 'Gizem',
    age: 26,
    city: 'İstanbul',
    compatibilityPercent: 65,
    photoUrls: ['https://i.pravatar.cc/400?img=41'],
    bio: 'Eczacı, bilim meraklısı. Netflix ve pipoporn izlerken uyuyakalmak en büyük yeteneğim.',
    intentionTag: 'Keşfediyorum',
    isVerified: true,
    distanceKm: 13.5,
    earnedBadges: ['verified_star'],
    interestTags: ['movies', 'books', 'nature'],
  },
  {
    id: 'bot-013',
    name: 'Yağmur',
    age: 24,
    city: 'Bursa',
    compatibilityPercent: 62,
    photoUrls: ['https://i.pravatar.cc/400?img=44'],
    bio: 'Endüstri mühendisi, satranç oyuncusu. Stratejik düşünmek iş hayatımda da kişisel hayatımda da var.',
    intentionTag: 'Ciddi İlişki',
    isVerified: false,
    distanceKm: 15.0,
    earnedBadges: [],
    interestTags: ['technology', 'gaming', 'sports'],
  },
  {
    id: 'bot-014',
    name: 'İrem',
    age: 28,
    city: 'İstanbul',
    compatibilityPercent: 58,
    photoUrls: ['https://i.pravatar.cc/400?img=47'],
    bio: 'Reklamcı, stand-up komedisine bayılıyorum. Hayat gülmeden geçilmez.',
    intentionTag: 'Keşfediyorum',
    isVerified: false,
    distanceKm: 3.9,
    earnedBadges: [],
    interestTags: ['movies', 'music', 'fashion', 'dance'],
  },
  {
    id: 'bot-015',
    name: 'Dilan',
    age: 25,
    city: 'İstanbul',
    compatibilityPercent: 55,
    photoUrls: ['https://i.pravatar.cc/400?img=49'],
    bio: 'Hemşire, gece mesaisi hayatım. Ama böyle bile olsa dans kursumu aksatmam.',
    intentionTag: 'Emin Değilim',
    isVerified: false,
    distanceKm: 7.8,
    earnedBadges: [],
    interestTags: ['dance', 'music', 'coffee'],
  },
];

// ── Matches (6 existing matches) ────────────────────────────────────
const matches = [
  {
    id: 'match-001',
    userId: 'bot-001',
    name: 'Elif',
    age: 25,
    city: 'İstanbul',
    photoUrl: 'https://i.pravatar.cc/400?img=1',
    compatibilityPercent: 94,
    intentionTag: 'Ciddi İlişki',
    isVerified: true,
    lastActivity: minutesAgo(5),
    isNew: true,
    hasHarmonyRoom: true,
    matchedAt: hoursAgo(2),
  },
  {
    id: 'match-002',
    userId: 'bot-002',
    name: 'Zeynep',
    age: 27,
    city: 'İstanbul',
    photoUrl: 'https://i.pravatar.cc/400?img=5',
    compatibilityPercent: 91,
    intentionTag: 'Ciddi İlişki',
    isVerified: true,
    lastActivity: minutesAgo(30),
    isNew: true,
    hasHarmonyRoom: false,
    matchedAt: hoursAgo(6),
  },
  {
    id: 'match-003',
    userId: 'bot-004',
    name: 'Ayşe',
    age: 28,
    city: 'Ankara',
    photoUrl: 'https://i.pravatar.cc/400?img=16',
    compatibilityPercent: 86,
    intentionTag: 'Ciddi İlişki',
    isVerified: true,
    lastActivity: hoursAgo(3),
    isNew: false,
    hasHarmonyRoom: false,
    matchedAt: daysAgo(1),
  },
  {
    id: 'match-004',
    userId: 'bot-006',
    name: 'Merve',
    age: 26,
    city: 'İstanbul',
    photoUrl: 'https://i.pravatar.cc/400?img=23',
    compatibilityPercent: 82,
    intentionTag: 'Keşfediyorum',
    isVerified: true,
    lastActivity: hoursAgo(8),
    isNew: false,
    hasHarmonyRoom: true,
    matchedAt: daysAgo(3),
  },
  {
    id: 'match-005',
    userId: 'bot-007',
    name: 'Buse',
    age: 29,
    city: 'İzmir',
    photoUrl: 'https://i.pravatar.cc/400?img=25',
    compatibilityPercent: 79,
    intentionTag: 'Ciddi İlişki',
    isVerified: true,
    lastActivity: daysAgo(1),
    isNew: false,
    hasHarmonyRoom: false,
    matchedAt: daysAgo(5),
  },
  {
    id: 'match-006',
    userId: 'bot-009',
    name: 'İpek',
    age: 27,
    city: 'İstanbul',
    photoUrl: 'https://i.pravatar.cc/400?img=32',
    compatibilityPercent: 73,
    intentionTag: 'Ciddi İlişki',
    isVerified: true,
    lastActivity: daysAgo(2),
    isNew: false,
    hasHarmonyRoom: false,
    matchedAt: daysAgo(7),
  },
];

// ── Chat Conversations & Messages ───────────────────────────────────
const conversations = [
  {
    matchId: 'match-001',
    userId: 'bot-001',
    name: 'Elif',
    photoUrl: 'https://i.pravatar.cc/400?img=1',
    lastMessage: 'Yarın Karaköy\'de bir kafe var, gidelim mi?',
    lastMessageAt: minutesAgo(5),
    unreadCount: 2,
    isOnline: true,
  },
  {
    matchId: 'match-002',
    userId: 'bot-002',
    name: 'Zeynep',
    photoUrl: 'https://i.pravatar.cc/400?img=5',
    lastMessage: 'O kitabı ben de çok sevmiştim!',
    lastMessageAt: minutesAgo(45),
    unreadCount: 1,
    isOnline: true,
  },
  {
    matchId: 'match-003',
    userId: 'bot-004',
    name: 'Ayşe',
    photoUrl: 'https://i.pravatar.cc/400?img=16',
    lastMessage: 'Merhaba! Uyumluluk puanımız çok yüksek, çok şaşırdım :)',
    lastMessageAt: hoursAgo(3),
    unreadCount: 0,
    isOnline: false,
  },
  {
    matchId: 'match-004',
    userId: 'bot-006',
    name: 'Merve',
    photoUrl: 'https://i.pravatar.cc/400?img=23',
    lastMessage: 'Japonya fotoğraflarını görmelisin!',
    lastMessageAt: hoursAgo(8),
    unreadCount: 0,
    isOnline: false,
  },
  {
    matchId: 'match-005',
    userId: 'bot-007',
    name: 'Buse',
    photoUrl: 'https://i.pravatar.cc/400?img=25',
    lastMessage: 'Merhaba, nasılsın?',
    lastMessageAt: daysAgo(1),
    unreadCount: 0,
    isOnline: false,
  },
];

const messages: Record<string, Array<{
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  type: 'TEXT';
  status: 'SENT' | 'DELIVERED' | 'READ';
  createdAt: string;
  isRead: boolean;
  reactions: Array<{ emoji: 'HEART' | 'LAUGH' | 'WOW' | 'SAD' | 'FIRE' | 'THUMBS_UP'; count: number; hasReacted: boolean }>;
}>> = {
  'match-001': [
    {
      id: 'msg-001',
      matchId: 'match-001',
      senderId: 'bot-001',
      content: 'Selam! Profilindeki biyo çok hoşuma gitti 😊',
      type: 'TEXT',
      status: 'READ',
      createdAt: hoursAgo(2),
      isRead: true,
      reactions: [],
    },
    {
      id: 'msg-002',
      matchId: 'match-001',
      senderId: 'dev-user-001',
      content: 'Merhaba Elif! Teşekkür ederim, seninki de çok güzel. Kitap okumayı sevdiğini gördüm, son ne okudun?',
      type: 'TEXT',
      status: 'READ',
      createdAt: hoursAgo(1.5),
      isRead: true,
      reactions: [{ emoji: 'HEART', count: 1, hasReacted: false }],
    },
    {
      id: 'msg-003',
      matchId: 'match-001',
      senderId: 'bot-001',
      content: 'Orhan Pamuk\'un "Kafamda Bir Tuhaflık" kitabını bitirdim, çok etkileyiciydi. Sen?',
      type: 'TEXT',
      status: 'READ',
      createdAt: hoursAgo(1),
      isRead: true,
      reactions: [],
    },
    {
      id: 'msg-004',
      matchId: 'match-001',
      senderId: 'dev-user-001',
      content: 'Ben de Sabahattin Ali okuyorum şu an. Kuyucaklı Yusuf harika bir eser.',
      type: 'TEXT',
      status: 'DELIVERED',
      createdAt: minutesAgo(30),
      isRead: true,
      reactions: [{ emoji: 'FIRE', count: 1, hasReacted: false }],
    },
    {
      id: 'msg-005',
      matchId: 'match-001',
      senderId: 'bot-001',
      content: 'Çok severim onu! Bi ara kitap kafede buluşup tartışsak çok iyi olur.',
      type: 'TEXT',
      status: 'DELIVERED',
      createdAt: minutesAgo(15),
      isRead: false,
      reactions: [],
    },
    {
      id: 'msg-006',
      matchId: 'match-001',
      senderId: 'bot-001',
      content: 'Yarın Karaköy\'de bir kafe var, gidelim mi?',
      type: 'TEXT',
      status: 'DELIVERED',
      createdAt: minutesAgo(5),
      isRead: false,
      reactions: [],
    },
  ],
  'match-002': [
    {
      id: 'msg-007',
      matchId: 'match-002',
      senderId: 'dev-user-001',
      content: 'Merhaba Zeynep! Yazılım mühendisi olarak ne üzerinde çalışıyorsun?',
      type: 'TEXT',
      status: 'READ',
      createdAt: hoursAgo(5),
      isRead: true,
      reactions: [],
    },
    {
      id: 'msg-008',
      matchId: 'match-002',
      senderId: 'bot-002',
      content: 'Selam! Bir fintech startup\'ında React Native ile mobil uygulama geliştiriyorum. Sen?',
      type: 'TEXT',
      status: 'READ',
      createdAt: hoursAgo(4),
      isRead: true,
      reactions: [{ emoji: 'WOW', count: 1, hasReacted: true }],
    },
    {
      id: 'msg-009',
      matchId: 'match-002',
      senderId: 'dev-user-001',
      content: 'Vay be, ben de bir dating app üzerinde çalışıyorum! React Native kullanıyoruz.',
      type: 'TEXT',
      status: 'READ',
      createdAt: hoursAgo(3),
      isRead: true,
      reactions: [{ emoji: 'LAUGH', count: 1, hasReacted: false }],
    },
    {
      id: 'msg-010',
      matchId: 'match-002',
      senderId: 'bot-002',
      content: 'Hahaha ne tesadüf! Yoga için de vakit bulabiliyor musun yoğun iş temposuyla?',
      type: 'TEXT',
      status: 'DELIVERED',
      createdAt: hoursAgo(1),
      isRead: true,
      reactions: [],
    },
    {
      id: 'msg-011',
      matchId: 'match-002',
      senderId: 'dev-user-001',
      content: 'Yoga hiç denemedim aslında ama merak ediyorum. Önerir misin?',
      type: 'TEXT',
      status: 'READ',
      createdAt: minutesAgo(50),
      isRead: true,
      reactions: [],
    },
    {
      id: 'msg-012',
      matchId: 'match-002',
      senderId: 'bot-002',
      content: 'O kitabı ben de çok sevmiştim!',
      type: 'TEXT',
      status: 'DELIVERED',
      createdAt: minutesAgo(45),
      isRead: false,
      reactions: [],
    },
  ],
  'match-003': [
    {
      id: 'msg-013',
      matchId: 'match-003',
      senderId: 'bot-004',
      content: 'Merhaba! Uyumluluk puanımız çok yüksek, çok şaşırdım :)',
      type: 'TEXT',
      status: 'READ',
      createdAt: hoursAgo(3),
      isRead: true,
      reactions: [{ emoji: 'HEART', count: 1, hasReacted: true }],
    },
    {
      id: 'msg-014',
      matchId: 'match-003',
      senderId: 'dev-user-001',
      content: 'Evet %86 bayağı iyi! Konser planlarını merak ettim, en son nereye gittin?',
      type: 'TEXT',
      status: 'READ',
      createdAt: hoursAgo(2.5),
      isRead: true,
      reactions: [],
    },
  ],
  'match-004': [
    {
      id: 'msg-015',
      matchId: 'match-004',
      senderId: 'bot-006',
      content: 'Selam! 30 ülke gezdim diye yazmıştım, en çok Japonya\'yı sevdim. Sen hiç gittin mi?',
      type: 'TEXT',
      status: 'READ',
      createdAt: daysAgo(2),
      isRead: true,
      reactions: [],
    },
    {
      id: 'msg-016',
      matchId: 'match-004',
      senderId: 'dev-user-001',
      content: 'Japonya listemde! Tokyo mu yoksa Kyoto mu daha güzel?',
      type: 'TEXT',
      status: 'READ',
      createdAt: daysAgo(1.5),
      isRead: true,
      reactions: [],
    },
    {
      id: 'msg-017',
      matchId: 'match-004',
      senderId: 'bot-006',
      content: 'Japonya fotoğraflarını görmelisin!',
      type: 'TEXT',
      status: 'DELIVERED',
      createdAt: hoursAgo(8),
      isRead: true,
      reactions: [{ emoji: 'FIRE', count: 1, hasReacted: true }],
    },
  ],
};

// ── Harmony Sessions ────────────────────────────────────────────────
const harmonySessions = [
  {
    id: 'harmony-001',
    matchId: 'match-001',
    matchName: 'Elif',
    status: 'active' as const,
    remainingSeconds: 720,
    totalMinutes: 15,
    extensions: 0,
    cards: [
      { id: 'card-001', type: 'question' as const, text: 'Hayatında en çok neyi değiştirmek isterdin?', isRevealed: true },
      { id: 'card-002', type: 'question' as const, text: 'İdeal bir hafta sonu nasıl geçerdi?', isRevealed: true },
      { id: 'card-003', type: 'game' as const, text: '2 Doğru 1 Yanlış: Her biriniz 3 şey söylesin, biri yanlış olsun!', isRevealed: false },
      { id: 'card-004', type: 'challenge' as const, text: '60 saniye içinde birbirinize 5 iltifat edin!', isRevealed: false },
      { id: 'card-005', type: 'question' as const, text: 'En son ne zaman gerçekten mutlu hissettin?', isRevealed: false },
    ],
    messages: [
      { id: 'hmsg-001', text: 'Merhaba! Harmony Room çok eğlenceli bir fikir ya.', sender: 'other' as const, timestamp: '14:30', status: 'read' as const },
      { id: 'hmsg-002', text: 'Evet, kartları açarak sohbet etmek harika!', sender: 'me' as const, timestamp: '14:31', status: 'read' as const },
      { id: 'hmsg-003', text: 'İlk kartı açtım, çok derin bir soru geldi.', sender: 'other' as const, timestamp: '14:32', status: 'delivered' as const },
    ],
    startedAt: minutesAgo(3),
    compatibilityScore: 94,
  },
  {
    id: 'harmony-002',
    matchId: 'match-004',
    matchName: 'Merve',
    status: 'completed' as const,
    remainingSeconds: 0,
    totalMinutes: 15,
    extensions: 1,
    cards: [
      { id: 'card-006', type: 'question' as const, text: 'Seyahat ederken en unutulmaz anın neydi?', isRevealed: true },
      { id: 'card-007', type: 'question' as const, text: 'Bir süper gücün olsa ne olmasını isterdin?', isRevealed: true },
      { id: 'card-008', type: 'game' as const, text: 'Kelime Oyunu: Sıra sıra bir harf ekleyerek kelime türetin!', isRevealed: true },
    ],
    messages: [
      { id: 'hmsg-004', text: 'Bu çok güzel bir soru!', sender: 'other' as const, timestamp: '10:15', status: 'read' as const },
      { id: 'hmsg-005', text: 'Bence en güzel seyahat anım Kapadokya balonlarıydı.', sender: 'me' as const, timestamp: '10:16', status: 'read' as const },
      { id: 'hmsg-006', text: 'Ben de tam orayı diyecektim!', sender: 'other' as const, timestamp: '10:17', status: 'read' as const },
      { id: 'hmsg-007', text: 'Süper güç olarak telepati isterdim. Seninki?', sender: 'me' as const, timestamp: '10:20', status: 'read' as const },
      { id: 'hmsg-008', text: 'Zamanı durdurmak! Güzel anları uzatabilmek için.', sender: 'other' as const, timestamp: '10:21', status: 'read' as const },
    ],
    startedAt: daysAgo(2),
    compatibilityScore: 82,
  },
];

// ── Notifications ───────────────────────────────────────────────────
const notifications = [
  {
    id: 'notif-001',
    type: 'NEW_MATCH',
    title: 'Yeni Eşleşme!',
    body: 'Elif ile eşleştiniz! %94 uyumluluk puanı.',
    data: { matchId: 'match-001' },
    isRead: false,
    createdAt: hoursAgo(2),
  },
  {
    id: 'notif-002',
    type: 'NEW_MATCH',
    title: 'Yeni Eşleşme!',
    body: 'Zeynep ile eşleştiniz! %91 uyumluluk puanı.',
    data: { matchId: 'match-002' },
    isRead: false,
    createdAt: hoursAgo(6),
  },
  {
    id: 'notif-003',
    type: 'MESSAGE',
    title: 'Elif',
    body: 'Yarın Karaköy\'de bir kafe var, gidelim mi?',
    data: { matchId: 'match-001' },
    isRead: false,
    createdAt: minutesAgo(5),
  },
  {
    id: 'notif-004',
    type: 'BADGE_EARNED',
    title: 'Yeni Rozet!',
    body: '"Sohbet Yıldızı" rozetini kazandın! 10 farklı kişiyle sohbet ettin.',
    data: { badgeId: 'chat_star' },
    isRead: false,
    createdAt: hoursAgo(1),
  },
  {
    id: 'notif-005',
    type: 'HARMONY',
    title: 'Harmony Daveti',
    body: 'Elif seni Harmony Room\'a davet etti!',
    data: { sessionId: 'harmony-001' },
    isRead: true,
    createdAt: minutesAgo(10),
  },
  {
    id: 'notif-006',
    type: 'SYSTEM',
    title: 'Hoşgeldin!',
    body: 'LUMA\'ya hoşgeldin! Profilini tamamla ve eşleşmeler bulmaya başla.',
    data: {},
    isRead: true,
    createdAt: daysAgo(7),
  },
  {
    id: 'notif-007',
    type: 'MESSAGE',
    title: 'Zeynep',
    body: 'O kitabı ben de çok sevmiştim!',
    data: { matchId: 'match-002' },
    isRead: false,
    createdAt: minutesAgo(45),
  },
];

// ── Crossed Paths (10 profiles in Istanbul neighborhoods) ───────────
const crossedPaths = [
  {
    id: 'cp-001',
    userId: 'bot-cp-001',
    name: 'Deniz',
    age: 26,
    photoUrl: 'https://i.pravatar.cc/400?img=2',
    areaName: 'Bebek',
    city: 'İstanbul',
    lastSeenAt: minutesAgo(45),
    crossingCount: 3,
    crossingPeriod: 'Bu hafta',
    compatibilityPercent: 89,
    intentionTag: 'Ciddi İlişki',
    isVerified: true,
    distanceKm: 0.8,
  },
  {
    id: 'cp-002',
    userId: 'bot-cp-002',
    name: 'Cemre',
    age: 24,
    photoUrl: 'https://i.pravatar.cc/400?img=10',
    areaName: 'Kadıköy',
    city: 'İstanbul',
    lastSeenAt: hoursAgo(2),
    crossingCount: 5,
    crossingPeriod: 'Bu hafta',
    compatibilityPercent: 92,
    intentionTag: 'Ciddi İlişki',
    isVerified: true,
    distanceKm: 1.2,
  },
  {
    id: 'cp-003',
    userId: 'bot-cp-003',
    name: 'Ece',
    age: 27,
    photoUrl: 'https://i.pravatar.cc/400?img=15',
    areaName: 'Beşiktaş',
    city: 'İstanbul',
    lastSeenAt: hoursAgo(4),
    crossingCount: 2,
    crossingPeriod: 'Bu hafta',
    compatibilityPercent: 85,
    intentionTag: 'Keşfediyorum',
    isVerified: false,
    distanceKm: 1.5,
  },
  {
    id: 'cp-004',
    userId: 'bot-cp-004',
    name: 'Melis',
    age: 25,
    photoUrl: 'https://i.pravatar.cc/400?img=19',
    areaName: 'Nişantaşı',
    city: 'İstanbul',
    lastSeenAt: hoursAgo(6),
    crossingCount: 4,
    crossingPeriod: 'Bu hafta',
    compatibilityPercent: 91,
    intentionTag: 'Ciddi İlişki',
    isVerified: true,
    distanceKm: 0.5,
  },
  {
    id: 'cp-005',
    userId: 'bot-cp-005',
    name: 'Aslı',
    age: 23,
    photoUrl: 'https://i.pravatar.cc/400?img=22',
    areaName: 'Cihangir',
    city: 'İstanbul',
    lastSeenAt: hoursAgo(1),
    crossingCount: 7,
    crossingPeriod: 'Bu hafta',
    compatibilityPercent: 87,
    intentionTag: 'Ciddi İlişki',
    isVerified: true,
    distanceKm: 0.3,
  },
  {
    id: 'cp-006',
    userId: 'bot-cp-006',
    name: 'Pınar',
    age: 28,
    photoUrl: 'https://i.pravatar.cc/400?img=26',
    areaName: 'Moda',
    city: 'İstanbul',
    lastSeenAt: daysAgo(1),
    crossingCount: 2,
    crossingPeriod: 'Son 2 hafta',
    compatibilityPercent: 78,
    intentionTag: 'Keşfediyorum',
    isVerified: false,
    distanceKm: 2.1,
  },
  {
    id: 'cp-007',
    userId: 'bot-cp-007',
    name: 'Nehir',
    age: 26,
    photoUrl: 'https://i.pravatar.cc/400?img=30',
    areaName: 'Etiler',
    city: 'İstanbul',
    lastSeenAt: hoursAgo(8),
    crossingCount: 3,
    crossingPeriod: 'Bu hafta',
    compatibilityPercent: 83,
    intentionTag: 'Ciddi İlişki',
    isVerified: true,
    distanceKm: 1.0,
  },
  {
    id: 'cp-008',
    userId: 'bot-cp-008',
    name: 'Simge',
    age: 25,
    photoUrl: 'https://i.pravatar.cc/400?img=34',
    areaName: 'Ortaköy',
    city: 'İstanbul',
    lastSeenAt: hoursAgo(3),
    crossingCount: 6,
    crossingPeriod: 'Bu hafta',
    compatibilityPercent: 90,
    intentionTag: 'Ciddi İlişki',
    isVerified: true,
    distanceKm: 0.7,
  },
  {
    id: 'cp-009',
    userId: 'bot-cp-009',
    name: 'Tuğçe',
    age: 24,
    photoUrl: 'https://i.pravatar.cc/400?img=37',
    areaName: 'Bebek',
    city: 'İstanbul',
    lastSeenAt: daysAgo(2),
    crossingCount: 1,
    crossingPeriod: 'Son 2 hafta',
    compatibilityPercent: 75,
    intentionTag: 'Emin Değilim',
    isVerified: false,
    distanceKm: 1.8,
  },
  {
    id: 'cp-010',
    userId: 'bot-cp-010',
    name: 'Yasemin',
    age: 27,
    photoUrl: 'https://i.pravatar.cc/400?img=40',
    areaName: 'Kadıköy',
    city: 'İstanbul',
    lastSeenAt: minutesAgo(20),
    crossingCount: 4,
    crossingPeriod: 'Bu hafta',
    compatibilityPercent: 93,
    intentionTag: 'Ciddi İlişki',
    isVerified: true,
    distanceKm: 0.4,
  },
];

// ── Dev User's Own Profile ──────────────────────────────────────────
const devUserProfile = {
  firstName: 'Ari',
  birthDate: '1995-06-15',
  gender: 'male',
  intentionTag: 'Ciddi İlişki',
  interestTags: ['technology', 'travel', 'coffee', 'music', 'books'],
  photos: [
    'https://i.pravatar.cc/400?img=68',
    'https://i.pravatar.cc/400?img=59',
    'https://i.pravatar.cc/400?img=52',
  ],
  bio: 'Girişimci, teknoloji tutkunu. İyi bir kahve eşliğinde derin sohbetlere bayılırım. Seyahat etmeyi, yeni kültürler keşfetmeyi ve hayatı anlamlandırmayı seviyorum.',
  answers: { 1: 3, 2: 4, 3: 2, 4: 5, 5: 1, 6: 3, 7: 4, 8: 2, 9: 5, 10: 3 },
  city: 'İstanbul',
  isComplete: true,
};

// ── Match Detail Data (compatibility breakdown) ────────────────────
const matchDetails: Record<string, {
  photos: string[];
  bio: string;
  compatibilityBreakdown: Array<{ category: string; score: number }>;
}> = {
  'match-001': {
    photos: ['https://i.pravatar.cc/400?img=1'],
    bio: 'Kitap kurdu, kahve bağımlısı. Hafta sonları Prens Adaları\'nda bisiklet sürmek benim için terapi.',
    compatibilityBreakdown: [
      { category: 'Yaşam Tarzı', score: 96 },
      { category: 'Değerler', score: 94 },
      { category: 'İletişim', score: 92 },
      { category: 'Sosyal Uyum', score: 90 },
      { category: 'Gelecek Planları', score: 95 },
    ],
  },
  'match-002': {
    photos: ['https://i.pravatar.cc/400?img=5'],
    bio: 'Yazılım mühendisi, yoga tutkunu. İyi bir sohbet, iyi bir kahve ve iyi bir kitap — hayatın anlamı bu.',
    compatibilityBreakdown: [
      { category: 'Yaşam Tarzı', score: 93 },
      { category: 'Değerler', score: 90 },
      { category: 'İletişim', score: 88 },
      { category: 'Sosyal Uyum', score: 92 },
      { category: 'Gelecek Planları', score: 91 },
    ],
  },
  'match-003': {
    photos: ['https://i.pravatar.cc/400?img=16'],
    bio: 'Doktor adayı, müzik dinlemeden çalışamam. Konser planlarım her zaman vardır.',
    compatibilityBreakdown: [
      { category: 'Yaşam Tarzı', score: 88 },
      { category: 'Değerler', score: 90 },
      { category: 'İletişim', score: 82 },
      { category: 'Sosyal Uyum', score: 85 },
      { category: 'Gelecek Planları', score: 86 },
    ],
  },
  'match-004': {
    photos: ['https://i.pravatar.cc/400?img=23'],
    bio: 'Dijital pazarlama uzmanı, seyahat blogcusu. 30 ülke gezdim, hedefim 50!',
    compatibilityBreakdown: [
      { category: 'Yaşam Tarzı', score: 85 },
      { category: 'Değerler', score: 80 },
      { category: 'İletişim', score: 83 },
      { category: 'Sosyal Uyum', score: 78 },
      { category: 'Gelecek Planları', score: 84 },
    ],
  },
  'match-005': {
    photos: ['https://i.pravatar.cc/400?img=25'],
    bio: 'Mimarlık ofisinde çalışıyorum. Kedi annesi x3. Pazar kahvaltılarını çok ciddiye alıyorum.',
    compatibilityBreakdown: [
      { category: 'Yaşam Tarzı', score: 82 },
      { category: 'Değerler', score: 78 },
      { category: 'İletişim', score: 80 },
      { category: 'Sosyal Uyum', score: 75 },
      { category: 'Gelecek Planları', score: 79 },
    ],
  },
  'match-006': {
    photos: ['https://i.pravatar.cc/400?img=32'],
    bio: 'Avukat, kitap kulüpleri beni hayata bağlayan şey. Caz müziği olmadan bir gün bile geçirmem.',
    compatibilityBreakdown: [
      { category: 'Yaşam Tarzı', score: 75 },
      { category: 'Değerler', score: 72 },
      { category: 'İletişim', score: 74 },
      { category: 'Sosyal Uyum', score: 70 },
      { category: 'Gelecek Planları', score: 73 },
    ],
  },
};

// ── Main Seed Function ──────────────────────────────────────────────

export function seedDevData(): void {
  // 1. Profile (dev user's own profile)
  useProfileStore.setState({
    profile: devUserProfile,
    completionPercent: 100,
    _photoIds: ['photo-1', 'photo-2', 'photo-3'],
    isLoading: false,
  });

  // 2. Discovery feed (15 profiles to swipe)
  useDiscoveryStore.setState({
    cards: discoveryProfiles,
    currentIndex: 0,
    dailyRemaining: 20,
    isLoading: false,
    filters: {
      minAge: 18,
      maxAge: 35,
      maxDistance: 50,
      intentionTags: [],
      genderPreference: 'all',
      height: null,
      education: [],
      smoking: [],
      drinking: [],
      exercise: [],
      zodiac: [],
    },
  });

  // 3. Matches (6 existing matches)
  useMatchStore.setState({
    matches,
    totalCount: matches.length,
    isLoading: false,
  });

  // 4. Chat conversations and messages
  useChatStore.setState({
    conversations,
    messages,
    totalUnread: 3,
    isLoadingConversations: false,
    isLoadingMessages: false,
    hasMore: {
      'match-001': false,
      'match-002': false,
      'match-003': false,
      'match-004': false,
    },
    cursors: {
      'match-001': null,
      'match-002': null,
      'match-003': null,
      'match-004': null,
    },
  });

  // 5. Harmony sessions
  useHarmonyStore.setState({
    sessions: harmonySessions,
    isLoading: false,
  });

  // 6. Notifications
  useNotificationStore.setState({
    notifications,
    unreadCount: notifications.filter((n) => !n.isRead).length,
    total: notifications.length,
    totalPages: 1,
    page: 1,
    isLoading: false,
    hasPermission: true,
  });

  // 7. Crossed Paths
  useCrossedPathsStore.setState({
    paths: crossedPaths,
    totalCount: crossedPaths.length,
    isLoading: false,
    fetchPaths: async () => {
      useCrossedPathsStore.setState({
        paths: crossedPaths,
        totalCount: crossedPaths.length,
        isLoading: false,
      });
    },
    likePath: async (userId: string) => {
      useCrossedPathsStore.setState((state) => ({
        paths: state.paths.filter((p) => p.userId !== userId),
        totalCount: state.totalCount - 1,
      }));
      // 25% chance of match
      return Math.random() < 0.25;
    },
    skipPath: async (userId: string) => {
      useCrossedPathsStore.setState((state) => ({
        paths: state.paths.filter((p) => p.userId !== userId),
        totalCount: state.totalCount - 1,
      }));
    },
  });

  // 8. Override getMatch to resolve from local data (no backend needed)
  const originalGetMatch = useMatchStore.getState().getMatch;
  useMatchStore.setState({
    getMatch: async (matchId: string) => {
      const match = matches.find((m) => m.id === matchId);
      const detail = matchDetails[matchId];
      if (match && detail) {
        useMatchStore.setState({
          selectedMatch: {
            ...match,
            photos: detail.photos,
            bio: detail.bio,
            compatibilityBreakdown: detail.compatibilityBreakdown,
          },
          isLoading: false,
        });
      } else {
        // Fallback to original for unknown IDs
        await originalGetMatch(matchId);
      }
    },
  });

  // 8. Override fetchMatches to return seeded data
  useMatchStore.setState({
    fetchMatches: async () => {
      useMatchStore.setState({
        matches,
        totalCount: matches.length,
        isLoading: false,
      });
    },
  });

  // 9. Override fetchConversations to return seeded data
  useChatStore.setState({
    fetchConversations: async () => {
      useChatStore.setState({
        conversations,
        totalUnread: 3,
        isLoadingConversations: false,
      });
    },
  });

  // 10. Override fetchMessages to return seeded data
  useChatStore.setState({
    fetchMessages: async (matchId: string) => {
      useChatStore.setState((state) => ({
        messages: {
          ...state.messages,
          [matchId]: messages[matchId] ?? [],
        },
        isLoadingMessages: false,
        hasMore: { ...state.hasMore, [matchId]: false },
        cursors: { ...state.cursors, [matchId]: null },
      }));
    },
  });

  // 11. Override sendMessage for local echo
  useChatStore.setState({
    sendMessage: async (matchId: string, content: string) => {
      useChatStore.setState({ isSending: true });
      const newMsg = {
        id: `msg-dev-${Date.now()}`,
        matchId,
        senderId: 'dev-user-001',
        content,
        type: 'TEXT' as const,
        status: 'SENT' as const,
        createdAt: new Date().toISOString(),
        isRead: true,
        reactions: [],
      };
      useChatStore.setState((state) => ({
        messages: {
          ...state.messages,
          [matchId]: [...(state.messages[matchId] ?? []), newMsg],
        },
        isSending: false,
      }));
      useChatStore.getState().updateLastMessage(matchId, content, newMsg.createdAt);
    },
  });

  // 11b. Override sendImageMessage for local echo
  useChatStore.setState({
    sendImageMessage: async (matchId: string, _imageUri: string) => {
      useChatStore.setState({ isSending: true });
      const newMsg = {
        id: `msg-img-dev-${Date.now()}`,
        matchId,
        senderId: 'dev-user-001',
        content: '',
        type: 'IMAGE' as const,
        status: 'SENT' as const,
        createdAt: new Date().toISOString(),
        isRead: true,
        reactions: [],
        imageUrl: _imageUri,
      };
      useChatStore.setState((state) => ({
        messages: {
          ...state.messages,
          [matchId]: [...(state.messages[matchId] ?? []), newMsg],
        },
        isSending: false,
      }));
      useChatStore.getState().updateLastMessage(matchId, 'Fotoğraf', newMsg.createdAt);
    },
  });

  // 11c. Override markAsRead for local operation
  useChatStore.setState({
    markAsRead: async (matchId: string) => {
      useChatStore.setState((state) => ({
        conversations: state.conversations.map((conv) =>
          conv.matchId === matchId ? { ...conv, unreadCount: 0 } : conv
        ),
        totalUnread: state.conversations.reduce(
          (sum, conv) => sum + (conv.matchId === matchId ? 0 : conv.unreadCount),
          0
        ),
      }));
    },
  });

  // 11d. Override toggleReaction for local operation
  useChatStore.setState({
    toggleReaction: async (matchId: string, messageId: string, emoji: ReactionEmoji) => {
      useChatStore.setState((state) => {
        const matchMessages = state.messages[matchId] ?? [];
        const updatedMessages = matchMessages.map((msg) => {
          if (msg.id !== messageId) return msg;
          const existingReactions = msg.reactions ?? [];
          const existingIndex = existingReactions.findIndex(
            (r) => r.emoji === emoji && r.hasReacted
          );
          if (existingIndex >= 0) {
            // Remove reaction
            const updated = existingReactions
              .map((r) => r.emoji === emoji ? { ...r, count: r.count - 1, hasReacted: false } : r)
              .filter((r) => r.count > 0);
            return { ...msg, reactions: updated };
          }
          // Add reaction
          const emojiIndex = existingReactions.findIndex((r) => r.emoji === emoji);
          if (emojiIndex >= 0) {
            const updated = existingReactions.map((r) =>
              r.emoji === emoji ? { ...r, count: r.count + 1, hasReacted: true } : r
            );
            return { ...msg, reactions: updated };
          }
          return {
            ...msg,
            reactions: [...existingReactions, { emoji, count: 1, hasReacted: true }],
          };
        });
        return {
          messages: { ...state.messages, [matchId]: updatedMessages },
        };
      });
    },
  });

  // 12. Override discovery swipe for local operation (no API needed)
  useDiscoveryStore.setState({
    swipe: async (direction: 'left' | 'right' | 'up', _profileId: string) => {
      const state = useDiscoveryStore.getState();
      const currentProfile = state.cards[state.currentIndex];
      if (!currentProfile) return;

      if (direction === 'right' || direction === 'up') {
        useDiscoveryStore.setState((prev) => ({
          dailyRemaining: Math.max(0, prev.dailyRemaining - 1),
        }));
      }

      // 20% chance of match on right swipe, 40% on super like
      const matchChance = direction === 'up' ? 0.4 : direction === 'right' ? 0.2 : 0;
      const isMatch = Math.random() < matchChance;

      if (isMatch) {
        const newMatchId = `match-dev-${Date.now()}`;
        useDiscoveryStore.setState((prev) => ({
          currentIndex: prev.currentIndex + 1,
          showMatchAnimation: true,
          currentMatchId: newMatchId,
          matchAnimationType: direction === 'up' ? 'super_compatibility' : 'normal',
          canUndo: false,
          undoTimerId: null,
          lastSwipedProfile: null,
        }));
      } else {
        // Start 5-second undo window
        const timerId = setTimeout(() => {
          useDiscoveryStore.setState({ canUndo: false, undoTimerId: null, lastSwipedProfile: null });
        }, 5000);

        if (direction === 'up') {
          useDiscoveryStore.setState({ showSuperLikeGlow: true });
          setTimeout(() => {
            useDiscoveryStore.setState({ showSuperLikeGlow: false });
          }, 1500);
        }

        useDiscoveryStore.setState((prev) => ({
          currentIndex: prev.currentIndex + 1,
          canUndo: true,
          undoTimerId: timerId,
          lastSwipedProfile: currentProfile,
        }));
      }
    },
  });

  // 13. Override undo for local operation
  useDiscoveryStore.setState({
    undoLastSwipe: async () => {
      const state = useDiscoveryStore.getState();
      if (!state.canUndo || !state.lastSwipedProfile) return;

      if (state.undoTimerId) clearTimeout(state.undoTimerId);

      useDiscoveryStore.setState((prev) => ({
        currentIndex: Math.max(0, prev.currentIndex - 1),
        canUndo: false,
        undoTimerId: null,
        lastSwipedProfile: null,
        dailyRemaining: prev.dailyRemaining + 1,
      }));
    },
  });

  // 14. Override refreshFeed to reset index
  useDiscoveryStore.setState({
    refreshFeed: async () => {
      useDiscoveryStore.setState({
        currentIndex: 0,
        isLoading: false,
      });
    },
  });

  // 15. Override fetchFeed to not hit API
  useDiscoveryStore.setState({
    fetchFeed: async () => {
      // Data already seeded, just make sure loading is off
      useDiscoveryStore.setState({ isLoading: false });
    },
  });

  // 16. Override fetchSessions to return seeded harmony data
  useHarmonyStore.setState({
    sessions: harmonySessions,
    isLoading: false,
    fetchSessions: async () => {
      useHarmonyStore.setState({
        sessions: harmonySessions,
        isLoading: false,
      });
    },
  });

  // 17. Override fetchProfile to return seeded profile
  useProfileStore.setState({
    fetchProfile: async () => {
      useProfileStore.setState({
        profile: devUserProfile,
        completionPercent: 100,
        isLoading: false,
      });
    },
  });

  // 19. Social Feed — seed with mock posts
  const mockFeedPosts = socialFeedService.getMockPosts();
  useSocialFeedStore.setState({
    posts: mockFeedPosts,
    filter: 'ONERILEN',
    selectedTopic: null,
    isLoading: false,
    isRefreshing: false,
    cursor: null,
    hasMore: false,
  });

  // Override fetchFeed to return seeded data
  useSocialFeedStore.setState({
    fetchFeed: async () => {
      const { selectedTopic } = useSocialFeedStore.getState();
      let posts = [...mockFeedPosts];
      if (selectedTopic) {
        posts = posts.filter((p) => p.topic === selectedTopic);
      }
      useSocialFeedStore.setState({ posts, isLoading: false });
    },
    refreshFeed: async () => {
      const { selectedTopic } = useSocialFeedStore.getState();
      let posts = [...mockFeedPosts];
      if (selectedTopic) {
        posts = posts.filter((p) => p.topic === selectedTopic);
      }
      useSocialFeedStore.setState({ posts, isRefreshing: false });
    },
  });

  if (__DEV__) {
    console.log('[DevSeed] Tüm store\'lar mock data ile dolduruldu!');
    console.log(`  - ${discoveryProfiles.length} keşif profili`);
    console.log(`  - ${matches.length} eşleşme`);
    console.log(`  - ${conversations.length} sohbet`);
    console.log(`  - ${harmonySessions.length} harmony oturumu`);
    console.log(`  - ${notifications.length} bildirim`);
    console.log(`  - ${crossedPaths.length} kesişen yol`);
    console.log(`  - ${mockFeedPosts.length} sosyal akış paylaşımı`);
    console.log('  - API çağrıları mock override edildi');
  }
}
