import type { Order, Prisma } from '@prisma/client';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';
import { REDIS_KEYS, REDIS_TTL } from '../../config/redis';
import { NotificationModel } from '../../models/mongo/Notification.model';
import { OrderTimelineModel } from '../../models/mongo/Order.model';
import { ActivityLogModel } from '../../models/mongo/ActivityLog.model';
import type { DeliveryAddressSnapshot, OrderStatus } from '../../types';
import { ApiError } from '../../utils/ApiError';
import { setCache } from '../../utils/cache';
import { isValidTransition } from '../../utils/stateMachine';
import {
  buildPaginatedResponse,
  toSkipTake,
  type PaginatedResponse,
} from '../../utils/pagination';
import { invalidateSellerAnalytics, invalidateStoreCaches } from '../seller/seller.service';
import { invalidateAdminStats } from '../admin/analytics/admin-analytics.service';
import { autoAssignDelivery } from '../delivery/delivery.assignment';
import {
  emitAdminGlobalEvent,
  emitNewOrder,
  emitNotificationNew,
  emitOrderStatusChanged,
} from '../../realtime/realtime.emitters';
import {
  assertKnownFinishing,
  computeQuote,
  estimatedDeliveryFor,
  validateCoupon,
  type QuoteResult,
} from './orders.helpers';
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

/**
 * Order lifecycle — the core transaction flow.
 *
 * Money math is ALWAYS recomputed server-side (orders.helpers). Every
 * multi-write mutation runs inside a Prisma $transaction; cross-database
 * side effects (MongoDB timeline/audit/activity, Redis cache invalidation)
 * run after the SQL commit so a document-store hiccup can never roll back
 * committed money.
 */

// ── Shared side-effect helpers ─────────────────────────────────────────────

function humanize(status: string): string {
  return status.replace(/_/g, ' ');
}

export async function appendTimelineEvent(
  orderId: string,
  status: string,
  updatedBy: string,
  note?: string,
): Promise<void> {
  await OrderTimelineModel.updateOne(
    { orderId },
    {
      $push: {
        timeline: {
          status,
          label: humanize(status),
          timestamp: new Date(),
          ...(note ? { note } : {}),
          updatedBy,
        },
      },
    },
    { upsert: true },
  );
}

