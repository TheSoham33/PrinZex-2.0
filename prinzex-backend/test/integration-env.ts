/**
 * Jest setupFiles for the integration suite — runs in each worker BEFORE any
 * test module (and therefore before `config/env` and the Prisma client are
 * constructed). Reads the disposable-schema URL written by the global setup;
 * sets safe defaults for everything else envalid requires.
 *
 * Redis is real for the integration suite (OTP storage and login-attempt
 * tracking go through it) — point REDIS_HOST/REDIS_PORT at the compose
 * service locally; CI maps a service container onto localhost:6379.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const INTEGRATION_URL_FILE = path.join(os.tmpdir(), 'prinzex-integration-db-url');

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.PORT = process.env.PORT ?? '3001';
process.env.MONGODB_URI =
  process.env.MONGODB_URI ?? 'mongodb://localhost:27017/prinzex_test';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'integration-test-access-secret';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'integration-test-refresh-secret';
process.env.REDIS_HOST = process.env.REDIS_HOST ?? 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6379';

// The disposable schema created by test/integration-global-setup.ts. Fall
// back to a stable local name so a plain `jest` run without the global setup
// still boots (and fails loudly against a missing schema, not env).
process.env.DATABASE_URL =
  (fs.existsSync(INTEGRATION_URL_FILE) && fs.readFileSync(INTEGRATION_URL_FILE, 'utf8').trim()) ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:password@localhost:5432/prinzex?schema=prinzex_test';
