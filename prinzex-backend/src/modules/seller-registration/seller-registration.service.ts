import fs from 'fs';
import path from 'path';
import { prisma } from '../../config/database';
import { REDIS_KEYS } from '../../config/redis';
import { ApiError } from '../../utils/ApiError';
import { invalidateCachePattern } from '../../utils/cache';
import { sendSellerWelcomeEmail } from '../../utils/email';
import { invalidateAdminStats } from '../admin/analytics/admin-analytics.service';
import { emitAdminGlobalEvent } from '../../realtime/realtime.emitters';
import {
  DOCUMENT_DIR,
  SELLER_DOCUMENT_TYPES,
  verifyMagicBytes,
  type SellerDocumentType,
} from '../../utils/fileUpload';
import type { CustomerTokenPayload, SellerTokenPayload } from '../../utils/jwt';
import type { RegisterSellerInput } from './seller-registration.schema';

/**
 * Seller onboarding: application, KYC document upload, review status.
 *
 * The applicant is a logged-in CUSTOMER; the Seller row (and the SELLER
 * role on their User account) are created here. Documents/status accept
 * both token shapes:
 *   - a fresh CUSTOMER JWT taken right after registration, or
 *   - a SELLER JWT (e.g. re-issued later) — sellerId then comes from it.
 */

export interface SafeSeller {
  id: string;
  storeName: string;
  ownerName: string;
  email: string;
  phone: string;
  gstNumber: string | null;
  businessType: string;
  storeAddress: string;
  city: string;
  state: string;
  pincode: string;
  openingTime: string;
  closingTime: string;
  status: string;
  isVerified: boolean;
  createdAt: Date;
}

/** What a registration/status response exposes about one KYC document. */
export interface DocumentStatus {
  docType: SellerDocumentType;
  uploaded: boolean;
  isVerified: boolean;
  verifiedAt: Date | null;
  uploadedAt: Date | null;
}

/** Resolve the applicant's Seller row from either a customer or seller JWT. */
async function resolveSellerId(user: CustomerTokenPayload | SellerTokenPayload): Promise<string> {
  if (user.role === 'SELLER') {
    return user.sellerId;
  }
  const seller = await prisma.seller.findUnique({ where: { userId: user.userId } });
  if (!seller) {
    throw ApiError.notFound('No store application found — register as a seller first');
  }
  return seller.id;
}

// ─── POST /api/seller/register ─────────────────────────────────────────────

export async function register(userId: string, input: RegisterSellerInput): Promise<SafeSeller> {
  // 1. One application per user.
  const existingForUser = await prisma.seller.findUnique({ where: { userId } });
  if (existingForUser) {
    throw ApiError.conflict('You have already applied as a seller');
  }

  // 2. Store email must be unique across sellers.
  const existingEmail = await prisma.seller.findUnique({ where: { email: input.email } });
  if (existingEmail) {
    throw ApiError.conflict('This email is already registered to another store');
  }

  // 3. Everything succeeds or everything rolls back.
  const seller = await prisma.$transaction(async (tx) => {
    const hours = [
      'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
    ].map(day => ({
      day,
      open: input.openingTime,
      close: input.closingTime,
      closed: day === 'sunday'
    }));

    const created = await tx.seller.create({
      data: {
        userId,
        storeName: input.storeName,
        ownerName: input.ownerName,
        email: input.email,
        phone: input.phone,
        gstNumber: input.gstNumber ?? null,
        businessType: input.businessType,
        storeAddress: input.storeAddress,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        openingTime: input.openingTime,
        closingTime: input.closingTime,
        status: 'PENDING',
        metadata: { hours } as any,
      },
    });

    await tx.sellerService.createMany({
      data: input.services.map((service) => ({
        sellerId: created.id,
        categoryId: service.categoryId,
        categoryName: service.categoryName,
        serviceId: service.serviceId,
        serviceName: service.serviceName,
        basePrice: service.basePrice,
        unit: service.unit,
      })),
    });

    await tx.sellerBankDetails.create({
      data: {
        sellerId: created.id,
        accountHolderName: input.bankDetails.accountHolderName,
        accountNumber: input.bankDetails.accountNumber,
        ifscCode: input.bankDetails.ifscCode,
        panNumber: input.bankDetails.panNumber,
      },
    });

    // Same transaction: the applicant becomes a SELLER.
    await tx.user.update({
      where: { id: userId },
      data: { role: 'SELLER' },
    });

    return created;
  });

  // 4. A new store may affect discovery caches once approved.
  await invalidateCachePattern(REDIS_KEYS.STORE_LIST_PATTERN());

  // 4b. KPI cache (pending sellers count) — significant event, step 8.
  await invalidateAdminStats();

  // 4c. Admin live feed (step 9): new seller registration on the dashboard.
  emitAdminGlobalEvent('seller.registered', {
    sellerId: seller.id,
    storeName: seller.storeName,
    city: seller.city,
  });

  // 5. Welcome email (stub).
  await sendSellerWelcomeEmail(seller.email, seller.ownerName, seller.storeName);

  return {
    id: seller.id,
    storeName: seller.storeName,
    ownerName: seller.ownerName,
    email: seller.email,
    phone: seller.phone,
    gstNumber: seller.gstNumber,
    businessType: seller.businessType,
    storeAddress: seller.storeAddress,
    city: seller.city,
    state: seller.state,
    pincode: seller.pincode,
    openingTime: seller.openingTime,
    closingTime: seller.closingTime,
    status: seller.status,
    isVerified: seller.isVerified,
    createdAt: seller.createdAt,
  };
}