async function notifySeller(
  sellerId: string,
  type: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<void> {
  await NotificationModel.create({
    recipientId: sellerId,
    recipientType: 'seller',
    type,
    title,
    body,
    data,
    channel: ['push'],
  });
  emitNotificationNew('seller', sellerId, { type, title, body, data }); // step 9 realtime
}

/**
 * Post-commit side effects. The order already exists — log loudly instead
 * of masking a successful mutation behind a 500.
 */
async function runPostCommitSideEffects(label: string, effects: Array<() => Promise<unknown>>): Promise<void> {
  for (const effect of effects) {
    try {
      await effect();
    } catch (error) {
      logger.error('order_side_effect_failed', {
        label,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

// ── Service + seller validation (shared quote/order path) ──────────────────

async function loadOrderableService(sellerId: string, sellerServiceId: string) {
  const service = await prisma.sellerService.findFirst({
    where: {
      sellerId,
      OR: [{ id: sellerServiceId }, { serviceId: sellerServiceId }],
    },
  });
  if (!service) {
    throw ApiError.notFound('Service not found for this store');
  }
  if (!service.isActive) {
    throw ApiError.badRequest('This service is currently not available at the store');
  }

  const seller = await prisma.seller.findUnique({ where: { id: sellerId } });
  if (!seller) {
    throw ApiError.notFound('Store not found');
  }
  if (seller.status !== 'APPROVED') {
    throw ApiError.badRequest('This store is not accepting orders right now');
  }
  return { service, seller };
}

// ── POST /api/orders/quote ─────────────────────────────────────────────────

export interface QuoteResponse extends QuoteResult {
  estimatedDeliveryDate: Date;
  quoteKey: string;
  coupon: { code: string; valid: boolean; error?: string } | null;
}

export async function createQuote(customerId: string, input: QuoteBody): Promise<QuoteResponse> {
  assertKnownFinishing(input.specifications.finishing);
  const { service, seller } = await loadOrderableService(input.sellerId, input.sellerServiceId);

  // NOTE: the quote flow carries no address, so the SAME_DAY pincode rule is
  // enforced for real at POST /orders (which has deliveryAddressId).

  let discount = 0;
  let coupon: QuoteResponse['coupon'] = null;
  if (input.couponCode) {
    // Validate and price the coupon now — usage is NOT incremented here.
    const base = Number(service.basePrice) * input.quantity;
    const validation = await validateCoupon(input.couponCode, customerId, base);
    if (!validation.valid) {
      coupon = { code: input.couponCode, valid: false, error: validation.error };
    } else {
      discount = validation.discountAmount;
      coupon = { code: validation.coupon!.code, valid: true };
    }
  }

  const quote = computeQuote({
    basePrice: Number(service.basePrice), unit: service.unit,
    quantity: input.quantity,
    specifications: input.specifications,
    deliverySpeed: input.deliverySpeed,
    commissionRate: Number(seller.commissionRate),
    discount,
    sellerMetadata: seller.metadata,
  });

  const timestamp = Date.now();
  const response: QuoteResponse = {
    ...quote,
    estimatedDeliveryDate: estimatedDeliveryFor(input.deliverySpeed),
    quoteKey: REDIS_KEYS.QUOTE(customerId, input.sellerServiceId, timestamp),
    coupon,
  };

  // Cache the exact quote shown to the customer for 15 minutes.
  await setCache(
    response.quoteKey,
    { input, response },
    REDIS_TTL.CACHE_QUOTE,
  );

  return response;
}

// ── POST /api/orders ───────────────────────────────────────────────────────

export interface CreatedOrder {
  order: Order & { items: Prisma.OrderItemGetPayload<object>[] };
  estimatedDelivery: Date;
}

export async function createOrder(customerId: string, input: CreateOrderInput): Promise<CreatedOrder> {
  assertKnownFinishing(input.specifications.finishing);

  // 1. Address must belong to THIS customer (JWT-derived id, never the body).
  const address = await prisma.address.findFirst({
    where: { id: input.deliveryAddressId, userId: customerId },
  });
  if (!address) {
    throw ApiError.notFound('Delivery address not found');
  }

  // 3. Server-side quote — client-sent prices are ignored entirely.
  const { service, seller } = await loadOrderableService(input.sellerId, input.sellerServiceId);

  // SAME_DAY only when the store actually delivers to the address pincode.
  if (input.deliverySpeed === 'SAME_DAY') {
    const pincodes = await prisma.sellerPincode.findMany({
      where: { sellerId: seller.id },
    });
    if (pincodes.length > 0) {
      const entry = pincodes.find((p) => p.pincode === address.pincode);
      if (!entry || entry.isExcluded) {
        throw ApiError.badRequest('Same-day delivery is not available for this pincode');
      }
    }
    // No pincode rows = store hasn't restricted its coverage area; allow.
  }

  let appliedCoupon: string | null = null;
  let discount = 0;
  if (input.couponCode) {
    const validation = await validateCoupon(
      input.couponCode,
      customerId,
      Number(service.basePrice) * input.quantity,
    );
    if (!validation.valid) {
      throw ApiError.badRequest(validation.error ?? 'Coupon is not valid');
    }
    discount = validation.discountAmount;
    appliedCoupon = validation.coupon!.code;
  }

  const quote = computeQuote({
    basePrice: Number(service.basePrice), unit: service.unit,
    quantity: input.quantity,
    specifications: input.specifications,
    deliverySpeed: input.deliverySpeed,
    commissionRate: Number(seller.commissionRate),
    discount,
    sellerMetadata: seller.metadata,
  });

  const paysByWallet = input.paymentMethod === 'wallet';
  const paymentStatus = paysByWallet ? 'paid' : 'pending';
  // TODO(payments step): for card/upi create a Razorpay order here and flip
  // paymentStatus to 'paid' from the webhook after signature verification.

  const estimatedDelivery = estimatedDeliveryFor(input.deliverySpeed);

  // 2. Address snapshot — the order keeps the original even if the address
  //    is edited/deleted later.
  const addressSnapshot: DeliveryAddressSnapshot = {
    label: address.label,
    fullAddress: address.fullAddress,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    phone: address.phone,
    lat: address.lat,
    lng: address.lng,
  };

  // 5. One atomic transaction: order + item + coupon usage + wallet debit.
  const order = await prisma.$transaction(async (tx) => {
    let walletId: string | null = null;
    if (paysByWallet) {
      const wallet = await tx.wallet.findUnique({ where: { userId: customerId } });
      if (!wallet) {
        throw ApiError.badRequest('Wallet not found — top up first');
      }
      if (Number(wallet.balance) < quote.total) {
        throw ApiError.badRequest(
          `Insufficient wallet balance — need ₹${quote.total}, have ₹${Number(wallet.balance)}`,
        );
      }
      walletId = wallet.id;
    }

    const created = await tx.order.create({
      data: {
        customerId,
        sellerId: seller.id,
        status: 'placed',
        total: quote.total,
        subtotal: quote.subtotal,
        deliveryFee: quote.deliveryFee,
        rushFee: quote.rushFee,
        tax: quote.tax,
        discount: quote.discount,
        commissionAmount: quote.commissionAmount,
        deliverySpeed: input.deliverySpeed,
        deliveryAddress: addressSnapshot as unknown as Prisma.InputJsonValue,
        estimatedDelivery,
        specialInstructions: input.specialInstructions ?? null,
        couponCode: appliedCoupon,
        paymentMethod: input.paymentMethod,
        paymentStatus,
        // Rush-eligible speeds flag the order for the seller queue.
        isRush: input.deliverySpeed === 'EXPRESS' || input.deliverySpeed === 'SAME_DAY',
        items: {
          create: [
            {
              sellerServiceId: service.id,
              serviceName: service.serviceName,
              quantity: input.quantity,
              unitPrice: Number(service.basePrice),
              total: quote.subtotal,
              specifications: input.specifications as unknown as Prisma.InputJsonValue,
              fileUrl: input.fileUrl ?? null,
            },
          ],
        },
      },
      include: { items: true },
    });

    // 5c. Coupon usage increments ONLY at creation; the order row itself
    //     (customerId + couponCode) is the per-user usage record consulted
    //     by validateCoupon.
    if (appliedCoupon) {
      await tx.coupon.update({
        where: { code: appliedCoupon },
        data: { usageCount: { increment: 1 } },
      });
    }

    // 5d. Wallet payment: debit + ledger entry, atomically with the order.
    if (paysByWallet && walletId) {
      await tx.wallet.update({
        where: { id: walletId },
        data: { balance: { decrement: quote.total } },
      });
      await tx.transaction.create({
        data: {
          walletId,
          type: 'DEBIT',
          reason: 'ORDER_PAYMENT',
          amount: quote.total,
          description: `Payment for order ${created.id}`,
          referenceId: created.id,
        },
      });
    }

    return created;
  });

  // 6–7. Mongo timeline + seller notification (post-commit, never masked).
  await runPostCommitSideEffects('order.created', [
    () =>
      OrderTimelineModel.create({
        orderId: order.id,
        timeline: [
          { status: 'placed', label: 'placed', timestamp: new Date(), updatedBy: customerId },
        ],
        adminNotes: [],
        disputeDetails: { isDisputed: false },
      }),
    // Wallet/COD orders are already settled → seller hears about the new
    // order NOW. Gateway (card/upi) orders notify at payment capture instead
    // (payments module: "Payment received — new order").
    ...(order.paymentStatus !== 'pending'
      ? [
          () =>
            notifySeller(
              seller.id,
              'new_order',
              'New order received',
              `New order #${order.id.slice(-6).toUpperCase()} — ${service.serviceName} ×${input.quantity} (₹${quote.total}).`,
              { orderId: order.id, total: quote.total, isRush: order.isRush },
            ),
        ]
      : []),
    () => invalidateSellerAnalytics(seller.id),
    // KPI cache (orders today/this month) — significant event, step 8.
    () => invalidateAdminStats(),
    // Real-time (step 9): order:new to the seller's room — same placement-vs-
    // capture split as the notification above (gateway orders fire at capture).
    ...(order.paymentStatus !== 'pending'
      ? [
          async () => {
            emitNewOrder(seller.id, {
              orderId: order.id,
              total: quote.total,
              paymentMethod: order.paymentMethod,
              timestamp: new Date(),
            });
          },
        ]
      : []),
    // Admin global: high-value order alert (> ₹5000).
    ...(quote.total > 5000
      ? [
          async () => {
            emitAdminGlobalEvent('order.high_value', { orderId: order.id, total: quote.total, sellerId: seller.id });
          },
        ]
      : []),
  ]);

  return { order, estimatedDelivery };
}

// ── GET /api/orders (customer) ─────────────────────────────────────────────

export interface CustomerOrderListItem {
  id: string;
  status: string;
  storeName: string;
  services: string[];
  total: number;
  estimatedDelivery: Date;
  isRush: boolean;
  paymentStatus: string;
  createdAt: Date;
}

export async function listCustomerOrders(
  customerId: string,
  query: ListOrdersQuery,
): Promise<PaginatedResponse<CustomerOrderListItem>> {
  const where: Prisma.OrderWhereInput = {
    customerId,
    ...(query.status ? { status: query.status } : {}),
  };
  const { skip, take } = toSkipTake({ page: query.page, limit: query.limit });
  const [total, orders] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        seller: { select: { storeName: true } },
        items: { select: { serviceName: true, quantity: true } },
      },
    }),
  ]);

  return buildPaginatedResponse(
    orders.map((order) => ({
      id: order.id,
      status: order.status,
      storeName: order.seller.storeName,
      services: order.items.map((item) => `${item.serviceName} ×${item.quantity}`),
      total: Number(order.total),
      estimatedDelivery: order.estimatedDelivery,
      isRush: order.isRush,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
    })),
    total,
    { page: query.page, limit: query.limit },
  );
}

// ── GET /api/orders/:orderId (customer) ────────────────────────────────────

type TimelineEvent = {
  status: string;
  label?: string;
  timestamp: Date;
  note?: string;
  updatedBy: string;
};

async function loadTimeline(orderId: string): Promise<TimelineEvent[]> {
  const doc = await OrderTimelineModel.findOne({ orderId });
  return (doc?.timeline ?? []).map((event) => ({
    status: event.status,
    ...(event.label !== undefined ? { label: event.label } : {}),
    timestamp: event.timestamp,
    ...(event.note !== undefined ? { note: event.note } : {}),
    updatedBy: event.updatedBy,
  }));
}

export async function getCustomerOrderDetail(customerId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId },
    include: {
      seller: { select: { id: true, storeName: true, phone: true, city: true } },
      items: true,
      delivery: { select: { status: true, deliveredAt: true, pickedUpAt: true } },
    },
  });
  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  const timeline = await loadTimeline(order.id);
  // Only true internals are withheld from the customer payload (payout
  // plumbing); everything else about their own order is returned as-is.
  const { payoutId: _payoutId, ...safe } = order;
  return { ...safe, timeline };
}

