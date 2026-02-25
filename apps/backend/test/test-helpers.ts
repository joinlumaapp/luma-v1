/**
 * LUMA V1 — E2E Test Helpers
 *
 * Provides utilities for creating isolated NestJS test applications
 * with mocked services, JWT token generation for authenticated requests,
 * and shared mock factories used across all E2E test suites.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, Type } from '@nestjs/common';
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

// ─── JWT Token Generation ───────────────────────────────────────────

/**
 * Generate a valid JWT token for E2E test requests.
 * Uses the same structure as production JwtPayload.
 */
export function generateTestToken(
  jwtService: JwtService,
  payload?: {
    sub?: string;
    phone?: string;
    isVerified?: boolean;
    packageTier?: string;
  },
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

// ─── Module Builder ─────────────────────────────────────────────────

/**
 * Configuration for building a test module with specific controllers and mocked services.
 */
export interface TestModuleConfig {
  controllers: Type[];
  serviceProviders: Array<{ provide: Type | string; useValue: Record<string, unknown> }>;
}

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
      ...config.serviceProviders,
    ],
  });

  // Override ThrottlerGuard to always allow (no rate limiting in E2E tests)
  moduleBuilder.overrideGuard(ThrottlerGuard).useValue({ canActivate: () => true });

  return moduleBuilder.compile();
}

/**
 * Initialize a NestJS application from a compiled testing module.
 * Applies global prefix, validation pipe, and exception filter
 * matching the production main.ts bootstrap configuration.
 */
export async function initTestApp(module: TestingModule): Promise<INestApplication> {
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
 */
export async function createTestApp(
  config: TestModuleConfig,
): Promise<{ app: INestApplication; module: TestingModule; jwtToken: string }> {
  const module = await createTestModule(config);
  const app = await initTestApp(module);
  const jwtService = module.get<JwtService>(JwtService);
  const jwtToken = generateTestToken(jwtService);

  return { app, module, jwtToken };
}
