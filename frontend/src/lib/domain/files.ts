/**
 * Printable-document upload classification — the single source of truth for
 * which file types an order accepts and how each one's page count is found.
 *
 *   PDF        → pages counted exactly with pdf-lib in the browser
 *   JPG/PNG    → one sheet per image (count = 1)
 *   Word/PPT   → modern .docx/.pptx are ZIP containers carrying Office's own
 *                metadata: docProps/app.xml stores <Pages> for documents and
 *                <Slides> for decks (a deck's slide XML files are counted
 *                directly — authoritative). Legacy .doc/.ppt (OLE2) carry no
 *                honest browser-readable count, so those fall back to the
 *                customer typing the number of pages/slides.
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
export type PageCountStrategy = 'pdf' | 'image' | 'office' | null;

export const pageCountStrategy = (fileName: string): PageCountStrategy => {
  const extension = fileExtension(fileName);
  if (extension === 'pdf') return 'pdf';
  if (IMAGE_EXTENSIONS.has(extension)) return 'image';
  if (OFFICE_EXTENSIONS.has(extension)) return 'office';
  return null;
};

const OFFICE_APP_PROPS = 'docProps/app.xml';

/**
 * Best-effort page/slide count from a modern Office file. Returns null when
 * the count can't be known honestly (legacy format, missing metadata, or a
 * file that isn't really a ZIP) — the caller then asks the customer to type
 * it. jszip is lazy-imported so its chunk only loads on Office uploads.
 */
export const readOfficePageCount = async (file: File): Promise<number | null> => {
  const extension = fileExtension(file.name);
  if (extension !== 'docx' && extension !== 'pptx') return null;
  try {
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    if (extension === 'pptx') {
      // Slide XML files are always present in a real deck — count them first.
      const slides = Object.keys(zip.files).filter((entryPath) =>
        /^ppt\/slides\/slide\d+\.xml$/i.test(entryPath),
      ).length;
      if (slides > 0) return slides;
    }
    // Word's stored page count (and the <Slides> metadata fallback for decks).
    const appProps = await zip.file(OFFICE_APP_PROPS)?.async('text');
    if (!appProps) return null;
    const tag = extension === 'pptx' ? 'Slides' : 'Pages';
    const match = appProps.match(new RegExp(`<${tag}>(\\d+)</${tag}>`));
    const count = match ? Number(match[1]) : 0;
    return count > 0 ? count : null;
  } catch {
    return null;
  }
};
