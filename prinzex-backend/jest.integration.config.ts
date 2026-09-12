import type { Config } from 'jest';

/**
 * Integration suite — service-level tests against a DISPOSABLE Postgres
 * schema (see test/integration-global-setup.ts) plus Redis for the OTP /
 * login-attempt paths. No MongoDB is needed by the current suite.
 *
 *   npm run test:integration
 *
 * Runs in ONE worker: the whole suite shares the single disposable schema
 * created by the global setup, so parallel workers would race on its
 * lifecycle. Add per-worker schemas before ever parallelizing.
 */
const config: Config = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src/__tests__/integration'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFiles: ['<rootDir>/test/integration-env.ts'],
  globalSetup: '<rootDir>/test/integration-global-setup.ts',
  globalTeardown: '<rootDir>/test/integration-global-teardown.ts',
  testTimeout: 30000,
  maxWorkers: 1,
  // Belt-and-braces: even with the explicit afterAll teardown, shared infra
  // clients (Prisma pool, ioredis) can hold the worker open; forceExit ends
  // the process once tests finish. It never rescues a mid-test hang.
  forceExit: true,
  clearMocks: true,
  verbose: true,
};

export default config;
