import type { Request } from 'express';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import type { AdminTokenPayload } from '../../utils/jwt';
import * as payoutsService from './payouts.service';
import type {
  BulkApproveBody,
  FailBody,
  FinancialsQuery,
  MarkPaidBody,
  PayoutsQuery,
} from './payouts.routes';

function adminMeta(req: Request): payoutsService.AdminActionMeta {
  const user = req.user as AdminTokenPayload | undefined;
  if (!user || user.role !== 'ADMIN') {
    throw ApiError.unauthorized();
  }
  return {
    adminId: user.adminId,
    ...(req.ip ? { ipAddress: req.ip } : {}),
    ...(typeof req.headers['user-agent'] === 'string' ? { userAgent: req.headers['user-agent'] } : {}),
  };
}

// ══ PAYOUT ADMIN ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═

export const listPayouts = asyncHandler(async (req, res) => {
  const payouts = await payoutsService.listPayouts(req.query as unknown as PayoutsQuery);
  res.status(200).json(new ApiResponse(200, payouts, 'Payouts fetched'));
});

export const payoutsSummary = asyncHandler(async (req, res) => {
  const summary = await payoutsService.payoutsSummary();
  res.status(200).json(new ApiResponse(200, summary, 'Payout summary fetched'));
});

export const approvePayout = asyncHandler(async (req, res) => {
  const result = await payoutsService.approvePayout(adminMeta(req), req.params.payoutId);
  res.status(200).json(new ApiResponse(200, result, 'Payout approved — processing'));
});

export const bulkApprovePayouts = asyncHandler(async (req, res) => {
  const { payoutIds } = req.body as BulkApproveBody;
  const result = await payoutsService.bulkApprovePayouts(adminMeta(req), payoutIds);
  res.status(200).json(new ApiResponse(200, result, `${result.approved} payout(s) approved`));
});

export const markPayoutPaid = asyncHandler(async (req, res) => {
  const { transactionRef } = req.body as MarkPaidBody;
  const result = await payoutsService.markPayoutPaid(adminMeta(req), req.params.payoutId, transactionRef);
  res.status(200).json(new ApiResponse(200, result, 'Payout marked as paid'));
});

export const failPayout = asyncHandler(async (req, res) => {
  const { reason } = req.body as FailBody;
  const result = await payoutsService.failPayout(adminMeta(req), req.params.payoutId, reason);
  res.status(200).json(new ApiResponse(200, result, 'Payout marked failed — earnings released'));
});

// ══ FINANCIALS ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═ ═

export const financialOverview = asyncHandler(async (req, res) => {
  const query = req.query as unknown as FinancialsQuery;
  const range = payoutsService.financialPeriod(query.startDate, query.endDate);
  const overview = await payoutsService.financialOverview(range);
  res.status(200).json(new ApiResponse(200, overview, 'Financial overview fetched'));
});

export const commissionReport = asyncHandler(async (req, res) => {
  const query = req.query as unknown as FinancialsQuery;
  const range = payoutsService.financialPeriod(query.startDate, query.endDate);
  const report = await payoutsService.commissionReport(range);
  res.status(200).json(new ApiResponse(200, report, 'Commission report fetched'));
});
