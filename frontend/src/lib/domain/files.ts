/**
 * Printable-document upload classification — the single source of truth for
 * which file types an order accepts and how each one's page count is found.
 *
 *   PDF        → pages counted exactly with pdf-lib in the browser
 *   JPG/PNG    → one sheet per image (count = 1)
 *   Word/PPT/Excel → uploaded at attach time; the backend converts them to a
 *                print-ready PDF with LibreOffice (exact, final pagination)
 *                and returns that page count — browser-side Office rendering
 *                can be trusted for neither.
 *
 * The backend independently re-verifies the extension and sniffs magic bytes
 * (utils/fileUpload.ts), so client-side checks only guide the UX.
 */

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png']);
const OFFICE_EXTENSIONS = new Set(['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx']);

/** Value for the <input accept> attribute and the error copy. */
export const ACCEPTED_DOCUMENT_TYPES = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.ppt,.pptx,.xls,.xlsx';
/** Human list used in validation/error messages (keep in sync!). */
export const ACCEPTED_DOCUMENT_DESCRIPTION = 'PDF, JPG/JPEG, PNG, DOC, DOCX, PPT, PPTX, XLS or XLSX';

export const fileExtension = (fileName: string): string => {
  const dot = fileName.lastIndexOf('.');
  // dot > 0: no extension, and dotfiles ('.pdf' as the whole name) don't count.
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : '';
};

/** How an uploaded document's page count is determined. */
export type PageCountStrategy = 'pdf' | 'image' | 'office' | null;

export const pageCountStrategy = (fileName: string): PageCountStrategy => {
  const extension = fileExtension(fileName);
  if (extension === 'pdf') return 'pdf';
  if (IMAGE_EXTENSIONS.has(extension)) return 'image';
  if (OFFICE_EXTENSIONS.has(extension)) return 'office';
  return null;
};

/* ── Multi-file orders ─────────────────────────────────────────────────── */

/** Mirrors the backend zod hard ceiling (catalog.schemas.ts). */
export const MAX_FILES_PER_ORDER = 10;

/** Subset of a 'service-categories' catalogue row the order page needs for
 *  the multi-file policy. */
export interface ServiceCatalogCategory {
  id: string;
  name: string;
  services: ReadonlyArray<{
    id: string;
    name: string;
    /** Admin kill switch — absent = active. */
    isActive?: boolean;
    maxFilesPerOrder?: number;
    /** Admin search tags — alternate names customers search by. */
    tags?: string[];
  }>;
}

/**
 * How many files the customer may attach to one order of a service. The
 * admin sets it per service in the catalogue (absent = 1, the original
 * single-file flow); the backend independently enforces the same rule at
 * order placement, so being defensive here is about UX, not security.
 */
export function maxFilesForService(
  categories: ReadonlyArray<ServiceCatalogCategory> | undefined,
  serviceId: string | null | undefined,
): number {
  if (!categories || !serviceId) return 1;
  for (const category of categories) {
    for (const service of category.services ?? []) {
      if (service.id === serviceId) {
        const n = service.maxFilesPerOrder;
        return typeof n === 'number' && Number.isInteger(n)
          ? Math.min(Math.max(1, n), MAX_FILES_PER_ORDER)
          : 1;
      }
    }
  }
  return 1;
}

/** Pages across every attached file (files whose count isn't known yet
 *  contribute 0) — feeds specs.totalPages, which pricing already reads. */
export function totalPagesOf(files: ReadonlyArray<{ pages?: number }>): number {
  return files.reduce((sum, file) => sum + (file.pages ?? 0), 0);
}

/** URLs sent at order placement: files already uploaded (Office conversions)
 *  carry their real URL; browser-side files keep the pre-existing stub. */
export function fileUrlsForOrder(
  files: ReadonlyArray<{ serverFileUrl?: string }>,
): string[] {
  return files.map((file) => file.serverFileUrl ?? '/uploads/designs/demo.pdf');
}
