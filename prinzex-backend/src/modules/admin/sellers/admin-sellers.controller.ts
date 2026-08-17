import { ApiResponse } from '../../../utils/ApiResponse';
import { adminIdentity, logActivity } from '../../../utils/activityLogger';
import { asyncHandler } from '../../../utils/asyncHandler';
import * as adminSellersService from './admin-sellers.service';
import type {
  ApproveBody,
  CommissionBody,
  RejectBody,
  SellersQuery,
  SuspendSellerBody,
  VerifyDocumentBody,
} from './admin-sellers.routes';

/** Admin seller management. logActivity is fire-and-forget (no await) per spec. */

export const listSellers = asyncHandler(async (req, res) => {
  const result = await adminSellersService.listSellers(req.query as unknown as SellersQuery);
  res.status(200).json(new ApiResponse(200, result, 'Sellers fetched'));
});

export const getSellerDetail = asyncHandler(async (req, res) => {
  const detail = await adminSellersService.getSellerDetail(req.params.sellerId);
  res.status(200).json(new ApiResponse(200, detail, 'Seller details fetched'));
});

export const approveSeller = asyncHandler(async (req, res) => {
  const { note } = req.body as ApproveBody;
  const result = await adminSellersService.approveSeller(req.params.sellerId, note);
  void logActivity({
    ...adminIdentity(req),
    action: 'seller.approved',
    entityType: 'seller',
    entityId: req.params.sellerId,
    metadata: { ...(note ? { note } : {}) },
    req,
  });
  res.status(200).json(new ApiResponse(200, result, 'Seller approved — store is live'));
});

export const rejectSeller = asyncHandler(async (req, res) => {
  const { reason } = req.body as RejectBody;
  const result = await adminSellersService.rejectSeller(req.params.sellerId, reason);
  void logActivity({
    ...adminIdentity(req),
    action: 'seller.rejected',
    entityType: 'seller',
    entityId: req.params.sellerId,
    metadata: { reason },
    req,
  });
  res.status(200).json(new ApiResponse(200, result, 'Seller application rejected'));
});

export const suspendSeller = asyncHandler(async (req, res) => {
  const { reason } = req.body as SuspendSellerBody;
  const result = await adminSellersService.suspendSeller(req.params.sellerId, reason);
  void logActivity({
    ...adminIdentity(req),
    action: 'seller.suspended',
    entityType: 'seller',
    entityId: req.params.sellerId,
    metadata: { reason },
    req,
  });
  res.status(200).json(new ApiResponse(200, result, 'Seller suspended — sessions revoked'));
});

export const verifyDocument = asyncHandler(async (req, res) => {
  const identity = adminIdentity(req);
  const input = req.body as VerifyDocumentBody;
  const result = await adminSellersService.verifySellerDocument(identity.adminId, req.params.sellerId, input);
  void logActivity({
    ...identity,
    action: 'seller.document.verified',
    entityType: 'seller_document',
    entityId: input.docId,
    metadata: { sellerId: req.params.sellerId, docType: result.docType, isVerified: input.isVerified, ...(input.note ? { note: input.note } : {}) },
    req,
  });
  res.status(200).json(new ApiResponse(200, result, input.isVerified ? 'Document verified' : 'Document verification revoked'));
});

export const updateCommission = asyncHandler(async (req, res) => {
  const { commissionRate } = req.body as CommissionBody;
  const result = await adminSellersService.updateCommissionRate(req.params.sellerId, commissionRate);
  void logActivity({
    ...adminIdentity(req),
    action: 'seller.commission.updated',
    entityType: 'seller',
    entityId: req.params.sellerId,
    metadata: { commissionRate },
    req,
  });
  res.status(200).json(new ApiResponse(200, result, `Commission rate updated to ${(commissionRate * 100).toFixed(0)}%`));
});
