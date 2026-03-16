import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

// ─── Standard TTL constants (seconds) ────────────────────────
// Use these when calling set() to ensure consistent cache durations.
export const CACHE_TTL = {
  /** User profile data — moderate TTL, invalidate on profile update */
  USER_PROFILE: 300, // 5 minutes
  /** Discovery feed — short TTL, feed changes frequently */
  DISCOVERY_FEED: 60, // 1 minute
  /** Compatibility scores — long TTL, recalculated infrequently */
  COMPATIBILITY_SCORE: 3600, // 1 hour
  /** Match list — moderate TTL, invalidate on new match/unmatch */
  MATCH_LIST: 180, // 3 minutes
  /** Questions list — very long TTL, questions rarely change */
  QUESTIONS: 86400, // 24 hours
  /** Badge definitions — very long TTL, definitions are static */
  BADGE_DEFINITIONS: 86400, // 24 hours
  /** Notification preferences — moderate TTL */
  NOTIFICATION_PREFS: 600, // 10 minutes
  /** Session validation — short TTL for security */
  SESSION: 60, // 1 minute
} as const;

// ─── Cache key builders ──────────────────────────────────────
// Centralized key patterns to avoid typos and ensure consistency.
export const CACHE_KEYS = {
  userProfile: (userId: string) => `user:profile:${userId}`,
  discoveryFeed: (userId: string) => `discovery:feed:${userId}`,
  compatScore: (userAId: string, userBId: string) =>
    `compat:${userAId}:${userBId}`,
  matchList: (userId: string) => `matches:${userId}`,
  questions: (isPremium: boolean) => `questions:${isPremium ? "all" : "core"}`,
  badgeDefinitions: () => "badges:definitions",
  notifPrefs: (userId: string) => `notif:prefs:${userId}`,
} as const;

/**
 * LumaCacheService — Redis-backed caching layer for LUMA V1.
 *
 * Provides typed get/set/del operations with TTL support
 * and pattern-based invalidation using SCAN (no KEYS in production).
 *
 * Falls back gracefully: cache misses or Redis downtime never block
 * the request — callers always receive null and proceed to the DB.
 */
@Injectable()
export class LumaCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LumaCacheService.name);
  private client: Redis | null = null;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const redisUrl = this.configService.get<string>(
      "REDIS_URL",
      "redis://localhost:6379",
    );

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times: number): number | null {
          if (times > 5) return null; // stop retrying after 5 attempts
          return Math.min(times * 200, 2000);
        },
        lazyConnect: false,
        enableReadyCheck: true,
      });

      this.client.on("connect", () => {
        this.isConnected = true;
        this.logger.log("Redis connected");
      });

      this.client.on("error", (err: Error) => {
        this.isConnected = false;
        this.logger.warn(`Redis error: ${err.message}`);
      });

      this.client.on("close", () => {
        this.isConnected = false;
        this.logger.warn("Redis connection closed");
      });

      // Wait for the initial connection (with timeout)
      await Promise.race([
        new Promise<void>((resolve) => {
          if (this.client) {
            this.client.once("ready", () => resolve());
          }
        }),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error("Redis connection timeout")), 5000),
        ),
      ]).catch((err: Error) => {
        this.logger.warn(
          `Redis initial connection failed: ${err.message}. Cache will be unavailable.`,
        );
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Failed to initialize Redis: ${message}. Running without cache.`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit().catch(() => {
        /* swallow quit errors during shutdown */
      });
      this.client = null;
      this.isConnected = false;
    }
  }

  // ─── Public API ─────────────────────────────────────────────

  /**
   * Get a cached value by key.
   * Returns null on cache miss or Redis error (never throws).
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) return null;

    try {
      const raw = await this.client!.get(this.prefixKey(key));
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logError("get", key, err);
      return null;
    }
  }

  /**
   * Set a cached value with optional TTL (in seconds).
   * Silently fails if Redis is unavailable (never throws).
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const serialized = JSON.stringify(value);
      const prefixed = this.prefixKey(key);

      if (ttlSeconds && ttlSeconds > 0) {
        await this.client!.setex(prefixed, ttlSeconds, serialized);
      } else {
        await this.client!.set(prefixed, serialized);
      }
    } catch (err) {
      this.logError("set", key, err);
    }
  }

  /**
   * Delete a specific cached key.
   */
  async del(key: string): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      await this.client!.del(this.prefixKey(key));
    } catch (err) {
      this.logError("del", key, err);
    }
  }

  /**
   * Invalidate all keys matching a glob pattern.
   * Uses SCAN to avoid blocking Redis with KEYS.
   *
   * Example patterns:
   *   'user:profile:*'       — all user profiles
   *   'discovery:feed:abc*'  — a specific user's feed cache
   *   'compat:*'             — all compatibility caches
   */
  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const prefixedPattern = this.prefixKey(pattern);
      let cursor = "0";
      let totalDeleted = 0;

      do {
        const [nextCursor, keys] = await this.client!.scan(
          cursor,
          "MATCH",
          prefixedPattern,
          "COUNT",
          100,
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          await this.client!.del(...keys);
          totalDeleted += keys.length;
        }
      } while (cursor !== "0");

      if (totalDeleted > 0) {
        this.logger.debug(
          `Invalidated ${totalDeleted} keys matching "${pattern}"`,
        );
      }
    } catch (err) {
      this.logError("invalidatePattern", pattern, err);
    }
  }

  /**
   * Check if Redis is available and connected.
   */
  isRedisConnected(): boolean {
    return this.isAvailable();
  }

  // ─── Private Helpers ────────────────────────────────────────

  private isAvailable(): boolean {
    return this.client !== null && this.isConnected;
  }

  /** Namespace all keys under 'luma:' to avoid collisions. */
  private prefixKey(key: string): string {
    return `luma:${key}`;
  }

  private logError(operation: string, key: string, err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    this.logger.warn(`Cache ${operation} failed for "${key}": ${message}`);
  }
}
