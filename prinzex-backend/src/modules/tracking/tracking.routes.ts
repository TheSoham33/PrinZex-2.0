import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeRoles } from '../../middlewares/authorizeRoles';
import { validate } from '../../middlewares/validate';
import * as trackingController from './tracking.controller';

/**
 * Customer live tracking — mounted at /api/tracking.
 * "Public for customers with order ownership": the JWT carries the customer
 * and the service verifies order.customerId === req.user.userId.
 */
export const trackingRouter = Router();

const orderParams = z.object({ orderId: z.string().min(1) });

trackingRouter.use(authenticate, authorizeRoles('CUSTOMER'));

trackingRouter.get('/:orderId', validate({ params: orderParams }), trackingController.getTracking);
trackingRouter.get(
  '/:orderId/history',
  validate({ params: orderParams }),
  trackingController.getLocationHistory,
);
