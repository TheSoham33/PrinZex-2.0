import { promises as fs } from 'fs';
import { PDFDocument } from 'pdf-lib';

/**
 * Exact page count of a PDF on disk — same library the frontend uses for
 * client-side counting, so both ends always agree on a page.
 */
export async function countPdfPages(filePath: string): Promise<number> {
  const bytes = await fs.readFile(filePath);
  const document = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return document.getPageCount();
}
