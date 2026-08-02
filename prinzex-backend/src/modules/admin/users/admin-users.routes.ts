import { Router } from 'express';
import { z } from 'zod';
import { requirePermission } from '../../../middlewares/authorizeRoles';
import { validate } from '../../../middlewares/validate';
import * as adminUsersController from './admin-users.controller';

/**
 * Admin user management — mounted at /api/admin/users under the parent
 * adminRouter (authenticate + authorizeRoles('ADMIN') already applied).
 * Spec's canManageUsers → platform vocabulary: reads users.view,
 * mutations users.manage.
 */

export const usersQuery = z.object({
  role: z.enum(['CUSTOMER', 'SELLER', 'DELIVERY_BOY']).optional(),
  status: z.enum(['active', 'suspended']).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const userParams = z.object({ userId: z.string().min(1) });

export const suspendBody = z.object({ reason: z.string().trim().min(3).max(500) });

export const walletCreditBody = z.object({
  amount: z
    .number()
    .positive('Credit amount must be greater than 0')
    .max(100000, 'Single admin credit is capped at ₹1,00,000')
    .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-9, {
      message: 'Amount must have at most 2 decimal places',
    }),
  reason: z.string().trim().min(3).max(500),
});

export type UsersQuery = z.infer<typeof usersQuery>;
export type SuspendBody = z.infer<typeof suspendBody>;
export type WalletCreditBody = z.infer<typeof walletCreditBody>;

export const adminUsersRouter = Router();

adminUsersRouter.get('/', requirePermission('users.view'), validate({ query: usersQuery }), adminUsersController.listUsers);
adminUsersRouter.get('/:userId', requirePermission('users.view'), validate({ params: userParams }), adminUsersController.getUserDetail);
adminUsersRouter.patch(
  '/:userId/suspend',
  requirePermission('users.manage'),
  validate({ params: userParams, body: suspendBody }),
  adminUsersController.suspendUser,
);
adminUsersRouter.patch(
  '/:userId/unsuspend',
  requirePermission('users.manage'),
  validate({ params: userParams }),
  adminUsersController.unsuspendUser,
);
adminUsersRouter.post(
  '/:userId/wallet-credit',
  requirePermission('users.manage'),
  validate({ params: userParams, body: walletCreditBody }),
  adminUsersController.walletCredit,
);
