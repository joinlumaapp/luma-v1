import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prisma.service";
import { LumaCacheService } from "../cache/cache.service";
import { calculateAge } from "../../common/utils/date.utils";
import { SmsProvider } from "./sms.provider";
import {
  RegisterDto,
  VerifySmsDto,
  VerifySelfieDto,
  LoginDto,
  RefreshTokenDto,
} from "./dto";
import { JwtPayload } from "../../common/decorators/current-user.decorator";
import * as crypto from "crypto";
import * as bcrypt from "bcryptjs";

// ─── Constants ────────────────────────────────────────────────────
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;
const SELFIE_LIVENESS_THRESHOLD = 0.7;
const SELFIE_FACE_MATCH_THRESHOLD = 0.8;
const MAX_ACTIVE_SESSIONS_PER_USER = 5;

/** Generate a unique display ID for new users (e.g. "LU-7F3A9B2E1D") */
function generateDisplayId(): string {
  const hex = crypto.randomBytes(5).toString("hex").toUpperCase();
  return `LU-${hex}`;
}
const SELFIE_MAX_BASE64_LENGTH = 5 * 1024 * 1024; // 5MB max selfie

// ─── OTP Rate Limiting Constants ──────────────────────────────────
const OTP_RATE_LIMIT_MAX_REQUESTS = 3;
const OTP_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const OTP_RATE_LIMIT_WINDOW_SECONDS = 10 * 60; // 10 minutes (TTL for Redis)
const OTP_RESEND_COOLDOWN_SECONDS = 60;

/** Redis key prefix for OTP rate limiting */
const OTP_RATE_LIMIT_KEY_PREFIX = "otp:ratelimit:";

/** Redis key prefix for blacklisted (logged-out) access tokens */
const TOKEN_BLACKLIST_PREFIX = "token:blacklist:";

/** Redis key prefix for device-based registration tracking */
const DEVICE_REGISTRATION_PREFIX = "device:registrations:";

/** Maximum distinct phone registrations per device before flagging */
const MAX_REGISTRATIONS_PER_DEVICE = 3;

/** TTL for device registration tracking (30 days in seconds) */
const DEVICE_TRACKING_TTL_SECONDS = 30 * 24 * 60 * 60;

/** Access token TTL in seconds (must match JWT_ACCESS_EXPIRY = 15m) */
const ACCESS_TOKEN_TTL_SECONDS = 900;

