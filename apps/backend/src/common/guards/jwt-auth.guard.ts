import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { JwtService, TokenExpiredError } from "@nestjs/jwt";
import { Request } from "express";
import Redis from "ioredis";
import { createHash } from "crypto";

export const IS_PUBLIC_KEY = "isPublic";

/** Prefix for blacklisted (logged-out) tokens in Redis.
 *  Must include the 'luma:' namespace used by LumaCacheService. */
const TOKEN_BLACKLIST_PREFIX = "luma:token:blacklist:";

interface JwtTokenPayload {
  sub: string;
  phone: string;
  isVerified: boolean;
  packageTier: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger("JwtAuthGuard");
  private redis: Redis | null = null;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {
    const redisUrl = this.configService.get<string>("REDIS_URL");
    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: true,
      });

      this.redis.connect().catch((err: Error) => {
        this.logger.warn(
          `Redis connection failed for token blacklist: ${err.message}`,
        );
        this.redis = null;
      });
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException(
        "Erisim tokeni gereklidir. Lutfen giris yapin.",
      );
    }

    // Verify JWT signature and claims
    let payload: JwtTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtTokenPayload>(token, {
        secret: this.configService.get<string>("JWT_SECRET"),
      });
    } catch (error: unknown) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException(
          "Oturumunuzun suresi doldu. Lutfen tekrar giris yapin.",
        );
      }
      throw new UnauthorizedException(
        "Gecersiz erisim tokeni. Lutfen tekrar giris yapin.",
      );
    }

    // Validate required claims
    if (!payload.sub || !payload.phone) {
      throw new UnauthorizedException(
        "Gecersiz token icerigi. Lutfen tekrar giris yapin.",
      );
    }

    // Check token blacklist (logged-out tokens)
    const isBlacklisted = await this.isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedException(
        "Bu oturum sonlandirildi. Lutfen tekrar giris yapin.",
      );
    }

    // Attach the decoded user payload to the request object
    (request as unknown as Record<string, unknown>)["user"] = payload;

    return true;
  }

  /**
   * Check if a token has been blacklisted (e.g., after logout).
   * Uses a hash of the token as the key to avoid storing raw tokens.
   */
  private async isTokenBlacklisted(token: string): Promise<boolean> {
    if (!this.redis) {
      return false;
    }

    try {
      // Use a simple hash of the token for the key
      const tokenKey = this.hashToken(token);
      const result = await this.redis.exists(
        `${TOKEN_BLACKLIST_PREFIX}${tokenKey}`,
      );
      return result === 1;
    } catch (err: unknown) {
      // On Redis error, allow the request (fail-open for availability)
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Token blacklist check failed: ${message}`);
      return false;
    }
  }

  /**
   * SHA-256 hash of the token, matching the approach used in auth.service.ts.
   * Ensures blacklist lookups use the same key format as blacklist writes.
   */
  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return undefined;
    }

    return parts[1];
  }
}
