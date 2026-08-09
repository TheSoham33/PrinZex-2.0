import fs from 'fs';
import path from 'path';
import { REDIS_KEYS, REDIS_TTL } from '../../config/redis';
import { ApiError } from '../../utils/ApiError';
import { getCache, setCache, invalidateCache } from '../../utils/cache';
import { DESIGN_DIR, verifyMagicBytes } from '../../utils/fileUpload';

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
}

export async function registerDesignUpload(
  userId: string,
  file: Express.Multer.File,
): Promise<UploadResult> {
  // Magic-byte verification happens after multer's extension filter.
  // Throws 415 (and deletes the file) on mismatch.
  await verifyMagicBytes(file.path);

  const metadata: UploadMetadata = {
    userId,
    originalName: file.originalname,
    sizeBytes: file.size,
    mimeType: file.mimetype,
    uploadedAt: new Date().toISOString(),
  };
  await setCache(REDIS_KEYS.UPLOAD_METADATA(file.filename), metadata, REDIS_TTL.UPLOAD_METADATA);

  return {
    fileUrl: `/uploads/designs/${file.filename}`,
    fileName: file.originalname,
    sizeKb: Math.round(file.size / 1024),
    mimeType: file.mimetype,
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
