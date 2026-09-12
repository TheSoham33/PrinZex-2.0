/**
 * Jest globalSetup for the integration suite — builds a DISPOSABLE Postgres
 * schema for this run:
 *
 *   1. CREATE SCHEMA prinzex_test_<timestamp>_<pid> on the test server
 *   2. prisma migrate deploy into it (the URL's ?schema= sets search_path,
 *      so every unqualified CREATE lands inside the disposable schema)
 *   3. hand the full URL to the test workers via a tmp file (globalSetup and
 *      workers do not share process.env)
 *
 * The teardown drops the schema with CASCADE. Nothing touches a dev database:
 * point INTEGRATION_DATABASE_URL at a throwaway server/database (CI uses a
 * service container; locally `docker compose up -d postgres` and the default
 * below applies).
 *
 * Default local target: the repo docker-compose postgres
 * (postgres:password@localhost:5432/prinzex).
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const INTEGRATION_URL_FILE = path.join(os.tmpdir(), 'prinzex-integration-db-url');

const backendRoot = path.resolve(__dirname, '..');

export default async function globalSetup(): Promise<void> {
  const base =
    process.env.INTEGRATION_DATABASE_URL ??
    'postgresql://postgres:password@localhost:5432/prinzex';
  const schema = `prinzex_test_${Date.now().toString(36)}_${process.pid}`;
  const testUrl = `${base}?schema=${schema}`;

  // 1. Create the disposable schema (db execute runs one script, no ORM).
  //    The URL is inlined (not shell-expanded) so this also runs on Windows.
  execSync(`npx prisma db execute --stdin --url "${base}"`, {
    cwd: backendRoot,
    input: `CREATE SCHEMA IF NOT EXISTS "${schema}";\n`,
    stdio: ['pipe', 'inherit', 'inherit'],
  });

  // 2. Apply every migration into it.
  execSync('npx prisma migrate deploy', {
    cwd: backendRoot,
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: 'inherit',
  });

  // 3. Publish the URL to the test workers (see test/integration-env.ts).
  fs.writeFileSync(INTEGRATION_URL_FILE, testUrl);
  process.stdout.write(`[integration] disposable schema ready: ${schema}\n`);
}
