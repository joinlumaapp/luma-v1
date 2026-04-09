// LUMA V1 — Database Seed Script (Comprehensive)
// Seeds: 20 Core + 25 Extended Compatibility Questions, Badge Definitions,
// 11 Demo Users with Profiles,
// Photos, Answers, Matches, Chat Messages, and Badge Awards
//
// ADMIN NOTE: Admin access is env-based (ADMIN_USER_IDS).
// To grant admin privileges to a seed user, copy their UUID from the
// database after seeding and add it to the ADMIN_USER_IDS environment
// variable (comma-separated). Recommended: use Baran (SUPREME tier,
// phone: +905559990011) as the admin user for development.

import {
  PrismaClient,
  Prisma,
  QuestionCategory,
  PackageTier,
  IntentionTag,
  Gender,
  SwipeAction,
  MatchAnimationType,
  CompatibilityLevel,
  ChatMessageType,
  ChatMessageStatus,
  NotificationType,
  PaymentPlatform,
  GoldTransactionType,
} from "@prisma/client";
import { randomBetween } from "./seed-utils";
import * as crypto from "crypto";

const prisma = new PrismaClient();

/** Generate a unique display ID for seed users */
function generateDisplayId(index: number): string {
  const hex = crypto.randomBytes(5).toString("hex").toUpperCase();
  return `LU-${hex}`;
}

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
    firstName: "Elif",
    gender: Gender.FEMALE,
    birthDate: new Date("2001-03-15"),
    city: "Istanbul",
    country: "Turkey",
    latitude: 41.0082,
    longitude: 28.9784,
    intentionTag: IntentionTag.EVLENMEK,
    bio: "Kitap kurdu, kahve bagimli. Haftasonlari sahilde yurumek en sevdigim aktivite. Derin sohbetlere bayilirim, yuzeysel konusmalara sabrim yok. Ruh esimi ariyorum.",
    phone: "+905551234501",
    phoneCountryCode: "+90",
    isVerified: true,
    packageTier: PackageTier.SUPREME,
    goldBalance: 150,
  },
  {
    firstName: "Ahmet",
    gender: Gender.MALE,
    birthDate: new Date("1998-07-22"),
    city: "Istanbul",
    country: "Turkey",
    latitude: 41.0422,
    longitude: 29.0083,
    intentionTag: IntentionTag.ILISKI,
    bio: "Yazilimci, dagci, aci kahve tiryakisi. Hafta ici kod yazarim, haftasonu zirveler tirmanirim. Hayatta tutkuyla yasayan birini ariyorum.",
    phone: "+905551234502",
    phoneCountryCode: "+90",
    isVerified: true,
    packageTier: PackageTier.PREMIUM,
    goldBalance: 80,
  },
  {
    firstName: "Zeynep",
    gender: Gender.FEMALE,
    birthDate: new Date("2003-01-10"),
    city: "Ankara",
    country: "Turkey",
    latitude: 39.9334,
    longitude: 32.8597,
    intentionTag: IntentionTag.KULTUR,
    bio: "Universite ogrencisi, sanat ve muzik hayatim. Gitar calarim, resim yaparim, yeni insanlarla tanismak beni mutlu eder. Hayati kesfediyorum!",
    phone: "+905551234503",
    phoneCountryCode: "+90",
    isVerified: true,
    packageTier: PackageTier.FREE,
    goldBalance: 10,
  },
  {
    firstName: "Can",
    gender: Gender.MALE,
    birthDate: new Date("1996-11-05"),
    city: "Izmir",
    country: "Turkey",
    latitude: 38.4237,
    longitude: 27.1428,
    intentionTag: IntentionTag.ILISKI,
    bio: "Muzisyen, seyahat tutkunu, iyi bir dinleyici. Jazz barlarda performans sergilerim. Hayatin ritmine uyum saglayacak birini ariyorum.",
    phone: "+905551234504",
    phoneCountryCode: "+90",
    isVerified: true,
    packageTier: PackageTier.PREMIUM,
    goldBalance: 60,
  },
  {
    firstName: "Selin",
    gender: Gender.FEMALE,
    birthDate: new Date("1999-06-18"),
    city: "Istanbul",
    country: "Turkey",
    latitude: 41.0136,
    longitude: 28.955,
    intentionTag: IntentionTag.SOHBET_ARKADAS,
    bio: "Grafik tasarimci, renkleri ve detaylari severim. Kedilerim benim her seyim. Iyi bir sohbet iyi bir iliskinin baslangicidir.",
    phone: "+905551234505",
    phoneCountryCode: "+90",
    isVerified: true,
    packageTier: PackageTier.FREE,
    goldBalance: 5,
  },
  {
    firstName: "Burak",
    gender: Gender.MALE,
    birthDate: new Date("2000-09-30"),
    city: "Antalya",
    country: "Turkey",
    latitude: 36.8969,
    longitude: 30.7133,
    intentionTag: IntentionTag.DUNYA_GEZME,
    bio: "Sporcu, doga sever, dalga sorfcusu. Deniz kenarinda yasiyorum ve her gunu dolu dolu geciriyorum. Enerjik ve pozitif insanlarla tanismak isterim.",
    phone: "+905551234506",
    phoneCountryCode: "+90",
    isVerified: false,
    packageTier: PackageTier.FREE,
    goldBalance: 0,
  },
  {
    firstName: "Defne",
    gender: Gender.FEMALE,
    birthDate: new Date("2002-04-12"),
    city: "Istanbul",
    country: "Turkey",
    latitude: 41.0053,
    longitude: 29.0126,
    intentionTag: IntentionTag.EVLENMEK,
    bio: "Tip ogrencisi, gelecekte cocuk doktoru olmak istiyorum. Sabah erkenci, gece okuyan, hafta sonu kahvalti yapan biriyim. Guvenilir ve samimi birini ariyorum.",
    phone: "+905551234507",
    phoneCountryCode: "+90",
    isVerified: true,
    packageTier: PackageTier.SUPREME,
    goldBalance: 200,
  },
  {
    firstName: "Emre",
    gender: Gender.MALE,
    birthDate: new Date("1994-02-28"),
    city: "Bursa",
    country: "Turkey",
    latitude: 40.1885,
    longitude: 29.061,
    intentionTag: IntentionTag.ILISKI,
    bio: "Girisimci, teknoloji meraklisi. Kendi startupimi kurdum ve buyutuyorum. Is disinda yemek yapmak ve yeni tatlar kesfetmek en buyuk hobim.",
    phone: "+905551234508",
    phoneCountryCode: "+90",
    isVerified: true,
    packageTier: PackageTier.PREMIUM,
    goldBalance: 100,
  },
  {
    firstName: "Ece",
    gender: Gender.FEMALE,
    birthDate: new Date("1997-08-20"),
    city: "Istanbul",
    country: "Turkey",
    latitude: 41.0351,
    longitude: 28.9833,
    intentionTag: IntentionTag.KULTUR,
    bio: "Avukat, yoga tutkunu, kitap delisi. Hafta ici mahkemelerde, hafta sonu mat ustunde. Hayatta dengeyi ve huzuru ariyorum. Zeki sohbetlere bayilirim.",
    phone: "+905551234509",
    phoneCountryCode: "+90",
    isVerified: false,
    packageTier: PackageTier.FREE,
    goldBalance: 15,
  },
  {
    firstName: "Kaan",
    gender: Gender.MALE,
    birthDate: new Date("1999-12-03"),
    city: "Istanbul",
    country: "Turkey",
    latitude: 41.0255,
    longitude: 28.9744,
    intentionTag: IntentionTag.SOHBET_ARKADAS,
    bio: "Fotograf sanatcisi, sokaklari ve insanlari cekmekten keyif alirim. Her karede bir hikaye ararım. Hayata farkli bir perspektiften bakan birini bulmak istiyorum.",
    phone: "+905551234510",
    phoneCountryCode: "+90",
    isVerified: false,
    packageTier: PackageTier.FREE,
    goldBalance: 0,
  },
  {
    firstName: "Baran",
    gender: Gender.MALE,
    birthDate: new Date("1988-03-15"),
    city: "Istanbul",
    country: "Turkey",
    latitude: 41.0155,
    longitude: 28.9795,
    intentionTag: IntentionTag.EVLENMEK,
    bio: "Teknoloji girisimcisi, kitap kurdu, muzik tutkunu. Hayatta anlam arayan, kaliteli sohbete degil dedikodulara vakit ayiran biriyim.",
    phone: "+905559990011",
    phoneCountryCode: "+90",
    isVerified: true,
    packageTier: PackageTier.SUPREME,
    goldBalance: 5000,
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
  // Baran  — analytical, balanced, deep
  [3, 0, 0, 0, 1, 2, 0, 0, 0, 1, 0, 2, 0, 0, 0, 1, 1, 2, 2, 1],
];

// Match pairs (indices into DEMO_USERS) with compatibility scores
const MATCH_PAIRS: Array<{
  userAIdx: number;
  userBIdx: number;
  score: number;
  level: CompatibilityLevel;
}> = [
  { userAIdx: 0, userBIdx: 1, score: 87.5, level: CompatibilityLevel.SUPER }, // Elif & Ahmet
  { userAIdx: 2, userBIdx: 5, score: 82.3, level: CompatibilityLevel.SUPER }, // Zeynep & Burak
  { userAIdx: 3, userBIdx: 8, score: 74.1, level: CompatibilityLevel.NORMAL }, // Can & Ece
  { userAIdx: 6, userBIdx: 7, score: 79.8, level: CompatibilityLevel.NORMAL }, // Defne & Emre
  { userAIdx: 4, userBIdx: 9, score: 91.2, level: CompatibilityLevel.SUPER }, // Selin & Kaan
];