// ── POST /api/orders/:orderId/cancel ───────────────────────────────────────

export async function cancelOrder(
  customerId: string,
  orderId: string,
  input: CancelOrderInput,
): Promise<{ orderId: string; status: string; refund: string }> {
  const order = await prisma.order.findFirst({ where: { id: orderId, customerId } });
  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  // State machine gate: only placed/confirmed may be cancelled by customer.
  if (!isValidTransition(order.status, 'cancelled')) {
    throw ApiError.badRequest('Order cannot be cancelled at this stage. Contact support.');
  }

  const wasPaid = order.paymentStatus === 'paid';
  let refundNote = 'No refund needed (cash on delivery)';

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'cancelled',
        cancelReason: input.reason,
        cancelledAt: new Date(),
        // Money already collected always flips to 'refunded' (see branch TODO).
        ...(wasPaid && order.paymentMethod !== 'cod' ? { paymentStatus: 'refunded' } : {}),
      },
    });

    if (wasPaid && order.paymentMethod === 'wallet') {
      // Wallet refund: instant, atomic, fully ledgered.
      const wallet = await tx.wallet.findUnique({ where: { userId: customerId } });
      if (!wallet) {
        throw ApiError.internal('Wallet record missing for refund');
      }
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: Number(order.total) } },
      });
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'CREDIT',
          reason: 'REFUND',
          amount: Number(order.total),
          description: `Refund for cancelled order ${order.id}`,
          referenceId: order.id,
        },
      });
      refundNote = `₹${Number(order.total)} credited back to your wallet`;
    } else if (wasPaid && (order.paymentMethod === 'card' || order.paymentMethod === 'upi' || order.paymentMethod === 'razorpay')) {
      // TODO: Razorpay refund API — create refund record, confirm via webhook.
      refundNote = 'Refund initiated to your original payment method (5–7 business days)';
    }
  });

  await runPostCommitSideEffects('order.cancelled', [
    () => appendTimelineEvent(order.id, 'cancelled', customerId, `Cancelled by customer: ${input.reason}`),
    async () => emitOrderStatusChanged(order, 'cancelled'), // step 9 realtime
    () =>
      notifySeller(
        order.sellerId,
        'order_cancelled',
        'Order cancelled',
        `Order #${order.id.slice(-6).toUpperCase()} was cancelled by the customer: ${input.reason}`,
        { orderId: order.id, reason: input.reason },
      ),
    () => invalidateSellerAnalytics(order.sellerId),
  ]);

  return { orderId: order.id, status: 'cancelled', refund: refundNote };
}

