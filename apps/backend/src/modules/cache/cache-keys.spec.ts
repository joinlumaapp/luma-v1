import {
  CacheKeys,
  hashFilters,
  TTL_DISCOVERY_FEED,
  TTL_USER_PROFILE,
  TTL_COMPATIBILITY_SCORE,
  TTL_PACKAGE_FEATURES,
} from "./cache-keys";

describe("CacheKeys", () => {
  // ═══════════════════════════════════════════════════════════════
  // TTL Constants
  // ═══════════════════════════════════════════════════════════════

  describe("TTL constants", () => {
    it("should have correct TTL values", () => {
      expect(TTL_DISCOVERY_FEED).toBe(30);
      expect(TTL_USER_PROFILE).toBe(60);
      expect(TTL_COMPATIBILITY_SCORE).toBe(300);
      expect(TTL_PACKAGE_FEATURES).toBe(3600);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Key Builders
  // ═══════════════════════════════════════════════════════════════

  describe("discoveryFeed()", () => {
    it("should build key without filters hash", () => {
      expect(CacheKeys.discoveryFeed("u1")).toBe("discovery:feed:u1");
    });

    it("should build key with filters hash", () => {
      expect(CacheKeys.discoveryFeed("u1", "abc123")).toBe(
        "discovery:feed:u1:abc123",
      );
    });

    it("should handle undefined filters hash", () => {
      expect(CacheKeys.discoveryFeed("u1", undefined)).toBe(
        "discovery:feed:u1",
      );
    });
  });

  describe("userProfile()", () => {
    it("should build user profile key", () => {
      expect(CacheKeys.userProfile("u1")).toBe("user:profile:u1");
    });
  });

  describe("currentUser()", () => {
    it("should build current user key", () => {
      expect(CacheKeys.currentUser("u1")).toBe("user:current:u1");
    });
  });

  describe("compatibilityScore()", () => {
    it("should order user IDs alphabetically", () => {
      expect(CacheKeys.compatibilityScore("b-user", "a-user")).toBe(
        "compat:score:a-user:b-user",
      );
    });

    it("should keep order when already sorted", () => {
      expect(CacheKeys.compatibilityScore("a-user", "b-user")).toBe(
        "compat:score:a-user:b-user",
      );
    });

    it("should produce same key regardless of argument order", () => {
      const key1 = CacheKeys.compatibilityScore("u1", "u2");
      const key2 = CacheKeys.compatibilityScore("u2", "u1");
      expect(key1).toBe(key2);
    });
  });

  describe("packageFeatures()", () => {
    it("should return static key", () => {
      expect(CacheKeys.packageFeatures()).toBe("packages:features");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Invalidation Patterns
  // ═══════════════════════════════════════════════════════════════

  describe("invalidation patterns", () => {
    it("should build user pattern", () => {
      expect(CacheKeys.userPattern("u1")).toBe("*:*:u1*");
    });

    it("should build all discovery feeds pattern", () => {
      expect(CacheKeys.allDiscoveryFeeds()).toBe("discovery:feed:*");
    });

    it("should build all compatibility scores pattern", () => {
      expect(CacheKeys.allCompatibilityScores()).toBe("compat:score:*");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // hashFilters()
  // ═══════════════════════════════════════════════════════════════

  describe("hashFilters()", () => {
    it("should return a deterministic 8-character hash", () => {
      const hash = hashFilters({ gender: "female", ageMin: 18, ageMax: 30 });
      expect(hash).toHaveLength(8);
    });

    it("should return the same hash for same filters regardless of key order", () => {
      const hash1 = hashFilters({ gender: "female", ageMin: 18 });
      const hash2 = hashFilters({ ageMin: 18, gender: "female" });
      expect(hash1).toBe(hash2);
    });

    it("should return different hashes for different filters", () => {
      const hash1 = hashFilters({ gender: "female" });
      const hash2 = hashFilters({ gender: "male" });
      expect(hash1).not.toBe(hash2);
    });

    it("should handle empty filters", () => {
      const hash = hashFilters({});
      expect(hash).toHaveLength(8);
    });
  });
});
