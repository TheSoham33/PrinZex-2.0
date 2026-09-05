/**
 * Runnable check for the Office → PDF pre-flight pieces that can run without
 * LibreOffice installed: the PDF page counter counts a freshly built PDF
 * exactly, the binary resolver honours LIBREOFFICE_PATH/PATH, and a missing
 * binary surfaces as 503 (never a silently stored half-converted file) while
 * leaving the caller's original file on disk for the service to clean up.
 *
 *   npx tsx scripts/check-office-convert.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { ApiError } from '../src/utils/ApiError';
import {
  OFFICE_CONVERTIBLE,
  convertOfficeToPdf,
  resolveSofficePath,
} from '../src/utils/libreoffice';
import { countPdfPages } from '../src/utils/pdf';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prinzex-convert-check-'));

async function main() {
  try {
    /* Exact page count from a real PDF (built with the same pdf-lib). */
    const document = await PDFDocument.create();
    for (let i = 0; i < 3; i++) document.addPage();
    const pdfPath = path.join(dir, 'three-pages.pdf');
    fs.writeFileSync(pdfPath, await document.save());
    assert.equal(await countPdfPages(pdfPath), 3);

    /* Only the four Office extensions convert. */
    assert.deepEqual([...OFFICE_CONVERTIBLE].sort(), ['.doc', '.docx', '.ppt', '.pptx']);

    /* Resolver: explicit env path wins when it exists; bogus values are
     * ignored instead of crashing spawns later. */
    const envBefore = process.env.LIBREOFFICE_PATH;
    const pathBefore = process.env.PATH;
    process.env.LIBREOFFICE_PATH = pdfPath; // exists ⇒ accepted
    assert.equal(resolveSofficePath(), pdfPath);
    process.env.LIBREOFFICE_PATH = path.join(dir, 'no-such-binary');
    process.env.PATH = dir; // empty dir ⇒ nothing on PATH
    if (process.platform !== 'win32') {
      // On Windows the standard install location may legitimately resolve.
      assert.equal(resolveSofficePath(), null);
    }

    /* A conversion can never succeed from garbage input: no binary → 503
     * config error, binary present (dev machine with LibreOffice) → 422
     * conversion failure. Either way the input file is NEVER touched —
     * registerDesignUpload owns cleanup on failure. */
    const resolved = resolveSofficePath();
    const inputDocx = path.join(dir, 'report.docx');
    fs.writeFileSync(inputDocx, 'PK-pretend-office');
    await assert.rejects(
      convertOfficeToPdf(inputDocx, dir),
      (error: unknown) =>
        error instanceof ApiError && error.statusCode === (resolved ? 422 : 503),
    );
    assert.ok(fs.existsSync(inputDocx), 'input must survive a failed conversion');

    process.env.LIBREOFFICE_PATH = envBefore ?? '';
    if (envBefore === undefined) delete process.env.LIBREOFFICE_PATH;
    process.env.PATH = pathBefore;

    console.log('check-office-convert: OK');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
