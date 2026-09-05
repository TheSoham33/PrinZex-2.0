/**
 * Runnable check for the Gotenberg Office → PDF client. A mock Gotenberg
 * server (node:http, ephemeral port) exercises the real fetch path:
 *
 *   200 + real PDF  → conversion succeeds, exact bytes stored, pages count
 *   500             → 422 user copy, input preserved, no output written
 *   200 + garbage   → 422 (a 200 is only trusted when bytes really are %PDF)
 *   server down     → 503 config error, input preserved, console warn names
 *                     the socket cause (ECONNREFUSED …) and the fix
 *
 *   npx tsx scripts/check-office-convert.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { ApiError } from '../src/utils/ApiError';
import {
  OFFICE_CONVERTIBLE,
  convertOfficeToPdf,
  gotenbergUrl,
} from '../src/utils/gotenberg';
import { countPdfPages } from '../src/utils/pdf';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prinzex-convert-check-'));
const inputDocx = path.join(dir, 'report.docx');
const expectedPdf = path.join(dir, 'report.pdf');

async function expectApiError(promise: Promise<unknown>, statusCode: number, label: string) {
  await assert.rejects(
    promise,
    (error: unknown) => error instanceof ApiError && error.statusCode === statusCode,
    label,
  );
  assert.ok(fs.existsSync(inputDocx), `${label}: input must survive`);
  assert.ok(!fs.existsSync(expectedPdf), `${label}: no half-written output`);
}

async function main() {
  try {
    /* Exact page count from a real PDF (also the mock's success payload). */
    const document = await PDFDocument.create();
    for (let i = 0; i < 3; i++) document.addPage();
    const pdfBytes = Buffer.from(await document.save());
    fs.writeFileSync(path.join(dir, 'three-pages.pdf'), pdfBytes);
    assert.equal(await countPdfPages(path.join(dir, 'three-pages.pdf')), 3);

    /* Only the four Office extensions convert. */
    assert.deepEqual([...OFFICE_CONVERTIBLE].sort(), ['.doc', '.docx', '.ppt', '.pptx']);

    /* The default sidecar port is 3200, NOT 3000 — 3000 is the Next.js dev
     * server, and hitting it used to surface as a mysterious 422 on upload. */
    const savedGotenbergUrl = process.env.GOTENBERG_URL;
    delete process.env.GOTENBERG_URL;
    assert.equal(gotenbergUrl(), 'http://localhost:3200');
    process.env.GOTENBERG_URL = 'http://example:9/'; // trailing slash trimmed
    assert.equal(gotenbergUrl(), 'http://example:9');
    if (savedGotenbergUrl === undefined) delete process.env.GOTENBERG_URL;
    else process.env.GOTENBERG_URL = savedGotenbergUrl;

    fs.writeFileSync(inputDocx, Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14])); // PK-pretend office

    /* Mock Gotenberg — response mode controlled per case. The multipart
     * envelope is validated with the same strictness Go's mime/multipart
     * parser applies (this is the one thing the mock must not rubber-stamp):
     * boundary prefix, a `files` part with the original filename, byte-exact
     * payload, closing delimiter. */
    let mode: 'ok' | 'fail' | 'garbage' = 'ok';
    let multipartReport = '';
    const server = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/forms/libreoffice/convert') {
        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
          const body = Buffer.concat(chunks);
          const boundary = /boundary=([^;]+)/.exec(
            (req.headers['content-type'] ?? '').replace(/"/g, ''),
          )?.[1];
          const text = body.toString('latin1');
          if (!boundary) multipartReport = 'missing boundary in content-type';
          else if (!text.startsWith(`--${boundary}\r\n`)) multipartReport = 'bad opening delimiter';
          else if (!/content-disposition: form-data; name="files"; filename="report\.docx"/i.test(text))
            multipartReport = 'files part missing or filename lost';
          else if (body.indexOf(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14])) === -1)
            multipartReport = 'payload bytes corrupted in transit';
          else if (!text.endsWith(`--${boundary}--\r\n`)) multipartReport = 'bad closing delimiter';
          else multipartReport = '';
          if (mode === 'ok') {
            res.writeHead(200, { 'content-type': 'application/pdf' });
            res.end(pdfBytes);
          } else if (mode === 'garbage') {
            res.writeHead(200, { 'content-type': 'text/plain' });
            res.end('not-a-pdf');
          } else {
            res.writeHead(500, { 'content-type': 'text/plain' });
            res.end('boom');
          }
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as { port: number };
    process.env.GOTENBERG_URL = `http://127.0.0.1:${port}`;

    /* 200 + real PDF → stored byte-exact under the same basename. */
    const output = await convertOfficeToPdf(inputDocx, dir);
    assert.equal(output, expectedPdf);
    assert.equal(multipartReport, '', `multipart shape rejected by the strict parser: ${multipartReport}`);
    assert.ok(fs.readFileSync(output).equals(pdfBytes));
    assert.equal(await countPdfPages(output), 3);
    fs.unlinkSync(expectedPdf);

    /* Service-side failure → 422, nothing written. */
    mode = 'fail';
    await expectApiError(convertOfficeToPdf(inputDocx, dir), 422, 'Gotenberg 500');

    /* Bogus 200 body → 422 (magic guard). */
    mode = 'garbage';
    await expectApiError(convertOfficeToPdf(inputDocx, dir), 422, 'garbage 200');

    /* Unreachable service → 503 config error, and the once-per-process
       console warn names the socket cause (undici hides it on error.cause). */
    await new Promise<void>((resolve) => server.close(() => resolve()));
    const warns: string[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      warns.push(args.map(String).join(' '));
    };
    try {
      await expectApiError(convertOfficeToPdf(inputDocx, dir), 503, 'service down');
    } finally {
      console.warn = originalWarn;
    }
    assert.ok(
      warns.some((line) => line.includes('ECONNREFUSED') && line.includes('docker compose up -d gotenberg')),
      'the down-service warn must name the connection cause and the fix',
    );

    console.log('check-office-convert: OK');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
