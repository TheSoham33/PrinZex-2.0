import fs from 'fs';
import path from 'path';
import { REDIS_KEYS, REDIS_TTL } from '../../config/redis';
import { ApiError } from '../../utils/ApiError';
import { getCache, setCache, invalidateCache } from '../../utils/cache';
import { DESIGN_DIR, verifyMagicBytes } from '../../utils/fileUpload';
import { OFFICE_CONVERTIBLE, convertOfficeToPdf } from '../../utils/libreoffice';
import { countPdfPages } from '../../utils/pdf';

/**
 * Design upload bookkeeping. Ownership metadata lives in Redis for 24h
 * (keyed by filename) so DELETE can check who uploaded what without a DB.
 */

export interface UploadMetadata {
  userId: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  uploadedAt: string;
}

export interface UploadResult {
  fileUrl: string;
  fileName: string;
  sizeKb: number;
  mimeType: string;
  /** Office uploads only: exact pages of the converted PDF. */
  totalPages?: number;
  /** True when the stored file is a PDF converted from an Office original. */
  convertedToPdf?: boolean;
}

export async function registerDesignUpload(
  userId: string,
  file: Express.Multer.File,
): Promise<UploadResult> {
  // Magic-byte verification happens after multer's extension filter.
  // Throws 415 (and deletes the file) on mismatch.
  await verifyMagicBytes(file.path);

  // Office documents are converted to print-ready PDF before storage: the
  // shop always receives a PDF and pricing uses its exact page count. A
  // failed conversion rejects the upload (no file is kept).
  let storedPath = file.path;
  let storedName = file.filename;
  let storedMime = file.mimetype;
  let storedSize = file.size;
  let totalPages: number | undefined;
  const extension = path.extname(file.filename).toLowerCase();
  if (OFFICE_CONVERTIBLE.has(extension)) {
    try {
      storedPath = await convertOfficeToPdf(file.path, DESIGN_DIR);
      totalPages = await countPdfPages(storedPath);
    } catch (error) {
      await fs.promises.unlink(file.path).catch(() => undefined);
      throw error;
    }
    storedName = path.basename(storedPath);
    storedMime = 'application/pdf';
    storedSize = (await fs.promises.stat(storedPath)).size;
  }

  const metadata: UploadMetadata = {
    userId,
    originalName: file.originalname,
    sizeBytes: storedSize,
    mimeType: storedMime,
    uploadedAt: new Date().toISOString(),
  };
  // Register BEFORE dropping the original, so a cache failure keeps a retry path.
  await setCache(REDIS_KEYS.UPLOAD_METADATA(storedName), metadata, REDIS_TTL.UPLOAD_METADATA);
  if (storedPath !== file.path) {
    await fs.promises.unlink(file.path).catch(() => undefined);
  }

  return {
    fileUrl: `/uploads/designs/${storedName}`,
    fileName: file.originalname,
    sizeKb: Math.round(storedSize / 1024),
    mimeType: storedMime,
    ...(totalPages !== undefined ? { totalPages, convertedToPdf: true } : {}),
  };
}

export async function registerAvatarUpload(
  userId: string,
  file: Express.Multer.File,
): Promise<{ fileUrl: string }> {
  // We only allow images for avatars, but the magic-byte signatures
  // are already configured for PNG/JPG in verifyMagicBytes.
  await verifyMagicBytes(file.path);

  return {
    fileUrl: `/uploads/avatars/${file.filename}`,
  };
}

export async function deleteDesignUpload(userId: string, filename: string): Promise<{ deleted: true }> {
  // Filenames are validated upstream (no path separators), but never trust.
  if (filename !== path.basename(filename)) {
    throw ApiError.badRequest('Invalid filename');
  }

  const key = REDIS_KEYS.UPLOAD_METADATA(filename);
  const metadata = await getCache<UploadMetadata>(key);
  if (!metadata) {
    throw ApiError.notFound('Upload not found (or ownership metadata expired)');
  }
  if (metadata.userId !== userId) {
    // 404 — do not reveal that the file belongs to someone else.
    throw ApiError.notFound('Upload not found');
  }

  const filePath = path.join(DESIGN_DIR, filename);
  await fs.promises.unlink(filePath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  });
  await invalidateCache(key);

  return { deleted: true };
}
