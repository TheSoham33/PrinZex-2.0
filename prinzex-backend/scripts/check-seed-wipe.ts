/**
 * Guard: every `prisma.<accessor>` used by prisma/seed.ts must exist in
 * prisma/schema.prisma. Seed previously wiped a table that no longer
 * exists (OTPs moved to Redis), crashing `npx prisma db seed` with
 * "Cannot read properties of undefined (reading 'deleteMany')".
 *
 * Run: npx tsx scripts/check-seed-wipe.ts   (from prinzex-backend)
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const schema = readFileSync(join(root, 'prisma', 'schema.prisma'), 'utf8');
const seed = readFileSync(join(root, 'prisma', 'seed.ts'), 'utf8');

const accessor = (model: string) => model.charAt(0).toLowerCase() + model.slice(1);
const modelAccessors = new Set(
  [...schema.matchAll(/^model\s+(\w+)/gm)].map((m) => accessor(m[1])),
);
const seedAccessors = new Set(
  [...seed.matchAll(/prisma\.([a-zA-Z]\w*)\./g)].map((m) => m[1]),
);

const missing = [...seedAccessors].filter((a) => !modelAccessors.has(a));
const unwiped = [...modelAccessors].filter((a) => !seedAccessors.has(a));

if (missing.length > 0) {
  console.error(`FAIL: seed.ts uses client accessors with no schema model: ${missing.join(', ')}`);
  process.exit(1);
}

// Informational only: models the seed never touches (e.g. CatalogEntry is
// seeded by SQL migrations and must NOT be wiped).
console.log(`OK: ${seedAccessors.size} seed accessors all match schema models (${modelAccessors.size} models).`);
console.log(`note: seed ignores models: ${unwiped.join(', ') || '(none)'}`);
