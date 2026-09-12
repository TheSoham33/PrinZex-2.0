import type { Request } from 'express';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import type { AdminTokenPayload, CustomerTokenPayload } from '../../utils/jwt';
import * as ordersService from './orders.service';
import type {
  AdminDisputeInput,
  AdminOrdersQuery,
  AdminRefundInput,
  AdminUpdateStatusInput,
  CancelOrderInput,
  CreateOrderInput,
  CreateReviewInput,
  ListOrdersQuery,
  QuoteBody,
} from './orders.schema';

/** Customer routes mount authorizeRoles('CUSTOMER'); narrow defensively. */
function customerId(req: Request): string {
  const user = req.user as CustomerTokenPayload | undefined;
  if (!user || user.role !== 'CUSTOMER') {
    throw ApiError.unauthorized();
  }
  return user.userId;
}

/** Admin routes mount authorizeRoles('ADMIN') + permission gates. */
function adminMeta(req: Request): ordersService.AdminActionMeta {
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

// ══ CUSTOMER ══════════════════════════════════════════════════════════════

export const createQuote = asyncHandler(async (req, res) => {
  const quote = await ordersService.createQuote(customerId(req), req.body as QuoteBody);
  res.status(200).json(new ApiResponse(200, quote, 'Quote calculated'));
});

export const createOrder = asyncHandler(async (req, res) => {
  const { order, estimatedDelivery } = await ordersService.createOrder(
    customerId(req),
    req.body as CreateOrderInput,
  );
  res.status(201).json(new ApiResponse(201, { order, estimatedDelivery }, 'Order placed'));
});

export const listOrders = asyncHandler(async (req, res) => {
  const orders = await ordersService.listCustomerOrders(
    customerId(req),
    req.query as unknown as ListOrdersQuery,
  );
  res.status(200).json(new ApiResponse(200, orders, 'Orders fetched'));
});

export const getOrderDetail = asyncHandler(async (req, res) => {
  const order = await ordersService.getCustomerOrderDetail(customerId(req), req.params.orderId);
  res.status(200).json(new ApiResponse(200, order, 'Order fetched'));
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const result = await ordersService.cancelOrder(
    customerId(req),
    req.params.orderId,
    req.body as CancelOrderInput,
  );
  res.status(200).json(new ApiResponse(200, result, 'Order cancelled'));
});

export const createReview = asyncHandler(async (req, res) => {
  const review = await ordersService.createReview(
    customerId(req),
    req.params.orderId,
    req.body as CreateReviewInput,
  );
  res.status(201).json(new ApiResponse(201, review, 'Review submitted — thank you!'));
});

// ══ ADMIN ═════════════════════════════════════════════════════════════════

export const adminListOrders = asyncHandler(async (req, res) => {
  const orders = await ordersService.adminListOrders(req.query as unknown as AdminOrdersQuery);
  res.status(200).json(new ApiResponse(200, orders, 'Orders fetched'));
});

export const adminGetOrderDetail = asyncHandler(async (req, res) => {
  const order = await ordersService.adminGetOrderDetail(req.params.orderId);
  res.status(200).json(new ApiResponse(200, order, 'Order fetched'));
});

export const adminUpdateStatus = asyncHandler(async (req, res) => {
  const result = await ordersService.adminUpdateOrderStatus(
    adminMeta(req),
    req.params.orderId,
    req.body as AdminUpdateStatusInput,
  );
  res.status(200).json(new ApiResponse(200, result, `Order status set to ${result.status.replace(/_/g, ' ')}`));
});

export const adminRefund = asyncHandler(async (req, res) => {
  const result = await ordersService.adminRefundOrder(
    adminMeta(req),
    req.params.orderId,
    req.body as AdminRefundInput,
  );
  res.status(200).json(new ApiResponse(200, result, 'Refund processed'));
});

export const adminResolveDispute = asyncHandler(async (req, res) => {
  const result = await ordersService.adminResolveDispute(
    adminMeta(req),
    req.params.orderId,
    req.body as AdminDisputeInput,
  );
  res.status(200).json(new ApiResponse(200, result, `Dispute resolved in favour of ${result.resolution}`));
});
