// LUMA V1 — Canlı (Live) Random Video Matching Types
// Replaces old Harmony Room concept — this is Omegle-style but compatibility-based
// Updated: 2026-04-08

export interface CanliSession {
  id: string;
  userAId: string;
  userBId: string;
  status: CanliSessionStatus;
  compatibilityScore: number; // uyum yüzdesi between the two users
  startedAt: Date | null;
  endedAt: Date | null;
  jetonSpent: number;
  createdAt: Date;
}

export enum CanliSessionStatus {
  SEARCHING = 'searching',   // Looking for compatible match
  CONNECTING = 'connecting', // Match found, establishing WebRTC
  ACTIVE = 'active',         // Live video chat in progress
  ENDED = 'ended',           // Session ended normally
  CANCELLED = 'cancelled',   // User cancelled before connecting
  FAILED = 'failed',         // Technical failure
}

// Actions available at end of Canlı session
export enum CanliEndAction {
  TAKIP_ET = 'takip_et',     // Follow the person
  BEGEN = 'begen',           // Like (if mutual = match)
  SONRAKI = 'sonraki',       // Skip to next person
}

export interface CanliEndResult {
  sessionId: string;
  action: CanliEndAction;
  didFollow: boolean;
  didLike: boolean;
  didMatch: boolean;          // True if mutual like
  didBecomeFriend: boolean;   // True if mutual follow (karşılıklı takip = arkadaş)
}

// Canlı matching preferences (filters)
export interface CanliMatchPreferences {
  genderFilter: string | null;
  ageMin: number | null;
  ageMax: number | null;
  maxDistance: number | null;  // km
  minCompatibility: number;   // default 50, min uyum yüzdesi
}

// Constants
export const CANLI_CONSTANTS = {
  jetonCostPerSession: 20,
  searchTimeoutSeconds: 30,     // Max wait time to find a match
  minCompatibilityDefault: 50,  // Minimum uyum % to be matched
  maxSessionDurationMinutes: 30, // Max single session length
} as const;
