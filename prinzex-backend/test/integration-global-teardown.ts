/**
 * Jest globalTeardown for the integration suite — drops the disposable
 * Postgres schema created by the global setup (CASCADE removes every table,
 * enum and index inside it) and removes the URL handoff file. Failures only
 * warn: a leaked prinzex_test_* schema on a throwaway server is harmless and
 * must never mask the actual test results.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const INTEGRATION_URL_FILE = path.join(os.tmpdir(), 'prinzex-integration-db-url');

const backendRoot = path.resolve(__dirname, '..');

export default async function globalTeardown(): Promise<void> {
  try {
    if (!fs.existsSync(INTEGRATION_URL_FILE)) return;
    const testUrl = fs.readFileSync(INTEGRATION_URL_FILE, 'utf8').trim();
    const [base, query] = testUrl.split('?');
    const schema = new URLSearchParams(query ?? '').get('schema');
    if (base && schema && /^prinzex_test_[a-z0-9_]+$/i.test(schema)) {
      execSync(`npx prisma db execute --stdin --url "${base}"`, {
        cwd: backendRoot,
        input: `DROP SCHEMA IF EXISTS "${schema}" CASCADE;\n`,
        stdio: ['pipe', 'inherit', 'inherit'],
      });
      process.stdout.write(`[integration] disposable schema dropped: ${schema}\n`);
    }
  } catch (error) {
    process.stdout.write(
      `[integration] WARNING: disposable schema teardown failed (${String(error)}) — ` +
        'harmless on a throwaway server, clean it with ' +
        '`DROP SCHEMA prinzex_test_* CASCADE` if needed.\n',
    );
  } finally {
    fs.rmSync(INTEGRATION_URL_FILE, { force: true });
  }
}
