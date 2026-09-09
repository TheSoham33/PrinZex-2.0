/**
 * Guard for the "OTP never arrives" bug class:
 *   seeded riders stored "+91…" while registration stores 10 digits, and
 *   delivery login looked the phone up by exact string — a 10-digit input
 *   silently missed (200 fake-success, no OTP generated).
 *
 * 1. canonicalPhone maps every accepted login form to the 10-digit record.
 * 2. Every seeded rider phone matches the registration storage format.
 *
 * Run: npx tsx scripts/check-delivery-phone.ts   (from prinzex-backend)
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { canonicalPhone } from '../src/utils/phone';

// 1. Canonicalization — both typed forms land on the same record.
assert.equal(canonicalPhone('9700000003'), '9700000003', 'bare 10 digits unchanged');
assert.equal(canonicalPhone('+919700000003'), '9700000003', 'strips +91');
assert.equal(canonicalPhone('919700000003'), '9700000003', 'strips 91 prefix');
assert.equal(canonicalPhone('9198765432'), '9198765432', 'genuine 91-leading mobile kept');

// 2. Seed storage format — identical to what registration accepts.
const seed = readFileSync(join(__dirname, '..', 'prisma', 'seed.ts'), 'utf8');
const boysBlock = seed.slice(seed.indexOf('const DELIVERY_BOYS'), seed.indexOf('for (const d of DELIVERY_BOYS)'));
const phones = [...boysBlock.matchAll(/phone:\s*'([^']+)'/g)].map((m) => m[1]);
assert.ok(phones.length >= 3, 'expected the 3 seeded riders');
for (const p of phones) {
  assert.match(p, /^\d{10}$/, `seeded rider phone must be 10 digits like registration stores, got ${p}`);
}

console.log(`OK: canonicalPhone handles all login forms (${phones.length} seeded rider numbers verified).`);
