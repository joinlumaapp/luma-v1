// LUMA V1 — User & Profile Types

export interface User {
  id: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  isActive: boolean;
  isSmsVerified: boolean;
  isSelfieVerified: boolean;
  isFullyVerified: boolean;
  packageTier: PackageTier;
  goldBalance: number;
}

export interface UserProfile {
  userId: string;
  firstName: string;
  birthDate: Date;
  gender: Gender;
  bio: string | null;
  intentionTag: IntentionTag;
  photos: UserPhoto[];
  isProfileComplete: boolean;
  lastActiveAt: Date;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  currentMood: string | null;
  moodSetAt: Date | null;
  voiceIntroUrl: string | null;
  voiceIntroDuration: number | null;

  // ── Hakkımda Daha Fazlası — extended lifestyle fields (all optional) ──
  /** Living arrangement (🏠 Yaşam Düzeni) */
  livingSituation: LivingSituation | null;
  /** Spoken languages (🗣️ Diller) — multi-select */
  languages: Language[];
  /** Sleep pattern (🌙 Uyku Düzeni) */
  sleepSchedule: SleepSchedule | null;
  /** Diet / eating preferences (🍽️ Beslenme) */
  diet: Diet | null;
  /** Work style (💼 Çalışma Şekli) */
  workStyle: WorkStyle | null;
  /** Travel frequency (🌍 Seyahat) */
  travelFrequency: TravelFrequency | null;
  /** Distance preference for matches (📏 Mesafe Tercihi) */
  distancePreference: DistancePreference | null;
  /** Communication style (💬 İletişim Tarzı) */
  communicationStyle: CommunicationStyle | null;
  /** Hookah / nargile habit (🚬 Nargile) */
  hookah: HookahHabit | null;
}

// ─── Hakkımda Daha Fazlası — value enums (stored as string keys) ───────────

/** 🏠 Yaşam Düzeni */
export enum LivingSituation {
  ALONE = 'alone',
  ROOMMATE = 'roommate',
  FAMILY = 'family',
}

/** 🗣️ Diller */
export enum Language {
  TURKISH = 'turkish',
  ENGLISH = 'english',
  GERMAN = 'german',
  FRENCH = 'french',
  SPANISH = 'spanish',
  ARABIC = 'arabic',
  RUSSIAN = 'russian',
  OTHER = 'other',
}

/** 🌙 Uyku Düzeni */
export enum SleepSchedule {
  EARLY_BIRD = 'early_bird',
  NIGHT_OWL = 'night_owl',
  FLEXIBLE = 'flexible',
}

/** 🍽️ Beslenme */
export enum Diet {
  OMNIVORE = 'omnivore',
  VEGETARIAN = 'vegetarian',
  VEGAN = 'vegan',
  HALAL = 'halal',
  GLUTEN_FREE = 'gluten_free',
}

/** 💼 Çalışma Şekli */
export enum WorkStyle {
  OFFICE = 'office',
  REMOTE = 'remote',
  HYBRID = 'hybrid',
  STUDENT = 'student',
  UNEMPLOYED = 'unemployed',
}

/** 🌍 Seyahat */
export enum TravelFrequency {
  OFTEN = 'often',
  SOMETIMES = 'sometimes',
  RARELY = 'rarely',
  WANTS_TO = 'wants_to',
}

/** 📏 Mesafe Tercihi */
export enum DistancePreference {
  CLOSE = 'close',
  CITY = 'city',
  FAR = 'far',
}

/** 💬 İletişim Tarzı */
export enum CommunicationStyle {
  CONSTANT_TEXTER = 'constant_texter',
  OCCASIONAL_TEXTER = 'occasional_texter',
  IN_PERSON = 'in_person',
}

/** 🚬 Nargile */
export enum HookahHabit {
  YES = 'yes',
  SOMETIMES = 'sometimes',
  NEVER = 'never',
}

export interface UserPhoto {
  id: string;
  userId: string;
  url: string;
  thumbnailUrl: string | null;
  order: number;
  isPrimary: boolean;
  isApproved: boolean;
  createdAt: Date;
}

// Hedef (Intention Tags) — LOCKED: 5 Tags
export enum IntentionTag {
  EVLENMEK = 'evlenmek',
  ILISKI = 'iliski',
  SOHBET_ARKADAS = 'sohbet_arkadas',
  KULTUR = 'kultur',
  DUNYA_GEZME = 'dunya_gezme',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

// Package Tiers — LOCKED: 3 Packages (NO Gold/Pro/Reserved)
export enum PackageTier {
  FREE = 'free',
  PREMIUM = 'premium',
  SUPREME = 'supreme',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export enum VerificationType {
  SMS = 'SMS',
  SELFIE = 'SELFIE',
}
