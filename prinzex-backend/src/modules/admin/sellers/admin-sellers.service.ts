import type { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { REDIS_KEYS } from '../../../config/redis';
import { logger } from '../../../config/logger';
import { NotificationModel } from '../../../models/mongo/Notification.model';
import { ApiError } from '../../../utils/ApiError';
import { invalidateCachePattern } from '../../../utils/cache';
import { sendSellerApprovalEmail } from '../../../utils/email';
import { roundMoney } from '../../../utils/financial';
import {
  buildPaginatedResponse,
  toSkipTake,
  type PaginatedResponse,
} from '../../../utils/pagination';
import { invalidateStoreCaches, maskAccountNumber } from '../../seller/seller.service';
import { invalidateAdminStats } from '../analytics/admin-analytics.service';
import type { SellersQuery, VerifyDocumentBody } from './admin-sellers.routes';

/**
 * Admin seller management — discovery, verification lane (approve/reject/
 * document verification) and governance (suspend, commission rate).
 * Every mutation is audited by the controllers via logActivity.
 */

/** The four KYC documents required before approval (schema docType comment). */
export const REQUIRED_DOC_TYPES = ['gst_certificate', 'business_license', 'owner_id', 'address_proof'] as const;

async function notifySeller(
  sellerId: string,
  type: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<void> {
  await NotificationModel.create({ recipientId: sellerId, recipientType: 'seller', type, title, body, data, channel: ['push'] });
}

async function runSideEffects(label: string, effects: Array<() => Promise<unknown>>): Promise<void> {
  for (const effect of effects) {
    try {
      await effect();
    } catch (error) {
      logger.error('admin_seller_side_effect_failed', {
        label,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

// ── GET /api/admin/sellers ─────────────────────────────────────────────────

export interface AdminSellerListItem {
  id: string;
  storeName: string;
  ownerName: string;
  city: string;
  status: string;
  rating: number;
  totalOrders: number;
  pendingDocuments: number;
  createdAt: Date;
}

export async function listSellers(query: SellersQuery): Promise<PaginatedResponse<AdminSellerListItem>> {
  const where: Prisma.SellerWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.city) where.city = { equals: query.city, mode: 'insensitive' };
  if (query.search) {
    where.OR = [
      { storeName: { contains: query.search, mode: 'insensitive' } },
      { ownerName: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const { skip, take } = toSkipTake({ page: query.page, limit: query.limit });
  const total = await prisma.seller.count({ where });
  const sellers = await prisma.seller.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip,
    take,
    select: {
      id: true,
      storeName: true,
      ownerName: true,
      city: true,
      status: true,
      averageRating: true,
      totalOrders: true,
      createdAt: true,
      documents: { select: { isVerified: true } },
    },
  });

  return buildPaginatedResponse(
    sellers.map((seller) => ({
      id: seller.id,
      storeName: seller.storeName,
      ownerName: seller.ownerName,
      city: seller.city,
      status: seller.status,
      rating: Number(seller.averageRating),
      totalOrders: seller.totalOrders,
      pendingDocuments: seller.documents.filter((doc) => !doc.isVerified).length,
      createdAt: seller.createdAt,
    })),
    total,
    { page: query.page, limit: query.limit },
  );
}

// ── GET /api/admin/sellers/:sellerId ───────────────────────────────────────

export async function getSellerDetail(sellerId: string) {
  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    include: {
      services: { orderBy: { serviceName: 'asc' } },
      documents: { orderBy: { createdAt: 'asc' } },
      bankDetails: true,
      _count: { select: { orders: true, teamMembers: true } },
    },
  });
  if (!seller) {
    throw ApiError.notFound('Seller not found');
  }

  // Exact unpaid-earnings math (same rule as payouts): delivered, not yet
  // locked into a payout → total - commission - deliveryFee.
  const unpaid = await prisma.order.aggregate({
    where: { sellerId: seller.id, status: 'delivered', payoutId: null },
    _sum: { total: true, commissionAmount: true, deliveryFee: true },
  });
  const pendingPayoutBalance = roundMoney(
    Number(unpaid._sum.total ?? 0) - Number(unpaid._sum.commissionAmount ?? 0) - Number(unpaid._sum.deliveryFee ?? 0),
  );

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
    rejectionReason: seller.rejectionReason,
    commissionRate: Number(seller.commissionRate),
    createdAt: seller.createdAt,
    performance: {
      averageRating: Number(seller.averageRating),
      totalOrders: seller.totalOrders,
      completionRate: Number(seller.completionRate),
      onTimeRate: Number(seller.onTimeRate),
      teamMembers: seller._count.teamMembers,
    },
    pendingPayoutBalance,
    services: seller.services.map((service) => ({
      id: service.id,
      categoryName: service.categoryName,
      serviceName: service.serviceName,
      basePrice: Number(service.basePrice),
      unit: service.unit,
      isActive: service.isActive,
    })),
    documents: seller.documents.map((doc) => ({
      id: doc.id,
      docType: doc.docType,
      fileUrl: doc.fileUrl,
      isVerified: doc.isVerified,
      verifiedAt: doc.verifiedAt,
      verifiedBy: doc.verifiedBy,
      uploadedAt: doc.createdAt,
    })),
    bankDetails: seller.bankDetails
      ? {
          accountHolderName: seller.bankDetails.accountHolderName,
          accountNumberMasked: maskAccountNumber(seller.bankDetails.accountNumber),
          ifscCode: seller.bankDetails.ifscCode,
          isVerified: seller.bankDetails.isVerified,
        }
      : null,
  };
}

// ── POST /:sellerId/approve + /reject + /suspend ───────────────────────────

export async function approveSeller(
  sellerId: string,
  note?: string,
): Promise<{ sellerId: string; status: string }> {
  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    include: { documents: { select: { docType: true } } },
  });
  if (!seller) {
    throw ApiError.notFound('Seller not found');
  }
  if (seller.status === 'APPROVED') {
    throw ApiError.conflict('This seller is already approved');
  }

  // Spec gate: all 4 required documents must be UPLOADED before approval.
  const uploaded = new Set(seller.documents.map((doc) => doc.docType));
  const missing = REQUIRED_DOC_TYPES.filter((docType) => !uploaded.has(docType));
  if (missing.length > 0) {
    throw ApiError.badRequest(`Cannot approve — seller is missing documents: ${missing.join(', ')}`);
  }

  await prisma.seller.update({
    where: { id: seller.id },
    data: { status: 'APPROVED', isVerified: true, rejectionReason: null },
  });

  await runSideEffects('seller.approved', [
    () => invalidateStoreCaches(seller.id), // store becomes discoverable in its city
    () => invalidateAdminStats(), // KPI: pending/approved seller counts shifted
    () => sendSellerApprovalEmail(seller.email, seller.ownerName, seller.storeName),
    () =>
      notifySeller(
        seller.id,
        'store_approved',
        'Your store is approved 🎉',
        `Congratulations — "${seller.storeName}" is now live on PrinZex.${note ? ` Note from the team: ${note}` : ''}`,
        { note: note ?? null },
      ),
  ]);

  return { sellerId: seller.id, status: 'APPROVED' };
}

export async function rejectSeller(sellerId: string, reason: string): Promise<{ sellerId: string; status: string }> {
  const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
  if (!seller) {
    throw ApiError.notFound('Seller not found');
  }
  if (seller.status === 'REJECTED') {
    throw ApiError.conflict('This seller application is already rejected');
  }

  await prisma.seller.update({
    where: { id: seller.id },
    data: { status: 'REJECTED', rejectionReason: reason, isVerified: false },
  });

  await runSideEffects('seller.rejected', [
    () => (seller.status === 'PENDING' ? invalidateAdminStats() : Promise.resolve()),
    () =>
      notifySeller(
        seller.id,
        'store_rejected',
        'Your store application was rejected',
        `"${seller.storeName}" could not be approved: ${reason}. Fix the issues and re-apply.`,
        { reason },
      ),
  ]);

  return { sellerId: seller.id, status: 'REJECTED' };
}

export async function suspendSeller(sellerId: string, reason: string): Promise<{ sellerId: string; status: string }> {
  const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
  if (!seller) {
    throw ApiError.notFound('Seller not found');
  }
  if (seller.status === 'SUSPENDED') {
    throw ApiError.conflict('This seller is already suspended');
  }

  await prisma.$transaction([
    prisma.seller.update({ where: { id: seller.id }, data: { status: 'SUSPENDED', isVerified: false } }),
    // Kill every active session of the seller's login user.
    prisma.refreshToken.updateMany({ where: { userId: seller.userId, isRevoked: false }, data: { isRevoked: true } }),
  ]);

  await runSideEffects('seller.suspended', [
    () => invalidateStoreCaches(seller.id),
    () =>
      notifySeller(
        seller.id,
        'store_suspended',
        'Your store has been suspended',
        `"${seller.storeName}" was suspended: ${reason}. Contact support for details.`,
        { reason },
      ),
  ]);

  return { sellerId: seller.id, status: 'SUSPENDED' };
}

// ── POST /:sellerId/verify-document ────────────────────────────────────────

export async function verifySellerDocument(
  adminId: string,
  sellerId: string,
  input: VerifyDocumentBody,
): Promise<{ docId: string; docType: string; isVerified: boolean }> {
  const document = await prisma.sellerDocument.findFirst({ where: { id: input.docId, sellerId } });
  if (!document) {
    throw ApiError.notFound('Document not found for this seller');
  }

  const updated = await prisma.sellerDocument.update({
    where: { id: document.id },
    data: {
      isVerified: input.isVerified,
      verifiedAt: input.isVerified ? new Date() : null,
      verifiedBy: input.isVerified ? adminId : null,
    },
  });

  return { docId: updated.id, docType: updated.docType, isVerified: updated.isVerified };
}

// ── PATCH /:sellerId/commission ────────────────────────────────────────────

export async function updateCommissionRate(
  sellerId: string,
  commissionRate: number,
): Promise<{ sellerId: string; commissionRate: number }> {
  const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
  if (!seller) {
    throw ApiError.notFound('Seller not found');
  }

  await prisma.seller.update({ where: { id: seller.id }, data: { commissionRate } });

  // The admin commission report embeds rates — drop its 5-min cache.
  await runSideEffects('seller.commission.updated', [
    () => invalidateCachePattern(`${REDIS_KEYS.ADMIN_COMMISSION_REPORT()}:*`),
  ]);

  return { sellerId: seller.id, commissionRate };
}
