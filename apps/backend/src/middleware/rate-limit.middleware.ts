import { Injectable, NestMiddleware, HttpStatus, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

/**
 * Route-specific rate limit tiers for LUMA endpoints.
 * This middleware provides Redis-based sliding-window rate limiting
 * as a complement to @nestjs/throttler's in-memory guards.
 *
 * Used for IP-based rate limiting before authentication.
 */

interface RateLimitTier {
  /** Max requests allowed in the window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

/** Rate limit configurations by route prefix */
const RATE_LIMIT_TIERS: ReadonlyArray<{
  pattern: RegExp;
  tier: RateLimitTier;
}> = [
  // Auth endpoints: 5 per minute (brute force protection)
  { pattern: /^\/api\/v1\/auth\//, tier: { limit: 5, windowSeconds: 60 } },
  // Discovery swipe: 200 per hour (abuse prevention)
  {
    pattern: /^\/api\/v1\/discovery\/swipe/,
    tier: { limit: 200, windowSeconds: 3600 },
  },
  // Chat send message: 60 per minute (spam prevention)
  {
    pattern: /^\/api\/v1\/chat\/.*\/messages/,
    tier: { limit: 60, windowSeconds: 60 },
  },
  // Admin endpoints: 30 per minute (abuse prevention)
  {
    pattern: /^\/api\/v1\/admin\//,
    tier: { limit: 30, windowSeconds: 60 },
  },
  // Payment endpoints: 10 per minute (fraud prevention)
  {
    pattern: /^\/api\/v1\/payments\//,
    tier: { limit: 10, windowSeconds: 60 },
  },
] as const;

/** Default: 100 requests per minute per IP */
const DEFAULT_TIER: RateLimitTier = { limit: 100, windowSeconds: 60 };

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger("RateLimit");
  private redis: Redis | null = null;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>("REDIS_URL");
    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: true,
      });

      this.redis.connect().catch((err: Error) => {
        this.logger.warn(
          `Redis connection failed for rate limiter, falling back to pass-through: ${err.message}`,
        );
        this.redis = null;
      });
    }
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    // If Redis is not available, pass through (ThrottlerGuard still provides in-memory protection)
    if (!this.redis) {
      next();
      return;
    }

    const clientIp = this.getClientIp(req);
    const tier = this.matchTier(req.originalUrl);
    const key = `rl:${clientIp}:${req.originalUrl.split("?")[0]}`;

    try {
      const now = Date.now();
      const windowStart = now - tier.windowSeconds * 1000;

      // Sliding window using Redis sorted set
      const pipeline = this.redis.pipeline();
      // Remove expired entries
      pipeline.zremrangebyscore(key, 0, windowStart);
      // Count current entries
      pipeline.zcard(key);
      // Add current request
      pipeline.zadd(key, now, `${now}:${Math.random()}`);
      // Set expiry on the key
      pipeline.expire(key, tier.windowSeconds);

      const results = await pipeline.exec();
      if (!results) {
        next();
        return;
      }

      const currentCount = results[1]?.[1] as number;

      // Set rate limit headers
      res.setHeader("X-RateLimit-Limit", tier.limit);
      res.setHeader(
        "X-RateLimit-Remaining",
        Math.max(0, tier.limit - currentCount - 1),
      );
      res.setHeader(
        "X-RateLimit-Reset",
        Math.ceil((now + tier.windowSeconds * 1000) / 1000),
      );

      if (currentCount >= tier.limit) {
        res.setHeader("Retry-After", tier.windowSeconds);
        res.status(HttpStatus.TOO_MANY_REQUESTS).json({
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: "Too Many Requests",
          message: "Cok fazla istek gonderdiniz. Lutfen bekleyin.",
          retryAfter: tier.windowSeconds,
        });
        return;
      }

      next();
    } catch (err: unknown) {
      // On Redis error, allow the request through (fail-open)
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Rate limit check failed, passing through: ${errorMessage}`,
      );
      next();
    }
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      return forwarded.split(",")[0]?.trim() ?? "0.0.0.0";
    }
    return req.ip ?? "0.0.0.0";
  }

  private matchTier(url: string): RateLimitTier {
    for (const { pattern, tier } of RATE_LIMIT_TIERS) {
      if (pattern.test(url)) {
        return tier;
      }
    }
    return DEFAULT_TIER;
  }
}
