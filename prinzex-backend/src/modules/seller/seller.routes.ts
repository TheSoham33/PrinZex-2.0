import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeRoles } from '../../middlewares/authorizeRoles';
import { validate } from '../../middlewares/validate';
import * as sellerController from './seller.controller';
import {
  analyticsQuery,
  bulkDiscountsBody,
  bulkPricingBody,
  createInventoryBody,
  createServiceBody,
  createTeamMemberBody,
  deliverySettingsBody,
  hoursSettingsBody,
  inventoryParams,
  inventoryQuery,
  orderParams,
  ordersQuery,
  payoutsQuery,
  rejectOrderBody,
  serviceParams,
  teamParams,
  updateInventoryBody,
  updateOrderStatusBody,
  updateServiceBody,
  updateStoreBody,
  updateTeamMemberBody,
} from './seller.schema';

/**
 * Seller store management — mounted at /api/seller (AFTER
 * /api/seller/register so onboarding routes are not seller-gated).
 * Every route requires an authenticated SELLER.
 */
export const sellerRouter = Router();

sellerRouter.use(authenticate, authorizeRoles('SELLER'));

// ── Store ──────────────────────────────────────────────────────────────────
sellerRouter.get('/store', sellerController.getStore);
sellerRouter.patch('/store', validate({ body: updateStoreBody }), sellerController.updateStore);

// ── Services ───────────────────────────────────────────────────────────────
sellerRouter.get('/store/services', sellerController.listServices);
sellerRouter.post(
  '/store/services',
  validate({ body: createServiceBody }),
  sellerController.createService,
);
sellerRouter.patch(
  '/store/services/:serviceId',
  validate({ params: serviceParams, body: updateServiceBody }),
  sellerController.updateService,
);
sellerRouter.delete(
  '/store/services/:serviceId',
  validate({ params: serviceParams }),
  sellerController.deleteService,
);

// ── Pricing ────────────────────────────────────────────────────────────────
sellerRouter.get('/pricing', sellerController.getPricing);
sellerRouter.patch('/pricing/bulk', validate({ body: bulkPricingBody }), sellerController.bulkUpdatePrices);
sellerRouter.patch(
  '/pricing/bulk-discounts',
  validate({ body: bulkDiscountsBody }),
  sellerController.updateBulkDiscounts,
);

// ── Inventory (static route BEFORE /:itemId) ───────────────────────────────
sellerRouter.get(
  '/inventory',
  validate({ query: inventoryQuery }),
  sellerController.listInventory,
);
sellerRouter.post(
  '/inventory',
  validate({ body: createInventoryBody }),
  sellerController.createInventoryItem,
);
sellerRouter.get('/inventory/low-stock-alerts', sellerController.getLowStockAlerts);
sellerRouter.patch(
  '/inventory/:itemId',
  validate({ params: inventoryParams, body: updateInventoryBody }),
  sellerController.updateInventoryItem,
);
sellerRouter.delete(
  '/inventory/:itemId',
  validate({ params: inventoryParams }),
  sellerController.deleteInventoryItem,
);

// ── Team ───────────────────────────────────────────────────────────────────
sellerRouter.get('/team', sellerController.listTeamMembers);
sellerRouter.post('/team', validate({ body: createTeamMemberBody }), sellerController.addTeamMember);
sellerRouter.patch(
  '/team/:memberId',
  validate({ params: teamParams, body: updateTeamMemberBody }),
  sellerController.updateTeamMember,
);
sellerRouter.delete(
  '/team/:memberId',
  validate({ params: teamParams }),
  sellerController.deleteTeamMember,
);

// ── Analytics ──────────────────────────────────────────────────────────────
sellerRouter.get(
  '/analytics/overview',
  validate({ query: analyticsQuery }),
  sellerController.getAnalyticsOverview,
);
sellerRouter.get(
  '/analytics/revenue-by-day',
  validate({ query: analyticsQuery }),
  sellerController.getRevenueByDay,
);
sellerRouter.get('/analytics/service-breakdown', sellerController.getServiceBreakdown);

// ── Orders ─────────────────────────────────────────────────────────────────
sellerRouter.get('/orders', validate({ query: ordersQuery }), sellerController.listOrders);
sellerRouter.get('/orders/:orderId', validate({ params: orderParams }), sellerController.getOrderDetail);
sellerRouter.patch(
  '/orders/:orderId/status',
  validate({ params: orderParams, body: updateOrderStatusBody }),
  sellerController.updateOrderStatus,
);
sellerRouter.patch(
  '/orders/:orderId/reject',
  validate({ params: orderParams, body: rejectOrderBody }),
  sellerController.rejectOrder,
);

// ── Payouts (static route BEFORE any param route) ──────────────────────────
sellerRouter.get('/payouts', validate({ query: payoutsQuery }), sellerController.listPayouts);
sellerRouter.get('/payouts/pending-balance', sellerController.getPendingBalance);
sellerRouter.post('/payouts/request', sellerController.requestPayout);

// ── Settings ───────────────────────────────────────────────────────────────
sellerRouter.patch(
  '/settings/delivery',
  validate({ body: deliverySettingsBody }),
  sellerController.updateDeliverySettings,
);
sellerRouter.patch(
  '/settings/hours',
  validate({ body: hoursSettingsBody }),
  sellerController.updateStoreHours,
);
