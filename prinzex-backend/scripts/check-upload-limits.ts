/**
 * Runnable check for the admin-configured upload cap. Covers the pure
 * contract without Mongo by injecting a fake settings loader:
 *
 *   parseMaxUploadMb   → accepts whole MB in 1..128, rejects everything else
 *   cache              → reads the store once per TTL window; invalidate()
 *                        forces a fresh read (what updateSettings relies on)
 *   fallback           → null / throwing loaders enforce the 100MB default
 *   multer ceiling     → equals the 128MB configurable maximum, always
 *
 *   npx tsx scripts/check-upload-limits.ts
 */
import assert from 'node:assert/strict';
import { MAX_DESIGN_SIZE_BYTES } from '../src/utils/fileUpload';
import {
  DEFAULT_MAX_UPLOAD_MB,
  MAX_CONFIGURABLE_UPLOAD_MB,
  getMaxUploadDesignBytes,
  invalidateUploadLimitCache,
  parseMaxUploadMb,
} from '../src/utils/uploadLimits';

const MB = 1024 * 1024;

function main() {
  assert.equal(DEFAULT_MAX_UPLOAD_MB, 100);
  assert.equal(MAX_CONFIGURABLE_UPLOAD_MB, 128);
  assert.equal(
    MAX_DESIGN_SIZE_BYTES,
    MAX_CONFIGURABLE_UPLOAD_MB * MB,
    'multer ceiling must equal the configurable maximum (== Gotenberg --api-body-limit)',
  );
}

async function run() {
  main();

  /* Valid admin input. */
  assert.equal(parseMaxUploadMb(100), 100);
  assert.equal(parseMaxUploadMb('64'), 64);
  assert.equal(parseMaxUploadMb(1), 1);
  assert.equal(parseMaxUploadMb(MAX_CONFIGURABLE_UPLOAD_MB), MAX_CONFIGURABLE_UPLOAD_MB);

  /* Rejected: bounds, fractions, junk. */
  for (const bad of [0, 129, -1, 1.5, 'abc', '', null, undefined, {}, Number.NaN]) {
    assert.equal(parseMaxUploadMb(bad), null, `must reject ${String(bad)}`);
  }

  /* Read-through cache: the store is hit once, then served from cache. */
  invalidateUploadLimitCache();
  let reads = 0;
  const fortyTwoMb = async () => {
    reads += 1;
    return 42;
  };
  assert.equal(await getMaxUploadDesignBytes(fortyTwoMb), 42 * MB);
  assert.equal(await getMaxUploadDesignBytes(fortyTwoMb), 42 * MB);
  assert.equal(reads, 1, 'second read inside the TTL must be cached');

  invalidateUploadLimitCache();
  assert.equal(await getMaxUploadDesignBytes(fortyTwoMb), 42 * MB);
  assert.equal(reads, 2, 'invalidate must force a fresh store read');

  /* Fallbacks: unusable or broken store → the shipped default, never a rejection. */
  invalidateUploadLimitCache();
  assert.equal(await getMaxUploadDesignBytes(async () => null), DEFAULT_MAX_UPLOAD_MB * MB);

  invalidateUploadLimitCache();
  assert.equal(
    await getMaxUploadDesignBytes(async () => {
      throw new Error('mongo down');
    }),
    DEFAULT_MAX_UPLOAD_MB * MB,
  );

  invalidateUploadLimitCache();
  console.log('check-upload-limits: OK');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
