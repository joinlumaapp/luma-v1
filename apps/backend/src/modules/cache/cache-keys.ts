import * as crypto from 'crypto';

/**
 * Centralized cache key definitions and TTL values for LUMA V1.
 *
 * Naming convention: <domain>:<entity>:<identifier>
 * TTL values are in seconds.
 */

// ─── TTL Constants (seconds) ────────────────────────────────

/** Discovery feed: short TTL because feed changes frequently */
export const TTL_DISCOVERY_FEED = 30;

/** User profile: moderate TTL */
export const TTL_USER_PROFILE = 60;

/** Compatibility scores: longer TTL since scores are expensive to compute */
export const TTL_COMPATIBILITY_SCORE = 300; // 5 minutes

/** Package features: rarely change, long TTL */
export const TTL_PACKAGE_FEATURES = 3600; // 1 hour

// ─── Key Builders ───────────────────────────────────────────

export const CacheKeys = {
  /** Discovery feed for a user, hashed with filter state */
  discoveryFeed(userId: string, filtersHash?: string): string {
    const suffix = filtersHash ? `:${filtersHash}` : '';
    return `discovery:feed:${userId}${suffix}`;
  },

  /** User profile data */
  userProfile(userId: string): string {
    return `user:profile:${userId}`;
  },

  /** Full user profile (includes photos, badges, subscription) */
  currentUser(userId: string): string {
    return `user:current:${userId}`;
  },

  /** Compatibility score between two users (ordered) */
  compatibilityScore(userAId: string, userBId: string): string {
    const [first, second] = userAId < userBId ? [userAId, userBId] : [userBId, userAId];
    return `compat:score:${first}:${second}`;
  },

  /** Package feature definitions (static, shared across users) */
  packageFeatures(): string {
    return 'packages:features';
  },

  // ─── Invalidation Patterns ──────────────────────────────

  /** All cache entries for a specific user */
  userPattern(userId: string): string {
    return `*:*:${userId}*`;
  },

  /** All discovery feed entries (use after global data changes) */
  allDiscoveryFeeds(): string {
    return 'discovery:feed:*';
  },

  /** All compatibility score entries */
  allCompatibilityScores(): string {
    return 'compat:score:*';
  },
} as const;

/**
 * Create a deterministic hash of filter parameters
 * for use in discovery feed cache keys.
 */
export function hashFilters(filters: Record<string, unknown>): string {
  const sorted = JSON.stringify(filters, Object.keys(filters).sort());
  return crypto.createHash('md5').update(sorted).digest('hex').substring(0, 8);
}
