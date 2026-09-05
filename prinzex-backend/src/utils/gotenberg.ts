import fs from 'fs';
import path from 'path';
import { ApiError } from './ApiError';

/**
 * Office → PDF conversion via the Gotenberg sidecar container (LibreOffice
 * behind a queued, serialized HTTP API — see docker-compose.yml). The
 * backend POSTs the verified upload to POST {GOTENBERG_URL}/forms/
 * libreoffice/convert and stores the returned PDF: no Office processes on
 * the API host, and pagination is the final, true one. Per the chosen
 * product rule a failed conversion REJECTS the upload (422); an
 * unreachable service is a config problem (503). The input file is never
 * touched here — registerDesignUpload owns cleanup.
 *
 * Gotenberg must never be reachable from the public internet — the compose
 * service binds 127.0.0.1 and only this process (server-to-server) calls
 * it, so no auth is configured.
 */

/** Extensions converted to PDF before storage. */
export const OFFICE_CONVERTIBLE: ReadonlySet<string> = new Set([
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
]);

/** Client-side abort; keeps headroom below the service's --api-timeout. */
const REQUEST_TIMEOUT_MS = 120_000;

const CONVERT_ERROR_USER_COPY =
  'We could not convert this file to PDF — please convert it yourself (File → Save as PDF) and upload the PDF instead';

export function gotenbergUrl(): string {
  // 3200, not 3000 — the Next.js dev server already owns 3000 on a dev box;
  // hitting it yields its 404 "Server action not found", not a conversion.
  return (process.env.GOTENBERG_URL?.trim() || 'http://localhost:3200').replace(/\/+$/, '');
}

let warnedUnavailable = false;

/** One actionable backend-console line per process when office uploads 503. */
function warnUnavailableOnce(): void {
  if (warnedUnavailable) return;
  warnedUnavailable = true;
  console.warn(
    `[upload] Gotenberg conversion service unreachable — Office-file uploads are rejected (503). ` +
      `Expected it at ${gotenbergUrl()} — start it with \`docker compose up -d gotenberg\` ` +
      '(or set GOTENBERG_URL). Already-running uploads recover on the next request; no restart needed.',
  );
}

/**
 * Convert an Office document to PDF next to the uploads and return the PDF
 * path (same basename, .pdf extension — matches the old flow's contract).
 */
export async function convertOfficeToPdf(inputPath: string, outDir: string): Promise<string> {
  const bytes = await fs.promises.readFile(inputPath);
  const body = new FormData();
  // Gotenberg routes by file extension — keep the original name.
  body.append('files', new Blob([bytes], { type: 'application/octet-stream' }), path.basename(inputPath));

  let response: Response;
  try {
    response = await fetch(`${gotenbergUrl()}/forms/libreoffice/convert`, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    warnUnavailableOnce();
    throw new ApiError(
      503,
      'Office-to-PDF conversion is not available on this server — upload a PDF instead',
    );
  }

  const pdf = Buffer.from(await response.arrayBuffer());
  if (!response.ok) {
    // Log Gotenberg's own reason — the customer-facing 422 deliberately
    // hides service internals, so the backend console is the only place a
    // conversion root cause (corrupt/protected file, bad multipart…) shows.
    console.warn(
      `[upload] Gotenberg conversion failed (HTTP ${response.status}): ` +
        `${pdf.toString('utf8', 0, 500) || '(empty body)'}`,
    );
    if (response.status === 404) {
      console.warn(
        `[upload] 404 from ${gotenbergUrl()} — is GOTENBERG_URL really the ` +
          'Gotenberg container? Another app holding that port (classically the ' +
          'Next.js dev server on :3000) answers 404 with non-Gotenberg errors.',
      );
    }
    throw new ApiError(422, CONVERT_ERROR_USER_COPY);
  }
  // A 200 is only trusted when the bytes really are a PDF.
  if (pdf.length === 0 || !pdf.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    console.warn('[upload] Gotenberg answered 200 but the body is not a PDF');
    throw new ApiError(422, CONVERT_ERROR_USER_COPY);
  }

  const output = path.join(outDir, `${path.basename(inputPath, path.extname(inputPath))}.pdf`);
  await fs.promises.writeFile(output, pdf);
  return output;
}
