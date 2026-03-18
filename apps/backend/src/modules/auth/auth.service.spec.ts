import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { PrismaService } from "../../prisma/prisma.service";
import { LumaCacheService } from "../cache/cache.service";
import { SmsProvider } from "./sms.provider";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";

// Mock bcrypt to control OTP comparison in tests
jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed-otp"),
  compare: jest.fn(),
}));

// ─── Mock Factories ────────────────────────────────────────────────

function createMockUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "user-uuid-1",
    phone: "+905551234567",
    phoneCountryCode: "TR",
    isSmsVerified: false,
    isSelfieVerified: false,
    isFullyVerified: false,
    isActive: true,
    deletedAt: null,
    packageTier: "FREE",
    goldBalance: 0,
    photos: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockVerification(
  overrides: Partial<Record<string, unknown>> = {},
) {
  return {
    id: "verification-uuid-1",
    userId: "user-uuid-1",
    type: "SMS",
    status: "PENDING",
    otpCode: "123456",
    otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
    otpAttempts: 0,
    createdAt: new Date(),
    ...overrides,
  };
}

function createMockSession(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "session-uuid-1",
    userId: "user-uuid-1",
    accessToken: "mock-access-token",
    refreshToken: "mock-refresh-token",
    isRevoked: false,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    createdAt: new Date(),
    ...overrides,
  };
}

// ─── Test Suite ────────────────────────────────────────────────────

