import { UnauthorizedException } from "@nestjs/common";
import { JwtService, TokenExpiredError } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { JwtAuthGuard, IS_PUBLIC_KEY } from "./jwt-auth.guard";
import { LumaCacheService } from "../../modules/cache/cache.service";

describe("JwtAuthGuard", () => {
  let guard: JwtAuthGuard;
  let jwtService: JwtService;
  let configService: ConfigService;
  let reflector: Reflector;
  let cacheService: LumaCacheService;

  const mockPayload = {
    sub: "user-123",
    phone: "+905551234567",
    isVerified: true,
    packageTier: "free",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 900,
  };

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn().mockResolvedValue(mockPayload),
    } as unknown as JwtService;

    configService = {
      get: jest.fn((key: string) => {
        if (key === "JWT_SECRET") return "test-secret";
        return undefined;
      }),
    } as unknown as ConfigService;

    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;

    cacheService = {
      isRedisConnected: jest.fn().mockReturnValue(true),
      get: jest.fn().mockResolvedValue(null),
    } as unknown as LumaCacheService;

    guard = new JwtAuthGuard(jwtService, configService, reflector, cacheService);
  });

  function createMockContext(authHeader?: string) {
    const request: Record<string, unknown> = {
      headers: {
        authorization: authHeader,
      },
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as never;
  }

  it("should allow public routes", async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

    const result = await guard.canActivate(createMockContext());
    expect(result).toBe(true);
  });

  it("should throw if no authorization header", async () => {
    await expect(guard.canActivate(createMockContext())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("should throw if authorization header is not Bearer", async () => {
    await expect(
      guard.canActivate(createMockContext("Basic abc123")),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("should throw with specific message for expired tokens", async () => {
    (jwtService.verifyAsync as jest.Mock).mockRejectedValue(
      new TokenExpiredError("jwt expired", new Date()),
    );

    await expect(
      guard.canActivate(createMockContext("Bearer expired.token.here")),
    ).rejects.toThrow("Oturumunuzun suresi doldu");
  });

  it("should throw for invalid tokens", async () => {
    (jwtService.verifyAsync as jest.Mock).mockRejectedValue(
      new Error("invalid signature"),
    );

    await expect(
      guard.canActivate(createMockContext("Bearer invalid.token")),
    ).rejects.toThrow("Gecersiz erisim tokeni");
  });

  it("should throw if token payload is missing required claims", async () => {
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue({
      sub: "",
      phone: "",
      iat: 0,
      exp: 0,
    });

    await expect(
      guard.canActivate(createMockContext("Bearer valid.but.empty")),
    ).rejects.toThrow("Gecersiz token icerigi");
  });

  it("should attach user payload to request on success", async () => {
    const context = createMockContext("Bearer valid.jwt.token");
    const request = (
      context as unknown as {
        switchToHttp: () => { getRequest: () => Record<string, unknown> };
      }
    )
      .switchToHttp()
      .getRequest();

    await guard.canActivate(context);

    expect(request["user"]).toEqual(mockPayload);
  });

  it("should verify token with correct secret", async () => {
    await guard.canActivate(createMockContext("Bearer valid.jwt.token"));

    expect(jwtService.verifyAsync).toHaveBeenCalledWith("valid.jwt.token", {
      secret: "test-secret",
    });
  });

  it("should export IS_PUBLIC_KEY constant", () => {
    expect(IS_PUBLIC_KEY).toBe("isPublic");
  });

  it("should reject token when Redis is unavailable (fail-closed)", async () => {
    (cacheService.isRedisConnected as jest.Mock).mockReturnValue(false);

    await expect(
      guard.canActivate(createMockContext("Bearer valid.jwt.token")),
    ).rejects.toThrow("Bu oturum sonlandirildi");
  });

  it("should reject token when it is blacklisted in cache", async () => {
    (cacheService.get as jest.Mock).mockResolvedValue(true);

    await expect(
      guard.canActivate(createMockContext("Bearer blacklisted.token")),
    ).rejects.toThrow("Bu oturum sonlandirildi");
  });

  it("should allow token when cache returns null (not blacklisted)", async () => {
    (cacheService.get as jest.Mock).mockResolvedValue(null);

    const context = createMockContext("Bearer valid.jwt.token");
    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });
});
