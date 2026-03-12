/**
 * LUMA V1 -- E2E Test Configuration
 *
 * Separate Jest configuration for end-to-end tests.
 * Uses ts-jest for TypeScript compilation, increased timeouts for HTTP
 * lifecycle operations, and a setup file for test environment initialization.
 */

import type { Config } from 'jest';

const config: Config = {
  // ── Basics ──────────────────────────────────────────────────────────
  displayName: 'e2e',
  testEnvironment: 'node',
  rootDir: '..',
  verbose: true,

  // ── File matching ───────────────────────────────────────────────────
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '.*\\.e2e-spec\\.ts$',

  // ── TypeScript compilation ──────────────────────────────────────────
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
        // Disable type-checking in tests for speed; tsc handles that
        diagnostics: false,
      },
    ],
  },

  // ── Module resolution (matches tsconfig paths) ──────────────────────
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^src/(.*)$': '<rootDir>/src/$1',
  },

  // ── Timeouts ────────────────────────────────────────────────────────
  // E2E tests spin up full NestJS apps; 30s is generous but safe
  testTimeout: 30000,

  // ── Setup / Teardown ────────────────────────────────────────────────
  globalSetup: undefined,
  globalTeardown: undefined,
  setupFiles: ['<rootDir>/test/setup.ts'],

  // ── Execution ───────────────────────────────────────────────────────
  // Run tests serially (--runInBand) since they share ports; this config
  // enforces it even if someone forgets the CLI flag.
  maxWorkers: 1,

  // ── Coverage (optional, usually run via unit tests) ─────────────────
  collectCoverage: false,

  // ── Misc ────────────────────────────────────────────────────────────
  // Fail fast: stop after the first suite failure in CI
  bail: process.env.CI === 'true' ? 1 : 0,

  // Clear mocks between tests automatically
  clearMocks: true,
  restoreMocks: true,
};

export default config;