describe("AuthService", () => {
  let service: AuthService;
  let _prisma: Record<string, unknown>;
  let _jwtService: JwtService;
  let _configService: ConfigService;

  // ─── Prisma mock objects ───────────────────────────────────────

  const mockPrismaUser = {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const mockPrismaUserVerification = {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };

  const mockPrismaUserSession = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  };

  const mockPrismaUserProfile = {
    findUnique: jest.fn(),
    deleteMany: jest.fn(),
  };

  const mockPrismaUserPhoto = {
    deleteMany: jest.fn(),
  };

  const mockPrismaSubscription = {
    updateMany: jest.fn(),
  };

  const mockPrismaDeviceToken = {
    updateMany: jest.fn(),
  };

  const mockPrismaMatch = {
    updateMany: jest.fn(),
  };

  const mockPrismaBadgeDefinition = {
    findUnique: jest.fn(),
  };

  const mockPrismaUserBadge = {
    upsert: jest.fn(),
  };

  const mockPrismaGoldTransaction = {
    create: jest.fn(),
  };

  const mockPrisma = {
    user: mockPrismaUser,
    userVerification: mockPrismaUserVerification,
    userSession: mockPrismaUserSession,
    userProfile: mockPrismaUserProfile,
    userPhoto: mockPrismaUserPhoto,
    subscription: mockPrismaSubscription,
    deviceToken: mockPrismaDeviceToken,
    match: mockPrismaMatch,
    badgeDefinition: mockPrismaBadgeDefinition,
    userBadge: mockPrismaUserBadge,
    goldTransaction: mockPrismaGoldTransaction,
    $transaction: jest.fn(),
  };

  // ─── JWT and Config mocks ─────────────────────────────────────

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockSmsProvider = {
    sendOtp: jest.fn().mockResolvedValue(true),
  };

  const mockCacheService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    invalidatePattern: jest.fn().mockResolvedValue(undefined),
    isRedisConnected: jest.fn().mockReturnValue(true),
  };

  // ─── Setup ────────────────────────────────────────────────────

  beforeEach(async () => {
    // Reset all mocks including mockResolvedValueOnce queues
    jest.resetAllMocks();

    // Re-setup configService.get mock (cleared by resetAllMocks)
    mockConfigService.get.mockImplementation(
      (key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          JWT_SECRET: "test-jwt-secret",
          JWT_REFRESH_SECRET: "test-refresh-secret",
          JWT_ACCESS_EXPIRY: "15m",
          JWT_REFRESH_EXPIRY: "7d",
          JWT_REFRESH_EXPIRY_DAYS: "7",
          NODE_ENV: "development",
        };
        return config[key] ?? defaultValue;
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SmsProvider, useValue: mockSmsProvider },
        { provide: LumaCacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    _prisma = module.get(PrismaService);
    _jwtService = module.get<JwtService>(JwtService);
    _configService = module.get<ConfigService>(ConfigService);

    // Default JWT mock behavior
    mockJwtService.signAsync.mockResolvedValue("mock-jwt-token");

    // Default SMS provider mock (cleared by resetAllMocks)
    mockSmsProvider.sendOtp.mockResolvedValue(true);

    // Default cache service mock — no existing rate limit entries
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);

    // Default session findMany mock (for enforceSessionLimit)
    mockPrismaUserSession.findMany.mockResolvedValue([]);

    // Default bcrypt.compare mock: compare plain code with stored hash
    // Returns true when the plain code matches the otpCode in the verification record
    (bcrypt.compare as jest.Mock).mockImplementation(
      async (plain: string, _hash: string) => {
        // In tests, the verification mock stores the "expected" plain OTP as otpCode.
        // We compare the submitted code against that value.
        // The hash arg is what was stored (which in mock is the plain value from createMockVerification).
        return plain === _hash;
      },
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // REGISTER
  // ═══════════════════════════════════════════════════════════════

  describe("register()", () => {
    const registerDto = { phone: "+905551234567", countryCode: "TR" };

    it("should create a new user and send OTP when phone is not registered", async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);
      mockPrismaUser.create.mockResolvedValue(createMockUser());
      mockPrismaUserVerification.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaUserVerification.create.mockResolvedValue(
        createMockVerification(),
      );

      const result = await service.register(registerDto);

      expect(result.isNewUser).toBe(true);
      expect(result.message).toBeDefined();
      expect(mockPrismaUser.create).toHaveBeenCalledWith({
        data: {
          phone: "+905551234567",
          phoneCountryCode: "TR",
        },
      });
      // Should expire existing pending verifications
      expect(mockPrismaUserVerification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: "SMS",
            status: "PENDING",
          }),
        }),
      );
      // Should create new verification
      expect(mockPrismaUserVerification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "SMS",
            otpAttempts: 0,
          }),
        }),
      );
    });

    it("should send OTP to existing active user without creating a new user", async () => {
      const existingUser = createMockUser({ isSmsVerified: true });
      mockPrismaUser.findUnique.mockResolvedValue(existingUser);
      mockPrismaUserVerification.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaUserVerification.create.mockResolvedValue(
        createMockVerification(),
      );

      const result = await service.register(registerDto);

      expect(result.isNewUser).toBe(false);
      expect(result.message).toBeDefined();
      expect(mockPrismaUser.create).not.toHaveBeenCalled();
      // Verification should still be created using the existing user's ID
      expect(mockPrismaUserVerification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: existingUser.id,
          }),
        }),
      );
    });

    it("should throw BadRequestException for a deleted account", async () => {
      const deletedUser = createMockUser({ deletedAt: new Date() });
      mockPrismaUser.findUnique.mockResolvedValue(deletedUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        "Bu hesap silinmiştir",
      );
    });

    it("should generate a 6-digit OTP code", async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);
      mockPrismaUser.create.mockResolvedValue(createMockUser());
      mockPrismaUserVerification.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaUserVerification.create.mockResolvedValue(
        createMockVerification(),
      );

      await service.register(registerDto);

      // Since bcrypt.hash is mocked, the stored otpCode will be 'hashed-otp'.
      // Verify the raw OTP via the bcrypt.hash mock call instead.
      const hashCall = (bcrypt.hash as jest.Mock).mock.calls[0];
      const rawOtpCode = hashCall[0];
      expect(rawOtpCode).toMatch(/^\d{6}$/);
    });

    it("should set OTP expiry to 5 minutes in the future", async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);
      mockPrismaUser.create.mockResolvedValue(createMockUser());
      mockPrismaUserVerification.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaUserVerification.create.mockResolvedValue(
        createMockVerification(),
      );

      const beforeCall = Date.now();
      await service.register(registerDto);
      const afterCall = Date.now();

      const createCall = mockPrismaUserVerification.create.mock.calls[0][0];
      const expiresAt = createCall.data.otpExpiresAt as Date;
      const expectedMinExpiry = beforeCall + 5 * 60 * 1000;
      const expectedMaxExpiry = afterCall + 5 * 60 * 1000;

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxExpiry);
    });

    it("should expire all existing pending SMS verifications before creating a new one", async () => {
      const existingUser = createMockUser();
      mockPrismaUser.findUnique.mockResolvedValue(existingUser);
      mockPrismaUserVerification.updateMany.mockResolvedValue({ count: 2 });
      mockPrismaUserVerification.create.mockResolvedValue(
        createMockVerification(),
      );

      await service.register(registerDto);

      expect(mockPrismaUserVerification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: existingUser.id,
          type: "SMS",
          status: "PENDING",
        },
        data: { status: "EXPIRED" },
      });
      // create should be called AFTER updateMany
      expect(mockPrismaUserVerification.create).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // VERIFY SMS
  // ═══════════════════════════════════════════════════════════════

  describe("verifySms()", () => {
    const verifySmsDto = { phone: "+905551234567", code: "123456" };

    it("should verify SMS successfully and return tokens", async () => {
      const user = createMockUser();
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockPrismaUserVerification.findFirst.mockResolvedValue(
        createMockVerification({ otpCode: "123456" }),
      );
      mockPrismaUserVerification.update.mockResolvedValue({});
      mockPrismaUser.update.mockResolvedValue({ ...user, isSmsVerified: true });
      mockPrismaUserSession.create.mockResolvedValue(createMockSession());
      mockJwtService.signAsync.mockResolvedValue("mock-access-token");

      const result = await service.verifySms(verifySmsDto);

      expect(result.verified).toBe(true);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockPrismaUser.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { isSmsVerified: true },
      });
    });

    it("should throw BadRequestException if user does not exist", async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      await expect(service.verifySms(verifySmsDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException for expired OTP", async () => {
      const user = createMockUser();
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockPrismaUserVerification.findFirst.mockResolvedValue(
        createMockVerification({
          otpCode: "123456",
          otpExpiresAt: new Date(Date.now() - 60 * 1000), // expired 1 minute ago
        }),
      );
      mockPrismaUserVerification.update.mockResolvedValue({});

      await expect(service.verifySms(verifySmsDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when max OTP attempts exceeded", async () => {
      const user = createMockUser();
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockPrismaUserVerification.findFirst.mockResolvedValue(
        createMockVerification({
          otpCode: "123456",
          otpAttempts: 5, // MAX_OTP_ATTEMPTS = 5
        }),
      );
      mockPrismaUserVerification.update.mockResolvedValue({});

      await expect(service.verifySms(verifySmsDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException for invalid OTP code and increment attempts", async () => {
      const user = createMockUser();
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockPrismaUserVerification.findFirst.mockResolvedValue(
        createMockVerification({
          otpCode: "999999", // Different from the DTO code
          otpAttempts: 2,
        }),
      );
      mockPrismaUserVerification.update.mockResolvedValue({});

      await expect(
        service.verifySms({ ...verifySmsDto, code: "123456" }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrismaUserVerification.update).toHaveBeenCalledWith({
        where: { id: "verification-uuid-1" },
        data: { otpAttempts: 3 },
      });
    });

    it("should throw BadRequestException when no pending verification exists", async () => {
      const user = createMockUser();
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockPrismaUserVerification.findFirst.mockResolvedValue(null);

      await expect(service.verifySms(verifySmsDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should mark verification as VERIFIED on successful OTP match", async () => {
      const user = createMockUser();
      const verification = createMockVerification({ otpCode: "123456" });
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockPrismaUserVerification.findFirst.mockResolvedValue(verification);
      mockPrismaUserVerification.update.mockResolvedValue({});
      mockPrismaUser.update.mockResolvedValue({ ...user, isSmsVerified: true });
      mockPrismaUserSession.create.mockResolvedValue(createMockSession());

      await service.verifySms(verifySmsDto);

      // The first update call should be the verification status update
      expect(mockPrismaUserVerification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: verification.id },
          data: expect.objectContaining({
            status: "VERIFIED",
          }),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // LOGIN
  // ═══════════════════════════════════════════════════════════════

  describe("login()", () => {
    const loginDto = { phone: "+905551234567", code: "123456" };

    it("should log in an existing user successfully and return tokens", async () => {
      const user = createMockUser({ isSmsVerified: true });
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockPrismaUserVerification.findFirst.mockResolvedValue(
        createMockVerification({ otpCode: "123456" }),
      );
      mockPrismaUserVerification.update.mockResolvedValue({});
      mockPrismaUserProfile.findUnique.mockResolvedValue({ userId: user.id });
      mockPrismaUserSession.create.mockResolvedValue(createMockSession());

      const result = await service.login(loginDto);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.id).toBe(user.id);
      expect(result.user.isNewUser).toBe(false); // Has profile
    });

    it("should indicate isNewUser=true when user has no profile", async () => {
      const user = createMockUser({ isSmsVerified: true });
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockPrismaUserVerification.findFirst.mockResolvedValue(
        createMockVerification({ otpCode: "123456" }),
      );
      mockPrismaUserVerification.update.mockResolvedValue({});
      mockPrismaUserProfile.findUnique.mockResolvedValue(null); // No profile
      mockPrismaUserSession.create.mockResolvedValue(createMockSession());

      const result = await service.login(loginDto);

      expect(result.user.isNewUser).toBe(true);
    });

    it("should throw BadRequestException if user does not exist", async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw UnauthorizedException if user account is inactive", async () => {
      const inactiveUser = createMockUser({ isActive: false });
      mockPrismaUser.findUnique.mockResolvedValue(inactiveUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException if user account is deleted", async () => {
      const deletedUser = createMockUser({
        isActive: true,
        deletedAt: new Date(),
      });
      mockPrismaUser.findUnique.mockResolvedValue(deletedUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should mark user as SMS verified if not already verified", async () => {
      const user = createMockUser({ isSmsVerified: false });
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockPrismaUserVerification.findFirst.mockResolvedValue(
        createMockVerification({ otpCode: "123456" }),
      );
      mockPrismaUserVerification.update.mockResolvedValue({});
      mockPrismaUser.update.mockResolvedValue({ ...user, isSmsVerified: true });
      mockPrismaUserProfile.findUnique.mockResolvedValue(null);
      mockPrismaUserSession.create.mockResolvedValue(createMockSession());

      await service.login(loginDto);

      expect(mockPrismaUser.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { isSmsVerified: true },
      });
    });

    it("should not update SMS verification status if already verified", async () => {
      const user = createMockUser({ isSmsVerified: true });
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockPrismaUserVerification.findFirst.mockResolvedValue(
        createMockVerification({ otpCode: "123456" }),
      );
      mockPrismaUserVerification.update.mockResolvedValue({});
      mockPrismaUserProfile.findUnique.mockResolvedValue({ userId: user.id });
      mockPrismaUserSession.create.mockResolvedValue(createMockSession());

      await service.login(loginDto);

      // user.update should NOT be called for smsVerified since it's already true.
      // It may still be called for other reasons, so check the specific call:
      const smsUpdateCall = mockPrismaUser.update.mock.calls.find(
        (call: unknown[]) =>
          (call[0] as { data: { isSmsVerified?: boolean } }).data
            .isSmsVerified === true,
      );
      expect(smsUpdateCall).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // REFRESH TOKEN
  // ═══════════════════════════════════════════════════════════════

  describe("refreshToken()", () => {
    const refreshTokenDto = { refreshToken: "valid-refresh-token" };

    it("should rotate tokens successfully for valid refresh token", async () => {
      const user = createMockUser();
      const session = createMockSession({
        refreshToken: "valid-refresh-token",
        isRevoked: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      mockJwtService.verifyAsync.mockResolvedValue({ sub: user.id });
      mockPrismaUserSession.findUnique.mockResolvedValue(session);
      mockPrismaUserSession.update.mockResolvedValue({});
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockJwtService.signAsync.mockResolvedValue("new-mock-token");
      mockPrismaUserSession.create.mockResolvedValue(createMockSession());

      const result = await service.refreshToken(refreshTokenDto);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      // Old session should be revoked
      expect(mockPrismaUserSession.update).toHaveBeenCalledWith({
        where: { id: session.id },
        data: { isRevoked: true },
      });
    });

    it("should throw UnauthorizedException for invalid refresh token signature", async () => {
      mockJwtService.verifyAsync.mockRejectedValue(
        new Error("invalid signature"),
      );

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException for expired refresh token (JWT-level)", async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error("jwt expired"));

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException if session not found in database", async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: "user-uuid-1" });
      mockPrismaUserSession.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should detect token theft: revoke ALL sessions when revoked token is reused", async () => {
      const revokedSession = createMockSession({
        refreshToken: "valid-refresh-token",
        isRevoked: true, // Already revoked
        userId: "user-uuid-1",
      });

      mockJwtService.verifyAsync.mockResolvedValue({ sub: "user-uuid-1" });
      mockPrismaUserSession.findUnique.mockResolvedValue(revokedSession);
      mockPrismaUserSession.updateMany.mockResolvedValue({ count: 5 });

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );

      // Should revoke ALL sessions for the user (theft detection)
      expect(mockPrismaUserSession.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-uuid-1" },
        data: { isRevoked: true },
      });
    });

    it("should throw UnauthorizedException for expired session (database-level expiry)", async () => {
      const expiredSession = createMockSession({
        refreshToken: "valid-refresh-token",
        isRevoked: false,
        expiresAt: new Date(Date.now() - 60 * 1000), // expired 1 minute ago
      });

      mockJwtService.verifyAsync.mockResolvedValue({ sub: "user-uuid-1" });
      mockPrismaUserSession.findUnique.mockResolvedValue(expiredSession);
      mockPrismaUserSession.update.mockResolvedValue({});

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );

      // Expired session should be revoked
      expect(mockPrismaUserSession.update).toHaveBeenCalledWith({
        where: { id: expiredSession.id },
        data: { isRevoked: true },
      });
    });

    it("should throw UnauthorizedException if user is no longer active", async () => {
      const session = createMockSession({
        refreshToken: "valid-refresh-token",
        isRevoked: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      const inactiveUser = createMockUser({ isActive: false });

      mockJwtService.verifyAsync.mockResolvedValue({ sub: inactiveUser.id });
      mockPrismaUserSession.findUnique.mockResolvedValue(session);
      mockPrismaUserSession.update.mockResolvedValue({});
      mockPrismaUser.findUnique.mockResolvedValue(inactiveUser);

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException if user account is deleted", async () => {
      const session = createMockSession({
        refreshToken: "valid-refresh-token",
        isRevoked: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      const deletedUser = createMockUser({ deletedAt: new Date() });

      mockJwtService.verifyAsync.mockResolvedValue({ sub: deletedUser.id });
      mockPrismaUserSession.findUnique.mockResolvedValue(session);
      mockPrismaUserSession.update.mockResolvedValue({});
      mockPrismaUser.findUnique.mockResolvedValue(deletedUser);

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException if user no longer exists", async () => {
      const session = createMockSession({
        refreshToken: "valid-refresh-token",
        isRevoked: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      mockJwtService.verifyAsync.mockResolvedValue({ sub: "user-uuid-1" });
      mockPrismaUserSession.findUnique.mockResolvedValue(session);
      mockPrismaUserSession.update.mockResolvedValue({});
      mockPrismaUser.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should use JWT_REFRESH_SECRET for token verification", async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error("invalid"));

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow();

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(
        "valid-refresh-token",
        { secret: "test-refresh-secret" },
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // LOGOUT
  // ═══════════════════════════════════════════════════════════════

  describe("logout()", () => {
    it("should revoke all active sessions for the user", async () => {
      mockPrismaUserSession.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.logout("user-uuid-1");

      expect(result.message).toBeDefined();
      expect(mockPrismaUserSession.updateMany).toHaveBeenCalledWith({
        where: {
          userId: "user-uuid-1",
          isRevoked: false,
        },
        data: { isRevoked: true },
      });
    });

    it("should succeed even if no active sessions exist", async () => {
      mockPrismaUserSession.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.logout("user-uuid-1");

      expect(result.message).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DELETE ACCOUNT
  // ═══════════════════════════════════════════════════════════════

  describe("deleteAccount()", () => {
    it("should perform GDPR-compliant soft delete with data anonymization", async () => {
      const user = createMockUser();
      mockPrismaUser.findUnique.mockResolvedValue(user);

      // The $transaction mock should execute the callback with a mock transaction
      mockPrisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<void>) => {
          const tx = {
            user: { update: jest.fn().mockResolvedValue({}) },
            userProfile: { deleteMany: jest.fn().mockResolvedValue({}) },
            userPhoto: { deleteMany: jest.fn().mockResolvedValue({}) },
            userSession: { updateMany: jest.fn().mockResolvedValue({}) },
            subscription: { updateMany: jest.fn().mockResolvedValue({}) },
            deviceToken: { updateMany: jest.fn().mockResolvedValue({}) },
            match: { updateMany: jest.fn().mockResolvedValue({}) },
          };
          await callback(tx);
          return tx;
        },
      );

      const result = await service.deleteAccount("user-uuid-1");

      expect(result.message).toBeDefined();
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it("should anonymize phone number in the soft-deleted record", async () => {
      const user = createMockUser();
      mockPrismaUser.findUnique.mockResolvedValue(user);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let capturedTx: any;
      mockPrisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<void>) => {
          capturedTx = {
            user: { update: jest.fn().mockResolvedValue({}) },
            userProfile: { deleteMany: jest.fn().mockResolvedValue({}) },
            userPhoto: { deleteMany: jest.fn().mockResolvedValue({}) },
            userSession: { updateMany: jest.fn().mockResolvedValue({}) },
            subscription: { updateMany: jest.fn().mockResolvedValue({}) },
            deviceToken: { updateMany: jest.fn().mockResolvedValue({}) },
            match: { updateMany: jest.fn().mockResolvedValue({}) },
          };
          await callback(capturedTx);
        },
      );

      await service.deleteAccount("user-uuid-1");

      const userUpdateCall = capturedTx.user.update.mock.calls[0][0];
      expect(userUpdateCall.data.phone).toMatch(/^deleted_/);
      expect(userUpdateCall.data.isActive).toBe(false);
      expect(userUpdateCall.data.deletedAt).toBeInstanceOf(Date);
    });

    it("should delete profile data and photos within the transaction", async () => {
      const user = createMockUser();
      mockPrismaUser.findUnique.mockResolvedValue(user);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let capturedTx: any;
      mockPrisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<void>) => {
          capturedTx = {
            user: { update: jest.fn().mockResolvedValue({}) },
            userProfile: { deleteMany: jest.fn().mockResolvedValue({}) },
            userPhoto: { deleteMany: jest.fn().mockResolvedValue({}) },
            userSession: { updateMany: jest.fn().mockResolvedValue({}) },
            subscription: { updateMany: jest.fn().mockResolvedValue({}) },
            deviceToken: { updateMany: jest.fn().mockResolvedValue({}) },
            match: { updateMany: jest.fn().mockResolvedValue({}) },
          };
          await callback(capturedTx);
        },
      );

      await service.deleteAccount("user-uuid-1");

      expect(capturedTx.userProfile.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-uuid-1" },
      });
      expect(capturedTx.userPhoto.deleteMany).toHaveBeenCalledWith({
        where: { userId: "user-uuid-1" },
      });
    });

    it("should revoke all sessions and cancel subscriptions in the transaction", async () => {
      const user = createMockUser();
      mockPrismaUser.findUnique.mockResolvedValue(user);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let capturedTx: any;
      mockPrisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<void>) => {
          capturedTx = {
            user: { update: jest.fn().mockResolvedValue({}) },
            userProfile: { deleteMany: jest.fn().mockResolvedValue({}) },
            userPhoto: { deleteMany: jest.fn().mockResolvedValue({}) },
            userSession: { updateMany: jest.fn().mockResolvedValue({}) },
            subscription: { updateMany: jest.fn().mockResolvedValue({}) },
            deviceToken: { updateMany: jest.fn().mockResolvedValue({}) },
            match: { updateMany: jest.fn().mockResolvedValue({}) },
          };
          await callback(capturedTx);
        },
      );

      await service.deleteAccount("user-uuid-1");

      expect(capturedTx.userSession.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-uuid-1" },
        data: { isRevoked: true },
      });
      expect(capturedTx.subscription.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-uuid-1", isActive: true },
          data: expect.objectContaining({
            isActive: false,
            autoRenew: false,
          }),
        }),
      );
    });

    it("should deactivate device tokens and unmatch all active matches", async () => {
      const user = createMockUser();
      mockPrismaUser.findUnique.mockResolvedValue(user);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let capturedTx: any;
      mockPrisma.$transaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<void>) => {
          capturedTx = {
            user: { update: jest.fn().mockResolvedValue({}) },
            userProfile: { deleteMany: jest.fn().mockResolvedValue({}) },
            userPhoto: { deleteMany: jest.fn().mockResolvedValue({}) },
            userSession: { updateMany: jest.fn().mockResolvedValue({}) },
            subscription: { updateMany: jest.fn().mockResolvedValue({}) },
            deviceToken: { updateMany: jest.fn().mockResolvedValue({}) },
            match: { updateMany: jest.fn().mockResolvedValue({}) },
          };
          await callback(capturedTx);
        },
      );

      await service.deleteAccount("user-uuid-1");

      expect(capturedTx.deviceToken.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-uuid-1" },
        data: { isActive: false },
      });
      expect(capturedTx.match.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ userAId: "user-uuid-1" }, { userBId: "user-uuid-1" }],
            isActive: true,
          }),
          data: expect.objectContaining({
            isActive: false,
          }),
        }),
      );
    });

    it("should throw BadRequestException if user does not exist", async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      await expect(service.deleteAccount("nonexistent-id")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // VERIFY SELFIE
  // ═══════════════════════════════════════════════════════════════

  describe("verifySelfie()", () => {
    const selfieDto = { selfieImage: "base64-encoded-image-data" };

    it("should return already-verified status if user is already selfie verified", async () => {
      const user = createMockUser({
        isSelfieVerified: true,
        photos: [],
      });
      mockPrismaUser.findUnique.mockResolvedValue(user);

      const result = await service.verifySelfie("user-uuid-1", selfieDto);

      expect(result.verified).toBe(true);
      expect(result.status).toContain("doğrulanmış");
      expect(mockPrismaUserVerification.create).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException if user does not exist", async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      await expect(
        service.verifySelfie("nonexistent-id", selfieDto),
      ).rejects.toThrow(BadRequestException);
    });

    it("should create verification record on successful verification", async () => {
      const user = createMockUser({
        isSelfieVerified: false,
        isSmsVerified: true,
        photos: [],
      });
      mockPrismaUser.findUnique
        .mockResolvedValueOnce(user) // first call: main user fetch
        .mockResolvedValueOnce({ goldBalance: 0 }); // call for gold balance
      mockPrismaUserVerification.create.mockResolvedValue({});
      mockPrismaUser.update.mockResolvedValue({});
      mockPrismaBadgeDefinition.findUnique.mockResolvedValue(null);

      // Mock the private methods to return passing scores
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jest.spyOn(service as any, "verifyLiveness").mockReturnValue(0.95);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jest.spyOn(service as any, "verifyFaceComparison").mockReturnValue(0.9);

      const result = await service.verifySelfie("user-uuid-1", selfieDto);

      expect(result.verified).toBe(true);
      expect(mockPrismaUserVerification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-uuid-1",
            type: "SELFIE",
            status: "VERIFIED",
          }),
        }),
      );
    });

    it("should update user as selfie verified on success", async () => {
      const user = createMockUser({
        isSelfieVerified: false,
        isSmsVerified: true,
        photos: [],
      });
      mockPrismaUser.findUnique
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce({ goldBalance: 0 });
      mockPrismaUserVerification.create.mockResolvedValue({});
      mockPrismaUser.update.mockResolvedValue({});
      mockPrismaBadgeDefinition.findUnique.mockResolvedValue(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jest.spyOn(service as any, "verifyLiveness").mockReturnValue(0.95);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jest.spyOn(service as any, "verifyFaceComparison").mockReturnValue(0.9);

      await service.verifySelfie("user-uuid-1", selfieDto);

      expect(mockPrismaUser.update).toHaveBeenCalledWith({
        where: { id: "user-uuid-1" },
        data: {
          isSelfieVerified: true,
          isFullyVerified: true, // user.isSmsVerified is true
        },
      });
    });

    it("should create REJECTED verification record when liveness check fails", async () => {
      const user = createMockUser({
        isSelfieVerified: false,
        photos: [],
      });
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockPrismaUserVerification.create.mockResolvedValue({});

      // Mock liveness below threshold (0.7)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jest.spyOn(service as any, "verifyLiveness").mockReturnValue(0.3);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jest.spyOn(service as any, "verifyFaceComparison").mockReturnValue(0.9);

      const result = await service.verifySelfie("user-uuid-1", selfieDto);

      expect(result.verified).toBe(false);
      expect(mockPrismaUserVerification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "REJECTED",
            rejectionReason: expect.any(String),
          }),
        }),
      );
      // Should NOT update user verification status
      expect(mockPrismaUser.update).not.toHaveBeenCalled();
    });

    it("should create REJECTED verification record when face match fails", async () => {
      const user = createMockUser({
        isSelfieVerified: false,
        photos: [{ id: "photo-1", isPrimary: true }],
      });
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockPrismaUserVerification.create.mockResolvedValue({});

      // Mock face match below threshold (0.8)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jest.spyOn(service as any, "verifyLiveness").mockReturnValue(0.95);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jest.spyOn(service as any, "verifyFaceComparison").mockReturnValue(0.5);

      const result = await service.verifySelfie("user-uuid-1", selfieDto);

      expect(result.verified).toBe(false);
      expect(mockPrismaUserVerification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "REJECTED",
          }),
        }),
      );
    });

    it("should award verified badge and gold reward when badge exists", async () => {
      const user = createMockUser({
        isSelfieVerified: false,
        isSmsVerified: true,
        photos: [],
      });
      const badge = {
        id: "badge-uuid-1",
        key: "verified_identity",
        nameEn: "Verified Identity",
        goldReward: 50,
      };

      mockPrismaUser.findUnique
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce({ goldBalance: 100 });
      mockPrismaUserVerification.create.mockResolvedValue({});
      mockPrismaUser.update.mockResolvedValue({});
      mockPrismaBadgeDefinition.findUnique.mockResolvedValue(badge);
      mockPrismaUserBadge.upsert.mockResolvedValue({});
      mockPrismaGoldTransaction.create.mockResolvedValue({});

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jest.spyOn(service as any, "verifyLiveness").mockReturnValue(0.95);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jest.spyOn(service as any, "verifyFaceComparison").mockReturnValue(0.9);

      await service.verifySelfie("user-uuid-1", selfieDto);

      // Badge should be awarded
      expect(mockPrismaUserBadge.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_badgeId: { userId: "user-uuid-1", badgeId: "badge-uuid-1" },
          },
        }),
      );

      // Gold reward should be given
      expect(mockPrismaUser.update).toHaveBeenCalledWith({
        where: { id: "user-uuid-1" },
        data: { goldBalance: 150 }, // 100 + 50
      });

      // Gold transaction should be recorded
      expect(mockPrismaGoldTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-uuid-1",
            type: "BADGE_REWARD",
            amount: 50,
            balance: 150,
          }),
        }),
      );
    });

    it("should skip face comparison when user has no photos and accept selfie", async () => {
      const user = createMockUser({
        isSelfieVerified: false,
        isSmsVerified: true,
        photos: [], // No photos
      });
      mockPrismaUser.findUnique
        .mockResolvedValueOnce(user)
        .mockResolvedValueOnce({ goldBalance: 0 });
      mockPrismaUserVerification.create.mockResolvedValue({});
      mockPrismaUser.update.mockResolvedValue({});
      mockPrismaBadgeDefinition.findUnique.mockResolvedValue(null);

      // Liveness passes but face comparison is not called because no photos
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jest.spyOn(service as any, "verifyLiveness").mockReturnValue(0.9);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const faceCompSpy = jest
        .spyOn(service as any, "verifyFaceComparison")
        .mockReturnValue(0.5); // Low score, but should not matter

      const result = await service.verifySelfie("user-uuid-1", selfieDto);

      // Should be verified because faceMatchScore defaults to 1.0 when no photos
      expect(result.verified).toBe(true);
      // verifyFaceComparison should NOT be called (photos.length === 0)
      expect(faceCompSpy).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SESSION CREATION (tested through public methods)
  // ═══════════════════════════════════════════════════════════════

  describe("createSession (via login)", () => {
    it("should call jwtService.signAsync for both access and refresh tokens", async () => {
      const user = createMockUser({ isSmsVerified: true });
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockPrismaUserVerification.findFirst.mockResolvedValue(
        createMockVerification({ otpCode: "123456" }),
      );
      mockPrismaUserVerification.update.mockResolvedValue({});
      mockPrismaUserProfile.findUnique.mockResolvedValue(null);
      mockPrismaUserSession.create.mockResolvedValue(createMockSession());
      mockJwtService.signAsync.mockResolvedValue("some-token");

      await service.login({ phone: "+905551234567", code: "123456" });

      // signAsync should be called at least twice (access + refresh)
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);

      // Access token call
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: user.id,
          phone: user.phone,
          isVerified: user.isSelfieVerified,
          packageTier: "FREE",
        }),
        expect.objectContaining({
          secret: "test-jwt-secret",
          expiresIn: "15m",
        }),
      );

      // Refresh token call
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { sub: user.id },
        expect.objectContaining({
          secret: "test-refresh-secret",
          expiresIn: "7d",
        }),
      );
    });

    it("should enforce session limit by revoking oldest sessions", async () => {
      const user = createMockUser({ isSmsVerified: true });
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockPrismaUserVerification.findFirst.mockResolvedValue(
        createMockVerification({ otpCode: "123456" }),
      );
      mockPrismaUserVerification.update.mockResolvedValue({});
      mockPrismaUserProfile.findUnique.mockResolvedValue(null);
      mockPrismaUserSession.create.mockResolvedValue(createMockSession());

      // Simulate 5 active sessions (MAX_ACTIVE_SESSIONS_PER_USER = 5)
      const activeSessions = Array.from({ length: 5 }, (_, i) =>
        createMockSession({
          id: `session-${i}`,
          createdAt: new Date(Date.now() + i * 1000),
        }),
      );
      mockPrismaUserSession.findMany.mockResolvedValue(activeSessions);
      mockPrismaUserSession.updateMany.mockResolvedValue({ count: 1 });

      await service.login({ phone: "+905551234567", code: "123456" });

      // Should have called updateMany to revoke oldest session
      expect(mockPrismaUserSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: expect.arrayContaining(["session-0"]) } },
          data: { isRevoked: true },
        }),
      );
    });

    it("should store session in the database with hashed tokens and correct expiry", async () => {
      const user = createMockUser({ isSmsVerified: true });
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockPrismaUserVerification.findFirst.mockResolvedValue(
        createMockVerification({ otpCode: "123456" }),
      );
      mockPrismaUserVerification.update.mockResolvedValue({});
      mockPrismaUserProfile.findUnique.mockResolvedValue(null);
      mockPrismaUserSession.create.mockResolvedValue(createMockSession());
      mockJwtService.signAsync.mockResolvedValue("session-token");

      await service.login({ phone: "+905551234567", code: "123456" });

      // Tokens should be stored as SHA-256 hashes, not plaintext
      const expectedHash = crypto
        .createHash("sha256")
        .update("session-token")
        .digest("hex");
      expect(mockPrismaUserSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: user.id,
            accessToken: expectedHash,
            refreshToken: expectedHash,
          }),
        }),
      );

      // Verify expiresAt is approximately 7 days from now
      const createCallData = mockPrismaUserSession.create.mock.calls[0][0].data;
      const expiresAt = createCallData.expiresAt as Date;
      const sevenDaysFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
      expect(Math.abs(expiresAt.getTime() - sevenDaysFromNow)).toBeLessThan(
        5000,
      ); // within 5 seconds
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // SELFIE SIZE VALIDATION
  // ═══════════════════════════════════════════════════════════════

  describe("verifySelfie() — payload size validation", () => {
    it("should throw BadRequestException when selfie image exceeds 5MB", async () => {
      const oversizedImage = "x".repeat(5 * 1024 * 1024 + 1); // Just over 5MB

      await expect(
        service.verifySelfie("user-uuid-1", { selfieImage: oversizedImage }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should accept selfie image within 5MB limit", async () => {
      const validImage = "x".repeat(1000); // Well under limit
      const user = createMockUser({ isSelfieVerified: true, photos: [] });
      mockPrismaUser.findUnique.mockResolvedValue(user);

      const result = await service.verifySelfie("user-uuid-1", {
        selfieImage: validImage,
      });

      expect(result.verified).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // GDPR DATA EXPORT
  // ═══════════════════════════════════════════════════════════════

  describe("exportUserData()", () => {
    it("should return user data in GDPR-compliant export format", async () => {
      const user = createMockUser({
        profile: { displayName: "Test User" },
        photos: [{ id: "p1", url: "photo.jpg", isPrimary: true }],
        answers: [{ questionId: "q1", answer: "A" }],
        badges: [{ badgeId: "b1" }],
        subscriptions: [],
        notifications: [],
      });
      mockPrismaUser.findUnique.mockResolvedValue(user);

      const result = await service.exportUserData("user-uuid-1");

      expect(result.exportedAt).toBeDefined();
      expect(result.account).toBeDefined();
      expect((result.account as Record<string, unknown>).id).toBe(
        "user-uuid-1",
      );
      expect(result.profile).toBeDefined();
      expect(result.photos).toBeDefined();
      expect(result.answers).toBeDefined();
      expect(result.badges).toBeDefined();
    });

    it("should throw BadRequestException if user does not exist", async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      await expect(service.exportUserData("nonexistent-id")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // REFRESH TOKEN — HASHED LOOKUP
  // ═══════════════════════════════════════════════════════════════

  describe("refreshToken() — hashed token lookup", () => {
    it("should look up refresh token by SHA-256 hash", async () => {
      const refreshTokenDto = { refreshToken: "valid-refresh-token" };
      const expectedHash = crypto
        .createHash("sha256")
        .update("valid-refresh-token")
        .digest("hex");

      const user = createMockUser();
      const session = createMockSession({
        refreshToken: expectedHash,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      mockJwtService.verifyAsync.mockResolvedValue({ sub: user.id });
      mockPrismaUserSession.findUnique.mockResolvedValue(session);
      mockPrismaUserSession.update.mockResolvedValue({});
      mockPrismaUser.findUnique.mockResolvedValue(user);
      mockPrismaUserSession.create.mockResolvedValue(createMockSession());

      await service.refreshToken(refreshTokenDto);

      // Should look up by hashed token, not plaintext
      expect(mockPrismaUserSession.findUnique).toHaveBeenCalledWith({
        where: { refreshToken: expectedHash },
      });
    });
  });
});