// ─── POST /api/seller/register/documents ───────────────────────────────────

type DocumentFiles = Partial<Record<SellerDocumentType, Express.Multer.File[]>>;

function oldDocumentPath(fileUrl: string): string | null {
  const filename = path.basename(fileUrl);
  if (!filename || filename !== fileUrl.replace('/uploads/documents/', '')) {
    return null;
  }
  return path.join(DOCUMENT_DIR, filename);
}

/** Best-effort unlink that never throws (orphan files are swept later). */
async function unlinkQuietly(filePath: string): Promise<void> {
  await fs.promises.unlink(filePath).catch(() => undefined);
}

export async function uploadDocuments(
  user: CustomerTokenPayload | SellerTokenPayload,
  files: DocumentFiles | undefined,
): Promise<DocumentStatus[]> {
  const sellerId = await resolveSellerId(user);

  const provided = SELLER_DOCUMENT_TYPES.filter((type) => (files?.[type]?.length ?? 0) > 0).map(
    (type) => ({ type, file: files![type]![0] }),
  );
  if (provided.length === 0) {
    throw ApiError.badRequest('Attach at least one document file');
  }

  try {
    for (const { type, file } of provided) {
      // Verify content matches extension; throws 415 and deletes the file.
      await verifyMagicBytes(file.path);

      const fileUrl = `/uploads/documents/${file.filename}`;
      const existing = await prisma.sellerDocument.findFirst({
        where: { sellerId, docType: type },
      });

      if (existing) {
        // Re-upload replaces the file and resets verification.
        const oldPath = oldDocumentPath(existing.fileUrl);
        if (oldPath) {
          await unlinkQuietly(oldPath);
        }
        await prisma.sellerDocument.update({
          where: { id: existing.id },
          data: { fileUrl, isVerified: false, verifiedAt: null, verifiedBy: null },
        });
      } else {
        await prisma.sellerDocument.create({
          data: { sellerId, docType: type, fileUrl },
        });
      }
    }
  } catch (error) {
    // Never keep half-processed upload batches on disk.
    await Promise.all(provided.map(({ file }) => unlinkQuietly(file.path)));
    throw error;
  }

  return listDocumentStatus(sellerId);
}

// ─── GET /api/seller/register/status ───────────────────────────────────────

export interface RegistrationStatus {
  sellerId: string;
  status: string;
  isVerified: boolean;
  rejectionReason: string | null;
  documents: DocumentStatus[];
}

async function listDocumentStatus(sellerId: string): Promise<DocumentStatus[]> {
  const documents = await prisma.sellerDocument.findMany({ where: { sellerId } });
  return SELLER_DOCUMENT_TYPES.map((docType) => {
    const record = documents.find((doc) => doc.docType === docType);
    return {
      docType,
      uploaded: record !== undefined,
      isVerified: record?.isVerified ?? false,
      verifiedAt: record?.verifiedAt ?? null,
      uploadedAt: record?.createdAt ?? null,
    };
  });
}

export async function getRegistrationStatus(
  user: CustomerTokenPayload | SellerTokenPayload,
): Promise<RegistrationStatus> {
  const sellerId = await resolveSellerId(user);
  const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
  if (!seller) {
    throw ApiError.notFound('Seller not found');
  }

  return {
    sellerId: seller.id,
    status: seller.status,
    isVerified: seller.isVerified,
    rejectionReason: seller.rejectionReason,
    documents: await listDocumentStatus(seller.id),
  };
}