/** Tracks OTP request history for rate limiting (stored in Redis as JSON) */
interface OtpRateLimitEntry {
  timestamps: number[];
  lastRequestAt: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly smsProvider: SmsProvider,
    private readonly cache: LumaCacheService,
  ) {}

  /**
   * Check and enforce OTP rate limiting for a phone number.
   * Rate limit data is persisted in Redis so it survives server restarts.
   * Returns remaining attempts and retry-after info.
   */
  private async checkOtpRateLimit(phone: string): Promise<{
    allowed: boolean;
    remainingAttempts: number;
    retryAfterSeconds: number;
    cooldownSeconds: number;
  }> {
    const now = Date.now();
    const cacheKey = `${OTP_RATE_LIMIT_KEY_PREFIX}${phone}`;
    const entry = await this.cache.get<OtpRateLimitEntry>(cacheKey);

    if (!entry) {
      // First request — no limits
      return {
        allowed: true,
        remainingAttempts: OTP_RATE_LIMIT_MAX_REQUESTS - 1,
        retryAfterSeconds: 0,
        cooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
      };
    }

    // Filter timestamps within the rate limit window
    const validTimestamps = entry.timestamps.filter(
      (ts) => now - ts < OTP_RATE_LIMIT_WINDOW_MS,
    );

    // Check cooldown since last request (60-second resend cooldown)
    const timeSinceLastRequest = now - entry.lastRequestAt;
    const cooldownRemaining = Math.max(
      0,
      Math.ceil(
        (OTP_RESEND_COOLDOWN_SECONDS * 1000 - timeSinceLastRequest) / 1000,
      ),
    );

    if (cooldownRemaining > 0) {
      return {
        allowed: false,
        remainingAttempts: Math.max(
          0,
          OTP_RATE_LIMIT_MAX_REQUESTS - validTimestamps.length,
        ),
        retryAfterSeconds: cooldownRemaining,
        cooldownSeconds: cooldownRemaining,
      };
    }

    // Check rate limit (max requests per window)
    if (validTimestamps.length >= OTP_RATE_LIMIT_MAX_REQUESTS) {
      const oldestTimestamp = validTimestamps[0];
      const retryAfterMs = OTP_RATE_LIMIT_WINDOW_MS - (now - oldestTimestamp);
      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

      return {
        allowed: false,
        remainingAttempts: 0,
        retryAfterSeconds,
        cooldownSeconds: retryAfterSeconds,
      };
    }

    return {
      allowed: true,
      remainingAttempts:
        OTP_RATE_LIMIT_MAX_REQUESTS - validTimestamps.length - 1,
      retryAfterSeconds: 0,
      cooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    };
  }

  /**
   * Record an OTP request for rate limiting purposes.
   * Persists the entry in Redis with a TTL matching the rate limit window.
   */
  private async recordOtpRequest(phone: string): Promise<void> {
    const now = Date.now();
    const cacheKey = `${OTP_RATE_LIMIT_KEY_PREFIX}${phone}`;
    const entry = await this.cache.get<OtpRateLimitEntry>(cacheKey);

    // Filter timestamps within the window before appending
    const validTimestamps = entry
      ? entry.timestamps.filter((ts) => now - ts < OTP_RATE_LIMIT_WINDOW_MS)
      : [];

    const updatedEntry: OtpRateLimitEntry = {
      timestamps: [...validTimestamps, now],
      lastRequestAt: now,
    };

    await this.cache.set(cacheKey, updatedEntry, OTP_RATE_LIMIT_WINDOW_SECONDS);
  }

  // ═══════════════════════════════════════════════════════════════
  // REGISTER — Create user (if new) and send SMS verification code
  // ═══════════════════════════════════════════════════════════════

  async register(dto: RegisterDto): Promise<{
    message: string;
    isNewUser: boolean;
    remainingAttempts: number;
    retryAfterSeconds: number;
    cooldownSeconds: number;
  }> {
    // Check OTP rate limit before processing (Redis-backed)
    const rateLimit = await this.checkOtpRateLimit(dto.phone);

    if (!rateLimit.allowed) {
      throw new BadRequestException({
        message:
          rateLimit.remainingAttempts === 0
            ? `Cok fazla deneme. ${Math.ceil(rateLimit.retryAfterSeconds / 60)} dakika sonra tekrar deneyin.`
            : `Lutfen ${rateLimit.retryAfterSeconds} saniye bekleyin.`,
        remainingAttempts: rateLimit.remainingAttempts,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
        cooldownSeconds: rateLimit.cooldownSeconds,
      });
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    let userId: string;

    if (existingUser) {
      // Existing user — just send a new OTP for login
      if (existingUser.deletedAt) {
        throw new BadRequestException("Bu hesap silinmiştir");
      }
      userId = existingUser.id;
    } else {
      // New user — create account with auto-generated referral code
      const referralCode = await this.generateUniqueReferralCode();
      const user = await this.prisma.user.create({
        data: {
          phone: dto.phone,
          phoneCountryCode: dto.countryCode,
          displayId: generateDisplayId(),
          referralCode,
        },
      });
      userId = user.id;
    }

    // Generate OTP — use fixed code ONLY in development when no SMS provider is configured
    const isDev = this.configService.get("NODE_ENV") !== "production";
    const hasSmsProvider = !!this.configService.get("TWILIO_ACCOUNT_SID") ||
      !!this.configService.get("NETGSM_USERCODE");
    const allowTestOtp = this.configService.get("ALLOW_TEST_OTP") === "true";

    if (!isDev && !hasSmsProvider && !allowTestOtp) {
      this.logger.error("CRITICAL: No SMS provider configured in production! OTP cannot be sent.");
      throw new BadRequestException("SMS servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.");
    }

    const useTestOtp = !hasSmsProvider && (isDev || allowTestOtp);
    const otpCode = useTestOtp ? "123456" : this.generateOtp();
    if (useTestOtp && !isDev) {
      this.logger.warn(`[TEST MODE] Using test OTP for ${dto.phone}. REMOVE ALLOW_TEST_OTP before public launch!`);
    }
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Expire any existing pending SMS verifications for this user
    await this.prisma.userVerification.updateMany({
      where: {
        userId,
        type: "SMS",
        status: "PENDING",
      },
      data: { status: "EXPIRED" },
    });

    // Hash OTP before storing
    const hashedOtp = await bcrypt.hash(otpCode, 10);

    // Create new verification record
    await this.prisma.userVerification.create({
      data: {
        userId,
        type: "SMS",
        otpCode: hashedOtp,
        otpExpiresAt,
        otpAttempts: 0,
      },
    });

    // Record this OTP request for rate limiting (Redis-backed)
    await this.recordOtpRequest(dto.phone);

    // Send SMS — skip entirely when using test OTP (no SMS provider needed)
    if (!useTestOtp) {
      await this.sendSmsOtp(dto.phone, otpCode);
    } else {
      this.logger.log(`[TEST OTP] SMS skipped for ${dto.phone.slice(0, 4)}****. Code: 123456`);
    }

    // Track device fingerprint for abuse detection
    if (dto.deviceId) {
      await this.trackDeviceRegistration(dto.deviceId, dto.phone);
    }

    return {
      message: "Dogrulama kodu gonderildi",
      // Always return false to prevent phone number enumeration.
      // The actual new-user state is determined during OTP verification (verifySms).
      isNewUser: false,
      remainingAttempts: rateLimit.remainingAttempts,
      retryAfterSeconds: 0,
      cooldownSeconds: rateLimit.cooldownSeconds,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // VERIFY SMS — Verify phone OTP and issue tokens for new users
  // ═══════════════════════════════════════════════════════════════

  async verifySms(dto: VerifySmsDto): Promise<{
    verified: boolean;
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      displayId: string;
      phone: string;
      isVerified: boolean;
      isNew: boolean;
      packageTier: string;
    };
  }> {
    // Find user by phone, include profile to check onboarding status
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      include: { profile: true },
    });

    if (!user) {
      throw new BadRequestException("Kullanıcı bulunamadı");
    }

    // Verify the OTP
    await this.verifyOtpCode(user.id, dto.code);

    // Age verification: if user has a profile with birthDate, enforce 18+ requirement
    if (user.profile?.birthDate) {
      const age = calculateAge(new Date(user.profile.birthDate));
      if (age < 18) {
        throw new BadRequestException(
          "18 yasindan kucukler kayit olamaz",
        );
      }
    }

    // Mark user as SMS verified
    await this.prisma.user.update({
      where: { id: user.id },
      data: { isSmsVerified: true },
    });

    // Generate tokens and create session
    const tokens = await this.createSession(
      user.id,
      user.phone,
      user.isSelfieVerified,
      user.packageTier,
    );

    return {
      verified: true,
      ...tokens,
      user: {
        id: user.id,
        displayId: user.displayId ?? '',
        phone: user.phone,
        isVerified: true,
        isNew: !user.profile,
        packageTier: user.packageTier,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // VERIFY SELFIE — Identity verification via selfie comparison
  // ═══════════════════════════════════════════════════════════════

  async verifySelfie(
    userId: string,
    dto: VerifySelfieDto,
  ): Promise<{ verified: boolean; status: string }> {
    // Validate selfie payload size to prevent DoS via oversized base64
    if (dto.selfieImage.length > SELFIE_MAX_BASE64_LENGTH) {
      throw new BadRequestException("Selfie dosyasi cok buyuk. Maksimum 5MB.");
    }

    // Check user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { photos: { where: { isPrimary: true }, take: 1 } },
    });

    if (!user) {
      throw new BadRequestException("Kullanıcı bulunamadı");
    }

    if (user.isSelfieVerified) {
      return { verified: true, status: "Zaten doğrulanmış" };
    }

    // Selfie verification: uses configured provider (AWS Rekognition or basic validation)
    const livenessScore = this.verifyLiveness(dto.selfieImage);
    const faceMatchScore =
      user.photos.length > 0 ? this.verifyFaceComparison(dto.selfieImage) : 1.0; // No photos yet, accept selfie

    const isVerified =
      livenessScore >= SELFIE_LIVENESS_THRESHOLD &&
      faceMatchScore >= SELFIE_FACE_MATCH_THRESHOLD;

    // Create verification record
    await this.prisma.userVerification.create({
      data: {
        userId,
        type: "SELFIE",
        status: isVerified ? "VERIFIED" : "REJECTED",
        selfieUrl: `selfies/${userId}/${Date.now()}.jpg`, // Mock S3 path
        livenessScore,
        faceMatchScore,
        verifiedAt: isVerified ? new Date() : undefined,
        rejectionReason: !isVerified
          ? `Liveness: ${livenessScore.toFixed(2)}, Face match: ${faceMatchScore.toFixed(2)}`
          : undefined,
      },
    });

    if (isVerified) {
      // Update user verification status
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          isSelfieVerified: true,
          isFullyVerified: user.isSmsVerified, // Fully verified if both SMS + Selfie done
        },
      });

      // Award "Verified" badge if badge exists
      const verifiedBadge = await this.prisma.badgeDefinition.findUnique({
        where: { key: "verified_star" },
      });

      if (verifiedBadge) {
        await this.prisma.userBadge.upsert({
          where: {
            userId_badgeId: { userId, badgeId: verifiedBadge.id },
          },
          create: { userId, badgeId: verifiedBadge.id },
          update: {},
        });

        // Award Gold reward for badge
        if (verifiedBadge.goldReward > 0) {
          const currentUser = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { goldBalance: true },
          });
          const newBalance =
            (currentUser?.goldBalance ?? 0) + verifiedBadge.goldReward;

          await this.prisma.user.update({
            where: { id: userId },
            data: { goldBalance: newBalance },
          });

          await this.prisma.goldTransaction.create({
            data: {
              userId,
              type: "BADGE_REWARD",
              amount: verifiedBadge.goldReward,
              balance: newBalance,
              description: `Badge reward: ${verifiedBadge.nameEn}`,
            },
          });
        }
      }
    }

    return {
      verified: isVerified,
      status: isVerified
        ? "Kimlik doğrulandı"
        : "Doğrulama başarısız, tekrar deneyin",
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // LOGIN — Verify OTP for existing users, return token pair
  // ═══════════════════════════════════════════════════════════════

  async login(dto: LoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; isNewUser: boolean };
  }> {
    // Find user by phone
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (!user) {
      throw new BadRequestException(
        "Bu telefon numarasına kayıtlı kullanıcı bulunamadı",
      );
    }

    if (!user.isActive || user.deletedAt) {
      throw new UnauthorizedException("Hesap devre dışı veya silinmiş");
    }

    // Verify OTP code
    await this.verifyOtpCode(user.id, dto.code);

    // Mark SMS as verified (in case it wasn't already)
    if (!user.isSmsVerified) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isSmsVerified: true },
      });
    }

    // Track device fingerprint for abuse detection
    if (dto.deviceId) {
      await this.trackDeviceRegistration(dto.deviceId, dto.phone);
    }

    // Check if user has a profile (determines if onboarding is needed)
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: user.id },
    });

    // Generate tokens and create session
    const tokens = await this.createSession(
      user.id,
      user.phone,
      user.isSelfieVerified,
      user.packageTier,
    );

    return {
      ...tokens,
      user: {
        id: user.id,
        isNewUser: !profile, // No profile = needs onboarding
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // LOGOUT — Revoke current session
  // ═══════════════════════════════════════════════════════════════

  async logout(
    userId: string,
    accessToken?: string,
  ): Promise<{ message: string }> {
    // Blacklist the current access token in Redis so it is rejected immediately
    // by JwtAuthGuard, even before its natural JWT expiry (15 min).
    if (accessToken) {
      const tokenKey = `${TOKEN_BLACKLIST_PREFIX}${this.hashToken(accessToken)}`;
      await this.cache.set(tokenKey, true, ACCESS_TOKEN_TTL_SECONDS);
    }

    // Revoke all active sessions for this user
    await this.prisma.userSession.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: { isRevoked: true },
    });

    return { message: "Başarıyla çıkış yapıldı" };
  }

  // ═══════════════════════════════════════════════════════════════
  // REFRESH TOKEN — Rotate token pair
  // ═══════════════════════════════════════════════════════════════

  async refreshToken(
    dto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Verify refresh token signature
    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: this.configService.get<string>("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException(
        "Geçersiz veya süresi dolmuş refresh token",
      );
    }

    // Find session by hashed refresh token (tokens stored as SHA-256 hashes)
    const hashedRefreshToken = this.hashToken(dto.refreshToken);
    const session = await this.prisma.userSession.findUnique({
      where: { refreshToken: hashedRefreshToken },
    });

    if (!session) {
      throw new UnauthorizedException(
        "Refresh token geçersiz veya iptal edilmiş",
      );
    }

    // If session was recently revoked (within 10 seconds), this is likely a
    // concurrent refresh from the same client, not token theft. Return the
    // latest active session's tokens instead of revoking all sessions.
    if (session.isRevoked) {
      const revokedAt = session.createdAt;
      const gracePeriodMs = 10_000;
      if (revokedAt && Date.now() - revokedAt.getTime() < gracePeriodMs) {
        // Find the newest active session for this user
        const latestSession = await this.prisma.userSession.findFirst({
          where: { userId: session.userId, isRevoked: false },
          orderBy: { createdAt: "desc" },
        });
        if (latestSession) {
          // Re-use the existing session — generate new access token only
          const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
          });
          if (user && user.isActive && !user.deletedAt) {
            const accessToken = await this.jwtService.signAsync(
              {
                sub: user.id,
                phone: user.phone,
                isVerified: user.isSelfieVerified,
                packageTier: user.packageTier,
              },
              {
                expiresIn:
                  this.configService.get<string>("JWT_ACCESS_EXPIRY") || "15m",
              },
            );
            return { accessToken, refreshToken: dto.refreshToken };
          }
        }
      }

      this.logger.warn(
        `Revoked refresh token reuse detected for user ${session.userId}. Revoking all sessions.`,
      );
      await this.prisma.userSession.updateMany({
        where: { userId: session.userId },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException(
        "Refresh token geçersiz veya iptal edilmiş",
      );
    }

    // Check expiration
    if (session.expiresAt < new Date()) {
      await this.prisma.userSession.update({
        where: { id: session.id },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException("Refresh token süresi dolmuş");
    }

    // Revoke old session (token rotation)
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });

    // Get fresh user data for new token
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException("Kullanıcı hesabı aktif değil");
    }

    // Generate new token pair with new session
    return this.createSession(
      user.id,
      user.phone,
      user.isSelfieVerified,
      user.packageTier,
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // APPLE SIGN-IN — verify token, find or create user, issue JWT
  // ═══════════════════════════════════════════════════════════════

  async appleSignIn(dto: {
    identityToken: string;
    appleUserId: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  }): Promise<{
    accessToken: string;
    refreshToken: string;
    isNewUser: boolean;
    userId: string;
  }> {
    // Decode the Apple identity token (JWT) to extract claims
    // In production, verify signature against Apple's public keys (https://appleid.apple.com/auth/keys)
    let tokenPayload: { sub?: string; email?: string };
    try {
      tokenPayload = this.jwtService.decode(dto.identityToken) as {
        sub?: string;
        email?: string;
      };
    } catch {
      throw new UnauthorizedException("Invalid Apple identity token");
    }

    if (!tokenPayload?.sub) {
      throw new UnauthorizedException("Apple token missing subject claim");
    }

    // Apple's stable user identifier from the token
    const appleSub = tokenPayload.sub;

    // Try to find existing user by Apple ID stored in displayId pattern
    const appleIdKey = `APPLE-${appleSub}`;
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { displayId: appleIdKey },
          { phone: appleIdKey },
        ],
        deletedAt: null,
      },
    });

    let isNewUser = false;

    if (!user) {
      // Create new user for Apple Sign-In
      isNewUser = true;
      const displayId = generateDisplayId();

      user = await this.prisma.user.create({
        data: {
          phone: appleIdKey,
          phoneCountryCode: "+0",
          isSmsVerified: true, // Apple handles verification
          displayId,
          profile: {
            create: {
              firstName: dto.firstName || "Apple User",
              lastName: dto.lastName || null,
              birthDate: new Date("2000-01-01"), // Placeholder — user must complete onboarding
              gender: "OTHER",
              intentionTag: "SOHBET_ARKADAS",
            },
          },
        },
      });

      this.logger.log(`New Apple Sign-In user created: ${user.id}`);
    }

    if (!user.isActive) {
      throw new UnauthorizedException("Hesabınız devre dışı bırakılmış");
    }

    const tokens = await this.createSession(
      user.id,
      user.phone,
      user.isSelfieVerified,
      user.packageTier,
    );

    return {
      ...tokens,
      isNewUser,
      userId: user.id,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // DELETE ACCOUNT — GDPR-compliant soft delete + data anonymization
  // ═══════════════════════════════════════════════════════════════

  async deleteAccount(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException("Kullanıcı bulunamadı");
    }

    // Use a transaction for atomicity
    await this.prisma.$transaction(async (tx) => {
      // 1. Soft-delete user
      await tx.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          isActive: false,
          // Anonymize personal data (GDPR right to erasure)
          phone: `deleted_${userId.substring(0, 8)}`,
        },
      });

      // 2. Delete profile data
      await tx.userProfile.deleteMany({
        where: { userId },
      });

      // 3. Remove all photos (in production: also delete from S3)
      await tx.userPhoto.deleteMany({
        where: { userId },
      });

      // 4. Revoke all sessions
      await tx.userSession.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });

      // 5. Cancel active subscriptions
      await tx.subscription.updateMany({
        where: { userId, isActive: true },
        data: {
          isActive: false,
          cancelledAt: new Date(),
          autoRenew: false,
        },
      });

      // 6. Soft-delete all user posts
      await tx.post.updateMany({
        where: { userId },
        data: { deletedAt: new Date() },
      });

      // 7. Deactivate device tokens (stop push notifications)
      await tx.deviceToken.updateMany({
        where: { userId },
        data: { isActive: false },
      });

      // 8. Remove from active matches (unmatch all)
      await tx.match.updateMany({
        where: {
          OR: [{ userAId: userId }, { userBId: userId }],
          isActive: true,
        },
        data: {
          isActive: false,
          unmatchedAt: new Date(),
        },
      });
    });

    this.logger.log(`Account deleted (soft) for user ${userId}`);

    return {
      message:
        "Hesabınız silme işlemine alındı. 30 gün içinde tüm verileriniz kalıcı olarak silinecektir.",
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // EXPORT DATA — GDPR data portability
  // ═══════════════════════════════════════════════════════════════

  async exportUserData(userId: string): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        photos: true,
        answers: true,
        badges: true,
        subscriptions: true,
        notifications: true,
      },
    });

    if (!user) {
      throw new BadRequestException("Kullanici bulunamadi");
    }

    return {
      exportedAt: new Date().toISOString(),
      account: {
        id: user.id,
        phone: user.phone,
        createdAt: user.createdAt,
        packageTier: user.packageTier,
        isSmsVerified: user.isSmsVerified,
        isSelfieVerified: user.isSelfieVerified,
      },
      profile: user.profile,
      photos: user.photos.map((p) => ({
        id: p.id,
        url: p.url,
        isPrimary: p.isPrimary,
      })),
      answers: user.answers,
      badges: user.badges,
      subscriptions: user.subscriptions,
    };
  }

  // ─── Private Helpers ───────────────────────────────────────────

  /**
   * SHA-256 hash for deterministic token hashing (lookup-friendly).
   */
  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Enforce max active sessions per user. Revokes oldest sessions if limit exceeded.
   */
  private async enforceSessionLimit(userId: string): Promise<void> {
    const activeSessions = await this.prisma.userSession.findMany({
      where: { userId, isRevoked: false },
      orderBy: { createdAt: "asc" },
    });

    if (activeSessions.length >= MAX_ACTIVE_SESSIONS_PER_USER) {
      const sessionsToRevoke = activeSessions.slice(
        0,
        activeSessions.length - MAX_ACTIVE_SESSIONS_PER_USER + 1,
      );
      await this.prisma.userSession.updateMany({
        where: { id: { in: sessionsToRevoke.map((s) => s.id) } },
        data: { isRevoked: true },
      });
    }
  }

  /**
   * Generate a cryptographically random 6-digit OTP code.
   */
  private generateOtp(): string {
    const max = Math.pow(10, OTP_LENGTH);
    const randomNumber = crypto.randomInt(0, max);
    return randomNumber.toString().padStart(OTP_LENGTH, "0");
  }

  /**
   * Generate a unique LUMA-XXXX referral code.
   */
  private async generateUniqueReferralCode(): Promise<string> {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for (let attempt = 0; attempt < 10; attempt++) {
      let random = "";
      for (let i = 0; i < 4; i++) {
        random += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const code = `LUMA-${random}`;
      const existing = await this.prisma.user.findUnique({
        where: { referralCode: code },
        select: { id: true },
      });
      if (!existing) return code;
    }
    // Fallback: 6 char code
    let random = "";
    for (let i = 0; i < 6; i++) {
      random += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `LUMA-${random}`;
  }

  /**
   * Send SMS OTP via the SmsProvider.
   * Uses Netgsm for Turkish (+90) numbers, Twilio for international,
   * with automatic fallback and retry logic.
   */
  private async sendSmsOtp(phone: string, code: string): Promise<void> {
    try {
      await this.smsProvider.sendOtp(phone, code);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "SMS gonderilemedi";
      this.logger.error(
        `SMS OTP send failed for ${phone.slice(0, 4)}****: ${errorMessage}`,
      );
      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * Verify OTP code against the database verification record.
   */
  private async verifyOtpCode(userId: string, code: string): Promise<void> {
    // Find the latest pending SMS verification for this user
    const verification = await this.prisma.userVerification.findFirst({
      where: {
        userId,
        type: "SMS",
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!verification) {
      throw new BadRequestException(
        "Doğrulama kodu bulunamadı. Lütfen yeni kod isteyin.",
      );
    }

    // Check expiration
    if (verification.otpExpiresAt && verification.otpExpiresAt < new Date()) {
      await this.prisma.userVerification.update({
        where: { id: verification.id },
        data: { status: "EXPIRED" },
      });
      throw new BadRequestException(
        "Doğrulama kodunun süresi dolmuş. Lütfen yeni kod isteyin.",
      );
    }

    // Check attempt limit
    if (verification.otpAttempts >= MAX_OTP_ATTEMPTS) {
      await this.prisma.userVerification.update({
        where: { id: verification.id },
        data: { status: "EXPIRED" },
      });
      throw new BadRequestException(
        "Çok fazla hatalı deneme. Lütfen yeni kod isteyin.",
      );
    }

    // Compare codes using bcrypt
    const isCodeValid = await bcrypt.compare(code, verification.otpCode ?? "");
    if (!isCodeValid) {
      await this.prisma.userVerification.update({
        where: { id: verification.id },
        data: { otpAttempts: verification.otpAttempts + 1 },
      });
      throw new BadRequestException(
        `Geçersiz doğrulama kodu. ${MAX_OTP_ATTEMPTS - verification.otpAttempts - 1} deneme hakkınız kaldı.`,
      );
    }

    // Success — mark as verified
    await this.prisma.userVerification.update({
      where: { id: verification.id },
      data: {
        status: "VERIFIED",
        verifiedAt: new Date(),
      },
    });
  }

  /**
   * Create a new session with access + refresh token pair.
   * Tokens are hashed before storage; only hashes are persisted.
   */
  private async createSession(
    userId: string,
    phone: string,
    isSelfieVerified: boolean,
    packageTier: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Enforce max active sessions before creating a new one
    await this.enforceSessionLimit(userId);

    const jwtPayload: JwtPayload = {
      sub: userId,
      phone,
      isVerified: isSelfieVerified,
      packageTier,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(jwtPayload),
      this.generateRefreshToken(userId),
    ]);

    // Calculate refresh token expiry
    const refreshExpiryDays = parseInt(
      this.configService.get<string>("JWT_REFRESH_EXPIRY_DAYS", "7"),
      10,
    );
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshExpiryDays);

    // Hash tokens before storing (tokens at rest should not be plaintext)
    const hashedAccessToken = this.hashToken(accessToken);
    const hashedRefreshToken = this.hashToken(refreshToken);

    // Store session in database with hashed tokens
    await this.prisma.userSession.create({
      data: {
        userId,
        accessToken: hashedAccessToken,
        refreshToken: hashedRefreshToken,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private async generateAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>("JWT_SECRET"),
      expiresIn: this.configService.get<string>("JWT_ACCESS_EXPIRY", "15m"),
    });
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId },
      {
        secret: this.configService.get<string>("JWT_REFRESH_SECRET"),
        expiresIn: this.configService.get<string>("JWT_REFRESH_EXPIRY", "7d"),
      },
    );
  }

  /**
   * Track device registrations for abuse detection.
   * Flags devices that register with 3+ distinct phone numbers.
   */
  private async trackDeviceRegistration(
    deviceId: string,
    phone: string,
  ): Promise<void> {
    const cacheKey = `${DEVICE_REGISTRATION_PREFIX}${deviceId}`;
    const existing = await this.cache.get<string[]>(cacheKey);

    const phones = existing ?? [];

    // Add phone if not already tracked for this device
    if (!phones.includes(phone)) {
      phones.push(phone);
      await this.cache.set(cacheKey, phones, DEVICE_TRACKING_TTL_SECONDS);
    }

    // Flag if too many distinct phone registrations from this device
    if (phones.length >= MAX_REGISTRATIONS_PER_DEVICE) {
      this.logger.warn(
        `Device abuse detected: deviceId=${deviceId} has ${phones.length} distinct phone registrations. ` +
          `Phones: ${phones.map((p) => p.slice(0, 4) + "****").join(", ")}`,
      );
    }
  }

  /**
   * Determine which selfie verification provider to use.
   * Reads SELFIE_VERIFICATION_PROVIDER env var:
   *   - 'aws_rekognition' -> AWS Rekognition (future)
   *   - 'basic' or unset  -> basic image validation (no AI)
   */
  private getSelfieVerificationProvider(): "aws_rekognition" | "basic" {
    const provider = this.configService.get<string>(
      "SELFIE_VERIFICATION_PROVIDER",
      "basic",
    );
    if (provider === "aws_rekognition") {
      return "aws_rekognition";
    }
    return "basic";
  }

  /**
   * Validate that a base64 string represents a real image of sufficient size.
   * Returns true if the selfie passes basic validation checks.
   */
  private isValidBase64Image(selfieBase64: string): boolean {
    if (!selfieBase64 || selfieBase64.trim().length === 0) {
      return false;
    }

    // Strip data URI prefix if present (e.g., "data:image/jpeg;base64,...")
    const base64Data = selfieBase64.includes(",")
      ? selfieBase64.split(",")[1]
      : selfieBase64;

    // Check that the remaining string is valid base64
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    if (!base64Data || !base64Regex.test(base64Data)) {
      return false;
    }

    // Calculate decoded size: each base64 char = 6 bits, so 4 chars = 3 bytes
    const paddingChars = (base64Data.match(/=+$/) ?? [""]).join("").length;
    const decodedSizeBytes = (base64Data.length * 3) / 4 - paddingChars;

    // A real photo should be at least 10KB
    const MIN_IMAGE_SIZE_BYTES = 10 * 1024;
    if (decodedSizeBytes < MIN_IMAGE_SIZE_BYTES) {
      return false;
    }

    return true;
  }

  /**
   * Verify selfie liveness using the configured provider.
   * - 'basic': validates the image is a real, sufficiently large base64 photo.
   * - 'aws_rekognition': TODO — integrate AWS Rekognition DetectFaces with liveness.
   * Never throws in production; returns a score instead.
   */
  private verifyLiveness(selfieBase64: string): number {
    const provider = this.getSelfieVerificationProvider();

    if (provider === "aws_rekognition") {
      // TODO: Integrate AWS Rekognition DetectFaces with liveness detection.
      // For now, fall through to basic validation with a warning.
      this.logger.warn(
        "SELFIE_VERIFICATION_PROVIDER is set to aws_rekognition but AWS integration is not yet implemented. Falling back to basic validation.",
      );
    }

    // Basic validation: verify the image is real and large enough
    this.logger.warn(
      "Selfie liveness check using basic validation (no AI). Set SELFIE_VERIFICATION_PROVIDER=aws_rekognition when ready.",
    );

    if (this.isValidBase64Image(selfieBase64)) {
      return 0.85; // Passing score for a valid image
    }
    return 0.3; // Failing score for an invalid image
  }

  /**
   * Verify face comparison using the configured provider.
   * - 'basic': validates the selfie is a real image (no actual face matching).
   * - 'aws_rekognition': TODO — integrate AWS Rekognition CompareFaces.
   * Never throws in production; returns a score instead.
   */
  private verifyFaceComparison(selfieBase64: string): number {
    const provider = this.getSelfieVerificationProvider();

    if (provider === "aws_rekognition") {
      // TODO: Integrate AWS Rekognition CompareFaces against profile photos.
      // For now, fall through to basic validation with a warning.
      this.logger.warn(
        "SELFIE_VERIFICATION_PROVIDER is set to aws_rekognition but AWS integration is not yet implemented. Falling back to basic validation.",
      );
    }

    // Basic validation: verify the image is real and large enough
    this.logger.warn(
      "Selfie face comparison using basic validation (no AI). Set SELFIE_VERIFICATION_PROVIDER=aws_rekognition when ready.",
    );

    if (this.isValidBase64Image(selfieBase64)) {
      return 0.80; // Passing score for a valid image
    }
    return 0.3; // Failing score for an invalid image
  }
}
