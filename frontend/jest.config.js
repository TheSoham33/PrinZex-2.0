/**
 * Frontend unit suite — ports of the runnable check scripts (the pure
 * order-flow math and persistence: computeCost duplex/stapling/lamination,
 * wrap-cover binding helpers, order-draft persistence). No DOM needed
 * (orderDraft's localStorage is mocked in-test); the remaining check
 * scripts stay under scripts/ and run in CI until they're ported too.
 *
 * @type {import('jest').Config}
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  clearMocks: true,
  verbose: true,
};
