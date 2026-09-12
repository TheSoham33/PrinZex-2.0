import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeRoles, requirePermission } from '../../middlewares/authorizeRoles';
import { validate } from '../../middlewares/validate';
import { uploadDeliveryDocumentsMiddleware } from '../../utils/fileUpload';
import * as deliveryController from './delivery.controller';
import {
  adminDeliveryBoyParams,
  adminDeliveryBoysQuery,
  adminDeliveryBoyStatusBody,
  adminVerifyDocumentBody,
  availabilityBody,
  deliverBody,
  earningsQuery,
  failDeliveryBody,
  locationPingBody,
  payoutsQuery,
  registerDeliveryBody,
  updateBankBody,
  updateDeliveryProfileBody,
} from './delivery.schema';

/**
 * PUBLIC delivery registration — mounted at /api/delivery/register BEFORE
 * the rider router so it isn't gated by the DELIVERY_BOY role check.
 */
export const deliveryRegistrationRouter = Router();

deliveryRegistrationRouter.post(
  '/',
  validate({ body: registerDeliveryBody }),
  deliveryController.register,
);

/**
 * Rider self-service — mounted at /api/delivery. Requires the delivery JWT
 * (OTP login from /api/delivery/auth).
 */
export const deliveryRouter = Router();

deliveryRouter.use(authenticate, authorizeRoles('DELIVERY_BOY'));

// Documents (KYC)
deliveryRouter.post('/documents', uploadDeliveryDocumentsMiddleware, deliveryController.uploadDocuments);

// Profile & bank
deliveryRouter.get('/profile', deliveryController.getProfile);
deliveryRouter.patch(
  '/profile',
  validate({ body: updateDeliveryProfileBody }),
  deliveryController.updateProfile,
);
deliveryRouter.patch('/profile/bank', validate({ body: updateBankBody }), deliveryController.updateBank);

// Availability toggle
deliveryRouter.patch(
  '/availability',
  validate({ body: availabilityBody }),
  deliveryController.setAvailability,
);

// Active delivery workflow (static routes — no params here)
deliveryRouter.get('/active-delivery', deliveryController.getActiveDelivery);
deliveryRouter.patch(
  '/active-delivery/location',
  validate({ body: locationPingBody }),
  deliveryController.pingLocation,
);
deliveryRouter.patch('/active-delivery/pickup-confirm', deliveryController.confirmPickup);
deliveryRouter.patch(
  '/active-delivery/deliver',
  validate({ body: deliverBody }),
  deliveryController.confirmDelivery,
);
deliveryRouter.patch(
  '/active-delivery/fail',
  validate({ body: failDeliveryBody }),
  deliveryController.failDelivery,
);

// Earnings & payouts
deliveryRouter.get('/earnings', validate({ query: earningsQuery }), deliveryController.getEarnings);
deliveryRouter.get('/payouts', validate({ query: payoutsQuery }), deliveryController.listPayouts);
deliveryRouter.post('/payouts/request', deliveryController.requestPayout);

/**
 * Admin fleet management — mounted at /api/admin/delivery.
 * Spec's "canManageUsers" maps to the platform permission vocabulary:
 * reads → delivery.view, mutations → delivery.manage, doc verification →
 * delivery.verify.
 */
export const adminDeliveryRouter = Router();

adminDeliveryRouter.use(authenticate, authorizeRoles('ADMIN'));

adminDeliveryRouter.get(
  '/boys',
  requirePermission('delivery.view'),
  validate({ query: adminDeliveryBoysQuery }),
  deliveryController.adminListDeliveryBoys,
);
adminDeliveryRouter.get(
  '/active',
  requirePermission('delivery.view'),
  deliveryController.adminListActiveDeliveries,
);
adminDeliveryRouter.get(
  '/boys/:id',
  requirePermission('delivery.view'),
  validate({ params: adminDeliveryBoyParams }),
  deliveryController.adminGetDeliveryBoy,
);
adminDeliveryRouter.patch(
  '/boys/:id/status',
  requirePermission('delivery.manage'),
  validate({ params: adminDeliveryBoyParams, body: adminDeliveryBoyStatusBody }),
  deliveryController.adminUpdateStatus,
);
adminDeliveryRouter.post(
  '/boys/:id/verify-document',
  requirePermission('delivery.verify'),
  validate({ params: adminDeliveryBoyParams, body: adminVerifyDocumentBody }),
  deliveryController.adminVerifyDocument,
);
