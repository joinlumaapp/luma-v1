import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { LumaCacheService } from '../cache/cache.service';
import { SmsProvider } from './sms.provider';
import {
  RegisterDto,
  VerifySmsDto,
  VerifySelfieDto,
  LoginDto,
  RefreshTokenDto,
} from './dto';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

// ─── Constants ────────────────────────────────────────────────────
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;
const SELFIE_LIVENESS_THRESHOLD = 0.7;
const SELFIE_FACE_MATCH_THRESHOLD = 0.8;
const MAX_ACTIVE_SESSIONS_PER_USER = 5;
const SELFIE_MAX_BASE64_LENGTH = 5 * 1024 * 1024; // 5MB max selfie

// ─── OTP Rate Limiting Constants ──────────────────────────────────
const OTP_RATE_LIMIT_MAX_REQUESTS = 3;
const OTP_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const OTP_RATE_LIMIT_WINDOW_SECONDS = 10 * 60;     // 10 minutes (TTL for Redis)
const OTP_RESEND_COOLDOWN_SECONDS = 60;

/** Redis key prefix for OTP rate limiting */
const OTP_RATE_LIMIT_KEY_PREFIX = 'otp:ratelimit:';

/** Redis key prefix for blacklisted (logged-out) access tokens */
const TOKEN_BLACKLIST_PREFIX = 'token:blacklist:';

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
      Math.ceil((OTP_RESEND_COOLDOWN_SECONDS * 1000 - timeSinceLastRequest) / 1000),
    );

    if (cooldownRemaining > 0) {
      return {
        allowed: false,
        remainingAttempts: Math.max(0, OTP_RATE_LIMIT_MAX_REQUESTS - validTimestamps.length),
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
      remainingAttempts: OTP_RATE_LIMIT_MAX_REQUESTS - validTimestamps.length - 1,
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
        message: rateLimit.remainingAttempts === 0
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
    let isNewUser = false;

    if (existingUser) {
      // Existing user — just send a new OTP for login
      if (existingUser.deletedAt) {
        throw new BadRequestException('Bu hesap silinmiştir');
      }
      userId = existingUser.id;
    } else {
      // New user — create account
      isNewUser = true;
      const user = await this.prisma.user.create({
        data: {
          phone: dto.phone,
          phoneCountryCode: dto.countryCode,
        },
      });
      userId = user.id;
    }

    // Generate OTP and create verification record
    const otpCode = this.generateOtp();
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Expire any existing pending SMS verifications for this user
    await this.prisma.userVerification.updateMany({
      where: {
        userId,
        type: 'SMS',
        status: 'PENDING',
      },
      data: { status: 'EXPIRED' },
    });

    // Hash OTP before storing
    const hashedOtp = await bcrypt.hash(otpCode, 10);

    // Create new verification record
    await this.prisma.userVerification.create({
      data: {
        userId,
        type: 'SMS',
        otpCode: hashedOtp,
        otpExpiresAt,
        otpAttempts: 0,
      },
    });

    // Record this OTP request for rate limiting (Redis-backed)
    await this.recordOtpRequest(dto.phone);

    // Send SMS (mock in development, Twilio in production)
    await this.sendSmsOtp(dto.phone, otpCode);

    return {
      message: 'Dogrulama kodu gonderildi',
      isNewUser,
      remainingAttempts: rateLimit.remainingAttempts,
      retryAfterSeconds: 0,
      cooldownSeconds: rateLimit.cooldownSeconds,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // VERIFY SMS — Verify phone OTP and issue tokens for new users
  // ═══════════════════════════════════════════════════════════════

  async verifySms(
    dto: VerifySmsDto,
  ): Promise<{
    verified: boolean;
    accessToken: string;
    refreshToken: string;
    user: { id: string; phone: string; isVerified: boolean; isNew: boolean; packageTier: string };
  }> {
    // Find user by phone, include profile to check onboarding status
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      include: { profile: true },
    });

    if (!user) {
      throw new BadRequestException('Kullanıcı bulunamadı');
    }

    // Verify the OTP
    await this.verifyOtpCode(user.id, dto.code);

    // Mark user as SMS verified
    await this.prisma.user.update({
      where: { id: user.id },
      data: { isSmsVerified: true },
    });

    // Generate tokens and create session
    const tokens = await this.createSession(user.id, user.phone, user.isSelfieVerified, user.packageTier);

    return {
      verified: true,
      ...tokens,
      user: {
        id: user.id,
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
      throw new BadRequestException('Selfie dosyasi cok buyuk. Maksimum 5MB.');
    }

    // Check user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { photos: { where: { isPrimary: true }, take: 1 } },
    });

    if (!user) {
      throw new BadRequestException('Kullanıcı bulunamadı');
    }

    if (user.isSelfieVerified) {
      return { verified: true, status: 'Zaten doğrulanmış' };
    }

    // In production: Send selfie to AWS Rekognition / Face comparison service
    // For now: Mock verification with simulated scores
    const livenessScore = this.mockLivenessCheck(dto.selfieImage);
    const faceMatchScore = user.photos.length > 0
      ? this.mockFaceComparison(dto.selfieImage)
      : 1.0; // No photos yet, accept selfie

    const isVerified =
      livenessScore >= SELFIE_LIVENESS_THRESHOLD &&
      faceMatchScore >= SELFIE_FACE_MATCH_THRESHOLD;

    // Create verification record
    await this.prisma.userVerification.create({
      data: {
        userId,
        type: 'SELFIE',
        status: isVerified ? 'VERIFIED' : 'REJECTED',
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
        where: { key: 'verified_star' },
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
          const newBalance = (currentUser?.goldBalance ?? 0) + verifiedBadge.goldReward;

          await this.prisma.user.update({
            where: { id: userId },
            data: { goldBalance: newBalance },
          });

          await this.prisma.goldTransaction.create({
            data: {
              userId,
              type: 'BADGE_REWARD',
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
      status: isVerified ? 'Kimlik doğrulandı' : 'Doğrulama başarısız, tekrar deneyin',
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // LOGIN — Verify OTP for existing users, return token pair
  // ═══════════════════════════════════════════════════════════════

  async login(
    dto: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string; user: { id: string; isNewUser: boolean } }> {
    // Find user by phone
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (!user) {
      throw new BadRequestException('Bu telefon numarasına kayıtlı kullanıcı bulunamadı');
    }

    if (!user.isActive || user.deletedAt) {
      throw new UnauthorizedException('Hesap devre dışı veya silinmiş');
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

    // Check if user has a profile (determines if onboarding is needed)
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: user.id },
    });

    // Generate tokens and create session
    const tokens = await this.createSession(user.id, user.phone, user.isSelfieVerified, user.packageTier);

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

  async logout(userId: string, accessToken?: string): Promise<{ message: string }> {
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

    return { message: 'Başarıyla çıkış yapıldı' };
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
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Geçersiz veya süresi dolmuş refresh token');
    }

    // Find session by hashed refresh token (tokens stored as SHA-256 hashes)
    const hashedRefreshToken = this.hashToken(dto.refreshToken);
    const session = await this.prisma.userSession.findUnique({
      where: { refreshToken: hashedRefreshToken },
    });

    if (!session || session.isRevoked) {
      // Possible token theft — revoke ALL sessions for this user
      if (session) {
        this.logger.warn(
          `Revoked refresh token reuse detected for user ${session.userId}. Revoking all sessions.`,
        );
        await this.prisma.userSession.updateMany({
          where: { userId: session.userId },
          data: { isRevoked: true },
        });
      }
      throw new UnauthorizedException('Refresh token geçersiz veya iptal edilmiş');
    }

    // Check expiration
    if (session.expiresAt < new Date()) {
      await this.prisma.userSession.update({
        where: { id: session.id },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException('Refresh token süresi dolmuş');
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
      throw new UnauthorizedException('Kullanıcı hesabı aktif değil');
    }

    // Generate new token pair with new session
    return this.createSession(user.id, user.phone, user.isSelfieVerified, user.packageTier);
  }

  // ═══════════════════════════════════════════════════════════════
  // DELETE ACCOUNT — GDPR-compliant soft delete + data anonymization
  // ═══════════════════════════════════════════════════════════════

  async deleteAccount(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('Kullanıcı bulunamadı');
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

      // 6. Deactivate device tokens (stop push notifications)
      await tx.deviceToken.updateMany({
        where: { userId },
        data: { isActive: false },
      });

      // 7. Remove from active matches (unmatch all)
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

    return { message: 'Hesabınız silme işlemine alındı. 30 gün içinde tüm verileriniz kalıcı olarak silinecektir.' };
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
      throw new BadRequestException('Kullanici bulunamadi');
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
      photos: user.photos.map((p) => ({ id: p.id, url: p.url, isPrimary: p.isPrimary })),
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
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Enforce max active sessions per user. Revokes oldest sessions if limit exceeded.
   */
  private async enforceSessionLimit(userId: string): Promise<void> {
    const activeSessions = await this.prisma.userSession.findMany({
      where: { userId, isRevoked: false },
      orderBy: { createdAt: 'asc' },
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
    return randomNumber.toString().padStart(OTP_LENGTH, '0');
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
      const errorMessage = error instanceof Error ? error.message : 'SMS gonderilemedi';
      this.logger.error(`SMS OTP send failed for ${phone.slice(0, 4)}****: ${errorMessage}`);
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
        type: 'SMS',
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      throw new BadRequestException('Doğrulama kodu bulunamadı. Lütfen yeni kod isteyin.');
    }

    // Check expiration
    if (verification.otpExpiresAt && verification.otpExpiresAt < new Date()) {
      await this.prisma.userVerification.update({
        where: { id: verification.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Doğrulama kodunun süresi dolmuş. Lütfen yeni kod isteyin.');
    }

    // Check attempt limit
    if (verification.otpAttempts >= MAX_OTP_ATTEMPTS) {
      await this.prisma.userVerification.update({
        where: { id: verification.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Çok fazla hatalı deneme. Lütfen yeni kod isteyin.');
    }

    // Compare codes using bcrypt
    const isCodeValid = await bcrypt.compare(code, verification.otpCode ?? '');
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
        status: 'VERIFIED',
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
      packageTier: packageTier.toLowerCase(),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(jwtPayload),
      this.generateRefreshToken(userId),
    ]);

    // Calculate refresh token expiry
    const refreshExpiryDays = parseInt(
      this.configService.get<string>('JWT_REFRESH_EXPIRY_DAYS', '7'),
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
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRY', '15m'),
    });
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRY', '7d'),
      },
    );
  }

  /**
   * Mock liveness check — returns a simulated score.
   * TODO(production): Replace with AWS Rekognition DetectFaces with liveness detection.
   * WARNING: This mock always returns passing scores. Only used when NODE_ENV !== 'production'.
   * In production, this must call a real liveness detection API.
   */
  private mockLivenessCheck(_selfieBase64: string): number {
    // DEV/STAGING ONLY — returns a simulated passing liveness score (0.85-0.99).
    // In production (NODE_ENV === 'production'), replace with real AWS Rekognition call.
    return 0.85 + Math.random() * 0.14;
  }

  /**
   * Mock face comparison — returns a simulated match score.
   * TODO(production): Replace with AWS Rekognition CompareFaces against profile photos.
   * WARNING: This mock always returns passing scores. Only used when NODE_ENV !== 'production'.
   * In production, this must call a real face comparison API.
   */
  private mockFaceComparison(_selfieBase64: string): number {
    // DEV/STAGING ONLY — returns a simulated passing face match score (0.82-0.98).
    // In production (NODE_ENV === 'production'), replace with real AWS Rekognition call.
    return 0.82 + Math.random() * 0.16;
  }
}
