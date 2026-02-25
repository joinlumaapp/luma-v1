// LUMA V1 — Database Seed Script (Comprehensive)
// Seeds: 45 Compatibility Questions, 30 Harmony Question Cards,
// 5 Game Cards, Badge Definitions, 10 Demo Users with Profiles,
// Photos, Answers, Matches, Chat Messages, and Badge Awards

import { PrismaClient, QuestionCategory, PackageTier, IntentionTag, Gender, SwipeAction, MatchAnimationType, CompatibilityLevel, ChatMessageType, ChatMessageStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================================
// DEMO USER DATA
// ============================================================

interface DemoUser {
  firstName: string;
  gender: Gender;
  birthDate: Date;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  intentionTag: IntentionTag;
  bio: string;
  phone: string;
  phoneCountryCode: string;
  isVerified: boolean;
  packageTier: PackageTier;
  goldBalance: number;
}

const DEMO_USERS: DemoUser[] = [
  {
    firstName: 'Elif',
    gender: Gender.FEMALE,
    birthDate: new Date('2001-03-15'),
    city: 'Istanbul',
    country: 'Turkey',
    latitude: 41.0082,
    longitude: 28.9784,
    intentionTag: IntentionTag.SERIOUS_RELATIONSHIP,
    bio: 'Kitap kurdu, kahve bagimli. Haftasonlari sahilde yurumek en sevdigim aktivite. Derin sohbetlere bayilirim, yuzeysel konusmalara sabrim yok. Ruh esimi ariyorum.',
    phone: '+905551234501',
    phoneCountryCode: '+90',
    isVerified: true,
    packageTier: PackageTier.PRO,
    goldBalance: 150,
  },
  {
    firstName: 'Ahmet',
    gender: Gender.MALE,
    birthDate: new Date('1998-07-22'),
    city: 'Istanbul',
    country: 'Turkey',
    latitude: 41.0422,
    longitude: 29.0083,
    intentionTag: IntentionTag.SERIOUS_RELATIONSHIP,
    bio: 'Yazilimci, dagci, aci kahve tiryakisi. Hafta ici kod yazarim, haftasonu zirveler tirmanirim. Hayatta tutkuyla yasayan birini ariyorum.',
    phone: '+905551234502',
    phoneCountryCode: '+90',
    isVerified: true,
    packageTier: PackageTier.GOLD,
    goldBalance: 80,
  },
  {
    firstName: 'Zeynep',
    gender: Gender.FEMALE,
    birthDate: new Date('2003-01-10'),
    city: 'Ankara',
    country: 'Turkey',
    latitude: 39.9334,
    longitude: 32.8597,
    intentionTag: IntentionTag.EXPLORING,
    bio: 'Universite ogrencisi, sanat ve muzik hayatim. Gitar calarim, resim yaparim, yeni insanlarla tanismak beni mutlu eder. Hayati kesfediyorum!',
    phone: '+905551234503',
    phoneCountryCode: '+90',
    isVerified: true,
    packageTier: PackageTier.FREE,
    goldBalance: 10,
  },
  {
    firstName: 'Can',
    gender: Gender.MALE,
    birthDate: new Date('1996-11-05'),
    city: 'Izmir',
    country: 'Turkey',
    latitude: 38.4237,
    longitude: 27.1428,
    intentionTag: IntentionTag.SERIOUS_RELATIONSHIP,
    bio: 'Muzisyen, seyahat tutkunu, iyi bir dinleyici. Jazz barlarda performans sergilerim. Hayatin ritmine uyum saglayacak birini ariyorum.',
    phone: '+905551234504',
    phoneCountryCode: '+90',
    isVerified: true,
    packageTier: PackageTier.GOLD,
    goldBalance: 60,
  },
  {
    firstName: 'Selin',
    gender: Gender.FEMALE,
    birthDate: new Date('1999-06-18'),
    city: 'Istanbul',
    country: 'Turkey',
    latitude: 41.0136,
    longitude: 28.9550,
    intentionTag: IntentionTag.NOT_SURE,
    bio: 'Grafik tasarimci, renkleri ve detaylari severim. Kedilerim benim her seyim. Iyi bir sohbet iyi bir iliskinin baslangicidir.',
    phone: '+905551234505',
    phoneCountryCode: '+90',
    isVerified: true,
    packageTier: PackageTier.FREE,
    goldBalance: 5,
  },
  {
    firstName: 'Burak',
    gender: Gender.MALE,
    birthDate: new Date('2000-09-30'),
    city: 'Antalya',
    country: 'Turkey',
    latitude: 36.8969,
    longitude: 30.7133,
    intentionTag: IntentionTag.EXPLORING,
    bio: 'Sporcu, doga sever, dalga sorfcusu. Deniz kenarinda yasiyorum ve her gunu dolu dolu geciriyorum. Enerjik ve pozitif insanlarla tanismak isterim.',
    phone: '+905551234506',
    phoneCountryCode: '+90',
    isVerified: false,
    packageTier: PackageTier.FREE,
    goldBalance: 0,
  },
  {
    firstName: 'Defne',
    gender: Gender.FEMALE,
    birthDate: new Date('2002-04-12'),
    city: 'Istanbul',
    country: 'Turkey',
    latitude: 41.0053,
    longitude: 29.0126,
    intentionTag: IntentionTag.SERIOUS_RELATIONSHIP,
    bio: 'Tip ogrencisi, gelecekte cocuk doktoru olmak istiyorum. Sabah erkenci, gece okuyan, hafta sonu kahvalti yapan biriyim. Guvenilir ve samimi birini ariyorum.',
    phone: '+905551234507',
    phoneCountryCode: '+90',
    isVerified: true,
    packageTier: PackageTier.PRO,
    goldBalance: 200,
  },
  {
    firstName: 'Emre',
    gender: Gender.MALE,
    birthDate: new Date('1994-02-28'),
    city: 'Bursa',
    country: 'Turkey',
    latitude: 40.1885,
    longitude: 29.0610,
    intentionTag: IntentionTag.SERIOUS_RELATIONSHIP,
    bio: 'Girisimci, teknoloji meraklisi. Kendi startupimi kurdum ve buyutuyorum. Is disinda yemek yapmak ve yeni tatlar kesfetmek en buyuk hobim.',
    phone: '+905551234508',
    phoneCountryCode: '+90',
    isVerified: true,
    packageTier: PackageTier.GOLD,
    goldBalance: 100,
  },
  {
    firstName: 'Ece',
    gender: Gender.FEMALE,
    birthDate: new Date('1997-08-20'),
    city: 'Istanbul',
    country: 'Turkey',
    latitude: 41.0351,
    longitude: 28.9833,
    intentionTag: IntentionTag.EXPLORING,
    bio: 'Avukat, yoga tutkunu, kitap delisi. Hafta ici mahkemelerde, hafta sonu mat ustunde. Hayatta dengeyi ve huzuru ariyorum. Zeki sohbetlere bayilirim.',
    phone: '+905551234509',
    phoneCountryCode: '+90',
    isVerified: false,
    packageTier: PackageTier.FREE,
    goldBalance: 15,
  },
  {
    firstName: 'Kaan',
    gender: Gender.MALE,
    birthDate: new Date('1999-12-03'),
    city: 'Istanbul',
    country: 'Turkey',
    latitude: 41.0255,
    longitude: 28.9744,
    intentionTag: IntentionTag.NOT_SURE,
    bio: 'Fotograf sanatcisi, sokaklari ve insanlari cekmekten keyif alirim. Her karede bir hikaye ararım. Hayata farkli bir perspektiften bakan birini bulmak istiyorum.',
    phone: '+905551234510',
    phoneCountryCode: '+90',
    isVerified: false,
    packageTier: PackageTier.FREE,
    goldBalance: 0,
  },
];

// Per-user answer patterns (option index 0-3 for each of 20 core questions)
// Designed so some users have similar patterns (high compatibility) and some differ
const USER_ANSWER_PATTERNS: number[][] = [
  // Elif   — thoughtful, deep, balanced
  [3, 0, 0, 1, 1, 2, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 1, 0, 2, 1],
  // Ahmet  — action-oriented, open, active
  [1, 1, 2, 0, 1, 2, 0, 2, 0, 2, 0, 1, 2, 0, 1, 0, 0, 2, 0, 0],
  // Zeynep — social, spontaneous, expressive
  [1, 0, 1, 2, 3, 1, 2, 0, 2, 0, 1, 0, 0, 2, 0, 0, 0, 2, 0, 0],
  // Can    — calm, creative, empathetic
  [0, 1, 0, 2, 2, 1, 1, 2, 1, 3, 3, 2, 2, 1, 0, 2, 2, 1, 2, 1],
  // Selin  — independent, artistic, reserved
  [2, 3, 3, 3, 3, 3, 1, 0, 1, 1, 1, 2, 1, 3, 2, 3, 3, 3, 1, 2],
  // Burak  — energetic, spontaneous, physical
  [1, 1, 2, 2, 0, 1, 2, 0, 0, 2, 0, 0, 2, 2, 1, 0, 0, 1, 0, 0],
  // Defne  — caring, family-oriented, stable
  [3, 0, 0, 1, 1, 2, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 1, 0, 2, 1],
  // Emre   — ambitious, balanced, structured
  [1, 1, 1, 0, 1, 0, 3, 2, 0, 0, 0, 1, 0, 0, 1, 1, 1, 2, 2, 1],
  // Ece    — intellectual, balanced, independent
  [0, 0, 0, 0, 1, 2, 1, 0, 1, 2, 3, 2, 0, 1, 0, 1, 2, 2, 1, 1],
  // Kaan   — creative, observant, quiet
  [2, 3, 3, 2, 2, 1, 1, 2, 2, 3, 1, 3, 1, 1, 2, 2, 3, 2, 1, 2],
];

// Match pairs (indices into DEMO_USERS) with compatibility scores
const MATCH_PAIRS: Array<{ userAIdx: number; userBIdx: number; score: number; level: CompatibilityLevel }> = [
  { userAIdx: 0, userBIdx: 1, score: 87.5, level: CompatibilityLevel.SUPER },   // Elif & Ahmet
  { userAIdx: 2, userBIdx: 5, score: 82.3, level: CompatibilityLevel.SUPER },   // Zeynep & Burak
  { userAIdx: 3, userBIdx: 8, score: 74.1, level: CompatibilityLevel.NORMAL },  // Can & Ece
  { userAIdx: 6, userBIdx: 7, score: 79.8, level: CompatibilityLevel.NORMAL },  // Defne & Emre
  { userAIdx: 4, userBIdx: 9, score: 91.2, level: CompatibilityLevel.SUPER },   // Selin & Kaan
];

// Chat messages per match
const CHAT_CONVERSATIONS: string[][][] = [
  // Match 0: Elif & Ahmet (deep connection)
  [
    ['A', 'Merhaba Elif! Profilini cok begendim, kitap onerisi alabilir miyim?'],
    ['B', 'Merhaba Ahmet! Tabii ki, su an Orhan Pamuk okuyorum, Masumiyet Muzesi. Sen ne okuyorsun?'],
    ['A', 'Ben daha cok bilim kurgu severim, son okuduğum Dune serisi. Ama Pamuk da cok iyi!'],
    ['B', 'Dune harika bir secim! Dagciliga ne zaman basaldin?'],
    ['A', 'Universite yillarinda basladim, Kackar Daglari ilk rotamdi. Hic dagcilik denedin mi?'],
    ['B', 'Deniz insaniyim aslinda ama denemek isterim! Beni goturursen tabii :)'],
    ['A', 'Tabii ki! Baslangic icin Uludag guzel olur, bir hafta sonu planlariz'],
    ['B', 'Cok guzel olur! Sonra ben de sana sahilde yuruyus rotami gosteririm'],
    ['A', 'Anlasma! Bu hafta sonu musait misin kahve icmeye?'],
    ['B', 'Cumartesi ogleden sonra olur mu? Kadikoy tarafinda guzel bir yer biliyorum'],
    ['A', 'Muhtesem, saat 3te olalim mi?'],
    ['B', 'Saat 3 iyi, gorusmek uzere!'],
  ],
  // Match 1: Zeynep & Burak (fun and energetic)
  [
    ['A', 'Selam Burak! Sorfcu ha, cok havaliii'],
    ['B', 'Haha tesekkurler Zeynep! Sen de gitarciysin, akustik mi elektrik mi?'],
    ['A', 'Akustik ama elektrik de ogrenmeye basladim, rock da calmak istiyorum!'],
    ['B', 'Harika! Kumsal partisinde calsan efsane olur'],
    ['A', 'Hayalim zaten! Antalyada yazin konser var mi?'],
    ['B', 'Cok oluyor, yazin gel birlikte gideriz!'],
    ['A', 'Teklif kabul! Ankaradan kacmak icin bahane ariyordum zaten'],
    ['B', 'Haha gel, deniz seni bekliyor! Sorf da ogretirim istersen'],
    ['A', 'Beni suyun icine sokamazsin ama deneyebiliriz :D'],
    ['B', 'Challenge accepted!'],
  ],
  // Match 2: Can & Ece (intellectual connection)
  [
    ['A', 'Merhaba Ece, profilinde yoga yaziyormus, jazz ile yoga yakindir aslinda, ikisi de flow hali'],
    ['B', 'Ne guzel bir bakis acisi Can! Dogru, ikisi de anin icinde olmayi gerektiriyor'],
    ['A', 'Aynen oyle. Hangi tarz yoga yapiyorsun?'],
    ['B', 'Vinyasa ve Yin. Sen hangi tur jazz caliyorsun?'],
    ['A', 'Daha cok modern jazz, ama bossa nova da severim. Nuri Bilge Ceylan filmi gibi bir hava'],
    ['B', 'Harika benzetme! Ceylan filmlerini cok severim'],
    ['A', 'O zaman bir gun birlikte film izleriz, sonra muzikle karistiririz'],
    ['B', 'Cok kulturel bir bulusma olur, bayilirim!'],
  ],
  // Match 3: Defne & Emre (warm and genuine)
  [
    ['A', 'Merhaba Emre! Yemek yapmak hobinmis, benim de en buyuk zevkim!'],
    ['B', 'Defne merhaba! Doktor adayi ve yemek tutkunu, mukemmel kombinasyon!'],
    ['A', 'Haha ogrencilik gunlerinde pratik yemekler ogrenmek zorunda kaldim, sonra asik oldum'],
    ['B', 'Ben de oyle, startup stresini mutfakta atiyorum. En sevdigin yemek ne?'],
    ['A', 'Ev yapimi mantisi kimse yenemez! Sen?'],
    ['B', 'Bende deniz urunleri, ozellikle levrekli risotto yaparim'],
    ['A', 'Imza tarifi paylasma zamani geldiginde haber ver!'],
    ['B', 'Anlasildi, haftaya tarif degisimi yapalim mi?'],
    ['A', 'Superr! Manti vs risotto kapismasi!'],
    ['B', 'Kazanan ogun kazanan herkes! Hakem lazim ama'],
    ['A', 'Hahahah hakem biz olalim, kendi yedigimizi degerlendiririz'],
    ['B', 'En adil yargi! Hafta sonu olur mu?'],
  ],
  // Match 4: Selin & Kaan (artistic souls)
  [
    ['A', 'Selam Kaan, fotograf sanatcisi! Portfolyonu gormek isterim'],
    ['B', 'Selam Selin! Grafik tasarimci, biz ayni dili konusuyoruz sanki'],
    ['A', 'Kesinlikle! Gorsel insanlarin bulus masi guzel bir sey'],
    ['B', 'Aynen, bir gun birlikte sokak fotografciligi yapalim mi?'],
    ['A', 'Iste bunu bekliyordum! Istanbul sokaklari harika malzeme'],
    ['B', 'Balat veya Kadikoy olabilir, renkleri ve dokuyu seviyorum'],
    ['A', 'Balat olsun! Renkli evler, kediler, vintage atmosfer'],
    ['B', 'Harika, bu Cumartesi olur mu?'],
    ['A', 'Olur! Sabah erken gidersek isik guzel olur'],
    ['B', 'Altin saat fotografcisi bulduk! Saat 7de bulusuruz'],
  ],
];

// Badge awards per user (user index -> badge keys)
const USER_BADGE_AWARDS: Record<number, string[]> = {
  0: ['first_spark', 'verified_star', 'question_explorer'],   // Elif
  1: ['first_spark', 'verified_star', 'explorer'],             // Ahmet
  2: ['first_spark', 'explorer'],                               // Zeynep
  3: ['first_spark', 'chat_master'],                            // Can
  4: ['first_spark', 'soul_mate'],                              // Selin
  5: ['first_spark'],                                           // Burak
  6: ['first_spark', 'verified_star', 'gold_member'],          // Defne
  7: ['first_spark', 'verified_star', 'gold_member'],          // Emre
  8: ['first_spark'],                                           // Ece
  9: ['first_spark', 'soul_mate'],                              // Kaan
};

// ============================================================
// MAIN SEED FUNCTION
// ============================================================

async function main(): Promise<void> {
  console.log('LUMA V1 — Seeding database...\n');

  // Phase 1: Static data (questions, cards, badges)
  await seedCompatibilityQuestions();
  await seedHarmonyQuestionCards();
  await seedHarmonyGameCards();
  await seedBadgeDefinitions();

  // Phase 2: Demo users and relationships
  await seedDemoData();

  console.log('\nSeed complete!');
}

// ============================================================
// DEMO DATA SEEDER
// ============================================================

async function seedDemoData(): Promise<void> {
  console.log('\n--- Demo Data ---');

  // Clean existing demo data (reverse dependency order)
  console.log('Cleaning existing demo data...');
  await prisma.$transaction([
    prisma.messageReaction.deleteMany(),
    prisma.icebreakerAnswer.deleteMany(),
    prisma.icebreakerSession.deleteMany(),
    prisma.chatMessage.deleteMany(),
    prisma.harmonyExtension.deleteMany(),
    prisma.harmonyMessage.deleteMany(),
    prisma.harmonyUsedCard.deleteMany(),
    prisma.harmonySession.deleteMany(),
    prisma.dailyQuestionAnswer.deleteMany(),
    prisma.swipe.deleteMany(),
    prisma.match.deleteMany(),
    prisma.compatibilityScore.deleteMany(),
    prisma.userAnswer.deleteMany(),
    prisma.userBadge.deleteMany(),
    prisma.userPhoto.deleteMany(),
    prisma.notificationPreference.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.deviceToken.deleteMany(),
    prisma.goldTransaction.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.block.deleteMany(),
    prisma.report.deleteMany(),
    prisma.placeMemory.deleteMany(),
    prisma.placeCheckIn.deleteMany(),
    prisma.coupleBadge.deleteMany(),
    prisma.couplesClubParticipant.deleteMany(),
    prisma.relationship.deleteMany(),
    prisma.userSession.deleteMany(),
    prisma.userVerification.deleteMany(),
    prisma.userProfile.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // 1. Create users
  const userIds = await seedDemoUsers();
  console.log(`  ${userIds.length} demo users created`);

  // 2. Create answers
  await seedDemoAnswers(userIds);
  console.log('  User answers seeded (20 core questions x 10 users)');

  // 3. Create swipes and matches
  const matchIds = await seedDemoMatches(userIds);
  console.log(`  ${matchIds.length} matches created`);

  // 4. Create chat messages
  await seedDemoMessages(userIds, matchIds);
  console.log('  Chat messages seeded');

  // 5. Award badges
  await seedDemoBadges(userIds);
  console.log('  Badges awarded');

  // 6. Create notification preferences
  await seedDemoNotificationPrefs(userIds);
  console.log('  Notification preferences seeded');
}

// ============================================================
// USER SEEDER
// ============================================================

async function seedDemoUsers(): Promise<string[]> {
  const userIds: string[] = [];

  for (const demo of DEMO_USERS) {
    const user = await prisma.user.create({
      data: {
        phone: demo.phone,
        phoneCountryCode: demo.phoneCountryCode,
        isActive: true,
        isSmsVerified: true,
        isSelfieVerified: demo.isVerified,
        isFullyVerified: demo.isVerified,
        packageTier: demo.packageTier,
        goldBalance: demo.goldBalance,
        profile: {
          create: {
            firstName: demo.firstName,
            birthDate: demo.birthDate,
            gender: demo.gender,
            bio: demo.bio,
            intentionTag: demo.intentionTag,
            city: demo.city,
            country: demo.country,
            latitude: demo.latitude,
            longitude: demo.longitude,
            isComplete: true,
            lastActiveAt: new Date(),
            locationUpdatedAt: new Date(),
          },
        },
      },
    });

    // Create 3 photos per user
    const photoBaseUrl = 'https://cdn.lumaapp.com/photos';
    const photoData = [
      { order: 0, isPrimary: true },
      { order: 1, isPrimary: false },
      { order: 2, isPrimary: false },
    ];

    for (const photo of photoData) {
      await prisma.userPhoto.create({
        data: {
          userId: user.id,
          url: `${photoBaseUrl}/${demo.firstName.toLowerCase()}_${photo.order + 1}.jpg`,
          thumbnailUrl: `${photoBaseUrl}/${demo.firstName.toLowerCase()}_${photo.order + 1}_thumb.jpg`,
          order: photo.order,
          isPrimary: photo.isPrimary,
          isApproved: true,
          moderationScore: 0.95,
        },
      });
    }

    userIds.push(user.id);
  }

  return userIds;
}

// ============================================================
// ANSWERS SEEDER
// ============================================================

async function seedDemoAnswers(userIds: string[]): Promise<void> {
  // Fetch all core questions (Q1-Q20) ordered by questionNumber
  const questions = await prisma.compatibilityQuestion.findMany({
    where: { isPremium: false },
    include: { options: { orderBy: { order: 'asc' } } },
    orderBy: { questionNumber: 'asc' },
  });

  for (let userIdx = 0; userIdx < userIds.length; userIdx++) {
    const userId = userIds[userIdx];
    const pattern = USER_ANSWER_PATTERNS[userIdx];

    for (let qIdx = 0; qIdx < questions.length; qIdx++) {
      const question = questions[qIdx];
      const optionIdx = pattern[qIdx] % question.options.length;
      const option = question.options[optionIdx];

      await prisma.userAnswer.create({
        data: {
          userId,
          questionId: question.id,
          optionId: option.id,
        },
      });
    }
  }
}

// ============================================================
// MATCHES SEEDER
// ============================================================

async function seedDemoMatches(userIds: string[]): Promise<string[]> {
  const matchIds: string[] = [];

  for (const pair of MATCH_PAIRS) {
    const userAId = userIds[pair.userAIdx];
    const userBId = userIds[pair.userBIdx];

    // Create mutual swipes
    await prisma.swipe.create({
      data: {
        swiperId: userAId,
        targetId: userBId,
        action: pair.level === CompatibilityLevel.SUPER ? SwipeAction.SUPER_LIKE : SwipeAction.LIKE,
      },
    });

    await prisma.swipe.create({
      data: {
        swiperId: userBId,
        targetId: userAId,
        action: SwipeAction.LIKE,
      },
    });

    // Create match
    const animationType = pair.level === CompatibilityLevel.SUPER
      ? MatchAnimationType.SUPER_COMPATIBILITY
      : MatchAnimationType.NORMAL;

    const match = await prisma.match.create({
      data: {
        userAId,
        userBId,
        compatibilityScore: pair.score,
        compatibilityLevel: pair.level,
        animationType,
        isActive: true,
      },
    });

    // Create compatibility score record
    await prisma.compatibilityScore.create({
      data: {
        userAId,
        userBId,
        baseScore: pair.score,
        finalScore: pair.score,
        level: pair.level,
        dimensionScores: {
          communication: Math.round(60 + Math.random() * 35),
          values: Math.round(60 + Math.random() * 35),
          lifestyle: Math.round(55 + Math.random() * 40),
          emotional_intelligence: Math.round(60 + Math.random() * 35),
          relationship_expectations: Math.round(55 + Math.random() * 40),
          social: Math.round(60 + Math.random() * 35),
          life_goals: Math.round(55 + Math.random() * 40),
        },
      },
    });

    matchIds.push(match.id);
  }

  // Add some extra one-sided swipes for realism
  const extraSwipes: Array<{ from: number; to: number }> = [
    { from: 1, to: 2 }, // Ahmet likes Zeynep (no match)
    { from: 3, to: 0 }, // Can likes Elif (no match)
    { from: 5, to: 4 }, // Burak likes Selin (no match)
    { from: 7, to: 8 }, // Emre likes Ece (no match)
    { from: 9, to: 6 }, // Kaan likes Defne (no match)
    { from: 8, to: 1 }, // Ece likes Ahmet (no match)
  ];

  for (const swipe of extraSwipes) {
    await prisma.swipe.create({
      data: {
        swiperId: userIds[swipe.from],
        targetId: userIds[swipe.to],
        action: SwipeAction.LIKE,
      },
    });
  }

  return matchIds;
}

// ============================================================
// MESSAGES SEEDER
// ============================================================

async function seedDemoMessages(userIds: string[], matchIds: string[]): Promise<void> {
  const now = new Date();

  for (let matchIdx = 0; matchIdx < MATCH_PAIRS.length; matchIdx++) {
    const matchId = matchIds[matchIdx];
    const pair = MATCH_PAIRS[matchIdx];
    const conversation = CHAT_CONVERSATIONS[matchIdx];

    const userAId = userIds[pair.userAIdx];
    const userBId = userIds[pair.userBIdx];

    for (let msgIdx = 0; msgIdx < conversation.length; msgIdx++) {
      const [sender, content] = conversation[msgIdx];
      const senderId = sender === 'A' ? userAId : userBId;

      // Stagger messages: start from 3 days ago, each ~15-45 min apart
      const messageTime = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000) + (msgIdx * 30 * 60 * 1000));

      // Mark older messages as READ, recent ones as DELIVERED or SENT
      let status: ChatMessageStatus;
      let readAt: Date | null = null;

      if (msgIdx < conversation.length - 2) {
        status = ChatMessageStatus.READ;
        readAt = new Date(messageTime.getTime() + 5 * 60 * 1000); // read 5 min later
      } else if (msgIdx < conversation.length - 1) {
        status = ChatMessageStatus.DELIVERED;
      } else {
        status = ChatMessageStatus.SENT;
      }

      await prisma.chatMessage.create({
        data: {
          matchId,
          senderId,
          content,
          type: ChatMessageType.TEXT,
          status,
          readAt,
          createdAt: messageTime,
        },
      });
    }
  }
}

// ============================================================
// BADGES SEEDER
// ============================================================

async function seedDemoBadges(userIds: string[]): Promise<void> {
  const badgeDefs = await prisma.badgeDefinition.findMany();
  const badgeMap = new Map(badgeDefs.map((b) => [b.key, b.id]));

  for (const [userIdxStr, badgeKeys] of Object.entries(USER_BADGE_AWARDS)) {
    const userIdx = parseInt(userIdxStr, 10);
    const userId = userIds[userIdx];

    for (const key of badgeKeys) {
      const badgeId = badgeMap.get(key);
      if (badgeId) {
        await prisma.userBadge.create({
          data: {
            userId,
            badgeId,
          },
        });
      }
    }
  }
}

// ============================================================
// NOTIFICATION PREFERENCES SEEDER
// ============================================================

async function seedDemoNotificationPrefs(userIds: string[]): Promise<void> {
  for (const userId of userIds) {
    await prisma.notificationPreference.create({
      data: {
        userId,
        newMatches: true,
        messages: true,
        harmonyInvites: true,
        badges: true,
        system: true,
        allDisabled: false,
      },
    });
  }
}

// ============================================================
// 45 COMPATIBILITY QUESTIONS (20 Core + 25 Premium) — LOCKED
// ============================================================
async function seedCompatibilityQuestions(): Promise<void> {
  console.log('Seeding 45 compatibility questions...');

  const questions: Array<{
    questionNumber: number;
    category: string;
    weight: number;
    isPremium: boolean;
    textEn: string;
    textTr: string;
    options: Array<{ labelEn: string; labelTr: string; value: number }>;
  }> = [
    // -- CORE QUESTIONS (Q1-Q20) --

    // Communication Style (Q1-Q3) - Weight: 1.2
    {
      questionNumber: 1, category: 'COMMUNICATION', weight: 1.2, isPremium: false,
      textEn: 'What do you do during an argument?',
      textTr: 'Bir tartismada ne yaparsin?',
      options: [
        { labelEn: 'I wait until I calm down', labelTr: 'Sakinlesene kadar beklerim', value: 0.25 },
        { labelEn: 'I resolve it by talking immediately', labelTr: 'Hemen konusarak cozerim', value: 0.75 },
        { labelEn: 'I express myself in writing', labelTr: 'Yazarak ifade ederim', value: 0.5 },
        { labelEn: 'I listen to the other person', labelTr: 'Karsimdakini dinlerim', value: 1.0 },
      ],
    },
    {
      questionNumber: 2, category: 'COMMUNICATION', weight: 1.2, isPremium: false,
      textEn: 'How do you express your feelings?',
      textTr: 'Duygularini nasil ifade edersin?',
      options: [
        { labelEn: 'With words, openly', labelTr: 'Sozlerle, acikca', value: 1.0 },
        { labelEn: 'I show through my actions', labelTr: 'Davranislarimla gosteririm', value: 0.75 },
        { labelEn: 'I struggle but I try', labelTr: 'Zor ifade ederim ama denerim', value: 0.5 },
        { labelEn: 'I express better in writing', labelTr: 'Yazarak daha iyi anlatirim', value: 0.25 },
      ],
    },
    {
      questionNumber: 3, category: 'COMMUNICATION', weight: 1.2, isPremium: false,
      textEn: 'What does an ideal evening conversation look like?',
      textTr: 'Ideal bir aksam sohbeti nasil olur?',
      options: [
        { labelEn: 'Deep, philosophical topics', labelTr: 'Derin, felsefi konular', value: 1.0 },
        { labelEn: 'Casual, relaxed chat', labelTr: 'Gunluk, rahat sohbet', value: 0.5 },
        { labelEn: 'While doing something together', labelTr: 'Birlikte bir sey yaparken', value: 0.75 },
        { labelEn: 'Silence is fine too', labelTr: 'Sessizlik de guzeldir', value: 0.25 },
      ],
    },

    // Life Goals (Q4-Q6) - Weight: 1.2
    {
      questionNumber: 4, category: 'LIFE_GOALS', weight: 1.2, isPremium: false,
      textEn: 'Where do you see yourself in 5 years?',
      textTr: '5 yil sonra kendini nerede goruyorsun?',
      options: [
        { labelEn: 'Near the top of my career', labelTr: 'Kariyerimde zirveye yakin', value: 1.0 },
        { labelEn: 'In a peaceful family life', labelTr: 'Huzurlu bir aile hayatinda', value: 0.75 },
        { labelEn: 'Exploring the world', labelTr: 'Dunyayi kesfederken', value: 0.5 },
        { labelEn: 'Life is full of surprises, I don\'t plan', labelTr: 'Hayat surprizlerle dolu, planlamam', value: 0.25 },
      ],
    },
    {
      questionNumber: 5, category: 'LIFE_GOALS', weight: 1.2, isPremium: false,
      textEn: 'How should work-life balance be?',
      textTr: 'Is-yasam dengesi sence nasil olmali?',
      options: [
        { labelEn: 'Work first, then rest', labelTr: 'Is oncelikli, sonra dinlenme', value: 0.25 },
        { labelEn: 'Equal balance is essential', labelTr: 'Esit denge sart', value: 1.0 },
        { labelEn: 'Life first, work is a tool', labelTr: 'Yasam oncelikli, is arac', value: 0.75 },
        { labelEn: 'It depends on the situation', labelTr: 'Duruma gore degisir', value: 0.5 },
      ],
    },
    {
      questionNumber: 6, category: 'LIFE_GOALS', weight: 1.2, isPremium: false,
      textEn: 'What is your approach to money?',
      textTr: 'Para konusundaki yaklasiminiz?',
      options: [
        { labelEn: 'I like saving, it makes me feel secure', labelTr: 'Biriktirmeyi severim, guvende hissederim', value: 0.25 },
        { labelEn: 'I spend on experiences, memories matter', labelTr: 'Deneyimlere harcarim, anilar onemli', value: 0.75 },
        { labelEn: 'I have a balanced approach', labelTr: 'Dengeli bir yaklasimim var', value: 1.0 },
        { labelEn: 'I don\'t think about it much', labelTr: 'Cok dusunmem, akar gider', value: 0.5 },
      ],
    },

    // Values & Beliefs (Q7-Q9) - Weight: 1.5
    {
      questionNumber: 7, category: 'VALUES', weight: 1.5, isPremium: false,
      textEn: 'What is the most important value in a relationship?',
      textTr: 'Bir iliskide en onemli deger?',
      options: [
        { labelEn: 'Trust and loyalty', labelTr: 'Guven ve sadakat', value: 1.0 },
        { labelEn: 'Freedom and respect', labelTr: 'Ozgurluk ve saygi', value: 0.75 },
        { labelEn: 'Passion and excitement', labelTr: 'Tutku ve heyecan', value: 0.5 },
        { labelEn: 'Understanding and patience', labelTr: 'Anlayis ve sabir', value: 0.85 },
      ],
    },
    {
      questionNumber: 8, category: 'VALUES', weight: 1.5, isPremium: false,
      textEn: 'How do you approach different opinions?',
      textTr: 'Farkli goruslere nasil yaklasirsin?',
      options: [
        { labelEn: 'I listen and try to understand', labelTr: 'Dinlerim ve anlamaya calisirim', value: 1.0 },
        { labelEn: 'I defend my own view', labelTr: 'Kendi gorusumu savunurum', value: 0.25 },
        { labelEn: 'I look for common ground', labelTr: 'Ortak nokta ararim', value: 0.75 },
        { labelEn: 'I change the subject', labelTr: 'Konuyu degistiririm', value: 0.5 },
      ],
    },
    {
      questionNumber: 9, category: 'VALUES', weight: 1.5, isPremium: false,
      textEn: 'What does family mean to you?',
      textTr: 'Aile sence ne ifade ediyor?',
      options: [
        { labelEn: 'The foundation of everything', labelTr: 'Her seyin temeli', value: 1.0 },
        { labelEn: 'Important but independence is essential too', labelTr: 'Onemli ama bagimsizlik da sart', value: 0.75 },
        { labelEn: 'We build our own family', labelTr: 'Kendi ailemizi kurariz', value: 0.5 },
        { labelEn: 'Extended family included, big picture', labelTr: 'Genis aile de dahil, buyuk tablo', value: 0.85 },
      ],
    },

    // Lifestyle (Q10-Q12) - Weight: 1.0
    {
      questionNumber: 10, category: 'LIFESTYLE', weight: 1.0, isPremium: false,
      textEn: 'Your ideal weekend?',
      textTr: 'Ideal hafta sonun?',
      options: [
        { labelEn: 'Social, out with friends', labelTr: 'Sosyal, arkadaslarla disarida', value: 1.0 },
        { labelEn: 'At home, books and movies', labelTr: 'Evde, kitap ve film', value: 0.25 },
        { labelEn: 'In nature, active', labelTr: 'Dogada, aktif', value: 0.75 },
        { labelEn: 'Spontaneous, unplanned', labelTr: 'Spontane, plansiz', value: 0.5 },
      ],
    },
    {
      questionNumber: 11, category: 'LIFESTYLE', weight: 1.0, isPremium: false,
      textEn: 'How about health and fitness?',
      textTr: 'Saglik ve fitness konusunda?',
      options: [
        { labelEn: 'I exercise regularly', labelTr: 'Duzenli spor yaparim', value: 1.0 },
        { labelEn: 'I move occasionally', labelTr: 'Ara sira hareket ederim', value: 0.5 },
        { labelEn: 'Food is more important', labelTr: 'Yemek daha onemli', value: 0.25 },
        { labelEn: 'Mental health is my priority', labelTr: 'Ruhsal saglik onceligim', value: 0.75 },
      ],
    },
    {
      questionNumber: 12, category: 'LIFESTYLE', weight: 1.0, isPremium: false,
      textEn: 'Your social media usage?',
      textTr: 'Sosyal medya kullaniminin?',
      options: [
        { labelEn: 'I actively share', labelTr: 'Aktif paylasirim', value: 1.0 },
        { labelEn: 'I follow but rarely share', labelTr: 'Takip ederim ama az paylasirim', value: 0.75 },
        { labelEn: 'I barely use it', labelTr: 'Cok az kullanirim', value: 0.5 },
        { labelEn: 'I don\'t use it at all', labelTr: 'Hic kullanmam', value: 0.25 },
      ],
    },

    // Emotional Intelligence (Q13-Q15) - Weight: 1.2
    {
      questionNumber: 13, category: 'EMOTIONAL_INTELLIGENCE', weight: 1.2, isPremium: false,
      textEn: 'What do you do when you have a tough day?',
      textTr: 'Zor bir gun gecirdiginde ne yaparsin?',
      options: [
        { labelEn: 'I talk to someone', labelTr: 'Birileriyle konusurum', value: 1.0 },
        { labelEn: 'I want to be alone', labelTr: 'Yalniz kalmak isterim', value: 0.25 },
        { labelEn: 'I distract myself with an activity', labelTr: 'Bir aktiviteyle dagitirim', value: 0.75 },
        { labelEn: 'I sleep, tomorrow is a new day', labelTr: 'Uyurum, yarin yeni gun', value: 0.5 },
      ],
    },
    {
      questionNumber: 14, category: 'EMOTIONAL_INTELLIGENCE', weight: 1.2, isPremium: false,
      textEn: 'When you notice your partner is sad?',
      textTr: 'Partnerinin uzgun oldugunu fark ettiginde?',
      options: [
        { labelEn: 'I immediately ask and listen', labelTr: 'Hemen sorarim ve dinlerim', value: 1.0 },
        { labelEn: 'I stay beside them, wait for them to talk', labelTr: 'Yaninda olurum, konusmasini beklerim', value: 0.75 },
        { labelEn: 'I try to cheer them up', labelTr: 'Onu neselendirmeye calisirim', value: 0.5 },
        { labelEn: 'I give them space', labelTr: 'Kendi alanini veririm', value: 0.25 },
      ],
    },
    {
      questionNumber: 15, category: 'EMOTIONAL_INTELLIGENCE', weight: 1.2, isPremium: false,
      textEn: 'What do you think about vulnerability?',
      textTr: 'Kirilganlik hakkinda ne dusunuyorsun?',
      options: [
        { labelEn: 'It\'s a sign of strength', labelTr: 'Gucluluk isareti', value: 1.0 },
        { labelEn: 'Difficult but necessary', labelTr: 'Zor ama gerekli', value: 0.75 },
        { labelEn: 'Only with someone I trust', labelTr: 'Sadece guvendigim biriyle', value: 0.5 },
        { labelEn: 'I\'m not very comfortable with it', labelTr: 'Cok rahat degilim', value: 0.25 },
      ],
    },

    // Relationship Expectations (Q16-Q18) - Weight: 1.5
    {
      questionNumber: 16, category: 'RELATIONSHIP_EXPECTATIONS', weight: 1.5, isPremium: false,
      textEn: 'How much time together in a relationship?',
      textTr: 'Iliskide ne kadar birlikte zaman?',
      options: [
        { labelEn: 'As much as possible', labelTr: 'Mumkun oldugunca cok', value: 1.0 },
        { labelEn: 'Balanced, everyone needs their own time', labelTr: 'Dengeli, herkesin kendi zamani da olmali', value: 0.75 },
        { labelEn: 'Quality matters, not quantity', labelTr: 'Kalite onemli, miktar degil', value: 0.5 },
        { labelEn: 'Independence is very important', labelTr: 'Bagimsizlik cok onemli', value: 0.25 },
      ],
    },
    {
      questionNumber: 17, category: 'RELATIONSHIP_EXPECTATIONS', weight: 1.5, isPremium: false,
      textEn: 'Physical closeness for you?',
      textTr: 'Fiziksel yakinlik sence?',
      options: [
        { labelEn: 'Very important, every day', labelTr: 'Cok onemli, her gun', value: 1.0 },
        { labelEn: 'Important but not excessive', labelTr: 'Onemli ama abartisiz', value: 0.75 },
        { labelEn: 'Emotional closeness matters more', labelTr: 'Duygusal yakinlik daha onemli', value: 0.5 },
        { labelEn: 'It develops over time', labelTr: 'Zamanla gelisir', value: 0.25 },
      ],
    },
    {
      questionNumber: 18, category: 'RELATIONSHIP_EXPECTATIONS', weight: 1.5, isPremium: false,
      textEn: 'Which is your love language?',
      textTr: 'Ask dili hangisi?',
      options: [
        { labelEn: 'Words and compliments', labelTr: 'Sozler ve iltifatlar', value: 1.0 },
        { labelEn: 'Touch and hugs', labelTr: 'Dokunma ve sarilma', value: 0.75 },
        { labelEn: 'Spending quality time together', labelTr: 'Birlikte vakit gecirme', value: 0.5 },
        { labelEn: 'Gifts and surprises', labelTr: 'Hediyeler ve surprizler', value: 0.25 },
      ],
    },

    // Social Compatibility (Q19-Q20) - Weight: 1.0
    {
      questionNumber: 19, category: 'SOCIAL_COMPATIBILITY', weight: 1.0, isPremium: false,
      textEn: 'Your partner\'s friend circle?',
      textTr: 'Partnerinin arkadas cevresi?',
      options: [
        { labelEn: 'They should be my friends too', labelTr: 'Benim de arkadaslarim olsun', value: 1.0 },
        { labelEn: 'Separate circles are healthy', labelTr: 'Ayri cevreler saglikli', value: 0.5 },
        { labelEn: 'They blend over time', labelTr: 'Zamanla kaynasir', value: 0.75 },
        { labelEn: 'It\'s not very important', labelTr: 'Cok onemli degil', value: 0.25 },
      ],
    },
    {
      questionNumber: 20, category: 'SOCIAL_COMPATIBILITY', weight: 1.0, isPremium: false,
      textEn: 'What kind of person are you in a group?',
      textTr: 'Topluluk icinde nasil birisin?',
      options: [
        { labelEn: 'Energetic, social butterfly', labelTr: 'Enerjik, sosyal kelebek', value: 1.0 },
        { labelEn: 'I prefer small groups', labelTr: 'Kucuk gruplari severim', value: 0.75 },
        { labelEn: 'A few close friends is enough', labelTr: 'Birkac yakin arkadas yeter', value: 0.5 },
        { labelEn: 'I\'m introverted but warm', labelTr: 'Icedonugum ama sicakkanliiyim', value: 0.25 },
      ],
    },

    // -- PREMIUM QUESTIONS (Q21-Q45) --

    // Attachment Style (Q21-Q24) - Weight: 1.5
    {
      questionNumber: 21, category: 'ATTACHMENT_STYLE', weight: 1.5, isPremium: true,
      textEn: 'When your partner doesn\'t respond for hours, what do you feel?',
      textTr: 'Partnerin saatlerce cevap vermezse ne hissedersin?',
      options: [
        { labelEn: 'I trust them, they must be busy', labelTr: 'Guvenirim, mesguldur', value: 1.0 },
        { labelEn: 'I get a little anxious', labelTr: 'Biraz endiselenirm', value: 0.5 },
        { labelEn: 'I enjoy the space', labelTr: 'Kendi alanimin tadini cikaririm', value: 0.75 },
        { labelEn: 'I start overthinking', labelTr: 'Kafamda senaryolar kurarim', value: 0.25 },
      ],
    },
    {
      questionNumber: 22, category: 'ATTACHMENT_STYLE', weight: 1.5, isPremium: true,
      textEn: 'How fast do you get emotionally attached?',
      textTr: 'Duygusal olarak ne kadar hizli baglanirsin?',
      options: [
        { labelEn: 'Slowly, I need time', labelTr: 'Yavas, zamana ihtiyacim var', value: 0.75 },
        { labelEn: 'I feel things quickly', labelTr: 'Hizli hissederim', value: 0.5 },
        { labelEn: 'Depends on the connection', labelTr: 'Baglantiya bagli', value: 1.0 },
        { labelEn: 'I keep my guard up', labelTr: 'Duvarlarimi yuksek tutarim', value: 0.25 },
      ],
    },
    {
      questionNumber: 23, category: 'ATTACHMENT_STYLE', weight: 1.5, isPremium: true,
      textEn: 'After a breakup, how do you cope?',
      textTr: 'Bir ayriliktan sonra nasil basa cikarsin?',
      options: [
        { labelEn: 'I process and heal gradually', labelTr: 'Zamanla isler ve iyilesirim', value: 1.0 },
        { labelEn: 'I keep myself busy', labelTr: 'Kendimi mesgul ederim', value: 0.5 },
        { labelEn: 'I lean on friends for support', labelTr: 'Arkadaslarimdan destek alirim', value: 0.75 },
        { labelEn: 'I move on quickly', labelTr: 'Hizlica gecerim', value: 0.25 },
      ],
    },
    {
      questionNumber: 24, category: 'ATTACHMENT_STYLE', weight: 1.5, isPremium: true,
      textEn: 'What makes you feel most secure in a relationship?',
      textTr: 'Iliskide seni en cok ne guvende hissettirir?',
      options: [
        { labelEn: 'Consistent actions, not just words', labelTr: 'Sadece sozler degil, tutarli davranislar', value: 1.0 },
        { labelEn: 'Regular communication', labelTr: 'Duzenli iletisim', value: 0.75 },
        { labelEn: 'Knowing they choose me every day', labelTr: 'Her gun beni sectigini bilmek', value: 0.5 },
        { labelEn: 'Giving each other freedom', labelTr: 'Birbirimize ozgurluk tanimak', value: 0.25 },
      ],
    },

    // Love Language (Q25-Q27) - Weight: 1.2
    {
      questionNumber: 25, category: 'LOVE_LANGUAGE', weight: 1.2, isPremium: true,
      textEn: 'How do you most like to receive love?',
      textTr: 'Sevgiyi en cok nasil almak istersin?',
      options: [
        { labelEn: 'Hearing "I love you" and affirmations', labelTr: '"Seni seviyorum" duymak ve onaylanmak', value: 1.0 },
        { labelEn: 'Physical touch and closeness', labelTr: 'Fiziksel dokunus ve yakinlik', value: 0.75 },
        { labelEn: 'Undivided attention and quality time', labelTr: 'Tam ilgi ve kaliteli vakit', value: 0.5 },
        { labelEn: 'Thoughtful gestures and acts of service', labelTr: 'Dusunceli hareketler ve yardimlar', value: 0.25 },
      ],
    },
    {
      questionNumber: 26, category: 'LOVE_LANGUAGE', weight: 1.2, isPremium: true,
      textEn: 'You want to show love to your partner. What do you do?',
      textTr: 'Partnerine sevgini gostermek istiyorsun. Ne yaparsin?',
      options: [
        { labelEn: 'Write a heartfelt message', labelTr: 'Icten bir mesaj yazarim', value: 1.0 },
        { labelEn: 'Plan a surprise date', labelTr: 'Surpriz bir bulusma planlarim', value: 0.75 },
        { labelEn: 'Cook their favorite meal', labelTr: 'En sevdigi yemegi pisiririm', value: 0.5 },
        { labelEn: 'Just hold them close', labelTr: 'Sadece sarilirim', value: 0.25 },
      ],
    },
    {
      questionNumber: 27, category: 'LOVE_LANGUAGE', weight: 1.2, isPremium: true,
      textEn: 'What makes you feel most appreciated?',
      textTr: 'Seni en cok ne takdir edilmis hissettirir?',
      options: [
        { labelEn: 'Verbal recognition and praise', labelTr: 'Sozlu takdir ve ovgu', value: 1.0 },
        { labelEn: 'Someone remembering small details', labelTr: 'Birinin kucuk detaylari hatirlamasi', value: 0.75 },
        { labelEn: 'Someone making time for me', labelTr: 'Birinin bana zaman ayirmasi', value: 0.5 },
        { labelEn: 'Receiving a meaningful gift', labelTr: 'Anlamli bir hediye almak', value: 0.25 },
      ],
    },

    // Conflict Style (Q28-Q30) - Weight: 1.5
    {
      questionNumber: 28, category: 'CONFLICT_STYLE', weight: 1.5, isPremium: true,
      textEn: 'During a conflict with your partner, you typically...',
      textTr: 'Partnerinle bir catismada genellikle...',
      options: [
        { labelEn: 'Stay calm and discuss rationally', labelTr: 'Sakin kalir ve mantikli tartisirim', value: 1.0 },
        { labelEn: 'Get emotional and need time', labelTr: 'Duygusalllasirim ve zamana ihtiyac duyarim', value: 0.5 },
        { labelEn: 'Compromise to keep the peace', labelTr: 'Baris icin uzlasirim', value: 0.75 },
        { labelEn: 'Avoid the conflict altogether', labelTr: 'Catismadan tamamen kacarim', value: 0.25 },
      ],
    },
    {
      questionNumber: 29, category: 'CONFLICT_STYLE', weight: 1.5, isPremium: true,
      textEn: 'After a fight, how do you reconcile?',
      textTr: 'Bir kavgadan sonra nasil barisirsin?',
      options: [
        { labelEn: 'I initiate a calm conversation', labelTr: 'Sakin bir konusma baslatirim', value: 1.0 },
        { labelEn: 'I show affection without words', labelTr: 'Sozsuz sevgi gosteririm', value: 0.75 },
        { labelEn: 'I wait for the other person to reach out', labelTr: 'Karsi tarafin gelmesini beklerim', value: 0.25 },
        { labelEn: 'I act like nothing happened', labelTr: 'Hicbir sey olmamis gibi davranirim', value: 0.5 },
      ],
    },
    {
      questionNumber: 30, category: 'CONFLICT_STYLE', weight: 1.5, isPremium: true,
      textEn: 'What is your biggest relationship deal-breaker?',
      textTr: 'Iliskide en buyuk kirmizi cizgin ne?',
      options: [
        { labelEn: 'Dishonesty and betrayal of trust', labelTr: 'Durust olmamak ve guven ihaneti', value: 1.0 },
        { labelEn: 'Lack of respect', labelTr: 'Saygisizlik', value: 0.75 },
        { labelEn: 'Emotional unavailability', labelTr: 'Duygusal uzaklik', value: 0.5 },
        { labelEn: 'Controlling behavior', labelTr: 'Kontrol edici davranis', value: 0.25 },
      ],
    },

    // Future Vision (Q31-Q34) - Weight: 1.5
    {
      questionNumber: 31, category: 'FUTURE_VISION', weight: 1.5, isPremium: true,
      textEn: 'Do you want children?',
      textTr: 'Cocuk istiyor musun?',
      options: [
        { labelEn: 'Yes, definitely', labelTr: 'Evet, kesinlikle', value: 1.0 },
        { labelEn: 'Maybe, in the future', labelTr: 'Belki, ileride', value: 0.75 },
        { labelEn: 'I\'m not sure', labelTr: 'Emin degilim', value: 0.5 },
        { labelEn: 'No, I don\'t want children', labelTr: 'Hayir, cocuk istemiyorum', value: 0.25 },
      ],
    },
    {
      questionNumber: 32, category: 'FUTURE_VISION', weight: 1.5, isPremium: true,
      textEn: 'Where would you ideally live?',
      textTr: 'Ideal olarak nerede yasamak istersin?',
      options: [
        { labelEn: 'In a big city, full of energy', labelTr: 'Buyuk sehirde, enerji dolu', value: 1.0 },
        { labelEn: 'Suburbs, peaceful but connected', labelTr: 'Banliyode, huzurlu ama baglantili', value: 0.75 },
        { labelEn: 'Countryside, close to nature', labelTr: 'Kirsal, dogaya yakin', value: 0.5 },
        { labelEn: 'Anywhere, I\'m flexible', labelTr: 'Her yerde, esneyim', value: 0.25 },
      ],
    },
    {
      questionNumber: 33, category: 'FUTURE_VISION', weight: 1.5, isPremium: true,
      textEn: 'Describe your ideal life in 10 years.',
      textTr: '10 yil sonra ideal hayatini anlat.',
      options: [
        { labelEn: 'Stable career, family, home', labelTr: 'Istikrarli kariyer, aile, yuva', value: 1.0 },
        { labelEn: 'Traveling and experiencing the world', labelTr: 'Dunyayi gezip deneyimlemek', value: 0.5 },
        { labelEn: 'Running my own business', labelTr: 'Kendi isimi yurutmek', value: 0.75 },
        { labelEn: 'Living simply, focusing on happiness', labelTr: 'Sade yasamak, mutluluga odaklanmak', value: 0.25 },
      ],
    },
    {
      questionNumber: 34, category: 'FUTURE_VISION', weight: 1.5, isPremium: true,
      textEn: 'How important is financial stability before marriage?',
      textTr: 'Evlilik oncesi finansal guvence ne kadar onemli?',
      options: [
        { labelEn: 'Very important, foundation first', labelTr: 'Cok onemli, once temel', value: 1.0 },
        { labelEn: 'Important but love comes first', labelTr: 'Onemli ama sevgi once gelir', value: 0.75 },
        { labelEn: 'We can build it together', labelTr: 'Birlikte insa ederiz', value: 0.5 },
        { labelEn: 'Money shouldn\'t dictate love', labelTr: 'Para aska yon vermemeli', value: 0.25 },
      ],
    },

    // Intellectual Compatibility (Q35-Q37) - Weight: 1.0
    {
      questionNumber: 35, category: 'INTELLECTUAL', weight: 1.0, isPremium: true,
      textEn: 'How curious are you about learning new things?',
      textTr: 'Yeni seyler ogrenmeye ne kadar meraklisin?',
      options: [
        { labelEn: 'Extremely, I\'m always learning', labelTr: 'Son derece, surekli ogrenirim', value: 1.0 },
        { labelEn: 'When a topic interests me', labelTr: 'Ilgimi ceken konularda', value: 0.75 },
        { labelEn: 'Occasionally, when needed', labelTr: 'Ara sira, gerektiginde', value: 0.5 },
        { labelEn: 'I prefer comfort in what I know', labelTr: 'Bildiklerimde rahat ederim', value: 0.25 },
      ],
    },
    {
      questionNumber: 36, category: 'INTELLECTUAL', weight: 1.0, isPremium: true,
      textEn: 'Do you enjoy intellectual debates?',
      textTr: 'Entelektuel tartismalardan hoslanir misin?',
      options: [
        { labelEn: 'Love them, they energize me', labelTr: 'Severim, bana enerji verir', value: 1.0 },
        { labelEn: 'Sometimes, with the right person', labelTr: 'Bazen, dogru insanla', value: 0.75 },
        { labelEn: 'I prefer lighter conversations', labelTr: 'Daha hafif sohbetleri tercih ederim', value: 0.5 },
        { labelEn: 'I avoid debates', labelTr: 'Tartismalardan kacarim', value: 0.25 },
      ],
    },
    {
      questionNumber: 37, category: 'INTELLECTUAL', weight: 1.0, isPremium: true,
      textEn: 'How do you prefer to learn?',
      textTr: 'Nasil ogrenmeyi tercih edersin?',
      options: [
        { labelEn: 'Reading books and articles', labelTr: 'Kitap ve makale okuyarak', value: 1.0 },
        { labelEn: 'Watching documentaries and videos', labelTr: 'Belgesel ve video izleyerek', value: 0.75 },
        { labelEn: 'Through experience and practice', labelTr: 'Deneyim ve pratikle', value: 0.5 },
        { labelEn: 'Through conversations with others', labelTr: 'Baskalariyla sohbetle', value: 0.25 },
      ],
    },

    // Intimacy Profile (Q38-Q40) - Weight: 1.2
    {
      questionNumber: 38, category: 'INTIMACY', weight: 1.2, isPremium: true,
      textEn: 'How comfortable are you with emotional intimacy?',
      textTr: 'Duygusal yakinlik konusunda ne kadar rahatsin?',
      options: [
        { labelEn: 'Very comfortable, I open up easily', labelTr: 'Cok rahat, kolayca acilirim', value: 1.0 },
        { labelEn: 'Comfortable once trust is built', labelTr: 'Guven olusunca rahat', value: 0.75 },
        { labelEn: 'It takes me a long time', labelTr: 'Uzun zaman alir', value: 0.5 },
        { labelEn: 'I keep emotional distance', labelTr: 'Duygusal mesafe korurum', value: 0.25 },
      ],
    },
    {
      questionNumber: 39, category: 'INTIMACY', weight: 1.2, isPremium: true,
      textEn: 'How important is physical intimacy in a relationship?',
      textTr: 'Iliskide fiziksel yakinlik ne kadar onemli?',
      options: [
        { labelEn: 'Essential, a core part of connection', labelTr: 'Temel, baglantinin ozu', value: 1.0 },
        { labelEn: 'Important but not everything', labelTr: 'Onemli ama her sey degil', value: 0.75 },
        { labelEn: 'Emotional bond matters more', labelTr: 'Duygusal bag daha onemli', value: 0.5 },
        { labelEn: 'It develops naturally over time', labelTr: 'Zamanla dogal olarak gelisir', value: 0.25 },
      ],
    },
    {
      questionNumber: 40, category: 'INTIMACY', weight: 1.2, isPremium: true,
      textEn: 'How quickly do you share your deepest secrets?',
      textTr: 'En derin sirlarini ne kadar hizli paylasirsin?',
      options: [
        { labelEn: 'When I feel a genuine connection', labelTr: 'Gercek bir bag hissettigimde', value: 1.0 },
        { labelEn: 'After months of building trust', labelTr: 'Aylarca guven insa ettikten sonra', value: 0.75 },
        { labelEn: 'Only with very close people', labelTr: 'Sadece cok yakin insanlarla', value: 0.5 },
        { labelEn: 'I rarely share them', labelTr: 'Nadiren paylasiarim', value: 0.25 },
      ],
    },

    // Growth Mindset (Q41-Q43) - Weight: 1.0
    {
      questionNumber: 41, category: 'GROWTH_MINDSET', weight: 1.0, isPremium: true,
      textEn: 'How do you handle constructive criticism?',
      textTr: 'Yapici elestiriyi nasil karsilrsin?',
      options: [
        { labelEn: 'I welcome it, it helps me grow', labelTr: 'Hos karsilarim, buyumeme yardimci olur', value: 1.0 },
        { labelEn: 'I try to accept it, though it stings', labelTr: 'Kabul etmeye calisirim, acisa da', value: 0.75 },
        { labelEn: 'Depends on who it comes from', labelTr: 'Kimden geldigine bagli', value: 0.5 },
        { labelEn: 'I tend to get defensive', labelTr: 'Savunmaya gecerim', value: 0.25 },
      ],
    },
    {
      questionNumber: 42, category: 'GROWTH_MINDSET', weight: 1.0, isPremium: true,
      textEn: 'When faced with a big change in life, you...',
      textTr: 'Hayatinda buyuk bir degisiklikle karsilastiginda...',
      options: [
        { labelEn: 'Embrace it as an opportunity', labelTr: 'Bir firsat olarak kucaklarim', value: 1.0 },
        { labelEn: 'Adapt gradually', labelTr: 'Yavas yavas uyum saglarim', value: 0.75 },
        { labelEn: 'Feel anxious but push through', labelTr: 'Endiseleniirim ama ustesinden gelirim', value: 0.5 },
        { labelEn: 'Resist change, prefer stability', labelTr: 'Degisime direnc gosteririm, istikrar isterim', value: 0.25 },
      ],
    },
    {
      questionNumber: 43, category: 'GROWTH_MINDSET', weight: 1.0, isPremium: true,
      textEn: 'Do you believe people can fundamentally change?',
      textTr: 'Insanlarin temelden degisebilecegine inaniyor musun?',
      options: [
        { labelEn: 'Yes, with effort and willingness', labelTr: 'Evet, caba ve istekle', value: 1.0 },
        { labelEn: 'Somewhat, but core traits remain', labelTr: 'Kismen, ama temel ozellikler kalir', value: 0.75 },
        { labelEn: 'Small changes are possible', labelTr: 'Kucuk degisiklikler mumkun', value: 0.5 },
        { labelEn: 'People don\'t really change', labelTr: 'Insanlar gercekten degismez', value: 0.25 },
      ],
    },

    // Core Fears (Q44-Q45) - Weight: 1.5
    {
      questionNumber: 44, category: 'CORE_FEARS', weight: 1.5, isPremium: true,
      textEn: 'What is your biggest fear in a relationship?',
      textTr: 'Iliskide en buyuk korkun ne?',
      options: [
        { labelEn: 'Being betrayed or cheated on', labelTr: 'Aldatilmak veya ihanete ugramak', value: 1.0 },
        { labelEn: 'Losing my independence', labelTr: 'Bagimsizligimi kaybetmek', value: 0.5 },
        { labelEn: 'Not being truly loved', labelTr: 'Gercekten sevilmemek', value: 0.75 },
        { labelEn: 'Growing apart over time', labelTr: 'Zamanla birbirinden uzaklasmak', value: 0.25 },
      ],
    },
    {
      questionNumber: 45, category: 'CORE_FEARS', weight: 1.5, isPremium: true,
      textEn: 'What would make you end a relationship?',
      textTr: 'Seni bir iliskiyi bitirmeye ne iter?',
      options: [
        { labelEn: 'Repeated lying', labelTr: 'Tekrarlayan yalanlar', value: 1.0 },
        { labelEn: 'Feeling unappreciated', labelTr: 'Takdir edilmemek', value: 0.75 },
        { labelEn: 'Growing in different directions', labelTr: 'Farkli yonlere buyumek', value: 0.5 },
        { labelEn: 'Lack of effort from the other side', labelTr: 'Karsi tarafin caba gostermemesi', value: 0.25 },
      ],
    },
  ];

  for (const q of questions) {
    await prisma.compatibilityQuestion.upsert({
      where: { questionNumber: q.questionNumber },
      update: {},
      create: {
        questionNumber: q.questionNumber,
        category: q.category as QuestionCategory,
        textEn: q.textEn,
        textTr: q.textTr,
        weight: q.weight,
        isPremium: q.isPremium,
        order: q.questionNumber,
        options: {
          create: q.options.map((opt, idx) => ({
            labelEn: opt.labelEn,
            labelTr: opt.labelTr,
            value: opt.value,
            order: idx,
          })),
        },
      },
    });
  }

  console.log(`  ${questions.length} questions seeded (20 core + 25 premium)`);
}

// ============================================================
// 30 HARMONY QUESTION CARDS
// ============================================================
async function seedHarmonyQuestionCards(): Promise<void> {
  console.log('Seeding 30 Harmony question cards...');

  const cards = [
    // Icebreaker (10)
    { category: 'ICEBREAKER', textEn: 'What was the moment you laughed the most in your life?', textTr: 'Hayatinda en cok guldugum an hangisiydi?' },
    { category: 'ICEBREAKER', textEn: 'If you had a superpower, what would it be?', textTr: 'Bir super gucun olsa ne olurdu?' },
    { category: 'ICEBREAKER', textEn: 'What was the last show/movie you watched? Why did you like it?', textTr: 'Son izledigin dizi/film ne? Neden sevdin?' },
    { category: 'ICEBREAKER', textEn: 'What did you want to be when you grew up?', textTr: 'Cocukken buyuyunce ne olmak istiyordun?' },
    { category: 'ICEBREAKER', textEn: 'If you could teleport anywhere in the world, where would you go?', textTr: 'Dunyada herhangi bir yere isinlanabilsen nereye giderdin?' },
    { category: 'ICEBREAKER', textEn: 'What song are you listening to the most right now?', textTr: 'Playlistinde su an en cok dinledigin sarki?' },
    { category: 'ICEBREAKER', textEn: 'Are you a morning person or a night owl?', textTr: 'Sabah insani misin yoksa gece kusu mu?' },
    { category: 'ICEBREAKER', textEn: 'When was the last time you tried something for the first time?', textTr: 'En son ne zaman ilk kez bir sey denedin?' },
    { category: 'ICEBREAKER', textEn: 'Which emoji describes you best?', textTr: 'Seni en iyi anlatan emoji hangisi?' },
    { category: 'ICEBREAKER', textEn: 'What does an ideal first date look like?', textTr: 'Ideal bir ilk bulusma nasil olur?' },
    // Deep Connection (10)
    { category: 'DEEP_CONNECTION', textEn: 'What would someone who truly knows you say about you?', textTr: 'Seni gercekten taniyan biri hakkinda ne der?' },
    { category: 'DEEP_CONNECTION', textEn: 'What do you value most in life?', textTr: 'Hayatta en cok neye deger verirsin?' },
    { category: 'DEEP_CONNECTION', textEn: 'When was the last time you truly showed vulnerability?', textTr: 'En son ne zaman gercekten kirilganlik gosterdin?' },
    { category: 'DEEP_CONNECTION', textEn: 'What has shaped you the most as a person?', textTr: 'Seni bir insan olarak en cok ne sekillendirdi?' },
    { category: 'DEEP_CONNECTION', textEn: 'What have you learned the most from relationships?', textTr: 'Iliskilerde en cok neyi ogrendin?' },
    { category: 'DEEP_CONNECTION', textEn: 'Describe your ideal day 10 years from now.', textTr: '10 yil sonra ideal bir gununu anlat.' },
    { category: 'DEEP_CONNECTION', textEn: 'Is there something in life you regret?', textTr: 'Hayatta pisman oldugun bir sey var mi?' },
    { category: 'DEEP_CONNECTION', textEn: 'How do you deal with your biggest fear?', textTr: 'En buyuk korkunla nasil basa cikiyorsun?' },
    { category: 'DEEP_CONNECTION', textEn: 'How do you think love should be shown?', textTr: 'Sevgi sence nasil gosterilir?' },
    { category: 'DEEP_CONNECTION', textEn: 'What motivates you the most?', textTr: 'Seni en cok ne motive ediyor?' },
    // Fun & Playful (10)
    { category: 'FUN_PLAYFUL', textEn: 'This or that: Mountains or Sea?', textTr: 'Bu veya su: Dag mi, Deniz mi?' },
    { category: 'FUN_PLAYFUL', textEn: 'If you could be any celebrity for a day, who would it be?', textTr: 'Bir gun boyunca unlu biri olabilsen kim olurdun?' },
    { category: 'FUN_PLAYFUL', textEn: 'What is your worst food experience?', textTr: 'En kotu yemek deneyimin ne?' },
    { category: 'FUN_PLAYFUL', textEn: 'What was the craziest thing you did during quarantine?', textTr: 'Karantinada en cilginca ne yaptin?' },
    { category: 'FUN_PLAYFUL', textEn: 'If you had a time machine, would you go to the past or the future?', textTr: 'Bir zaman makinen olsa gecmise mi gidersin gelecege mi?' },
    { category: 'FUN_PLAYFUL', textEn: 'When was the last time you laughed so hard your stomach hurt?', textTr: 'En son ne zaman kahkahadan karnin agridi?' },
    { category: 'FUN_PLAYFUL', textEn: 'Are you competitive or a team player with your partner?', textTr: 'Partnerinle yarismali mi olursun yoksa takim mi?' },
    { category: 'FUN_PLAYFUL', textEn: 'If you had a podcast, what would the topic be?', textTr: 'Bir podcastin olsa konusu ne olurdu?' },
    { category: 'FUN_PLAYFUL', textEn: 'What is your most embarrassing moment? (If you can share)', textTr: 'En utanc verici anin ne? (Paylasabilirsen)' },
    { category: 'FUN_PLAYFUL', textEn: 'If you want to remember me after this chat, what would you remember?', textTr: 'Bu sohbetten sonra beni hatirlamak istersen, ne hatirlarsin?' },
  ];

  // Clear existing cards and re-create (seed is idempotent)
  await prisma.harmonyUsedCard.deleteMany({});
  await prisma.harmonyQuestionCard.deleteMany({});

  await prisma.harmonyQuestionCard.createMany({
    data: cards.map((card, i) => ({
      category: card.category as 'ICEBREAKER' | 'DEEP_CONNECTION' | 'FUN_PLAYFUL',
      textEn: card.textEn,
      textTr: card.textTr,
      order: i + 1,
    })),
  });

  console.log(`  ${cards.length} question cards seeded`);
}

// ============================================================
// 5 HARMONY GAME CARDS
// ============================================================
async function seedHarmonyGameCards(): Promise<void> {
  console.log('Seeding 5 Harmony game cards...');

  const games = [
    {
      gameType: 'common_ground',
      nameEn: 'Our Common Ground', nameTr: 'Ikimizin Ortak Noktasi',
      descriptionEn: 'Both guess what you have in common, reveal simultaneously.',
      descriptionTr: 'Ikiniz de ortak noktanizi tahmin edin, ayni anda acikladini.',
    },
    {
      gameType: 'two_truths_one_lie',
      nameEn: 'Two Truths, One Lie', nameTr: 'Dogru mu Yanlis mi?',
      descriptionEn: 'Each shares 2 truths and 1 lie, the partner guesses.',
      descriptionTr: 'Her biri 2 dogru 1 yanlis soylesin, partner tahmin etsin.',
    },
    {
      gameType: 'complete_sentence',
      nameEn: 'Complete the Sentence', nameTr: 'Tamamla Cumleyi',
      descriptionEn: 'One starts a sentence, the other finishes it.',
      descriptionTr: 'Biri cumleye baslasin, digeri tamamlasin.',
    },
    {
      gameType: 'word_association',
      nameEn: 'Word Association', nameTr: 'Kelime Iliskilendirme',
      descriptionEn: 'Quick word association game - say the first thing that comes to mind!',
      descriptionTr: 'Hizli kelime cagrisimi - aklina gelen ilk seyi soyle!',
    },
    {
      gameType: 'imagination',
      nameEn: 'Imagination', nameTr: 'Hayal Gucu',
      descriptionEn: '"Together we would..." - Build a scenario together.',
      descriptionTr: '"Birlikte biz..." - Birlikte bir senaryo kurun.',
    },
  ];

  // Clear existing game cards and re-create (seed is idempotent)
  await prisma.harmonyGameCard.deleteMany({});

  await prisma.harmonyGameCard.createMany({
    data: games,
  });

  console.log(`  ${games.length} game cards seeded`);
}

// ============================================================
// BADGE DEFINITIONS
// ============================================================
async function seedBadgeDefinitions(): Promise<void> {
  console.log('Seeding badge definitions...');

  const badges = [
    {
      key: 'first_spark', nameEn: 'First Spark', nameTr: 'Ilk Kivilcim',
      descriptionEn: 'Celebrate your first match!', descriptionTr: 'Ilk eslesmeni kutla!',
      criteria: { type: 'match_count', count: 1 }, goldReward: 5,
    },
    {
      key: 'chat_master', nameEn: 'Chat Master', nameTr: 'Sohbet Ustasi',
      descriptionEn: 'Complete 5 Harmony Room sessions!', descriptionTr: '5 Harmony odasini tamamladin!',
      criteria: { type: 'harmony_session_count', count: 5 }, goldReward: 10,
    },
    {
      key: 'question_explorer', nameEn: 'Question Explorer', nameTr: 'Merak Uzmani',
      descriptionEn: 'Answer all core compatibility questions!', descriptionTr: 'Tum temel uyumluluk sorularini yanitladin!',
      criteria: { type: 'answer_count', count: 20 }, goldReward: 10,
    },
    {
      key: 'soul_mate', nameEn: 'Soul Mate', nameTr: 'Ruh Ikizi',
      descriptionEn: 'Found a Super Compatibility match!', descriptionTr: 'Super uyumluluk buldun!',
      criteria: { type: 'super_compatibility_match', count: 1 }, goldReward: 15,
    },
    {
      key: 'verified_star', nameEn: 'Verified Star', nameTr: 'Dogrulanmis Yildiz',
      descriptionEn: 'Your selfie is verified!', descriptionTr: 'Selfie dogrulaman tamamlandi!',
      criteria: { type: 'selfie_verification', count: 1 }, goldReward: 5,
    },
    {
      key: 'couple_goal', nameEn: 'Couple Goal', nameTr: 'Cift Hedefi',
      descriptionEn: 'Activated Relationship Mode!', descriptionTr: 'Iliski modunu aktiflestirdin!',
      criteria: { type: 'relationship_activated', count: 1 }, goldReward: 20,
    },
    {
      key: 'explorer', nameEn: 'Explorer', nameTr: 'Kasif',
      descriptionEn: 'Explored 50 profiles in discovery!', descriptionTr: '50 profil kesfettin!',
      criteria: { type: 'swipe_count', count: 50 }, goldReward: 5,
    },
    {
      key: 'gold_member', nameEn: 'Gold Member', nameTr: 'Altin Uye',
      descriptionEn: 'Welcome to the premium world!', descriptionTr: 'Premium dunyaya hos geldin!',
      criteria: { type: 'subscription_active', count: 1 }, goldReward: 10,
    },
  ];

  for (const badge of badges) {
    await prisma.badgeDefinition.upsert({
      where: { key: badge.key },
      update: {},
      create: badge,
    });
  }

  console.log(`  ${badges.length} badges seeded`);
}

// ============================================================
// RUN
// ============================================================
main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