// Chat messages per match
const CHAT_CONVERSATIONS: string[][][] = [
  // Match 0: Elif & Ahmet (deep connection)
  [
    [
      "A",
      "Merhaba Elif! Profilini cok begendim, kitap onerisi alabilir miyim?",
    ],
    [
      "B",
      "Merhaba Ahmet! Tabii ki, su an Orhan Pamuk okuyorum, Masumiyet Muzesi. Sen ne okuyorsun?",
    ],
    [
      "A",
      "Ben daha cok bilim kurgu severim, son okuduğum Dune serisi. Ama Pamuk da cok iyi!",
    ],
    ["B", "Dune harika bir secim! Dagciliga ne zaman basaldin?"],
    [
      "A",
      "Universite yillarinda basladim, Kackar Daglari ilk rotamdi. Hic dagcilik denedin mi?",
    ],
    [
      "B",
      "Deniz insaniyim aslinda ama denemek isterim! Beni goturursen tabii :)",
    ],
    [
      "A",
      "Tabii ki! Baslangic icin Uludag guzel olur, bir hafta sonu planlariz",
    ],
    [
      "B",
      "Cok guzel olur! Sonra ben de sana sahilde yuruyus rotami gosteririm",
    ],
    ["A", "Anlasma! Bu hafta sonu musait misin kahve icmeye?"],
    [
      "B",
      "Cumartesi ogleden sonra olur mu? Kadikoy tarafinda guzel bir yer biliyorum",
    ],
    ["A", "Muhtesem, saat 3te olalim mi?"],
    ["B", "Saat 3 iyi, gorusmek uzere!"],
  ],
  // Match 1: Zeynep & Burak (fun and energetic)
  [
    ["A", "Selam Burak! Sorfcu ha, cok havaliii"],
    [
      "B",
      "Haha tesekkurler Zeynep! Sen de gitarciysin, akustik mi elektrik mi?",
    ],
    [
      "A",
      "Akustik ama elektrik de ogrenmeye basladim, rock da calmak istiyorum!",
    ],
    ["B", "Harika! Kumsal partisinde calsan efsane olur"],
    ["A", "Hayalim zaten! Antalyada yazin konser var mi?"],
    ["B", "Cok oluyor, yazin gel birlikte gideriz!"],
    ["A", "Teklif kabul! Ankaradan kacmak icin bahane ariyordum zaten"],
    ["B", "Haha gel, deniz seni bekliyor! Sorf da ogretirim istersen"],
    ["A", "Beni suyun icine sokamazsin ama deneyebiliriz :D"],
    ["B", "Challenge accepted!"],
  ],
  // Match 2: Can & Ece (intellectual connection)
  [
    [
      "A",
      "Merhaba Ece, profilinde yoga yaziyormus, jazz ile yoga yakindir aslinda, ikisi de flow hali",
    ],
    [
      "B",
      "Ne guzel bir bakis acisi Can! Dogru, ikisi de anin icinde olmayi gerektiriyor",
    ],
    ["A", "Aynen oyle. Hangi tarz yoga yapiyorsun?"],
    ["B", "Vinyasa ve Yin. Sen hangi tur jazz caliyorsun?"],
    [
      "A",
      "Daha cok modern jazz, ama bossa nova da severim. Nuri Bilge Ceylan filmi gibi bir hava",
    ],
    ["B", "Harika benzetme! Ceylan filmlerini cok severim"],
    ["A", "O zaman bir gun birlikte film izleriz, sonra muzikle karistiririz"],
    ["B", "Cok kulturel bir bulusma olur, bayilirim!"],
  ],
  // Match 3: Defne & Emre (warm and genuine)
  [
    ["A", "Merhaba Emre! Yemek yapmak hobinmis, benim de en buyuk zevkim!"],
    [
      "B",
      "Defne merhaba! Doktor adayi ve yemek tutkunu, mukemmel kombinasyon!",
    ],
    [
      "A",
      "Haha ogrencilik gunlerinde pratik yemekler ogrenmek zorunda kaldim, sonra asik oldum",
    ],
    [
      "B",
      "Ben de oyle, startup stresini mutfakta atiyorum. En sevdigin yemek ne?",
    ],
    ["A", "Ev yapimi mantisi kimse yenemez! Sen?"],
    ["B", "Bende deniz urunleri, ozellikle levrekli risotto yaparim"],
    ["A", "Imza tarifi paylasma zamani geldiginde haber ver!"],
    ["B", "Anlasildi, haftaya tarif degisimi yapalim mi?"],
    ["A", "Superr! Manti vs risotto kapismasi!"],
    ["B", "Kazanan ogun kazanan herkes! Hakem lazim ama"],
    ["A", "Hahahah hakem biz olalim, kendi yedigimizi degerlendiririz"],
    ["B", "En adil yargi! Hafta sonu olur mu?"],
  ],
  // Match 4: Selin & Kaan (artistic souls)
  [
    ["A", "Selam Kaan, fotograf sanatcisi! Portfolyonu gormek isterim"],
    ["B", "Selam Selin! Grafik tasarimci, biz ayni dili konusuyoruz sanki"],
    ["A", "Kesinlikle! Gorsel insanlarin bulus masi guzel bir sey"],
    ["B", "Aynen, bir gun birlikte sokak fotografciligi yapalim mi?"],
    ["A", "Iste bunu bekliyordum! Istanbul sokaklari harika malzeme"],
    ["B", "Balat veya Kadikoy olabilir, renkleri ve dokuyu seviyorum"],
    ["A", "Balat olsun! Renkli evler, kediler, vintage atmosfer"],
    ["B", "Harika, bu Cumartesi olur mu?"],
    ["A", "Olur! Sabah erken gidersek isik guzel olur"],
    ["B", "Altin saat fotografcisi bulduk! Saat 7de bulusuruz"],
  ],
];

// Badge awards per user (user index -> badge keys)
const USER_BADGE_AWARDS: Record<number, string[]> = {
  0: ["first_spark", "verified_star", "question_explorer"], // Elif
  1: ["first_spark", "verified_star", "explorer"], // Ahmet
  2: ["first_spark", "explorer"], // Zeynep
  3: ["first_spark", "chat_master"], // Can — NOTE: chat_master manually awarded in seed
  4: ["first_spark", "soul_mate"], // Selin
  5: ["first_spark"], // Burak
  6: ["first_spark", "verified_star", "gold_member"], // Defne
  7: ["first_spark", "verified_star", "gold_member"], // Emre
  8: ["first_spark"], // Ece
  9: ["first_spark", "soul_mate"], // Kaan
  10: ["first_spark", "verified_star", "question_explorer", "gold_member"], // Baran (SUPREME)
};

// Interest tags per user (indices into INTEREST_TAGS)
const USER_INTEREST_TAGS: string[][] = [
  ["Kitap", "Kahve", "Seyahat", "Felsefe", "Siir", "Yuzme"], // Elif
  ["Teknoloji", "Dagcilik", "Kahve", "Kosu", "Spor", "Podcast"], // Ahmet
  ["Gitar", "Muzik", "Sanat", "Resim", "Dans", "Fotograf"], // Zeynep
  ["Muzik", "Seyahat", "Kahve", "Film", "Felsefe", "Piyano"], // Can
  ["Tasarim", "Sanat", "Film", "Kahve", "Hayvan Sevgisi", "Fotograf"], // Selin
  ["Dalga Sorfu", "Spor", "Doga", "Kamp", "Yuzme", "Bisiklet"], // Burak
  ["Kitap", "Yemek Yapma", "Gonullu Calisma", "Yoga", "Bilim"], // Defne
  ["Teknoloji", "Yemek Yapma", "Seyahat", "Podcast", "Basketbol"], // Emre
  ["Yoga", "Kitap", "Siir", "Film", "Meditasyon", "Pilates"], // Ece
  ["Fotograf", "Sanat", "Film", "Seyahat", "Tasarim", "Tarih"], // Kaan
  ["Teknoloji", "Kitap", "Muzik", "Seyahat", "Kahve", "Girisimcilik"], // Baran
];

// Profile prompts per user (Hinge-style question-answer pairs)
const USER_PROFILE_PROMPTS: Array<Array<{ question: string; answer: string }>> =
  [
    // Elif
    [
      {
        question: "Beni en iyi anlatan sey",
        answer: "Elinde her zaman bir kitap ve bir fincan kahve olan biri",
      },
      {
        question: "Ideal Cumartesi",
        answer: "Sahilde yuruyus, ardinda kitapci turu ve aksamustu bir kafe",
      },
      {
        question: "Hayalim",
        answer: "Dunyayi gezip her ulkeden bir kitap toplamak",
      },
    ],
    // Ahmet
    [
      {
        question: "Beni gulduren sey",
        answer: "Kodun ilk seferde calismasi (cok nadir oluyor)",
      },
      {
        question: "Haftasonu plani",
        answer:
          "Sabah erken kalkip dag zirve tirmani, aksam aci kahve esliginde belgesel",
      },
      {
        question: "Seni etkilemek icin",
        answer:
          "Yildizlarin altinda kamp yapar ve teleskopla gokyuzunu gosteririm",
      },
    ],
    // Zeynep
    [
      {
        question: "Muzik zevkim",
        answer: "Indie rock, Turkce alternatif ve bazen gece 3te klasik muzik",
      },
      {
        question: "En sevdigim sanat",
        answer: "Soyut resimler ciziyorum, her biri bir duyguyu anlatiyor",
      },
      {
        question: "Benden bekleme",
        answer: "Plan yapmami, ben anin insaniyim!",
      },
    ],
    // Can
    [
      {
        question: "Sahne disinda ben",
        answer: "Jazz piyanistiyim ama evde sukut da bir muzikal",
      },
      {
        question: "Ruh halim",
        answer: "Bossa nova gibi: sakin, sicak ve biraz melankolik",
      },
      {
        question: "Birlikte yapalim",
        answer:
          "Plak dukkanlarinda kaybolalim, sonra bir kafede canlarin anlamini tartisalim",
      },
    ],
    // Selin
    [
      {
        question: "Beni tanimlayan renk",
        answer: "Lavanta moru — sakin gorunur ama derinligi vardir",
      },
      {
        question: "Kedilerim",
        answer: "Pamuk ve Bulut, hayatimin anlami, onlar olmadan eksigim",
      },
      {
        question: "Iyi tasarim",
        answer: "Bir logo degil, duygu aktaran gorsel bir hikaye",
      },
    ],
    // Burak
    [
      {
        question: "Gunun en iyi ani",
        answer: "Sabah 6da dalgalarin ustunde olmak, dunya henuz uyurken",
      },
      {
        question: "Motivasyonum",
        answer: "Dogayla bas basa her gun yeni bir macera",
      },
      {
        question: "Seni gotururum",
        answer: "Antalya sahilinde sorf dersi, sonra gun batiminda mangal",
      },
    ],
    // Defne
    [
      {
        question: "Neden tip",
        answer:
          "Bir cocugun gulumsemsini geri getirmek dunyanin en guzel duygusu",
      },
      {
        question: "Mutfagim",
        answer: "Anneannemden ogredigim yemekler, ozellikle ev mantisi",
      },
      {
        question: "Bende farkli olan",
        answer:
          "Sabah 5te kalkip ders calisan ama hafta sonu brunch yapmadan cikamayan biri",
      },
    ],
    // Emre
    [
      {
        question: "Startup hayati",
        answer:
          "Kaos ve yaraticilik bir arada, her gun farkli bir meydan okuma",
      },
      {
        question: "En iyi yemegim",
        answer: "Ev yapimi levrekli risotto — tarifi ozel, paylasim sartli",
      },
      {
        question: "Gelecek plani",
        answer: "Sirketimi buyutmek ama hayattan da keyif almak",
      },
    ],
    // Ece
    [
      {
        question: "Ikilemi cozme yontemi",
        answer:
          "Bir yoga seansinda veya kitap okurken cozum kendilginden gelir",
      },
      {
        question: "Favori mekanlari",
        answer: "Sessiz kafeler, antikaci dukkanlari ve sahaf",
      },
      {
        question: "Ideal partner",
        answer: "Zeki sohbet edebilen, sessizlikten rahatsiz olmayan biri",
      },
    ],
    // Kaan
    [
      {
        question: "Her kare bir hikaye",
        answer:
          "Sokak fotografciliginda insanlarin gormedigi detaylari yakalarim",
      },
      {
        question: "Perspektif",
        answer: "Herkesin gordugunun otesinde ne oldugunu merak ederim",
      },
      {
        question: "Birlikte yapilacak",
        answer: "Balaatta kaybolalim, renkli sokaklarda fotograf cekelim",
      },
    ],
    // Baran
    [
      {
        question: "Ideal hafta sonu",
        answer:
          "Sabah kitap, ogleden sonra cafe, aksam canli muzik.",
      },
      {
        question: "Hayat hedefim",
        answer: "Dunyayi degistirecek bir urun gelistirmek.",
      },
      {
        question: "Dealbreaker",
        answer: "Saygisizlik ve empati eksikligi.",
      },
    ],
  ];

