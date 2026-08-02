import type { Request } from 'express';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import type { AdminTokenPayload, CustomerTokenPayload } from '../../utils/jwt';
import { handleRazorpayWebhook } from './webhook.handler';
import * as paymentsService from './payments.service';
import type {
  AdminRefundInput,
  CreatePaymentOrderInput,
  PaymentHistoryQuery,
  TopupInitiateInput,
  TopupVerifyInput,
  VerifyPaymentInput,
} from './payments.schema';

function customerId(req: Request): string {
  const user = req.user as CustomerTokenPayload | undefined;
  if (!user || user.role !== 'CUSTOMER') {
    throw ApiError.unauthorized();
  }
  return user.userId;
}

function adminId(req: Request): string {
  const user = req.user as AdminTokenPayload | undefined;
  if (!user || user.role !== 'ADMIN') {
    throw ApiError.unauthorized();
  }
  return user.adminId;
}

function clientMeta(req: Request): { ipAddress?: string; userAgent?: string } {
  return {
    ...(req.ip ? { ipAddress: req.ip } : {}),
    ...(typeof req.headers['user-agent'] === 'string' ? { userAgent: req.headers['user-agent'] } : {}),
  };
}

// ══ CUSTOMER — order payments ═════════════════════════════════════════════

export const createPaymentOrder = asyncHandler(async (req, res) => {
  const result = await paymentsService.createPaymentOrder(
    customerId(req),
    (req.body as CreatePaymentOrderInput).orderId,
  );
  res.status(200).json(new ApiResponse(200, result, 'Payment order created'));
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const result = await paymentsService.verifyPayment(customerId(req), req.body as VerifyPaymentInput);
  res.status(200).json(new ApiResponse(200, result, result.message));
});

export const getPaymentHistory = asyncHandler(async (req, res) => {
  const history = await paymentsService.getPaymentHistory(
    customerId(req),
    req.query as unknown as PaymentHistoryQuery,
  );
  res.status(200).json(new ApiResponse(200, history, 'Payment history fetched'));
});

// ══ ADMIN — refunds ═══════════════════════════════════════════════════════

export const adminRefund = asyncHandler(async (req, res) => {
  const result = await paymentsService.processAdminRefund(
    adminId(req),
    req.body as AdminRefundInput,
    clientMeta(req),
  );
  res.status(200).json(new ApiResponse(200, result, 'Refund processed'));
});

// ══ WEBHOOK (no auth — raw body) ══════════════════════════════════════════

export const webhook = asyncHandler(async (req, res) => {
  await handleRazorpayWebhook(req, res);
});

// ══ WALLET ════════════════════════════════════════════════════════════════

export const initiateTopup = asyncHandler(async (req, res) => {
  const result = await paymentsService.initiateTopup(
    customerId(req),
    (req.body as TopupInitiateInput).amount,
  );
  res.status(200).json(new ApiResponse(200, result, 'Top-up checkout created'));
});

export const verifyTopup = asyncHandler(async (req, res) => {
  const result = await paymentsService.verifyTopup(customerId(req), req.body as TopupVerifyInput);
  res.status(200).json(new ApiResponse(200, result, result.message));
});

export const getWalletBalance = asyncHandler(async (req, res) => {
  const balance = await paymentsService.getWalletBalance(customerId(req));
  res.status(200).json(new ApiResponse(200, balance, 'Wallet balance fetched'));
});
