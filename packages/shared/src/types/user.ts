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
