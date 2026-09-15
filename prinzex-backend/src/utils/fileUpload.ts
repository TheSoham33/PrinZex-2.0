import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { ApiError } from './ApiError';
import { MAX_CONFIGURABLE_UPLOAD_MB } from './uploadLimits';

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

// Office→PDF conversion (Gotenberg) was removed for now, and only PDF and
// raster images (PNG/JPG) are accepted. Word (doc/docx), Excel and
// PowerPoint are intentionally absent — the UI asks the customer to convert
// them to PDF first ("doc/docx direct upload coming soon").
const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'] as const;
export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

// Hard ceiling only — the effective customer-facing cap is the
// admin-configured value from uploadLimits.ts (default 100MB), enforced in
// upload.service.
export const MAX_DESIGN_SIZE_BYTES = MAX_CONFIGURABLE_UPLOAD_MB * 1024 * 1024;

/**
 * Magic-byte signatures per extension. Offsets are byte positions in the
 * file header.
 */
const MAGIC_SIGNATURES: Record<AllowedExtension, Buffer[]> = {
  '.pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])], // %PDF
  '.png': [Buffer.from([0x89, 0x50, 0x4e, 0x47])], // ‰PNG
  '.jpg': [Buffer.from([0xff, 0xd8, 0xff])],
  '.jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
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

// ── Complaint evidence (disputes) ──────────────────────────────────────────
// Photos for wrong_item / print_quality / damaged_in_transit claims and the
// MANDATORY unboxing video for missing_pages claims. Images are capped at
// 10MB each; one video per request up to 100MB (below the 128MB server
// ceiling). Files land in uploads/evidence/ and are served by the same
// /uploads static mount as designs.

export const EVIDENCE_DIR = path.join(UPLOAD_ROOT, 'evidence');

const EVIDENCE_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg'] as const;
const EVIDENCE_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov'] as const;
export const EVIDENCE_ALLOWED_EXTENSIONS = [
  ...EVIDENCE_IMAGE_EXTENSIONS,
  ...EVIDENCE_VIDEO_EXTENSIONS,
] as const;
export type EvidenceExtension = (typeof EVIDENCE_ALLOWED_EXTENSIONS)[number];

export const MAX_EVIDENCE_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB per photo
export const MAX_EVIDENCE_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB per video

export function isEvidenceVideoExtension(ext: string): boolean {
  return (EVIDENCE_VIDEO_EXTENSIONS as readonly string[]).includes(ext);
}

const evidenceStorage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    ensureDir(EVIDENCE_DIR, callback);
  },
  filename: (_req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    callback(null, `${randomUUID()}${ext}`);
  },
});

const evidenceFileFilter: multer.Options['fileFilter'] = (_req, file, callback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!(EVIDENCE_ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
    callback(
      new ApiError(
        415,
        `Unsupported evidence type "${ext || '(none)'}" — allowed: ${EVIDENCE_ALLOWED_EXTENSIONS.join(', ')}`,
      ),
    );
    return;
  }
  callback(null, true);
};

const evidenceUploader = multer({
  storage: evidenceStorage,
  fileFilter: evidenceFileFilter,
  limits: { fileSize: MAX_EVIDENCE_VIDEO_BYTES, files: 1 },
});

/** Multer middleware for one evidence file (photo or video) as `file`. */
export const uploadEvidenceMiddleware = evidenceUploader.single('file');

// Magic-byte signatures with byte OFFSETS — mp4/mov carry `ftyp` at offset 4,
// unlike the offset-0 signatures used for designs.
const EVIDENCE_MAGIC: Record<EvidenceExtension, Array<{ offset: number; bytes: Buffer }>> = {
  '.png': [{ offset: 0, bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]) }],
  '.jpg': [{ offset: 0, bytes: Buffer.from([0xff, 0xd8, 0xff]) }],
  '.jpeg': [{ offset: 0, bytes: Buffer.from([0xff, 0xd8, 0xff]) }],
  '.mp4': [{ offset: 4, bytes: Buffer.from('ftyp', 'ascii') }],
  '.mov': [{ offset: 4, bytes: Buffer.from('ftyp', 'ascii') }],
  '.webm': [{ offset: 0, bytes: Buffer.from([0x1a, 0x45, 0xdf, 0xa3]) }],
};

/** Same contract as verifyMagicBytes but for the evidence lane's formats. */
export async function verifyEvidenceMagicBytes(filePath: string): Promise<EvidenceExtension> {
  const ext = path.extname(filePath).toLowerCase() as EvidenceExtension;
  const signatures = EVIDENCE_MAGIC[ext];
  if (!signatures) {
    await fs.promises.unlink(filePath).catch(() => undefined);
    throw new ApiError(415, `Unsupported evidence type "${ext}"`);
  }

  const handle = await fs.promises.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(12);
    const { bytesRead } = await handle.read(buffer, 0, 12, 0);

    const matches = signatures.some(({ offset, bytes }) => {
      const slice = buffer.subarray(offset, Math.min(bytesRead, offset + bytes.length));
      return bytesRead >= offset + bytes.length && slice.equals(bytes);
    });
    if (!matches) {
      await fs.promises.unlink(filePath).catch(() => undefined);
      throw new ApiError(415, 'File content does not match its extension — upload rejected');
    }
  } finally {
    await handle.close();
  }
  return ext;
}