// ── POST /api/orders/:orderId/reviews ──────────────────────────────────────

export async function createReview(customerId: string, orderId: string, input: CreateReviewInput) {
  const order = await prisma.order.findFirst({ where: { id: orderId, customerId } });
  if (!order) {
    throw ApiError.notFound('Order not found');
  }
  if (order.status !== 'delivered') {
    throw ApiError.badRequest('You can review an order only after it is delivered');
  }
  const existing = await prisma.review.findUnique({ where: { orderId: order.id } });
  if (existing) {
    throw ApiError.conflict('You have already reviewed this order');
  }

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        orderId: order.id,
        customerId,
        entityType: 'STORE',
        entityId: order.sellerId,
        overallRating: input.overallRating,
        qualityRating: input.qualityRating ?? null,
        deliveryRating: input.deliveryRating ?? null,
        communicationRating: input.communicationRating ?? null,
        valueRating: input.valueRating ?? null,
        comment: input.comment ?? null,
        photoUrls: [],
      },
    });

    // Recalculate the store rating inside the same transaction.
    const aggregate = await tx.review.aggregate({
      where: { entityType: 'STORE', entityId: order.sellerId },
      _avg: { overallRating: true },
    });
    await tx.seller.update({
      where: { id: order.sellerId },
      data: { averageRating: aggregate._avg.overallRating ?? 0 },
    });

    return created;
  });

  await runPostCommitSideEffects('review.created', [
    () =>
      notifySeller(
        order.sellerId,
        'new_review',
        'New review received',
        `A customer rated your store ${input.overallRating}★ on order #${order.id.slice(-6).toUpperCase()}.`,
        { orderId: order.id, reviewId: review.id, rating: input.overallRating },
      ),
    () => invalidateStoreCaches(order.sellerId),
  ]);

  return review;
}

