import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { ApiError } from './ApiError';

/**
 * Design-file upload handling — multer with DISK STORAGE for now.
 * TODO: replace disk storage with AWS S3 upload in the file-storage step
 * (env already carries AWS_BUCKET_NAME / AWS_REGION).
 *
 * Files land in `uploads/designs/` with random UUID names. Type safety is
 * enforced twice:
 *   1. extension allowlist in the multer fileFilter
 *   2. magic-byte sniffing of the written file (never trust the extension)
 */

export const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');
export const DESIGN_DIR = path.join(UPLOAD_ROOT, 'designs');
export const AVATAR_DIR = path.join(UPLOAD_ROOT, 'avatars');

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.ai', '.psd'] as const;
export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

export const MAX_DESIGN_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

/**
 * Magic-byte signatures per extension. Offsets are byte positions in the
 * file header. `.ai` files are PDF containers; `.psd` starts with "8BPS".
 */
const MAGIC_SIGNATURES: Record<AllowedExtension, Buffer[]> = {
  '.pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])], // %PDF
  '.ai': [Buffer.from([0x25, 0x50, 0x44, 0x46])], // %PDF
  '.png': [Buffer.from([0x89, 0x50, 0x4e, 0x47])], // ‰PNG
  '.jpg': [Buffer.from([0xff, 0xd8, 0xff])],
  '.jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  '.psd': [Buffer.from([0x38, 0x42, 0x50, 0x53])], // 8BPS
};

function ensureDir(dir: string, callback: (error: Error | null, resolved: string) => void): void {
  fs.mkdir(dir, { recursive: true }, (error) => callback(error ?? null, dir));
}

const designStorage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    ensureDir(DESIGN_DIR, callback);
  },
  filename: (_req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    callback(null, `${randomUUID()}${ext}`);
  },
});

const designFileFilter: multer.Options['fileFilter'] = (_req, file, callback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext as AllowedExtension)) {
    callback(
      new ApiError(
        415,
        `Unsupported file type "${ext || '(none)'}" — allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
      ),
    );
    return;
  }
  callback(null, true);
};

const designUploader = multer({
  storage: designStorage,
  fileFilter: designFileFilter,
  limits: { fileSize: MAX_DESIGN_SIZE_BYTES, files: 1 },
});

/** Multer middleware for one design file under the `file` field name. */
export const uploadDesignMiddleware = designUploader.single('file');

// ── Seller KYC documents ───────────────────────────────────────────────────
// Onboarding document uploads: up to 4 files in one request (one per doc
// type). Stricter than design uploads — 5MB each, pdf/jpg/png only.

export const DOCUMENT_DIR = path.join(UPLOAD_ROOT, 'documents');

export const SELLER_DOCUMENT_TYPES = [
  'gst_certificate',
  'business_license',
  'owner_id',
  'address_proof',
] as const;
export type SellerDocumentType = (typeof SELLER_DOCUMENT_TYPES)[number];

const DOCUMENT_ALLOWED_EXTENSIONS: AllowedExtension[] = ['.pdf', '.png', '.jpg', '.jpeg'];
export const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const documentStorage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    ensureDir(DOCUMENT_DIR, callback);
  },
  filename: (_req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    callback(null, `${randomUUID()}${ext}`);
  },
});

const documentFileFilter: multer.Options['fileFilter'] = (_req, file, callback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!DOCUMENT_ALLOWED_EXTENSIONS.includes(ext as AllowedExtension)) {
    callback(
      new ApiError(
        415,
        `Unsupported document type "${ext || '(none)'}" — allowed: ${DOCUMENT_ALLOWED_EXTENSIONS.join(', ')}`,
      ),
    );
    return;
  }
  callback(null, true);
};

const documentUploader = multer({
  storage: documentStorage,
  fileFilter: documentFileFilter,
  limits: { fileSize: MAX_DOCUMENT_SIZE_BYTES, files: SELLER_DOCUMENT_TYPES.length },
});

/** Multer middleware accepting all four seller document fields at once. */
export const uploadSellerDocumentsMiddleware = documentUploader.fields(
  SELLER_DOCUMENT_TYPES.map((name) => ({ name, maxCount: 1 })),
);

// ── User profile avatars ───────────────────────────────────────────────────

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    ensureDir(AVATAR_DIR, callback);
  },
  filename: (_req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    callback(null, `avatar-${randomUUID()}${ext}`);
  },
});

const avatarUploader = multer({
  storage: avatarStorage,
  fileFilter: documentFileFilter, // PDF/JPG/PNG, 5MB is fine for avatars
  limits: { fileSize: MAX_DOCUMENT_SIZE_BYTES, files: 1 },
});

export const uploadAvatarMiddleware = avatarUploader.single('file');

export const DELIVERY_DOCUMENT_TYPES = [
  'id_proof',
  'license',
  'address_proof',
  'vehicle_insurance',
] as const;
export type DeliveryDocumentType = (typeof DELIVERY_DOCUMENT_TYPES)[number];

/** Multer middleware accepting all four delivery-boy document fields at once. */
export const uploadDeliveryDocumentsMiddleware = documentUploader.fields(
  DELIVERY_DOCUMENT_TYPES.map((name) => ({ name, maxCount: 1 })),
);

/**
 * Verify the on-disk file really is what its extension claims by matching
 * its leading bytes against known signatures. Deletes the file and throws
 * 415 on mismatch — call immediately after a successful multer write.
 */
export async function verifyMagicBytes(filePath: string): Promise<AllowedExtension> {
  const ext = path.extname(filePath).toLowerCase() as AllowedExtension;
  const signatures = MAGIC_SIGNATURES[ext];
  if (!signatures) {
    await fs.promises.unlink(filePath).catch(() => undefined);
    throw new ApiError(415, `Unsupported file type "${ext}"`);
  }

  const handle = await fs.promises.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(8);
    const { bytesRead } = await handle.read(buffer, 0, 8, 0);
    const head = buffer.subarray(0, bytesRead);

    const matches = signatures.some(
      (signature) => head.length >= signature.length && head.subarray(0, signature.length).equals(signature),
    );
    if (!matches) {
      await fs.promises.unlink(filePath).catch(() => undefined);
      throw new ApiError(415, 'File content does not match its extension — upload rejected');
    }
  } finally {
    await handle.close();
  }
  return ext;
}
