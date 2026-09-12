import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeRoles } from '../../middlewares/authorizeRoles';
import { validate } from '../../middlewares/validate';
import * as customerController from './customer.controller';
import {
  addMoneyBody,
  addressParams,
  changePasswordBody,
  createAddressBody,
  notificationParams,
  notificationsQuery,
  transactionsQuery,
  updateAddressBody,
  updateProfileBody,
} from './customer.schema';

/** Customer profile, addresses, wallet, notifications — mounted at /api/customer. */
export const customerRouter = Router();

// Every route in this module requires an authenticated CUSTOMER.
customerRouter.use(authenticate, authorizeRoles('CUSTOMER'));

// ── Profile ────────────────────────────────────────────────────────────────
customerRouter.get('/profile', customerController.getProfile);
customerRouter.patch('/profile', validate({ body: updateProfileBody }), customerController.updateProfile);
customerRouter.patch(
  '/profile/change-password',
  validate({ body: changePasswordBody }),
  customerController.changePassword,
);

// ── Addresses ───────────────────────────────────────────────────────────────
customerRouter.get('/addresses', customerController.listAddresses);
customerRouter.post('/addresses', validate({ body: createAddressBody }), customerController.createAddress);
customerRouter.patch(
  '/addresses/:addressId',
  validate({ params: addressParams, body: updateAddressBody }),
  customerController.updateAddress,
);
customerRouter.delete(
  '/addresses/:addressId',
  validate({ params: addressParams }),
  customerController.deleteAddress,
);
customerRouter.patch(
  '/addresses/:addressId/set-default',
  validate({ params: addressParams }),
  customerController.setDefaultAddress,
);

// ── Wallet ──────────────────────────────────────────────────────────────────
customerRouter.get('/wallet', customerController.getWallet);
customerRouter.post('/wallet/add-money', validate({ body: addMoneyBody }), customerController.addMoney);
customerRouter.get(
  '/wallet/transactions',
  validate({ query: transactionsQuery }),
  customerController.listTransactions,
);

// ── Notifications (MongoDB) ─────────────────────────────────────────────────
customerRouter.get(
  '/notifications',
  validate({ query: notificationsQuery }),
  customerController.listNotifications,
);
customerRouter.patch(
  '/notifications/read-all',
  customerController.markAllNotificationsRead,
);
customerRouter.patch(
  '/notifications/:id/read',
  validate({ params: notificationParams }),
  customerController.markNotificationRead,
);
