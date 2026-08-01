#!/usr/bin/env node
/**
 * PrinZex database setup.
 *
 *   1. Applies db/schema.sql to the DATABASE_URL database (idempotent).
 *   2. Creates the initial admin account from ADMIN_EMAIL/ADMIN_PASSWORD if set.
 *
 * Usage:
 *   node scripts/setup-db.mjs
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString =
  process.env.DATABASE_URL || 'postgresql://prinzex:prinzex@localhost:5432/prinzex?schema=public';

async function main() {
  const pool = new Pool({ connectionString });

  console.log('Applying schema...');
  const schemaSql = await readFile(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  // pg can run multiple statements when passed as a single string (simple query protocol).
  await pool.query(schemaSql);
  console.log('Schema applied.');

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await pool.query(
      `INSERT INTO "users" (id, role, name, email, "passwordHash", status, "emailVerified")
       VALUES (gen_random_uuid()::text, 'ADMIN', $1, $2, $3, 'ACTIVE', true)
       ON CONFLICT (email) DO NOTHING`,
      [adminEmail.split('@')[0] || 'Admin', adminEmail, hash],
    );
    console.log(`Admin account ready for ${adminEmail}`);
  } else {
    console.log('No ADMIN_EMAIL/ADMIN_PASSWORD provided — skipping admin creation.');
  }

  await pool.end();
  console.log('Done.');
}

main().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
