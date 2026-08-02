import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeRoles, requirePermission } from '../../middlewares/authorizeRoles';
import { validate } from '../../middlewares/validate';
import * as ordersController from './orders.controller';
import {
  adminDisputeBody,
  adminOrdersQuery,
  adminRefundBody,
  adminUpdateStatusBody,
  cancelOrderBody,
  createOrderBody,
  createReviewBody,
  listOrdersQuery,
  orderParams,
  quoteBody,
} from './orders.schema';

/**
 * Customer order flow — mounted at /api/orders. All routes authenticated.
 * `/quote` is declared before `/:orderId` so Express never swallows it.
 *
 * IMPORTANT: prices are never read from the request body — the server
 * recalculates every quote (orders.helpers).
 */
export const ordersRouter = Router();

ordersRouter.use(authenticate, authorizeRoles('CUSTOMER'));

ordersRouter.post('/quote', validate({ body: quoteBody }), ordersController.createQuote);
ordersRouter.post('/', validate({ body: createOrderBody }), ordersController.createOrder);
ordersRouter.get('/', validate({ query: listOrdersQuery }), ordersController.listOrders);
ordersRouter.get('/:orderId', validate({ params: orderParams }), ordersController.getOrderDetail);
ordersRouter.post(
  '/:orderId/cancel',
  validate({ params: orderParams, body: cancelOrderBody }),
  ordersController.cancelOrder,
);
ordersRouter.post(
  '/:orderId/reviews',
  validate({ params: orderParams, body: createReviewBody }),
  ordersController.createReview,
);

/**
 * Admin order operations — mounted at /api/admin/orders.
 * Reads need `orders.view`, mutations need `orders.manage` (the platform's
 * permission vocabulary for what the spec calls "canManageOrders").
 */
export const adminOrdersRouter = Router();

adminOrdersRouter.use(authenticate, authorizeRoles('ADMIN'));

adminOrdersRouter.get(
  '/',
  requirePermission('orders.view'),
  validate({ query: adminOrdersQuery }),
  ordersController.adminListOrders,
);
adminOrdersRouter.get(
  '/:orderId',
  requirePermission('orders.view'),
  validate({ params: orderParams }),
  ordersController.adminGetOrderDetail,
);
adminOrdersRouter.patch(
  '/:orderId/status',
  requirePermission('orders.manage'),
  validate({ params: orderParams, body: adminUpdateStatusBody }),
  ordersController.adminUpdateStatus,
);
adminOrdersRouter.post(
  '/:orderId/refund',
  requirePermission('orders.manage'),
  validate({ params: orderParams, body: adminRefundBody }),
  ordersController.adminRefund,
);
adminOrdersRouter.post(
  '/:orderId/dispute',
  requirePermission('orders.manage'),
  validate({ params: orderParams, body: adminDisputeBody }),
  ordersController.adminResolveDispute,
);