// ══════════════════════════════════════════════════════════════════════════
// ADMIN — full-access order operations
// ══════════════════════════════════════════════════════════════════════════

export interface AdminOrderListItem {
  id: string;
  status: string;
  customerName: string;
  sellerName: string;
  serviceName: string; // Added this
  deliveryBoyName: string | null;
  total: number;
  isRush: boolean;
  paymentStatus: string;
  paymentMethod: string;
  estimatedDelivery: Date;
  createdAt: Date;
}

export async function adminListOrders(
  query: AdminOrdersQuery,
): Promise<PaginatedResponse<AdminOrderListItem>> {
  const createdAt: { gte?: Date; lte?: Date } = {};
  if (query.startDate) createdAt.gte = query.startDate;
  if (query.endDate) createdAt.lte = query.endDate;

  const where: Prisma.OrderWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.sellerId ? { sellerId: query.sellerId } : {}),
    ...(query.customerId ? { customerId: query.customerId } : {}),
    ...(query.isRush !== undefined ? { isRush: query.isRush } : {}),
    ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
  };

  const { skip, take } = toSkipTake({ page: query.page, limit: query.limit });
  const [total, orders] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        customer: { select: { name: true } },
        seller: { select: { storeName: true } },
        items: { select: { serviceName: true }, take: 1 }, // Added this
        delivery: { include: { deliveryBoy: { select: { name: true } } } },
      },
    }),
  ]);

  return buildPaginatedResponse(
    orders.map((order) => ({
      id: order.id,
      status: order.status,
      customerName: order.customer.name,
      sellerName: order.seller.storeName,
      serviceName: order.items[0]?.serviceName ?? '—', // Added this
      deliveryBoyName: order.delivery?.deliveryBoy?.name ?? null,
      total: Number(order.total),
      isRush: order.isRush,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      estimatedDelivery: order.estimatedDelivery,
      createdAt: order.createdAt,
    })),
    total,
    { page: query.page, limit: query.limit },
  );
}

export async function adminGetOrderDetail(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      seller: { select: { id: true, storeName: true, ownerName: true, email: true, phone: true } },
      items: true,
      delivery: {
        include: {
          deliveryBoy: { select: { id: true, name: true, phone: true } },
        },
      },
    },
  });
  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  // FULL internal detail for admins — commission, payout linkage included.
  const timeline = await loadTimeline(order.id);
  return { ...order, timeline };
}

