import type { Request } from 'express';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import type { SellerTokenPayload } from '../../utils/jwt';
import * as sellerService from './seller.service';
import type {
  AnalyticsQuery,
  BulkDiscountsInput,
  BulkPricingInput,
  CreateInventoryInput,
  CreateServiceInput,
  CreateTeamMemberInput,
  DeliverySettingsInput,
  HoursSettingsInput,
  InventoryQuery,
  OrdersQuery,
  PayoutsQuery,
  RejectOrderInput,
  UpdateInventoryInput,
  UpdateOrderStatusInput,
  UpdateServiceInput,
  UpdateStoreInput,
  UpdateTeamMemberInput,
} from './seller.schema';

/** Narrowed request — the module router mounts authenticate + authorizeRoles('SELLER'). */
function sellerId(req: Request): string {
  const user = req.user as SellerTokenPayload | undefined;
  if (!user || user.role !== 'SELLER') {
    throw ApiError.unauthorized();
  }
  return user.sellerId;
}

// ── Store ──────────────────────────────────────────────────────────────────

export const getStore = asyncHandler(async (req, res) => {
  const store = await sellerService.getStore(sellerId(req));
  res.status(200).json(new ApiResponse(200, store, 'Store fetched'));
});

export const updateStore = asyncHandler(async (req, res) => {
  const store = await sellerService.updateStore(sellerId(req), req.body as UpdateStoreInput);
  res.status(200).json(new ApiResponse(200, store, 'Store updated'));
});

// ── Services ───────────────────────────────────────────────────────────────

export const listServices = asyncHandler(async (req, res) => {
  const groups = await sellerService.listServices(sellerId(req));
  res.status(200).json(new ApiResponse(200, { categories: groups }, 'Services fetched'));
});

export const createService = asyncHandler(async (req, res) => {
  const service = await sellerService.createService(sellerId(req), req.body as CreateServiceInput);
  res.status(201).json(new ApiResponse(201, service, 'Service added'));
});

export const updateService = asyncHandler(async (req, res) => {
  const service = await sellerService.updateService(
    sellerId(req),
    req.params.serviceId,
    req.body as UpdateServiceInput,
  );
  res.status(200).json(new ApiResponse(200, service, 'Service updated'));
});

export const deleteService = asyncHandler(async (req, res) => {
  const result = await sellerService.deleteService(sellerId(req), req.params.serviceId);
  const message =
    result.action === 'deactivated'
      ? 'Service has active orders — deactivated instead of deleted'
      : 'Service deleted';
  res.status(200).json(new ApiResponse(200, result, message));
});

// ── Pricing ────────────────────────────────────────────────────────────────

export const getPricing = asyncHandler(async (req, res) => {
  const pricing = await sellerService.getPricing(sellerId(req));
  res.status(200).json(new ApiResponse(200, pricing, 'Pricing fetched'));
});

export const bulkUpdatePrices = asyncHandler(async (req, res) => {
  const result = await sellerService.bulkUpdatePrices(sellerId(req), req.body as BulkPricingInput);
  res.status(200).json(new ApiResponse(200, result, 'Prices updated'));
});

export const updateBulkDiscounts = asyncHandler(async (req, res) => {
  const result = await sellerService.updateBulkDiscountTiers(
    sellerId(req),
    req.body as BulkDiscountsInput,
  );
  res.status(200).json(new ApiResponse(200, result, 'Bulk discount tiers updated'));
});

// ── Inventory ──────────────────────────────────────────────────────────────

export const listInventory = asyncHandler(async (req, res) => {
  const items = await sellerService.listInventory(sellerId(req), req.query as unknown as InventoryQuery);
  res.status(200).json(new ApiResponse(200, items, 'Inventory fetched'));
});

export const createInventoryItem = asyncHandler(async (req, res) => {
  const item = await sellerService.createInventoryItem(sellerId(req), req.body as CreateInventoryInput);
  res.status(201).json(new ApiResponse(201, item, 'Inventory item added'));
});

export const updateInventoryItem = asyncHandler(async (req, res) => {
  const item = await sellerService.updateInventoryItem(
    sellerId(req),
    req.params.itemId,
    req.body as UpdateInventoryInput,
  );
  res.status(200).json(new ApiResponse(200, item, 'Inventory item updated'));
});

export const deleteInventoryItem = asyncHandler(async (req, res) => {
  const result = await sellerService.deleteInventoryItem(sellerId(req), req.params.itemId);
  res.status(200).json(new ApiResponse(200, result, 'Inventory item deleted'));
});

export const getLowStockAlerts = asyncHandler(async (req, res) => {
  const alerts = await sellerService.getLowStockAlerts(sellerId(req));
  res.status(200).json(new ApiResponse(200, alerts, 'Low stock alerts fetched'));
});

