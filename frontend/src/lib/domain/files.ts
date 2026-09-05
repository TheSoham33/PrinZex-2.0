/**
 * Printable-document upload classification — the single source of truth for
 * which file types an order accepts and how each one's page count is found.
 *
 *   PDF        → pages counted exactly with pdf-lib in the browser
 *   JPG/PNG    → one sheet per image (count = 1)
 *   Word/PPT   → page counts depend on print layout, so no library can read
 *                them reliably in the browser — the customer enters the
 *                number of pages/slides manually
 *
 * The backend independently re-verifies the extension and sniffs magic bytes
 * (utils/fileUpload.ts), so client-side checks only guide the UX.
 */

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png']);
const OFFICE_EXTENSIONS = new Set(['doc', 'docx', 'ppt', 'pptx']);

/** Value for the <input accept> attribute and the error copy. */
export const ACCEPTED_DOCUMENT_TYPES = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.ppt,.pptx';
/** Human list used in validation/error messages (keep in sync!). */
export const ACCEPTED_DOCUMENT_DESCRIPTION = 'PDF, JPG/JPEG, PNG, DOC, DOCX, PPT or PPTX';

export const fileExtension = (fileName: string): string => {
  const dot = fileName.lastIndexOf('.');
  // dot > 0: no extension, and dotfiles ('.pdf' as the whole name) don't count.
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : '';
};

/** How an uploaded document's page count is determined. */
export type PageCountStrategy = 'pdf' | 'image' | 'manual' | null;

export const pageCountStrategy = (fileName: string): PageCountStrategy => {
  const extension = fileExtension(fileName);
  if (extension === 'pdf') return 'pdf';
  if (IMAGE_EXTENSIONS.has(extension)) return 'image';
  if (OFFICE_EXTENSIONS.has(extension)) return 'manual';
  return null;
};
