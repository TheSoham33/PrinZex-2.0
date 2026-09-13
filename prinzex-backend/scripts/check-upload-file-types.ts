/**
 * Runnable check for design-upload type enforcement: every allowed extension
 * passes magic-byte sniffing only when its leading bytes match the real
 * format (PDF header, PNG/JPEG markers, ZIP container for .pptx, OLE2
 * container for legacy .ppt); mismatched content is deleted + 415. Office
 * formats (doc/docx/xls/xlsx) are intentionally NOT allowed since Office→PDF
 * conversion (Gotenberg) was removed.
 *
 *   npx tsx scripts/check-upload-file-types.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ApiError } from '../src/utils/ApiError';
import { verifyMagicBytes } from '../src/utils/fileUpload';

const HEADERS: Record<string, Buffer> = {
  '.pdf': Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e]), // %PDF-1.
  '.png': Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]),
  '.jpg': Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  '.ppt': Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
  '.pptx': Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]),
};

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prinzex-upload-check-'));
const write = (name: string, bytes: Buffer) => {
  const p = path.join(dir, name);
  fs.writeFileSync(p, Buffer.concat([bytes, Buffer.from('payload-bytes')]));
  return p;
};

async function main() {
  try {
  /* Every allowed extension with its real signature is accepted. */
  for (const [ext, head] of Object.entries(HEADERS)) {
    assert.equal(await verifyMagicBytes(write(`sample${ext}`, head)), ext, ext);
  }

  /* Wrong content for the claimed extension → 415 and the file is deleted. */
  for (const name of ['fake.pptx', 'fake.ppt', 'fake.jpg', 'fake.pdf']) {
    const p = write(name, Buffer.from('MZ-not-a-real-header'));
    await assert.rejects(
      verifyMagicBytes(p),
      (e: unknown) => e instanceof ApiError && e.statusCode === 415,
      name,
    );
    assert.equal(fs.existsSync(p), false, `${name} must be deleted`);
  }

  /* Extensions outside the allowlist (now incl. Word/Excel) → 415, deleted. */
  for (const name of ['evil.exe', 'fake.docx', 'fake.xlsx']) {
    const p = write(name, Buffer.from([0x4d, 0x5a]));
    await assert.rejects(
      verifyMagicBytes(p),
      (e: unknown) => e instanceof ApiError && e.statusCode === 415,
      name,
    );
    assert.equal(fs.existsSync(p), false, `${name} must be deleted`);
  }

    console.log('check-upload-file-types: OK');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
