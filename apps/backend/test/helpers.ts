/**
 * LUMA V1 -- E2E Test Helpers
 *
 * Provides utilities for creating isolated NestJS test applications
 * with mocked services, JWT token generation for authenticated requests,
 * test user factories, and shared mock factories used across all E2E test suites.
 *
 * Design decisions:
 * - Each test suite creates its own NestJS app with only the controller(s)
 *   it needs, keeping tests fast and isolated.
 * - Services are mocked at the provider level, so tests validate the full
 *   HTTP pipeline (routing, guards, pipes, DTOs) without needing a database.
 * - JWT tokens are real (signed with TEST_JWT_SECRET) so the JwtAuthGuard
 *   performs actual verification.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, Type } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

// ─── Constants ──────────────────────────────────────────────────────

export const TEST_JWT_SECRET = 'test-jwt-secret-for-e2e-testing';

export const TEST_USER = {
  id: 'e2e-user-uuid-1',
  phone: '+905551234567',
  isVerified: true,
  packageTier: 'free',
} as const;

export const TEST_USER_2 = {
  id: 'e2e-user-uuid-2',
  phone: '+905559876543',
  isVerified: false,
  packageTier: 'gold',
} as const;

export const TEST_USER_3 = {
  id: 'e2e-user-uuid-3',
  phone: '+905553334444',
  isVerified: true,
  packageTier: 'pro',
} as const;

// ─── Types ──────────────────────────────────────────────────────────

interface TestUserPayload {
  sub: string;
  phone: string;
  isVerified: boolean;
  packageTier: string;
}

export interface TestModuleConfig {
  controllers: Type[];
  serviceProviders: Array<{
    provide: Type | string;
    useValue: Record<string, unknown>;
  }>;
}

interface TestAppResult {
  app: INestApplication;
  module: TestingModule;
  jwtToken: string;
  jwtService: JwtService;
}

// ─── JWT Token Generation ───────────────────────────────────────────

/**
 * Generate a valid JWT token for E2E test requests.
 * Uses the same structure as production JwtPayload.
 */
export function generateTestToken(
  jwtService: JwtService,
  payload?: Partial<TestUserPayload>,
): string {
  return jwtService.sign(
    {
      sub: payload?.sub ?? TEST_USER.id,
      phone: payload?.phone ?? TEST_USER.phone,
      isVerified: payload?.isVerified ?? TEST_USER.isVerified,
      packageTier: payload?.packageTier ?? TEST_USER.packageTier,
    },
    { secret: TEST_JWT_SECRET, expiresIn: '1h' },
  );
}

/**
 * Generate an expired JWT token for testing token expiry flows.
 */
export function generateExpiredToken(jwtService: JwtService): string {
  return jwtService.sign(
    {
      sub: TEST_USER.id,
      phone: TEST_USER.phone,
      isVerified: true,
      packageTier: 'free',
    },
    { secret: TEST_JWT_SECRET, expiresIn: '0s' },
  );
}

// ─── Auth Header Builder ────────────────────────────────────────────

/**
 * Build an Authorization header object for supertest requests.
 *
 * @example
 *   request(app.getHttpServer())
 *     .get('/api/v1/profiles/me')
 *     .set(getAuthHeaders(token))
 */
export function getAuthHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

// ─── Test User Factory ──────────────────────────────────────────────

interface CreateTestUserOptions {
  id?: string;
  phone?: string;
  isVerified?: boolean;
  packageTier?: string;
}

interface TestUserWithToken {
  user: TestUserPayload;
  token: string;
}

/**
 * Create a test user payload and corresponding JWT token.
 * Useful when tests need multiple authenticated users.
 *
 * @example
 *   const alice = createTestUser(jwtService, { id: 'alice-id', phone: '+901111111111' });
 *   const bob = createTestUser(jwtService, { id: 'bob-id', packageTier: 'gold' });
 *
 *   await request(app.getHttpServer())
 *     .get('/api/v1/profiles/me')
 *     .set(getAuthHeaders(alice.token))
 *     .expect(200);
 */