export interface AdminActionMeta {
  adminId: string;
  ipAddress?: string;
  userAgent?: string;
}

async function logActivity(
  meta: AdminActionMeta,
  action: string,
  entityId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await ActivityLogModel.create({
    adminId: meta.adminId,
    action,
    entityType: 'order',
    entityId,
    metadata,
    ...(meta.ipAddress ? { ipAddress: meta.ipAddress } : {}),
    ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
  });
}

/** Admin force-status: bypasses the state machine (intervention path). */
export async function adminUpdateOrderStatus(
  meta: AdminActionMeta,
  orderId: string,
  input: AdminUpdateStatusInput,
): Promise<{ orderId: string; status: OrderStatus }> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  const previousStatus = order.status;
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: input.status,
      ...(input.status === 'cancelled' ? { cancelledAt: new Date() } : {}),
    },
  });

  // Timeline + audit still happen — admin overrides are MORE visible, never less.
  await runPostCommitSideEffects('order.admin_status', [
    () =>
      appendTimelineEvent(
        orderId,
        input.status,
        meta.adminId,
        input.note ?? `Admin override: ${previousStatus} → ${input.status}`,
      ),
    () =>
      logActivity(meta, 'order.status_forced', orderId, {
        from: previousStatus,
        to: input.status,
        note: input.note ?? null,
      }),
    () => invalidateSellerAnalytics(order.sellerId),
    async () => emitOrderStatusChanged(order, input.status), // step 9 realtime
    async () => {
      // An admin forcing ready_for_pickup must kick off assignment too.
      if (input.status === 'ready_for_pickup') {
        await autoAssignDelivery(orderId);
      }
    },
  ]);

  return { orderId, status: input.status };
}

export async function adminRefundOrder(
  meta: AdminActionMeta,
  orderId: string,
  input: AdminRefundInput,
): Promise<{ orderId: string; refunded: number; channel: string }> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw ApiError.notFound('Order not found');
  }
  if (input.amount > Number(order.total)) {
    throw ApiError.badRequest(`Refund amount cannot exceed the order total of ₹${Number(order.total)}`);
  }
  if (order.paymentStatus === 'refunded') {
    throw ApiError.conflict('This order has already been refunded');
  }

  let channel = 'none';
  await prisma.$transaction(async (tx) => {
    if (order.paymentMethod === 'wallet') {
      // Wallet: credit the customer immediately (create the wallet if odd legacy data).
      const wallet =
        (await tx.wallet.findUnique({ where: { userId: order.customerId } })) ??
        (await tx.wallet.create({ data: { userId: order.customerId } }));
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: input.amount } },
      });
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'CREDIT',
          reason: 'REFUND',
          amount: input.amount,
          description: `Admin refund for order ${order.id}: ${input.reason}`,
          referenceId: order.id,
        },
      });
      channel = 'wallet';
    } else if (order.paymentMethod === 'cod') {
      // COD was never collected electronically — nothing to send back.
      channel = 'none';
    } else {
      // card / upi / razorpay — stubbed until the gateway integration lands.
      // TODO: Razorpay refund API (payments/refund), confirm via webhook.
      channel = 'gateway';
    }

    await tx.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'refunded' },
    });
  });

  await runPostCommitSideEffects('order.admin_refund', [
    () =>
      appendTimelineEvent(
        orderId,
        order.status,
        meta.adminId,
        `Refund of ₹${input.amount} issued by admin (${channel}): ${input.reason}`,
      ),
    () =>
      logActivity(meta, 'order.refunded', orderId, {
        amount: input.amount,
        reason: input.reason,
        channel,
        paymentMethod: order.paymentMethod,
      }),
  ]);

  return { orderId, refunded: input.amount, channel };
}

export async function adminResolveDispute(
  meta: AdminActionMeta,
  orderId: string,
  input: AdminDisputeInput,
): Promise<{ orderId: string; resolution: 'customer' | 'seller' }> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true } });
  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  await OrderTimelineModel.updateOne(
    { orderId },
    {
      $set: {
        disputeDetails: {
          isDisputed: true,
          reason: input.note,
          resolution: input.resolution,
          resolvedAt: new Date(),
          resolvedBy: meta.adminId,
        },
      },
    },
    { upsert: true },
  );

  await runPostCommitSideEffects('order.admin_dispute', [
    () =>
      logActivity(meta, 'order.dispute_resolved', orderId, {
        resolution: input.resolution,
        note: input.note,
      }),
  ]);

  return { orderId, resolution: input.resolution };
}
