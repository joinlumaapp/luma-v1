// LUMA V1 — User & Profile Types

export interface User {
  id: string;
  displayId: string;
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
  lastName: string | null;
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
  SERIOUS_RELATIONSHIP = 'SERIOUS_RELATIONSHIP',
  EXPLORING = 'EXPLORING',
  NOT_SURE = 'NOT_SURE',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

// Subsystem 16: Package Tiers — LOCKED: 4 Packages
export enum PackageTier {
  FREE = 'FREE',
  GOLD = 'GOLD',
  PRO = 'PRO',
  RESERVED = 'RESERVED',
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