export function createTestUser(
  jwtService: JwtService,
  overrides?: CreateTestUserOptions,
): TestUserWithToken {
  const user: TestUserPayload = {
    sub: overrides?.id ?? `test-user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    phone: overrides?.phone ?? `+9055${Math.floor(10000000 + Math.random() * 89999999)}`,
    isVerified: overrides?.isVerified ?? true,
    packageTier: overrides?.packageTier ?? 'free',
  };

  const token = generateTestToken(jwtService, user);

  return { user, token };
}

// ─── Test Data Cleanup ──────────────────────────────────────────────

/**
 * Reset all mock functions in a mock service object.
 * Call in beforeEach() to ensure test isolation.
 *
 * @example
 *   beforeEach(() => {
 *     cleanupTestData(mockAuthService);
 *     cleanupTestData(mockProfilesService);
 *   });
 */
export function cleanupTestData(
  ...mockServices: Array<Record<string, unknown>>
): void {
  for (const service of mockServices) {
    for (const key of Object.keys(service)) {
      const fn = service[key];
      if (typeof fn === 'function' && 'mockReset' in fn) {
        (fn as jest.Mock).mockReset();
      }
    }
  }
}

// ─── Module Builder ─────────────────────────────────────────────────

/**
 * Create a NestJS testing module with:
 * - Real JwtAuthGuard (validates tokens against TEST_JWT_SECRET)
 * - Disabled ThrottlerGuard (no rate limiting in tests)
 * - Global ValidationPipe (DTO validation active)
 * - Global AllExceptionsFilter (error formatting)
 * - Mocked services as provided
 */
export async function createTestModule(
  config: TestModuleConfig,
): Promise<TestingModule> {
  const jwtService = new JwtService({
    secret: TEST_JWT_SECRET,
    signOptions: { expiresIn: '1h' },
  });

  const configService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const configMap: Record<string, string> = {
        JWT_SECRET: TEST_JWT_SECRET,
        JWT_REFRESH_SECRET: TEST_JWT_SECRET,
        JWT_ACCESS_EXPIRY: '15m',
        JWT_REFRESH_EXPIRY: '7d',
        JWT_REFRESH_EXPIRY_DAYS: '7',
        NODE_ENV: 'test',
      };
      return configMap[key] ?? defaultValue ?? undefined;
    }),
  };

  const moduleBuilder = Test.createTestingModule({
    controllers: config.controllers,
    providers: [
      { provide: JwtService, useValue: jwtService },
      { provide: ConfigService, useValue: configService },
      Reflector,
      // Register JwtAuthGuard as global guard (mirrors APP_GUARD in app.module.ts)
      { provide: APP_GUARD, useClass: JwtAuthGuard },
      ...config.serviceProviders,
    ],
  });

  // Override ThrottlerGuard to always allow (no rate limiting in E2E tests)
  moduleBuilder
    .overrideGuard(ThrottlerGuard)
    .useValue({ canActivate: () => true });

  return moduleBuilder.compile();
}

/**
 * Initialize a NestJS application from a compiled testing module.
 * Applies global prefix, validation pipe, and exception filter
 * matching the production main.ts bootstrap configuration.
 */
export async function initTestApp(
  module: TestingModule,
): Promise<INestApplication> {
  const app = module.createNestApplication();

  // Match production main.ts configuration
  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  await app.init();
  return app;
}

/**
 * Full convenience: build module + init app in one call.
 * Returns the app, module, a default JWT token, and the JwtService
 * for creating additional tokens.
 */
export async function createTestApp(
  config: TestModuleConfig,
): Promise<TestAppResult> {
  const module = await createTestModule(config);
  const app = await initTestApp(module);
  const jwtService = module.get<JwtService>(JwtService);
  const jwtToken = generateTestToken(jwtService);

  return { app, module, jwtToken, jwtService };
}

// ─── Mock Factories ─────────────────────────────────────────────────

/**
 * Create a standard mock profile response matching the ProfilesService output.
 */
export function createMockProfile(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    userId: TEST_USER.id,
    profile: {
      firstName: 'Ahmet',
      birthDate: '1998-06-15T00:00:00.000Z',
      gender: 'MALE',
      bio: 'Test kullanicisi',
      city: 'Istanbul',
      intentionTag: 'SERIOUS_RELATIONSHIP',
      height: 180,
      education: 'UNIVERSITY',
      occupation: 'Yazilimci',
    },
    photos: [
      {
        id: 'photo-1',
        url: 'https://cdn.luma.app/photos/test.jpg',
        thumbnailUrl: 'https://cdn.luma.app/photos/test-thumb.jpg',
        order: 0,
        isPrimary: true,
      },
    ],
    profileCompletion: 75,
    ...overrides,
  };
}

/**
 * Create a standard mock feed card response.
 */
export function createMockFeedCard(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    userId: TEST_USER_2.id,
    firstName: 'Ayse',
    age: 25,
    bio: 'Merhaba',
    city: 'Istanbul',
    gender: 'FEMALE',
    intentionTag: 'SERIOUS_RELATIONSHIP',
    distanceKm: 5.2,
    photos: [
      {
        id: 'photo-1',
        url: 'https://cdn.luma.app/photo.jpg',
        thumbnailUrl: 'https://cdn.luma.app/thumb.jpg',
      },
    ],
    isVerified: true,
    compatibility: { score: 85, level: 'SUPER', isSuperCompatible: true },
    feedScore: 72.5,
    ...overrides,
  };
}

/**
 * Create a standard mock conversation response.
 */
export function createMockConversation(
  matchId: string,
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    matchId,
    partner: {
      userId: TEST_USER_2.id,
      firstName: 'Ayse',
      photoUrl: 'https://cdn.luma.app/thumb.jpg',
    },
    lastMessage: {
      id: 'msg-uuid-1',
      content: 'Merhaba!',
      senderId: TEST_USER_2.id,
      type: 'TEXT',
      status: 'SENT',
      mediaUrl: null,
      isRead: false,
      createdAt: '2026-02-24T12:00:00.000Z',
    },
    matchedAt: '2026-02-20T10:00:00.000Z',
    ...overrides,
  };
}

/**
 * Create a standard mock message response.
 */
export function createMockMessage(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    id: `msg-${Date.now()}`,
    senderId: TEST_USER.id,
    content: 'Merhaba!',
    type: 'TEXT',
    status: 'SENT',
    mediaUrl: null,
    isRead: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}
