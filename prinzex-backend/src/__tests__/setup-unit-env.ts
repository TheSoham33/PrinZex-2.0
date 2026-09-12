/**
 * Jest setupFiles (unit tests) — runs in each worker BEFORE any test module
 * is imported. The modules under test transitively import `config/env`
 * (envalid), which refuses to boot without the required variables; unit
 * tests never touch a database, so placeholder values are enough.
 *
 * Values are only set when absent so a developer's real `.env` still wins.
 */
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.PORT = process.env.PORT ?? '3001';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/prinzex_test';
process.env.MONGODB_URI =
  process.env.MONGODB_URI ?? 'mongodb://localhost:27017/prinzex_test';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'unit-test-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'unit-test-refresh-secret';
