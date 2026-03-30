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
export declare enum IntentionTag {
    SERIOUS_RELATIONSHIP = "SERIOUS_RELATIONSHIP",
    EXPLORING = "EXPLORING",
    NOT_SURE = "NOT_SURE"
}
export declare enum Gender {
    MALE = "MALE",
    FEMALE = "FEMALE",
    OTHER = "OTHER"
}
export declare enum PackageTier {
    FREE = "FREE",
    GOLD = "GOLD",
    PRO = "PRO",
    RESERVED = "RESERVED"
}
export declare enum VerificationStatus {
    PENDING = "PENDING",
    VERIFIED = "VERIFIED",
    REJECTED = "REJECTED",
    EXPIRED = "EXPIRED"
}
export declare enum VerificationType {
    SMS = "SMS",
    SELFIE = "SELFIE"
}
//# sourceMappingURL=user.d.ts.map