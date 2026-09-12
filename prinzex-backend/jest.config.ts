import type { Config } from 'jest';

/**
 * Unit-test suite (pure cores + parsers — no databases or sidecars).
 * `src/__tests__/setup-unit-env.ts` satisfies envalid with placeholder values
 * before any module loads. The integration suite lives under
 * src/__tests__/integration and runs via `npm run test:integration`
 * (jest.integration.config.ts) against a disposable Postgres schema.
 */
const config: Config = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts', '**/*.spec.ts'],
  testPathIgnorePatterns: ['<rootDir>/src/__tests__/integration'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFiles: ['<rootDir>/src/__tests__/setup-unit-env.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts'],
  coverageDirectory: 'coverage',
  clearMocks: true,
  verbose: true,
};

export default config;
