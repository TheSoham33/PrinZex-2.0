import express, { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeRoles, requirePermission } from '../../middlewares/authorizeRoles';
import { validate } from '../../middlewares/validate';
import * as paymentsController from './payments.controller';
import {
  adminRefundBody,
  createPaymentOrderBody,
  paymentHistoryQuery,
  topupInitiateBody,
  topupVerifyBody,
  verifyPaymentBody,
} from './payments.schema';

/**
 * Razorpay webhook router — mounted at /api/payments BEFORE express.json()
 * in app.ts. The signature check needs the exact raw bytes Razorpay sent.
 */
export const paymentsWebhookRouter = Router();

paymentsWebhookRouter.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  paymentsController.webhook,
);

/**
 * Payment routes — mounted at /api/payments (after express.json()).
 */
export const paymentsRouter = Router();

paymentsRouter.use(authenticate);

// Customer order payments
paymentsRouter.post(
  '/create-order',
  authorizeRoles('CUSTOMER'),
  validate({ body: createPaymentOrderBody }),
  paymentsController.createPaymentOrder,
);
paymentsRouter.post(
  '/verify',
  authorizeRoles('CUSTOMER'),
  validate({ body: verifyPaymentBody }),
  paymentsController.verifyPayment,
);
paymentsRouter.get(
  '/history',
  authorizeRoles('CUSTOMER'),
  validate({ query: paymentHistoryQuery }),
  paymentsController.getPaymentHistory,
);

// Admin gateway refunds (spec's canManagePayouts → payouts.manage)
paymentsRouter.post(
  '/refund',
  authorizeRoles('ADMIN'),
  requirePermission('payouts.manage'),
  validate({ body: adminRefundBody }),
  paymentsController.adminRefund,
);

/**
 * Wallet routes — mounted at /api/wallet. Razorpay top-up flow
 * (initiate → client checkout → verify) with idempotent credit.
 */
export const walletRouter = Router();

walletRouter.use(authenticate, authorizeRoles('CUSTOMER'));

walletRouter.post('/topup/initiate', validate({ body: topupInitiateBody }), paymentsController.initiateTopup);
walletRouter.post('/topup/verify', validate({ body: topupVerifyBody }), paymentsController.verifyTopup);
walletRouter.get('/balance', paymentsController.getWalletBalance);
