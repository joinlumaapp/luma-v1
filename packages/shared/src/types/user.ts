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

// Subsystem 4: Intention Tags — LOCKED: 3 Tags
export enum IntentionTag {
  SERIOUS_RELATIONSHIP = 'serious_relationship',
  EXPLORING = 'exploring',
  NOT_SURE = 'not_sure',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

// Subsystem 16: Package Tiers — LOCKED: 4 Packages
export enum PackageTier {
  FREE = 'free',
  GOLD = 'gold',
  PRO = 'pro',
  RESERVED = 'reserved',
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
