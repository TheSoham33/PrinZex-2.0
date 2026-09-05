import { execFile } from 'child_process';
import { randomUUID } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import { promisify } from 'util';
import { ApiError } from './ApiError';

/**
 * Office → PDF conversion via LibreOffice headless. Uploaded .doc/.docx/
 * .ppt/.pptx files are converted server-side so the shop receives a
 * print-ready PDF and the platform prices the exact, final pagination —
 * browser-side Office rendering can't be trusted for either.
 *
 * Per the product rule the customer chose, a failed conversion REJECTS the
 * upload (422) — the file is never stored half-processed. The original is
 * deleted by the caller only after a successful conversion is registered.
 */

const execFileAsync = promisify(execFile);

/** Extensions LibreOffice converts to PDF before storage. */
export const OFFICE_CONVERTIBLE: ReadonlySet<string> = new Set([
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
]);

const WINDOWS_SOFFICE_CANDIDATES = [
  'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
  'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
] as const;

let warnedMissingBinary = false;

/** One actionable backend-console line per process when office uploads 503. */
function warnMissingBinaryOnce(): void {
  if (warnedMissingBinary) return;
  warnedMissingBinary = true;
  console.warn(
    '[upload] LibreOffice not found — Office-file uploads are rejected (503). ' +
      `Checked: LIBREOFFICE_PATH="${process.env.LIBREOFFICE_PATH ?? ''}", PATH (soffice/libreoffice)` +
      (process.platform === 'win32'
        ? `, ${WINDOWS_SOFFICE_CANDIDATES.join(', ')}`
        : '') +
      '. Fix: install LibreOffice or set LIBREOFFICE_PATH to its soffice binary in .env, then restart the backend.',
  );
}

/** Absolute path of `binary` anywhere on PATH, or null. */
function findOnPath(binary: string): string | null {
  const names =
    process.platform === 'win32' ? [`${binary}.exe`, `${binary}.com`, binary] : [binary];
  for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
    for (const name of names) {
      const candidate = path.join(dir, name);
      if (dir && fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

/**
 * Locate the LibreOffice binary: explicit LIBREOFFICE_PATH wins when it
 * exists, else soffice/libreoffice on PATH, else the standard Windows
 * install location. Returns null when nothing usable can be found —
 * callers translate that into a 503 config error.
 */
export function resolveSofficePath(): string | null {
  const fromEnv = process.env.LIBREOFFICE_PATH?.trim();
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  const onPath = findOnPath('soffice') ?? findOnPath('libreoffice');
  if (onPath) return onPath;
  if (process.platform === 'win32') {
    const installed = WINDOWS_SOFFICE_CANDIDATES.find((candidate) => fs.existsSync(candidate));
    if (installed) return installed;
  }
  return null;
}

/**
 * Convert an Office document to PDF next to the uploads and return the PDF
 * path (same basename, .pdf extension — that's what soffice emits).
 *
 * Each run gets an isolated LibreOffice user profile: a shared profile makes
 * concurrent conversions randomly fail, and first-run dialogs would hang the
 * headless process.
 */
export async function convertOfficeToPdf(inputPath: string, outDir: string): Promise<string> {
  const soffice = resolveSofficePath();
  if (!soffice) {
    warnMissingBinaryOnce();
    throw new ApiError(
      503,
      'Office-to-PDF conversion is not available on this server — upload a PDF instead',
    );
  }

  const profileDir = path.join(os.tmpdir(), `prinzex-lo-${randomUUID()}`);
  const expected = path.join(outDir, `${path.basename(inputPath, path.extname(inputPath))}.pdf`);
  try {
    await execFileAsync(
      soffice,
      [
        `--env:UserInstallation=${pathToFileURL(profileDir).href}`,
        '--headless',
        '--nologo',
        '--convert-to',
        'pdf',
        '--outdir',
        outDir,
        inputPath,
      ],
      { timeout: 60_000 },
    );
  } catch {
    throw new ApiError(
      422,
      'We could not convert this file to PDF — please convert it yourself (File → Save as PDF) and upload the PDF instead',
    );
  } finally {
    await fs.promises.rm(profileDir, { recursive: true, force: true }).catch(() => undefined);
  }

  // soffice exits 0 even for some failed conversions — trust only the file.
  const exists = await fs.promises.stat(expected).catch(() => null);
  if (!exists || exists.size === 0) {
    throw new ApiError(
      422,
      'We could not convert this file to PDF — please convert it yourself (File → Save as PDF) and upload the PDF instead',
    );
  }
  return expected;
}
