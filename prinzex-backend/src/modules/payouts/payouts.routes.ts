import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeRoles, requirePermission } from '../../middlewares/authorizeRoles';
import { validate } from '../../middlewares/validate';
import * as payoutsController from './payouts.controller';

/**
 * Payout Zod schemas — declared here per the step's file structure
 * (routes/controller/service only).
 */

export const payoutsQuery = z.object({
  recipientType: z.enum(['seller', 'delivery_boy']).optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'PAID', 'FAILED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const payoutParams = z.object({ payoutId: z.string().min(1) });

export const bulkApproveBody = z.object({
  payoutIds: z.array(z.string().min(1)).min(1).max(100),
});

export const markPaidBody = z.object({
  transactionRef: z.string().trim().min(3, 'Provide the bank transfer reference').max(100),
});

export const failBody = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const financialsQuery = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type PayoutsQuery = z.infer<typeof payoutsQuery>;
export type BulkApproveBody = z.infer<typeof bulkApproveBody>;
export type MarkPaidBody = z.infer<typeof markPaidBody>;
export type FailBody = z.infer<typeof failBody>;
export type FinancialsQuery = z.infer<typeof financialsQuery>;

/**
 * Admin payout management — mounted at /api/admin/payouts.
 * Spec's canManagePayouts → platform vocabulary: reads use payouts.view,
 * mutations use payouts.manage.
 */
export const adminPayoutsRouter = Router();

adminPayoutsRouter.use(authenticate, authorizeRoles('ADMIN'));

adminPayoutsRouter.get('/', requirePermission('payouts.view'), validate({ query: payoutsQuery }), payoutsController.listPayouts);
adminPayoutsRouter.get('/summary', requirePermission('payouts.view'), payoutsController.payoutsSummary);

// Static action routes before /:payoutId to avoid param capture.
adminPayoutsRouter.post(
  '/bulk-approve',
  requirePermission('payouts.manage'),
  validate({ body: bulkApproveBody }),
  payoutsController.bulkApprovePayouts,
);
adminPayoutsRouter.post(
  '/:payoutId/approve',
  requirePermission('payouts.manage'),
  validate({ params: payoutParams }),
  payoutsController.approvePayout,
);
adminPayoutsRouter.post(
  '/:payoutId/mark-paid',
  requirePermission('payouts.manage'),
  validate({ params: payoutParams, body: markPaidBody }),
  payoutsController.markPayoutPaid,
);
adminPayoutsRouter.post(
  '/:payoutId/fail',
  requirePermission('payouts.manage'),
  validate({ params: payoutParams, body: failBody }),
  payoutsController.failPayout,
);

/**
 * Financial reporting — mounted at /api/admin/financials (payouts.manage).
 */
export const adminFinancialsRouter = Router();

adminFinancialsRouter.use(authenticate, authorizeRoles('ADMIN'), requirePermission('payouts.manage'));

adminFinancialsRouter.get('/overview', validate({ query: financialsQuery }), payoutsController.financialOverview);
adminFinancialsRouter.get('/commission-report', validate({ query: financialsQuery }), payoutsController.commissionReport);