// ── Team ───────────────────────────────────────────────────────────────────

export const listTeamMembers = asyncHandler(async (req, res) => {
  const members = await sellerService.listTeamMembers(sellerId(req));
  res.status(200).json(new ApiResponse(200, members, 'Team fetched'));
});

export const addTeamMember = asyncHandler(async (req, res) => {
  const member = await sellerService.addTeamMember(sellerId(req), req.body as CreateTeamMemberInput);
  res.status(201).json(new ApiResponse(201, member, 'Team member added — invite sent'));
});

export const updateTeamMember = asyncHandler(async (req, res) => {
  const member = await sellerService.updateTeamMember(
    sellerId(req),
    req.params.memberId,
    req.body as UpdateTeamMemberInput,
  );
  res.status(200).json(new ApiResponse(200, member, 'Team member updated'));
});

export const deleteTeamMember = asyncHandler(async (req, res) => {
  const result = await sellerService.deleteTeamMember(sellerId(req), req.params.memberId);
  res.status(200).json(new ApiResponse(200, result, 'Team member removed'));
});

// ── Analytics ──────────────────────────────────────────────────────────────

export const getAnalyticsOverview = asyncHandler(async (req, res) => {
  const { period } = req.query as unknown as AnalyticsQuery;
  const { overview, cacheHit } = await sellerService.getAnalyticsOverview(sellerId(req), period);
  if (cacheHit) {
    res.setHeader('X-Cache', 'HIT');
  } else {
    res.setHeader('X-Cache', 'MISS');
  }
  res.status(200).json(new ApiResponse(200, overview, 'Analytics overview fetched'));
});

export const getRevenueByDay = asyncHandler(async (req, res) => {
  const { period } = req.query as unknown as AnalyticsQuery;
  const days = await sellerService.getRevenueByDay(sellerId(req), period);
  res.status(200).json(new ApiResponse(200, days, 'Daily revenue fetched'));
});

export const getServiceBreakdown = asyncHandler(async (req, res) => {
  const breakdown = await sellerService.getServiceBreakdown(sellerId(req));
  res.status(200).json(new ApiResponse(200, breakdown, 'Service breakdown fetched'));
});

// ── Orders ─────────────────────────────────────────────────────────────────

export const listOrders = asyncHandler(async (req, res) => {
  const orders = await sellerService.listOrders(sellerId(req), req.query as unknown as OrdersQuery);
  res.status(200).json(new ApiResponse(200, orders, 'Orders fetched'));
});

export const getOrderDetail = asyncHandler(async (req, res) => {
  const order = await sellerService.getOrderDetail(sellerId(req), req.params.orderId);
  res.status(200).json(new ApiResponse(200, order, 'Order fetched'));
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const result = await sellerService.updateOrderStatus(
    sellerId(req),
    req.params.orderId,
    req.body as UpdateOrderStatusInput,
  );
  res.status(200).json(new ApiResponse(200, result, `Order marked ${result.status.replace(/_/g, ' ')}`));
});

export const rejectOrder = asyncHandler(async (req, res) => {
  const result = await sellerService.rejectOrder(
    sellerId(req),
    req.params.orderId,
    req.body as RejectOrderInput,
  );
  res.status(200).json(new ApiResponse(200, result, 'Order rejected and cancelled'));
});

// ── Payouts ────────────────────────────────────────────────────────────────

export const listPayouts = asyncHandler(async (req, res) => {
  const query = req.query as unknown as PayoutsQuery;
  const payouts = await sellerService.listPayouts(sellerId(req), {
    page: query.page,
    limit: query.limit,
  });
  res.status(200).json(new ApiResponse(200, payouts, 'Payouts fetched'));
});

export const getPendingBalance = asyncHandler(async (req, res) => {
  const balance = await sellerService.getPendingBalance(sellerId(req));
  res.status(200).json(new ApiResponse(200, balance, 'Pending balance fetched'));
});

export const requestPayout = asyncHandler(async (req, res) => {
  const payout = await sellerService.requestPayout(sellerId(req));
  res.status(201).json(new ApiResponse(201, payout, 'Payout requested — processing by finance team'));
});

// ── Settings ───────────────────────────────────────────────────────────────

export const updateDeliverySettings = asyncHandler(async (req, res) => {
  const settings = await sellerService.updateDeliverySettings(
    sellerId(req),
    req.body as DeliverySettingsInput,
  );
  res.status(200).json(new ApiResponse(200, settings, 'Delivery settings updated'));
});

export const updateStoreHours = asyncHandler(async (req, res) => {
  const result = await sellerService.updateStoreHours(sellerId(req), req.body as HoursSettingsInput);
  res.status(200).json(new ApiResponse(200, result, 'Store hours updated'));
});
