import fs from 'fs';
import path from 'path';
import { REDIS_KEYS, REDIS_TTL } from '../../config/redis';
import { ApiError } from '../../utils/ApiError';
import { getCache, setCache, invalidateCache } from '../../utils/cache';
import {
  DESIGN_DIR,
  isEvidenceVideoExtension,
  MAX_EVIDENCE_IMAGE_BYTES,
  verifyEvidenceMagicBytes,
  verifyMagicBytes,
} from '../../utils/fileUpload';
import { getMaxUploadDesignBytes } from '../../utils/uploadLimits';

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
  // Admin-configured cap (uploadLimits.ts). Multer's own limit is only the
  // 128MB hard ceiling, so the live setting is checked here — anything over
  // is deleted and rejected with the current value in the message.
  const limitBytes = await getMaxUploadDesignBytes();
  if (file.size > limitBytes) {
    await fs.promises.unlink(file.path).catch(() => undefined);
    const limitMb = Math.round(limitBytes / 1024 / 1024);
    throw new ApiError(413, `File too large — the current upload limit is ${limitMb} MB`);
  }

  // Magic-byte verification happens after multer's extension filter.
  // Throws 415 (and deletes the file) on mismatch.
  await verifyMagicBytes(file.path);

  // The file is stored as-is. Office→PDF conversion (Gotenberg) was removed
  // for now: the upload lane only accepts PDF and images, so there is
  // nothing left to convert — the shop receives exactly what was uploaded.
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

/**
 * Complaint evidence (disputes): photos and the mandatory missing-pages
 * unboxing video. Multer enforces the 100MB video ceiling; images get their
 * stricter 10MB cap here, and magic bytes are verified per evidence format.
 */
export async function registerEvidenceUpload(
  userId: string,
  file: Express.Multer.File,
): Promise<UploadResult> {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!isEvidenceVideoExtension(ext) && file.size > MAX_EVIDENCE_IMAGE_BYTES) {
    await fs.promises.unlink(file.path).catch(() => undefined);
    throw new ApiError(413, 'Photo too large — the limit is 10 MB per image');
  }

  await verifyEvidenceMagicBytes(file.path);

  const metadata: UploadMetadata = {
    userId,
    originalName: file.originalname,
    sizeBytes: file.size,
    mimeType: file.mimetype,
    uploadedAt: new Date().toISOString(),
  };
  await setCache(REDIS_KEYS.UPLOAD_METADATA(file.filename), metadata, REDIS_TTL.UPLOAD_METADATA);

  return {
    fileUrl: `/uploads/evidence/${file.filename}`,
    fileName: file.originalname,
    sizeKb: Math.round(file.size / 1024),
    mimeType: file.mimetype,
  };
}