// ============================================================
// MAIN SEED FUNCTION
// ============================================================

async function main(): Promise<void> {
  console.log("LUMA V1 — Seeding database...\n");

  // Phase 1: Static data (questions, badges)
  await seedCompatibilityQuestions();
  await seedBadgeDefinitions();

  // Phase 2: Demo users and relationships
  await seedDemoData();

  console.log("\nSeed complete!");
}

// ============================================================
// DEMO DATA SEEDER
// ============================================================

async function seedDemoData(): Promise<void> {
  console.log("\n--- Demo Data ---");

  // Clean existing demo data (reverse dependency order)
  console.log("Cleaning existing demo data...");
  await prisma.$transaction([
    prisma.messageReaction.deleteMany(),
    prisma.icebreakerAnswer.deleteMany(),
    prisma.icebreakerSession.deleteMany(),
    prisma.chatMessage.deleteMany(),
    prisma.dailyQuestionAnswer.deleteMany(),
    prisma.datePlan.deleteMany(),
    prisma.weeklyReport.deleteMany(),
    prisma.loginStreak.deleteMany(),
    prisma.profilePrompt.deleteMany(),
    prisma.profileBoost.deleteMany(),
    prisma.dailyPick.deleteMany(),
    prisma.feedView.deleteMany(),
    prisma.dailySwipeCount.deleteMany(),
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
    prisma.iapReceipt.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.block.deleteMany(),
    prisma.report.deleteMany(),
    prisma.placeMemory.deleteMany(),
    prisma.placeCheckIn.deleteMany(),
    prisma.discoveredPlace.deleteMany(),
    prisma.userSession.deleteMany(),
    prisma.userVerification.deleteMany(),
    prisma.userProfile.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // 1. Create users (with interest tags and profile prompts)
  const userIds = await seedDemoUsers();
  console.log(`  ${userIds.length} demo users created`);

  // 2. Create answers (core + premium)
  await seedDemoAnswers(userIds);
  console.log("  User answers seeded (20 core questions x 11 users)");

  // 2b. Create premium question answers for paid-tier users
  await seedDemoPremiumAnswers(userIds);
  console.log("  Premium answers seeded (Q21-Q45 for PREMIUM/SUPREME users)");

  // 3. Create swipes and matches
  const matchIds = await seedDemoMatches(userIds);
  console.log(`  ${matchIds.length} matches created`);

  // 3b. Create additional compatibility scores (non-matched pairs)
  await seedAdditionalCompatibilityScores(userIds);
  console.log("  Additional compatibility scores seeded");

  // 4. Create chat messages
  await seedDemoMessages(userIds, matchIds);
  console.log("  Chat messages seeded");

  // 5. Award badges
  await seedDemoBadges(userIds);
  console.log("  Badges awarded");

  // 6. Create notification preferences
  await seedDemoNotificationPrefs(userIds);
  console.log("  Notification preferences seeded");

  // 7. Create demo notifications
  await seedDemoNotifications(userIds, matchIds);
  console.log("  Demo notifications seeded");

  // 8. Create demo subscriptions for paid users
  await seedDemoSubscriptions(userIds);
  console.log("  Demo subscriptions seeded");

  // 9. Create login streaks
  await seedDemoLoginStreaks(userIds);
  console.log("  Login streaks seeded");

  // 10. Create profile prompts
  await seedDemoProfilePrompts(userIds);
  console.log("  Profile prompts seeded");

  // 11. Create demo gold transactions
  await seedDemoGoldTransactions(userIds);
  console.log("  Gold transactions seeded");

  // 12. Create demo discovered places
  await seedDemoPlaces(userIds);
  console.log("  Discovered places seeded");
}

// ============================================================
// USER SEEDER
// ============================================================

async function seedDemoUsers(): Promise<string[]> {
  const userIds: string[] = [];

  for (let i = 0; i < DEMO_USERS.length; i++) {
    const demo = DEMO_USERS[i];
    const user = await prisma.user.create({
      data: {
        phone: demo.phone,
        phoneCountryCode: demo.phoneCountryCode,
        displayId: generateDisplayId(i),
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
            interestTags: USER_INTEREST_TAGS[i] ?? [],
          },
        },
      },
    });

    // Create 3 photos per user
    const photoBaseUrl = "https://cdn.lumaapp.com/photos";
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
  // Fetch all questions (Q1-Q20) ordered by questionNumber
  const questions = await prisma.compatibilityQuestion.findMany({
    where: { questionNumber: { lte: 20 } },
    include: { options: { orderBy: { order: "asc" } } },
    orderBy: { questionNumber: "asc" },
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
// PREMIUM ANSWERS SEEDER (Q21-Q45 for PREMIUM/SUPREME users)
// ============================================================

async function seedDemoPremiumAnswers(userIds: string[]): Promise<void> {
  // Fetch all premium questions (Q21-Q45) ordered by questionNumber
  const premiumQuestions = await prisma.compatibilityQuestion.findMany({
    where: { questionNumber: { gt: 20 } },
    include: { options: { orderBy: { order: "asc" } } },
    orderBy: { questionNumber: "asc" },
  });

  if (premiumQuestions.length === 0) {
    console.log("    (no premium questions found, skipping)");
    return;
  }

  // Only seed premium answers for paid-tier users (PREMIUM, SUPREME)
  const paidTiers = new Set<PackageTier>([
    PackageTier.PREMIUM,
    PackageTier.SUPREME,
  ]);

  for (let userIdx = 0; userIdx < DEMO_USERS.length; userIdx++) {
    const demo = DEMO_USERS[userIdx];
    if (!paidTiers.has(demo.packageTier)) continue;

    const userId = userIds[userIdx];
    // Use the core answer pattern as a seed for premium answer selection
    // Rotate through the pattern to generate deterministic premium answers
    const corePattern = USER_ANSWER_PATTERNS[userIdx];

    for (let qIdx = 0; qIdx < premiumQuestions.length; qIdx++) {
      const question = premiumQuestions[qIdx];
      // Derive option index from core pattern (wrap around) + question index offset
      const patternIdx = qIdx % corePattern.length;
      const optionIdx =
        (corePattern[patternIdx] + qIdx) % question.options.length;
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
        action:
          pair.level === CompatibilityLevel.SUPER
            ? SwipeAction.SUPER_LIKE
            : SwipeAction.LIKE,
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
    const animationType =
      pair.level === CompatibilityLevel.SUPER
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
// ADDITIONAL COMPATIBILITY SCORES (non-matched pairs)
// ============================================================

async function seedAdditionalCompatibilityScores(
  userIds: string[],
): Promise<void> {
  // Pre-computed pairs that already have scores via seedDemoMatches
  const existingPairs = new Set(
    MATCH_PAIRS.map((p) => `${p.userAIdx}-${p.userBIdx}`),
  );

  // Additional cross-gender pairs for discovery feed realism
  const additionalPairs: Array<{
    aIdx: number;
    bIdx: number;
    score: number;
    level: CompatibilityLevel;
  }> = [
    { aIdx: 1, bIdx: 2, score: 68.4, level: CompatibilityLevel.NORMAL },  // Ahmet & Zeynep
    { aIdx: 3, bIdx: 0, score: 72.9, level: CompatibilityLevel.NORMAL },  // Can & Elif
    { aIdx: 5, bIdx: 4, score: 61.5, level: CompatibilityLevel.NORMAL },  // Burak & Selin
    { aIdx: 7, bIdx: 8, score: 78.6, level: CompatibilityLevel.NORMAL },  // Emre & Ece
    { aIdx: 9, bIdx: 6, score: 65.2, level: CompatibilityLevel.NORMAL },  // Kaan & Defne
    { aIdx: 10, bIdx: 0, score: 85.1, level: CompatibilityLevel.SUPER },  // Baran & Elif
    { aIdx: 10, bIdx: 4, score: 59.3, level: CompatibilityLevel.NORMAL }, // Baran & Selin
    { aIdx: 1, bIdx: 6, score: 76.0, level: CompatibilityLevel.NORMAL },  // Ahmet & Defne
  ];

  const scoresToCreate = additionalPairs.filter(
    (p) => !existingPairs.has(`${p.aIdx}-${p.bIdx}`),
  );

  for (const pair of scoresToCreate) {
    await prisma.compatibilityScore.create({
      data: {
        userAId: userIds[pair.aIdx],
        userBId: userIds[pair.bIdx],
        finalScore: pair.score,
        level: pair.level,
        dimensionScores: {
          communication: Math.round(50 + Math.random() * 40),
          values: Math.round(50 + Math.random() * 40),
          lifestyle: Math.round(45 + Math.random() * 45),
          emotional_intelligence: Math.round(50 + Math.random() * 40),
          relationship_expectations: Math.round(45 + Math.random() * 45),
          social: Math.round(50 + Math.random() * 40),
          life_goals: Math.round(45 + Math.random() * 45),
        },
      },
    });
  }
}

// ============================================================
// MESSAGES SEEDER
// ============================================================

async function seedDemoMessages(
  userIds: string[],
  matchIds: string[],
): Promise<void> {
  const now = new Date();

  for (let matchIdx = 0; matchIdx < MATCH_PAIRS.length; matchIdx++) {
    const matchId = matchIds[matchIdx];
    const pair = MATCH_PAIRS[matchIdx];
    const conversation = CHAT_CONVERSATIONS[matchIdx];

    const userAId = userIds[pair.userAIdx];
    const userBId = userIds[pair.userBIdx];

    for (let msgIdx = 0; msgIdx < conversation.length; msgIdx++) {
      const [sender, content] = conversation[msgIdx];
      const senderId = sender === "A" ? userAId : userBId;

      // Stagger messages: start from 3 days ago, each ~15-45 min apart
      const messageTime = new Date(
        now.getTime() - 3 * 24 * 60 * 60 * 1000 + msgIdx * 30 * 60 * 1000,
      );

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
  console.log("Seeding 45 compatibility questions...");

  const questions: Array<{
    questionNumber: number;
    category: string;
    weight: number;
    textEn: string;
    textTr: string;
    options: Array<{ labelEn: string; labelTr: string; value: number }>;
  }> = [
    // -- CORE QUESTIONS (Q1-Q20) --

    // Communication Style (Q1-Q3) - Weight: 1.2
    {
      questionNumber: 1,
      category: "COMMUNICATION",
      weight: 1.2,

      textEn: "What do you do during an argument?",
      textTr: "Bir tartışmada ne yaparsın?",
      options: [
        {
          labelEn: "I wait until I calm down",
          labelTr: "Sakinleşene kadar beklerim",
          value: 0.25,
        },
        {
          labelEn: "I resolve it by talking immediately",
          labelTr: "Hemen konuşarak çözerim",
          value: 0.75,
        },
        {
          labelEn: "I express myself in writing",
          labelTr: "Yazarak ifade ederim",
          value: 0.5,
        },
        {
          labelEn: "I listen to the other person",
          labelTr: "Karşımdakini dinlerim",
          value: 1.0,
        },
      ],
    },
    {
      questionNumber: 2,
      category: "COMMUNICATION",
      weight: 1.2,

      textEn: "How do you express your feelings?",
      textTr: "Duygularını nasıl ifade edersin?",
      options: [
        {
          labelEn: "With words, openly",
          labelTr: "Sözlerle, açıkça",
          value: 1.0,
        },
        {
          labelEn: "I show through my actions",
          labelTr: "Davranışlarımla gösteririm",
          value: 0.75,
        },
        {
          labelEn: "I struggle but I try",
          labelTr: "Zor ifade ederim ama denerim",
          value: 0.5,
        },
        {
          labelEn: "I express better in writing",
          labelTr: "Yazarak daha iyi anlatırım",
          value: 0.25,
        },
      ],
    },
    {
      questionNumber: 3,
      category: "COMMUNICATION",
      weight: 1.2,

      textEn: "What does an ideal evening conversation look like?",
      textTr: "İdeal bir akşam sohbeti nasıl olur?",
      options: [
        {
          labelEn: "Deep, philosophical topics",
          labelTr: "Derin, felsefi konular",
          value: 1.0,
        },
        {
          labelEn: "Casual, relaxed chat",
          labelTr: "Günlük, rahat sohbet",
          value: 0.5,
        },
        {
          labelEn: "While doing something together",
          labelTr: "Birlikte bir şey yaparken",
          value: 0.75,
        },
        {
          labelEn: "Silence is fine too",
          labelTr: "Sessizlik de güzeldir",
          value: 0.25,
        },
      ],
    },

    // Life Goals (Q4-Q6) - Weight: 1.2
    {
      questionNumber: 4,
      category: "LIFE_GOALS",
      weight: 1.2,

      textEn: "Where do you see yourself in 5 years?",
      textTr: "5 yıl sonra kendini nerede görüyorsun?",
      options: [
        {
          labelEn: "Near the top of my career",
          labelTr: "Kariyerimde zirveye yakın",
          value: 1.0,
        },
        {
          labelEn: "In a peaceful family life",
          labelTr: "Huzurlu bir aile hayatında",
          value: 0.75,
        },
        {
          labelEn: "Exploring the world",
          labelTr: "Dünyayı keşfederken",
          value: 0.5,
        },
        {
          labelEn: "Life is full of surprises, I don't plan",
          labelTr: "Hayat sürprizlerle dolu, planlamam",
          value: 0.25,
        },
      ],
    },
    {
      questionNumber: 5,
      category: "LIFE_GOALS",
      weight: 1.2,

      textEn: "How should work-life balance be?",
      textTr: "İş-yaşam dengesi sence nasıl olmalı?",
      options: [
        {
          labelEn: "Work first, then rest",
          labelTr: "İş öncelikli, sonra dinlenme",
          value: 0.25,
        },
        {
          labelEn: "Equal balance is essential",
          labelTr: "Eşit denge şart",
          value: 1.0,
        },
        {
          labelEn: "Life first, work is a tool",
          labelTr: "Yaşam öncelikli, iş araç",
          value: 0.75,
        },
        {
          labelEn: "It depends on the situation",
          labelTr: "Duruma göre değişir",
          value: 0.5,
        },
      ],
    },
    {
      questionNumber: 6,
      category: "LIFE_GOALS",
      weight: 1.2,

      textEn: "What is your approach to money?",
      textTr: "Para konusundaki yaklaşımınız?",
      options: [
        {
          labelEn: "I like saving, it makes me feel secure",
          labelTr: "Biriktirmeyi severim, güvende hissederim",
          value: 0.25,
        },
        {
          labelEn: "I spend on experiences, memories matter",
          labelTr: "Deneyimlere harcarım, anılar önemli",
          value: 0.75,
        },
        {
          labelEn: "I have a balanced approach",
          labelTr: "Dengeli bir yaklaşımım var",
          value: 1.0,
        },
        {
          labelEn: "I don't think about it much",
          labelTr: "Çok düşünmem, akar gider",
          value: 0.5,
        },
      ],
    },

    // Values & Beliefs (Q7-Q9) - Weight: 1.5
    {
      questionNumber: 7,
      category: "VALUES",
      weight: 1.5,

      textEn: "What is the most important value in a relationship?",
      textTr: "Bir ilişkide en önemli değer?",
      options: [
        {
          labelEn: "Trust and loyalty",
          labelTr: "Güven ve sadakat",
          value: 1.0,
        },
        {
          labelEn: "Freedom and respect",
          labelTr: "Özgürlük ve saygı",
          value: 0.75,
        },
        {
          labelEn: "Passion and excitement",
          labelTr: "Tutku ve heyecan",
          value: 0.5,
        },
        {
          labelEn: "Understanding and patience",
          labelTr: "Anlayış ve sabır",
          value: 0.85,
        },
      ],
    },
    {
      questionNumber: 8,
      category: "VALUES",
      weight: 1.5,

      textEn: "How do you approach different opinions?",
      textTr: "Farklı görüşlere nasıl yaklaşırsın?",
      options: [
        {
          labelEn: "I listen and try to understand",
          labelTr: "Dinlerim ve anlamaya çalışırım",
          value: 1.0,
        },
        {
          labelEn: "I defend my own view",
          labelTr: "Kendi görüşümü savunurum",
          value: 0.25,
        },
        {
          labelEn: "I look for common ground",
          labelTr: "Ortak nokta ararim",
          value: 0.75,
        },
        {
          labelEn: "I change the subject",
          labelTr: "Konuyu değiştiririm",
          value: 0.5,
        },
      ],
    },
    {
      questionNumber: 9,
      category: "VALUES",
      weight: 1.5,

      textEn: "What does family mean to you?",
      textTr: "Aile sence ne ifade ediyor?",
      options: [
        {
          labelEn: "The foundation of everything",
          labelTr: "Her şeyin temeli",
          value: 1.0,
        },
        {
          labelEn: "Important but independence is essential too",
          labelTr: "Önemli ama bağımsızlık da şart",
          value: 0.75,
        },
        {
          labelEn: "We build our own family",
          labelTr: "Kendi ailemizi kurarız",
          value: 0.5,
        },
        {
          labelEn: "Extended family included, big picture",
          labelTr: "Geniş aile de dahil, büyük tablo",
          value: 0.85,
        },
      ],
    },

    // Lifestyle (Q10-Q12) - Weight: 1.0
    {
      questionNumber: 10,
      category: "LIFESTYLE",
      weight: 1.0,

      textEn: "Your ideal weekend?",
      textTr: "İdeal hafta sonun?",
      options: [
        {
          labelEn: "Social, out with friends",
          labelTr: "Sosyal, arkadaşlarla dışarıda",
          value: 1.0,
        },
        {
          labelEn: "At home, books and movies",
          labelTr: "Evde, kitap ve film",
          value: 0.25,
        },
        { labelEn: "In nature, active", labelTr: "Doğada, aktif", value: 0.75 },
        {
          labelEn: "Spontaneous, unplanned",
          labelTr: "Spontane, plansız",
          value: 0.5,
        },
      ],
    },
    {
      questionNumber: 11,
      category: "LIFESTYLE",
      weight: 1.0,

      textEn: "How about health and fitness?",
      textTr: "Sağlık ve fitness konusunda?",
      options: [
        {
          labelEn: "I exercise regularly",
          labelTr: "Düzenli spor yaparım",
          value: 1.0,
        },
        {
          labelEn: "I move occasionally",
          labelTr: "Ara sıra hareket ederim",
          value: 0.5,
        },
        {
          labelEn: "Food is more important",
          labelTr: "Yemek daha önemli",
          value: 0.25,
        },
        {
          labelEn: "Mental health is my priority",
          labelTr: "Ruhsal sağlık önceliğim",
          value: 0.75,
        },
      ],
    },
    {
      questionNumber: 12,
      category: "LIFESTYLE",
      weight: 1.0,

      textEn: "Your social media usage?",
      textTr: "Sosyal medya kullanımının?",
      options: [
        {
          labelEn: "I actively share",
          labelTr: "Aktif paylaşırım",
          value: 1.0,
        },
        {
          labelEn: "I follow but rarely share",
          labelTr: "Takip ederim ama az paylaşırım",
          value: 0.75,
        },
        {
          labelEn: "I barely use it",
          labelTr: "Çok az kullanırım",
          value: 0.5,
        },
        {
          labelEn: "I don't use it at all",
          labelTr: "Hiç kullanmam",
          value: 0.25,
        },
      ],
    },

    // Emotional Intelligence (Q13-Q15) - Weight: 1.2
    {
      questionNumber: 13,
      category: "EMOTIONAL_INTELLIGENCE",
      weight: 1.2,

      textEn: "What do you do when you have a tough day?",
      textTr: "Zor bir gün geçirdiğinde ne yaparsın?",
      options: [
        {
          labelEn: "I talk to someone",
          labelTr: "Birileriyle konuşurum",
          value: 1.0,
        },
        {
          labelEn: "I want to be alone",
          labelTr: "Yalnız kalmak isterim",
          value: 0.25,
        },
        {
          labelEn: "I distract myself with an activity",
          labelTr: "Bir aktiviteyle dağıtırım",
          value: 0.75,
        },
        {
          labelEn: "I sleep, tomorrow is a new day",
          labelTr: "Uyurum, yarın yeni gün",
          value: 0.5,
        },
      ],
    },
    {
      questionNumber: 14,
      category: "EMOTIONAL_INTELLIGENCE",
      weight: 1.2,

      textEn: "When you notice your partner is sad?",
      textTr: "Partnerinin üzgün olduğunu fark ettiğinde?",
      options: [
        {
          labelEn: "I immediately ask and listen",
          labelTr: "Hemen sorarım ve dinlerim",
          value: 1.0,
        },
        {
          labelEn: "I stay beside them, wait for them to talk",
          labelTr: "Yanında olurum, konuşmasını beklerim",
          value: 0.75,
        },
        {
          labelEn: "I try to cheer them up",
          labelTr: "Onu neşlendirmeye çalışırım",
          value: 0.5,
        },
        {
          labelEn: "I give them space",
          labelTr: "Kendi alanını veririm",
          value: 0.25,
        },
      ],
    },
    {
      questionNumber: 15,
      category: "EMOTIONAL_INTELLIGENCE",
      weight: 1.2,

      textEn: "What do you think about vulnerability?",
      textTr: "Kırılganlık hakkında ne düşünüyorsun?",
      options: [
        {
          labelEn: "It's a sign of strength",
          labelTr: "Güçlülük işareti",
          value: 1.0,
        },
        {
          labelEn: "Difficult but necessary",
          labelTr: "Zor ama gerekli",
          value: 0.75,
        },
        {
          labelEn: "Only with someone I trust",
          labelTr: "Sadece güvendiğim biriyle",
          value: 0.5,
        },
        {
          labelEn: "I'm not very comfortable with it",
          labelTr: "Çok rahat değilim",
          value: 0.25,
        },
      ],
    },

    // Relationship Expectations (Q16-Q18) - Weight: 1.5
    {
      questionNumber: 16,
      category: "RELATIONSHIP_EXPECTATIONS",
      weight: 1.5,

      textEn: "How much time together in a relationship?",
      textTr: "İlişkide ne kadar birlikte zaman?",
      options: [
        {
          labelEn: "As much as possible",
          labelTr: "Mümkün olduğunca çok",
          value: 1.0,
        },
        {
          labelEn: "Balanced, everyone needs their own time",
          labelTr: "Dengeli, herkesin kendi zamanı da olmalı",
          value: 0.75,
        },
        {
          labelEn: "Quality matters, not quantity",
          labelTr: "Kalite önemli, miktar değil",
          value: 0.5,
        },
        {
          labelEn: "Independence is very important",
          labelTr: "Bağımsızlık çok önemli",
          value: 0.25,
        },
      ],
    },
    {
      questionNumber: 17,
      category: "RELATIONSHIP_EXPECTATIONS",
      weight: 1.5,

      textEn: "Physical closeness for you?",
      textTr: "Fiziksel yakınlık sence?",
      options: [
        {
          labelEn: "Very important, every day",
          labelTr: "Çok önemli, her gün",
          value: 1.0,
        },
        {
          labelEn: "Important but not excessive",
          labelTr: "Önemli ama abartısız",
          value: 0.75,
        },
        {
          labelEn: "Emotional closeness matters more",
          labelTr: "Duygusal yakınlık daha önemli",
          value: 0.5,
        },
        {
          labelEn: "It develops over time",
          labelTr: "Zamanla gelişir",
          value: 0.25,
        },
      ],
    },
    {
      questionNumber: 18,
      category: "RELATIONSHIP_EXPECTATIONS",
      weight: 1.5,

      textEn: "Which is your love language?",
      textTr: "Aşk dili hangisi?",
      options: [
        {
          labelEn: "Words and compliments",
          labelTr: "Sözler ve iltifatlar",
          value: 1.0,
        },
        {
          labelEn: "Touch and hugs",
          labelTr: "Dokunma ve sarılma",
          value: 0.75,
        },
        {
          labelEn: "Spending quality time together",
          labelTr: "Birlikte vakit geçirme",
          value: 0.5,
        },
        {
          labelEn: "Gifts and surprises",
          labelTr: "Hediyeler ve sürprizler",
          value: 0.25,
        },
      ],
    },

    // Social Compatibility (Q19-Q20) - Weight: 1.0
    {
      questionNumber: 19,
      category: "SOCIAL_COMPATIBILITY",
      weight: 1.0,

      textEn: "Your partner's friend circle?",
      textTr: "Partnerinin arkadaş çevresi?",
      options: [
        {
          labelEn: "They should be my friends too",
          labelTr: "Benim de arkadaşlarım olsun",
          value: 1.0,
        },
        {
          labelEn: "Separate circles are healthy",
          labelTr: "Ayrı çevreler sağlıklı",
          value: 0.5,
        },
        {
          labelEn: "They blend over time",
          labelTr: "Zamanla kaynaşır",
          value: 0.75,
        },
        {
          labelEn: "It's not very important",
          labelTr: "Çok önemli değil",
          value: 0.25,
        },
      ],
    },
    {
      questionNumber: 20,
      category: "SOCIAL_COMPATIBILITY",
      weight: 1.0,

      textEn: "What kind of person are you in a group?",
      textTr: "Topluluk içinde nasıl birisin?",
      options: [
        {
          labelEn: "Energetic, social butterfly",
          labelTr: "Enerjik, sosyal kelebek",
          value: 1.0,
        },
        {
          labelEn: "I prefer small groups",
          labelTr: "Küçük grupları severim",
          value: 0.75,
        },
        {
          labelEn: "A few close friends is enough",
          labelTr: "Birkaç yakın arkadaş yeter",
          value: 0.5,
        },
        {
          labelEn: "I'm introverted but warm",
          labelTr: "İçedönüğüm ama sıcakkanlıyım",
          value: 0.25,
        },
      ],
    },

    // -- PREMIUM QUESTIONS (Q21-Q45) --

    // Attachment Style (Q21-Q24) - Weight: 1.5
    {
      questionNumber: 21,
      category: "ATTACHMENT_STYLE",
      weight: 1.5,

      textEn: "When your partner doesn't respond for hours, what do you feel?",
      textTr: "Partnerin saatlerce cevap vermezse ne hissedersin?",
      options: [
        {
          labelEn: "I trust them, they must be busy",
          labelTr: "Güvenirim, meşguldür",
          value: 1.0,
        },
        {
          labelEn: "I get a little anxious",
          labelTr: "Biraz endişelenirim",
          value: 0.5,
        },
        {
          labelEn: "I enjoy the space",
          labelTr: "Kendi alanımın tadını çıkarırım",
          value: 0.75,
        },
        {
          labelEn: "I start overthinking",
          labelTr: "Kafamda senaryolar kurarım",
          value: 0.25,
        },
      ],
    },
    {
      questionNumber: 22,
      category: "ATTACHMENT_STYLE",
      weight: 1.5,

      textEn: "How fast do you get emotionally attached?",
      textTr: "Duygusal olarak ne kadar hızlı bağlanırsın?",
      options: [
        {
          labelEn: "Slowly, I need time",
          labelTr: "Yavaş, zamana ihtiyacım var",
          value: 0.75,
        },
        {
          labelEn: "I feel things quickly",
          labelTr: "Hızlı hissederim",
          value: 0.5,
        },
        {
          labelEn: "Depends on the connection",
          labelTr: "Bağlantıya bağlı",
          value: 1.0,
        },
        {
          labelEn: "I keep my guard up",
          labelTr: "Duvarlarımı yüksek tutarım",
          value: 0.25,
        },
      ],
    },
    {
      questionNumber: 23,
      category: "ATTACHMENT_STYLE",
      weight: 1.5,

      textEn: "After a breakup, how do you cope?",
      textTr: "Bir ayrılıktan sonra nasıl başa çıkarsın?",
      options: [
        {
          labelEn: "I process and heal gradually",
          labelTr: "Zamanla işler ve iyileşirim",
          value: 1.0,
        },
        {
          labelEn: "I keep myself busy",
          labelTr: "Kendimi meşgul ederim",
          value: 0.5,
        },
        {
          labelEn: "I lean on friends for support",
          labelTr: "Arkadaşlarımdan destek alırım",
          value: 0.75,
        },
        {
          labelEn: "I move on quickly",
          labelTr: "Hızlıca geçerim",
          value: 0.25,
        },
      ],
    },
    {
      questionNumber: 24,
      category: "ATTACHMENT_STYLE",
      weight: 1.5,

      textEn: "What makes you feel most secure in a relationship?",
      textTr: "İlişkide seni en çok ne güvende hissettirir?",
      options: [
        {
          labelEn: "Consistent actions, not just words",
          labelTr: "Sadece sözler değil, tutarlı davranışlar",
          value: 1.0,
        },
        {
          labelEn: "Regular communication",
          labelTr: "Düzenli iletişim",
          value: 0.75,
        },
        {
          labelEn: "Knowing they choose me every day",
          labelTr: "Her gün beni seçtiğini bilmek",
          value: 0.5,
        },
        {
          labelEn: "Giving each other freedom",
          labelTr: "Birbirimize özgürlük tanımak",
          value: 0.25,
        },
      ],
    },

    // Love Language (Q25-Q27) - Weight: 1.2
    {
      questionNumber: 25,
      category: "LOVE_LANGUAGE",
      weight: 1.2,

      textEn: "How do you most like to receive love?",
      textTr: "Sevgiyi en çok nasıl almak istersin?",
      options: [
        {
          labelEn: 'Hearing "I love you" and affirmations',
          labelTr: '"Seni seviyorum" duymak ve onaylanmak',
          value: 1.0,
        },
        {
          labelEn: "Physical touch and closeness",
          labelTr: "Fiziksel dokunuş ve yakınlık",
          value: 0.75,
        },
        {
          labelEn: "Undivided attention and quality time",
          labelTr: "Tam ilgi ve kaliteli vakit",
          value: 0.5,
        },
        {
          labelEn: "Thoughtful gestures and acts of service",
          labelTr: "Düşünceli hareketler ve yardımlar",
          value: 0.25,
        },
      ],
    },
    {
      questionNumber: 26,
      category: "LOVE_LANGUAGE",
      weight: 1.2,

      textEn: "You want to show love to your partner. What do you do?",
      textTr: "Partnerine sevgini göstermek istiyorsun. Ne yaparsın?",
      options: [
        {
          labelEn: "Write a heartfelt message",
          labelTr: "İçten bir mesaj yazarım",
          value: 1.0,
        },
        {
          labelEn: "Plan a surprise date",
          labelTr: "Sürpriz bir buluşma planlarım",
          value: 0.75,
        },
        {
          labelEn: "Cook their favorite meal",
          labelTr: "En sevdiği yemeği pişiririm",
          value: 0.5,
        },
        {
          labelEn: "Just hold them close",
          labelTr: "Sadece sarılırım",
          value: 0.25,
        },
      ],
    },
    {
      questionNumber: 27,
      category: "LOVE_LANGUAGE",
      weight: 1.2,

      textEn: "What makes you feel most appreciated?",
      textTr: "Seni en çok ne takdir edilmiş hissettirir?",
      options: [
        {
          labelEn: "Verbal recognition and praise",
          labelTr: "Sözlü takdir ve övgü",
          value: 1.0,
        },
        {
          labelEn: "Someone remembering small details",
          labelTr: "Birinin küçük detayları hatırlaması",
          value: 0.75,
        },
        {
          labelEn: "Someone making time for me",
          labelTr: "Birinin bana zaman ayırması",
          value: 0.5,
        },
        {
          labelEn: "Receiving a meaningful gift",
          labelTr: "Anlamlı bir hediye almak",
          value: 0.25,
        },
      ],
    },

    // Conflict Style (Q28-Q30) - Weight: 1.5
    {
      questionNumber: 28,
      category: "CONFLICT_STYLE",
      weight: 1.5,

      textEn: "During a conflict with your partner, you typically...",
      textTr: "Partnerinle bir çatışmada genellikle...",
      options: [
        {
          labelEn: "Stay calm and discuss rationally",
          labelTr: "Sakin kalır ve mantıklı tartışırım",
          value: 1.0,
        },
        {
          labelEn: "Get emotional and need time",
          labelTr: "Duygusallaşırım ve zamana ihtiyaç duyarım",
          value: 0.5,
        },
        {
          labelEn: "Compromise to keep the peace",
          labelTr: "Barış için uzlaşırım",
          value: 0.75,
        },
        {
          labelEn: "Avoid the conflict altogether",
          labelTr: "Çatışmadan tamamen kaçarım",
          value: 0.25,
        },
      ],
    },
    {
      questionNumber: 29,
      category: "CONFLICT_STYLE",
      weight: 1.5,

      textEn: "After a fight, how do you reconcile?",
      textTr: "Bir kavgadan sonra nasıl barışırsın?",
      options: [
        {
          labelEn: "I initiate a calm conversation",
          labelTr: "Sakin bir konuşma başlatırım",
          value: 1.0,
        },
        {
          labelEn: "I show affection without words",
          labelTr: "Sözsüz sevgi gösteririm",
          value: 0.75,
        },
        {
          labelEn: "I wait for the other person to reach out",
          labelTr: "Karşı tarafın gelmesini beklerim",
          value: 0.25,
        },
        {
          labelEn: "I act like nothing happened",
          labelTr: "Hiçbir şey olmamış gibi davranırım",
          value: 0.5,
        },
      ],
    },
    {
      questionNumber: 30,
      category: "CONFLICT_STYLE",
      weight: 1.5,

      textEn: "What is your biggest relationship deal-breaker?",
      textTr: "İlişkide en büyük kırmızı çizgin ne?",
      options: [
        {
          labelEn: "Dishonesty and betrayal of trust",
          labelTr: "Dürüst olmamak ve güven ihaneti",
          value: 1.0,
        },
        { labelEn: "Lack of respect", labelTr: "Saygısızlık", value: 0.75 },
        {
          labelEn: "Emotional unavailability",
          labelTr: "Duygusal uzaklık",
          value: 0.5,
        },
        {
          labelEn: "Controlling behavior",
          labelTr: "Kontrol edici davranış",
          value: 0.25,
        },
      ],
    },

    // Future Vision (Q31-Q34) - Weight: 1.5
    {
      questionNumber: 31,
      category: "FUTURE_VISION",
      weight: 1.5,

      textEn: "Do you want children?",
      textTr: "Çocuk istiyor musun?",
      options: [
        { labelEn: "Yes, definitely", labelTr: "Evet, kesinlikle", value: 1.0 },
        {
          labelEn: "Maybe, in the future",
          labelTr: "Belki, ileride",
          value: 0.75,
        },
        { labelEn: "I'm not sure", labelTr: "Emin değilim", value: 0.5 },
        {
          labelEn: "No, I don't want children",
          labelTr: "Hayır, çocuk istemiyorum",
          value: 0.25,
        },
      ],
    },
    {
      questionNumber: 32,
      category: "FUTURE_VISION",
      weight: 1.5,

      textEn: "Where would you ideally live?",
      textTr: "İdeal olarak nerede yaşamak istersin?",
      options: [
        {
          labelEn: "In a big city, full of energy",
          labelTr: "Büyük şehirde, enerji dolu",
          value: 1.0,
        },
        {
          labelEn: "Suburbs, peaceful but connected",
          labelTr: "Banliyöde, huzurlu ama bağlantılı",
          value: 0.75,
        },
        {
          labelEn: "Countryside, close to nature",
          labelTr: "Kırsal, doğaya yakın",
          value: 0.5,
        },
        {
          labelEn: "Anywhere, I'm flexible",
          labelTr: "Her yerde, esneyim",
          value: 0.25,
        },
      ],
    },
    {
      questionNumber: 33,
      category: "FUTURE_VISION",
      weight: 1.5,

      textEn: "Describe your ideal life in 10 years.",
      textTr: "10 yıl sonra ideal hayatını anlat.",
      options: [
        {
          labelEn: "Stable career, family, home",
          labelTr: "İstikrarlı kariyer, aile, yuva",
          value: 1.0,
        },
        {
          labelEn: "Traveling and experiencing the world",
          labelTr: "Dünyayı gezip deneyimlemek",
          value: 0.5,
        },
        {
          labelEn: "Running my own business",
          labelTr: "Kendi işimi yürütmek",
          value: 0.75,
        },
        {
          labelEn: "Living simply, focusing on happiness",
          labelTr: "Sade yaşamak, mutluluğa odaklanmak",
          value: 0.25,
        },
      ],
    },
    {
      questionNumber: 34,
      category: "FUTURE_VISION",
      weight: 1.5,

      textEn: "How important is financial stability before marriage?",
      textTr: "Evlilik öncesi finansal güvence ne kadar önemli?",
      options: [
        {
          labelEn: "Very important, foundation first",
          labelTr: "Çok önemli, önce temel",
          value: 1.0,
        },
        {
          labelEn: "Important but love comes first",
          labelTr: "Önemli ama sevgi önce gelir",
          value: 0.75,
        },
        {
          labelEn: "We can build it together",
          labelTr: "Birlikte inşa ederiz",
          value: 0.5,
        },
        {
          labelEn: "Money shouldn't dictate love",
          labelTr: "Para aşka yön vermemeli",
          value: 0.25,
        },
      ],
    },

    // Intellectual Compatibility (Q35-Q37) - Weight: 1.0
    {
      questionNumber: 35,
      category: "INTELLECTUAL",
      weight: 1.0,

      textEn: "How curious are you about learning new things?",
      textTr: "Yeni şeyler öğrenmeye ne kadar meraklısın?",
      options: [
        {
          labelEn: "Extremely, I'm always learning",
          labelTr: "Son derece, sürekli öğrenirim",
          value: 1.0,
        },
        {
          labelEn: "When a topic interests me",
          labelTr: "İlgimi çeken konularda",
          value: 0.75,
        },
        {
          labelEn: "Occasionally, when needed",
          labelTr: "Ara sıra, gerektiğinde",
          value: 0.5,
        },
        {
          labelEn: "I prefer comfort in what I know",
          labelTr: "Bildiklerimde rahat ederim",
          value: 0.25,
        },
      ],
    },
    {
      questionNumber: 36,
      category: "INTELLECTUAL",
      weight: 1.0,

      textEn: "Do you enjoy intellectual debates?",
      textTr: "Entelektüel tartışmalardan hoşlanır mısın?",
      options: [
        {
          labelEn: "Love them, they energize me",
          labelTr: "Severim, bana enerji verir",
          value: 1.0,
        },
        {
          labelEn: "Sometimes, with the right person",
          labelTr: "Bazen, doğru insanla",
          value: 0.75,
        },
        {
          labelEn: "I prefer lighter conversations",
          labelTr: "Daha hafif sohbetleri tercih ederim",
          value: 0.5,
        },
        {
          labelEn: "I avoid debates",
          labelTr: "Tartışmalardan kaçarım",
          value: 0.25,
        },
      ],
    },
    {
      questionNumber: 37,
      category: "INTELLECTUAL",
      weight: 1.0,

      textEn: "How do you prefer to learn?",
      textTr: "Nasıl öğrenmeyi tercih edersin?",
      options: [
        {
          labelEn: "Reading books and articles",
          labelTr: "Kitap ve makale okuyarak",
          value: 1.0,
        },
        {
          labelEn: "Watching documentaries and videos",
          labelTr: "Belgesel ve video izleyerek",
          value: 0.75,
        },
        {
          labelEn: "Through experience and practice",
          labelTr: "Deneyim ve pratikle",
          value: 0.5,
        },
        {
          labelEn: "Through conversations with others",
          labelTr: "Başkalarıyla sohbetle",
          value: 0.25,
        },
      ],
    },

    // Intimacy Profile (Q38-Q40) - Weight: 1.2
    {
      questionNumber: 38,
      category: "INTIMACY",
      weight: 1.2,

      textEn: "How comfortable are you with emotional intimacy?",
      textTr: "Duygusal yakınlık konusunda ne kadar rahatsın?",
      options: [
        {
          labelEn: "Very comfortable, I open up easily",
          labelTr: "Çok rahat, kolayca açılırım",
          value: 1.0,
        },
        {
          labelEn: "Comfortable once trust is built",
          labelTr: "Güven oluşunca rahat",
          value: 0.75,
        },
        {
          labelEn: "It takes me a long time",
          labelTr: "Uzun zaman alır",
          value: 0.5,
        },
        {
          labelEn: "I keep emotional distance",
          labelTr: "Duygusal mesafe korurum",
          value: 0.25,
        },
      ],
    },
    {
      questionNumber: 39,
      category: "INTIMACY",
      weight: 1.2,

      textEn: "How important is physical intimacy in a relationship?",
      textTr: "İlişkide fiziksel yakınlık ne kadar önemli?",
      options: [
        {
          labelEn: "Essential, a core part of connection",
          labelTr: "Temel, bağlantının özü",
          value: 1.0,
        },
        {
          labelEn: "Important but not everything",
          labelTr: "Önemli ama her şey değil",
          value: 0.75,
        },
        {
          labelEn: "Emotional bond matters more",
          labelTr: "Duygusal bağ daha önemli",
          value: 0.5,
        },
        {
          labelEn: "It develops naturally over time",
          labelTr: "Zamanla doğal olarak gelişir",
          value: 0.25,
        },
      ],
    },
    {
      questionNumber: 40,
      category: "INTIMACY",
      weight: 1.2,

      textEn: "How quickly do you share your deepest secrets?",
      textTr: "En derin sırlarını ne kadar hızlı paylaşırsın?",
      options: [
        {
          labelEn: "When I feel a genuine connection",
          labelTr: "Gerçek bir bağ hissettiğimde",
          value: 1.0,
        },
        {
          labelEn: "After months of building trust",
          labelTr: "Aylarca güven inşa ettikten sonra",
          value: 0.75,
        },
        {
          labelEn: "Only with very close people",
          labelTr: "Sadece çok yakın insanlarla",
          value: 0.5,
        },
        {
          labelEn: "I rarely share them",
          labelTr: "Nadiren paylaşırım",
          value: 0.25,
        },
      ],
    },

    // Growth Mindset (Q41-Q43) - Weight: 1.0
    {
      questionNumber: 41,
      category: "GROWTH_MINDSET",
      weight: 1.0,

      textEn: "How do you handle constructive criticism?",
      textTr: "Yapıcı eleştiriyi nasıl karşılarsın?",
      options: [
        {
          labelEn: "I welcome it, it helps me grow",
          labelTr: "Hoş karşılarım, büyümeme yardımcı olur",
          value: 1.0,
        },
        {
          labelEn: "I try to accept it, though it stings",
          labelTr: "Kabul etmeye çalışırım, acısa da",
          value: 0.75,
        },
        {
          labelEn: "Depends on who it comes from",
          labelTr: "Kimden geldiğine bağlı",
          value: 0.5,
        },
        {
          labelEn: "I tend to get defensive",
          labelTr: "Savunmaya geçerim",
          value: 0.25,
        },
      ],
    },
    {
      questionNumber: 42,
      category: "GROWTH_MINDSET",
      weight: 1.0,

      textEn: "When faced with a big change in life, you...",
      textTr: "Hayatında büyük bir değişiklikle karşılaştığında...",
      options: [
        {
          labelEn: "Embrace it as an opportunity",
          labelTr: "Bir fırsat olarak kucaklarım",
          value: 1.0,
        },
        {
          labelEn: "Adapt gradually",
          labelTr: "Yavaş yavaş uyum sağlarım",
          value: 0.75,
        },
        {
          labelEn: "Feel anxious but push through",
          labelTr: "Endişelenirim ama üstesinden gelirim",
          value: 0.5,
        },
        {
          labelEn: "Resist change, prefer stability",
          labelTr: "Değişime direnç gösteririm, istikrar isterim",
          value: 0.25,
        },
      ],
    },
    {
      questionNumber: 43,
      category: "GROWTH_MINDSET",
      weight: 1.0,

      textEn: "Do you believe people can fundamentally change?",
      textTr: "İnsanların temelden değişebileceğine inanıyor musun?",
      options: [
        {
          labelEn: "Yes, with effort and willingness",
          labelTr: "Evet, çaba ve istekle",
          value: 1.0,
        },
        {
          labelEn: "Somewhat, but core traits remain",
          labelTr: "Kısmen, ama temel özellikler kalır",
          value: 0.75,
        },
        {
          labelEn: "Small changes are possible",
          labelTr: "Küçük değişiklikler mümkün",
          value: 0.5,
        },
        {
          labelEn: "People don't really change",
          labelTr: "İnsanlar gerçekten değişmez",
          value: 0.25,
        },
      ],
    },

    // Core Fears (Q44-Q45) - Weight: 1.5
    {
      questionNumber: 44,
      category: "CORE_FEARS",
      weight: 1.5,

      textEn: "What is your biggest fear in a relationship?",
      textTr: "İlişkide en büyük korkun ne?",
      options: [
        {
          labelEn: "Being betrayed or cheated on",
          labelTr: "Aldatılmak veya ihanete uğramak",
          value: 1.0,
        },
        {
          labelEn: "Losing my independence",
          labelTr: "Bağımsızlığımı kaybetmek",
          value: 0.5,
        },
        {
          labelEn: "Not being truly loved",
          labelTr: "Gerçekten sevilmemek",
          value: 0.75,
        },
        {
          labelEn: "Growing apart over time",
          labelTr: "Zamanla birbirinden uzaklaşmak",
          value: 0.25,
        },
      ],
    },
    {
      questionNumber: 45,
      category: "CORE_FEARS",
      weight: 1.5,

      textEn: "What would make you end a relationship?",
      textTr: "Seni bir ilişkiyi bitirmeye ne iter?",
      options: [
        {
          labelEn: "Repeated lying",
          labelTr: "Tekrarlayan yalanlar",
          value: 1.0,
        },
        {
          labelEn: "Feeling unappreciated",
          labelTr: "Takdir edilmemek",
          value: 0.75,
        },
        {
          labelEn: "Growing in different directions",
          labelTr: "Farklı yönlere büyümek",
          value: 0.5,
        },
        {
          labelEn: "Lack of effort from the other side",
          labelTr: "Karşı tarafın çaba göstermemesi",
          value: 0.25,
        },
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
// BADGE DEFINITIONS
// ============================================================
async function seedBadgeDefinitions(): Promise<void> {
  console.log("Seeding badge definitions...");

  const badges = [
    {
      key: "first_spark",
      nameEn: "First Spark",
      nameTr: "İlk Kıvılcım",
      descriptionEn: "Celebrate your first match!",
      descriptionTr: "İlk eşleşmeni kutla!",
      criteria: { type: "match_count", count: 1 },
      goldReward: 5,
    },
    {
      key: "chat_master",
      nameEn: "Chat Master",
      nameTr: "Sohbet Ustası",
      descriptionEn: "Send 50 chat messages!",
      descriptionTr: "50 sohbet mesajı gönderdin!",
      criteria: { type: "chat_message_count", count: 50 },
      goldReward: 10,
    },
    {
      key: "question_explorer",
      nameEn: "Question Explorer",
      nameTr: "Merak Uzmanı",
      descriptionEn: "Answer all core compatibility questions!",
      descriptionTr: "Tüm temel uyumluluk sorularını yanıtladın!",
      criteria: { type: "answer_count", count: 20 },
      goldReward: 10,
    },
    {
      key: "soul_mate",
      nameEn: "Soul Mate",
      nameTr: "Ruh İkizi",
      descriptionEn: "Found a Super Compatibility match!",
      descriptionTr: "Süper uyumluluk buldun!",
      criteria: { type: "super_compatibility_match", count: 1 },
      goldReward: 15,
    },
    {
      key: "verified_star",
      nameEn: "Verified Star",
      nameTr: "Doğrulanmış Yıldız",
      descriptionEn: "Your selfie is verified!",
      descriptionTr: "Selfie doğrulaman tamamlandı!",
      criteria: { type: "selfie_verification", count: 1 },
      goldReward: 5,
    },
    {
      key: "couple_goal",
      nameEn: "Couple Goal",
      nameTr: "Çift Hedefi",
      descriptionEn: "Activated Relationship Mode!",
      descriptionTr: "İlişki modunu aktifleştirdin!",
      criteria: { type: "relationship_activated", count: 1 },
      goldReward: 20,
    },
    {
      key: "explorer",
      nameEn: "Explorer",
      nameTr: "Kâşif",
      descriptionEn: "Checked in to 10 different places!",
      descriptionTr: "10 farklı mekâna check-in yaptın!",
      criteria: { type: "checkin_count", count: 10 },
      goldReward: 5,
    },
    {
      key: "gold_member",
      nameEn: "Gold Member",
      nameTr: "Gold Üye",
      descriptionEn: "Upgrade to Gold or higher subscription!",
      descriptionTr: "Gold veya üstü abonelik başlattın!",
      criteria: { type: "subscription", count: 1 },
      goldReward: 15,
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
// NOTIFICATIONS SEEDER
// ============================================================

async function seedDemoNotifications(
  userIds: string[],
  matchIds: string[],
): Promise<void> {
  const now = new Date();

  const notifications: Array<{
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data: Prisma.InputJsonValue | null;
    isRead: boolean;
    createdAt: Date;
  }> = [];

  // Match notifications for all matched users
  for (let i = 0; i < MATCH_PAIRS.length; i++) {
    const pair = MATCH_PAIRS[i];
    const userAName = DEMO_USERS[pair.userAIdx].firstName;
    const userBName = DEMO_USERS[pair.userBIdx].firstName;
    const matchId = matchIds[i];

    notifications.push({
      userId: userIds[pair.userAIdx],
      type: NotificationType.NEW_MATCH,
      title: "Yeni Eslesme!",
      body: `${userBName} ile eslestiniz! Simdi sohbet baslatin.`,
      data: { matchId },
      isRead: true,
      createdAt: new Date(now.getTime() - (5 - i) * 24 * 60 * 60 * 1000),
    });

    notifications.push({
      userId: userIds[pair.userBIdx],
      type: NotificationType.NEW_MATCH,
      title: "Yeni Eslesme!",
      body: `${userAName} ile eslestiniz! Simdi sohbet baslatin.`,
      data: { matchId },
      isRead: true,
      createdAt: new Date(now.getTime() - (5 - i) * 24 * 60 * 60 * 1000),
    });
  }

  // Message notifications for recent messages
  for (let i = 0; i < MATCH_PAIRS.length; i++) {
    const pair = MATCH_PAIRS[i];
    const matchId = matchIds[i];
    const userBName = DEMO_USERS[pair.userBIdx].firstName;

    notifications.push({
      userId: userIds[pair.userAIdx],
      type: NotificationType.NEW_MESSAGE,
      title: `${userBName}`,
      body: `${userBName}: Yeni mesajiniz var`,
      data: { matchId },
      isRead: i < 3,
      createdAt: new Date(now.getTime() - i * 3600000),
    });
  }

  // Badge earned notifications
  notifications.push({
    userId: userIds[0],
    type: NotificationType.BADGE_EARNED,
    title: "Yeni Rozet Kazandınız!",
    body: "Merak Uzmanı rozetini kazandınız! +10 Gold ödüllendirildiniz.",
    data: { badgeKey: "question_explorer" },
    isRead: true,
    createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
  });

  // Super like notification
  notifications.push({
    userId: userIds[4],
    type: NotificationType.SUPER_LIKE,
    title: "Super Begeni!",
    body: "Biri sizi super begendi! Kimligini gormek icin Gold paketine yukseltin.",
    data: null,
    isRead: false,
    createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
  });

  // System notification
  for (const userId of userIds) {
    notifications.push({
      userId,
      type: NotificationType.SYSTEM,
      title: "LUMA'ya Hoş Geldiniz!",
      body: "Profilinizi tamamlayin ve eslesmeler bulmaya baslayin. Uyumluluk sorularini yanitlamayi unutmayin!",
      data: null,
      isRead: true,
      createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
    });
  }

  // Subscription expiring
  notifications.push({
    userId: userIds[0],
    type: NotificationType.SUBSCRIPTION_EXPIRING,
    title: "Abonelik Hatırlatması",
    body: "Pro aboneliginiz 3 gun icinde sona eriyor. Yenilemeyi unutmayin!",
    data: null,
    isRead: false,
    createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
  });

  await prisma.notification.createMany({
    data: notifications.map((n) => ({
      ...n,
      data: n.data === null ? Prisma.JsonNull : n.data,
    })),
  });
}

// ============================================================
// SUBSCRIPTIONS SEEDER
// ============================================================

async function seedDemoSubscriptions(userIds: string[]): Promise<void> {
  const now = new Date();
  const subscriptions: Array<{
    userId: string;
    packageTier: PackageTier;
    platform: PaymentPlatform;
    productId: string;
    startDate: Date;
    expiryDate: Date;
    isActive: boolean;
    autoRenew: boolean;
  }> = [];

  for (let i = 0; i < DEMO_USERS.length; i++) {
    const demo = DEMO_USERS[i];
    if (demo.packageTier === PackageTier.FREE) continue;

    const startDate = new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000);
    const expiryDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    const productIdMap: Record<string, string> = {
      [PackageTier.PREMIUM]: "com.luma.premium.monthly",
      [PackageTier.SUPREME]: "com.luma.supreme.monthly",
    };

    subscriptions.push({
      userId: userIds[i],
      packageTier: demo.packageTier,
      platform: i % 2 === 0 ? PaymentPlatform.APPLE : PaymentPlatform.GOOGLE,
      productId: productIdMap[demo.packageTier] ?? "com.luma.premium.monthly",
      startDate,
      expiryDate,
      isActive: true,
      autoRenew: true,
    });
  }

  await prisma.subscription.createMany({ data: subscriptions });
}

// ============================================================
// LOGIN STREAKS SEEDER
// ============================================================

async function seedDemoLoginStreaks(userIds: string[]): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const streaks = userIds.map((userId, _idx) => {
    const currentStreak = randomBetween(1, 14);
    const longestStreak = Math.max(
      currentStreak,
      randomBetween(currentStreak, 30),
    );
    return {
      userId,
      currentStreak,
      longestStreak,
      lastLoginDate: today,
      totalGoldEarned: currentStreak * 2,
    };
  });

  await prisma.loginStreak.createMany({ data: streaks });
}

// ============================================================
// PROFILE PROMPTS SEEDER
// ============================================================

async function seedDemoProfilePrompts(userIds: string[]): Promise<void> {
  for (let i = 0; i < userIds.length; i++) {
    const prompts = USER_PROFILE_PROMPTS[i];
    if (!prompts) continue;

    for (let order = 0; order < prompts.length; order++) {
      const prompt = prompts[order];
      await prisma.profilePrompt.create({
        data: {
          userId: userIds[i],
          question: prompt.question,
          answer: prompt.answer,
          order,
        },
      });
    }
  }
}

// ============================================================
// GOLD TRANSACTIONS SEEDER
// ============================================================

async function seedDemoGoldTransactions(userIds: string[]): Promise<void> {
  const now = new Date();
  const transactions: Array<{
    userId: string;
    type: GoldTransactionType;
    amount: number;
    balance: number;
    description: string;
    createdAt: Date;
  }> = [];

  for (let i = 0; i < DEMO_USERS.length; i++) {
    const demo = DEMO_USERS[i];
    const userId = userIds[i];
    let runningBalance = 0;

    // Initial subscription allocation (if paid user)
    if (demo.packageTier !== PackageTier.FREE) {
      const allocation =
        demo.packageTier === PackageTier.SUPREME
          ? 500
          : 50;
      runningBalance += allocation;
      transactions.push({
        userId,
        type: GoldTransactionType.SUBSCRIPTION_ALLOCATION,
        amount: allocation,
        balance: runningBalance,
        description: `${demo.packageTier} paketi aylik Gold tahsisi`,
        createdAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
      });
    }

    // Badge reward
    transactions.push({
      userId,
      type: GoldTransactionType.BADGE_REWARD,
      amount: 5,
      balance: runningBalance + 5,
      description: "İlk Kıvılcım rozeti ödülü",
      createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
    });
    runningBalance += 5;

    // Some users have streak rewards
    if (i < 5) {
      transactions.push({
        userId,
        type: GoldTransactionType.STREAK_REWARD,
        amount: 10,
        balance: runningBalance + 10,
        description: "7 gun giris serisi odulu",
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      });
      runningBalance += 10;
    }

    // Some spending for paid users
    if (demo.goldBalance > 50 && i < 4) {
      transactions.push({
        userId,
        type: GoldTransactionType.SUPER_LIKE,
        amount: -25,
        balance: runningBalance - 25,
        description: "Super Begeni gonderildi",
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      });
      runningBalance -= 25;
    }
  }

  await prisma.goldTransaction.createMany({ data: transactions });
}

// ============================================================
// DISCOVERED PLACES SEEDER
// ============================================================

async function seedDemoPlaces(userIds: string[]): Promise<void> {
  const places = [
    {
      name: "Bebek Sahili",
      address: "Bebek, Istanbul",
      latitude: 41.0765,
      longitude: 29.0433,
      category: "park",
    },
    {
      name: "Kadikoy Carsisi",
      address: "Kadikoy, Istanbul",
      latitude: 41.0028,
      longitude: 29.0234,
      category: "market",
    },
    {
      name: "Petra Roasting Co.",
      address: "Galata, Istanbul",
      latitude: 41.0242,
      longitude: 28.9749,
      category: "cafe",
    },
    {
      name: "Ataturk Orman Ciftligi",
      address: "Yenimahalle, Ankara",
      latitude: 39.97,
      longitude: 32.8081,
      category: "park",
    },
    {
      name: "Kordon Boyu",
      address: "Alsancak, Izmir",
      latitude: 38.4349,
      longitude: 27.1436,
      category: "promenade",
    },
  ];

  const createdPlaces = [];
  for (const place of places) {
    const created = await prisma.discoveredPlace.create({ data: place });
    createdPlaces.push(created);
  }

  // Check-ins for matched users
  const now = new Date();
  // Elif & Ahmet check in to Bebek Sahili
  await prisma.placeCheckIn.create({
    data: {
      placeId: createdPlaces[0].id,
      userId: userIds[0],
      checkedInAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.placeCheckIn.create({
    data: {
      placeId: createdPlaces[0].id,
      userId: userIds[1],
      checkedInAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    },
  });

  // Add a memory
  await prisma.placeMemory.create({
    data: {
      placeId: createdPlaces[0].id,
      userId: userIds[0],
      note: "Ilk bulusmamiz burada oldu, harika bir gun batimiydi.",
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
  });

  // Selin & Kaan check in to Kadikoy
  await prisma.placeCheckIn.create({
    data: {
      placeId: createdPlaces[1].id,
      userId: userIds[4],
      checkedInAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.placeCheckIn.create({
    data: {
      placeId: createdPlaces[1].id,
      userId: userIds[9],
      checkedInAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
  });
}

// ============================================================
// RUN
// ============================================================
main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
