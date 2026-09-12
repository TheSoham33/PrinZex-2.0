import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '../../../middlewares/authorizeRoles';
import { validate } from '../../../middlewares/validate';
import * as adminSellersController from './admin-sellers.controller';

/**
 * Admin seller management — mounted at /api/admin/sellers.
 * Spec's canManageSellers → vocabulary: reads sellers.view; the verification
 * lane (approve/reject/verify-document) sellers.verify (mirrors step-6
 * delivery.verify); suspend + commission → sellers.manage.
 */

export const sellersQuery = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED']).optional(),
  city: z.string().trim().min(1).max(100).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const sellerParams = z.object({ sellerId: z.string().min(1) });

export const approveBody = z.object({ note: z.string().trim().min(3).max(500).optional() });

export const rejectBody = z.object({ reason: z.string().trim().min(10, 'Give the seller a proper reason (min 10 chars)').max(500) });

export const suspendSellerBody = z.object({ reason: z.string().trim().min(3).max(500) });

export const verifyDocumentBody = z.object({
  docId: z.string().min(1),
  isVerified: z.boolean(),
  note: z.string().trim().max(500).optional(),
});

export const commissionBody = z.object({
  commissionRate: z.number().min(0, 'Commission cannot be negative').max(0.5, 'Commission is capped at 50%'),
});

export type SellersQuery = z.infer<typeof sellersQuery>;
export type ApproveBody = z.infer<typeof approveBody>;
export type RejectBody = z.infer<typeof rejectBody>;
export type SuspendSellerBody = z.infer<typeof suspendSellerBody>;
export type VerifyDocumentBody = z.infer<typeof verifyDocumentBody>;
export type CommissionBody = z.infer<typeof commissionBody>;

export const adminSellersRouter = Router();

adminSellersRouter.get('/', requirePermission('sellers.view'), validate({ query: sellersQuery }), adminSellersController.listSellers);
adminSellersRouter.get('/:sellerId', requirePermission('sellers.view'), validate({ params: sellerParams }), adminSellersController.getSellerDetail);
adminSellersRouter.post(
  '/:sellerId/approve',
  requirePermission('sellers.verify'),
  validate({ params: sellerParams, body: approveBody }),
  adminSellersController.approveSeller,
);
adminSellersRouter.post(
  '/:sellerId/reject',
  requirePermission('sellers.verify'),
  validate({ params: sellerParams, body: rejectBody }),
  adminSellersController.rejectSeller,
);
adminSellersRouter.post(
  '/:sellerId/suspend',
  requirePermission('sellers.manage'),
  validate({ params: sellerParams, body: suspendSellerBody }),
  adminSellersController.suspendSeller,
);
adminSellersRouter.post(
  '/:sellerId/verify-document',
  requirePermission('sellers.verify'),
  validate({ params: sellerParams, body: verifyDocumentBody }),
  adminSellersController.verifyDocument,
);
adminSellersRouter.patch(
  '/:sellerId/commission',
  requirePermission('sellers.manage'),
  validate({ params: sellerParams, body: commissionBody }),
  adminSellersController.updateCommission,
);
