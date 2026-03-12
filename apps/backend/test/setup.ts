/**
 * LUMA V1 -- E2E Test Setup
 *
 * Loaded before each E2E test suite via jest `setupFiles`.
 * Configures the test environment:
 * - Sets NODE_ENV to 'test'
 * - Provides fallback environment variables so modules that read from
 *   ConfigService don't crash during test-app bootstrap
 * - Increases default Jest timeout
 * - Suppresses noisy NestJS/Prisma logs in test output
 */

// ── Environment ──────────────────────────────────────────────────────

process.env.NODE_ENV = 'test';

// JWT secrets used by helpers.ts (must match TEST_JWT_SECRET)
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-for-e2e-testing';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'test-jwt-secret-for-e2e-testing';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';

// Database -- tests use mocked PrismaService, but the module still reads the URL
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://test:test@localhost:5432/luma_test';

// Redis -- tests mock Redis; provide a fallback so guard init doesn't throw
process.env.REDIS_URL = process.env.REDIS_URL ?? '';

// External services -- empty strings prevent real API calls
process.env.TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? '';
process.env.TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? '';
process.env.TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER ?? '';
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID ?? '';
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY ?? '';
process.env.AWS_S3_BUCKET = process.env.AWS_S3_BUCKET ?? 'luma-test-bucket';
process.env.AWS_REGION = process.env.AWS_REGION ?? 'eu-west-1';
process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? '';
process.env.SENTRY_DSN = process.env.SENTRY_DSN ?? '';

// ── Jest Configuration ───────────────────────────────────────────────

// Default timeout for individual test cases (30 seconds)
jest.setTimeout(30_000);

// ── Log Suppression ──────────────────────────────────────────────────

// Suppress console.log and console.warn in test output to keep it clean.
// console.error is preserved so genuine failures remain visible.
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

if (!process.env.E2E_VERBOSE) {
  console.log = (...args: unknown[]) => {
    // Allow through if explicitly tagged as test output
    if (typeof args[0] === 'string' && args[0].startsWith('[TEST]')) {
      originalConsoleLog(...args);
    }
  };

  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].startsWith('[TEST]')) {
      originalConsoleWarn(...args);
    }
  };
}
