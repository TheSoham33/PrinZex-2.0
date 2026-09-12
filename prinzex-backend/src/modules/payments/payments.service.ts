import type { Prisma } from '@prisma/client';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';
import { REDIS_KEYS, REDIS_TTL } from '../../config/redis';
import { NotificationModel } from '../../models/mongo/Notification.model';
import { ActivityLogModel } from '../../models/mongo/ActivityLog.model';
import { ApiError } from '../../utils/ApiError';
import { getCache, setCache } from '../../utils/cache';
import { roundMoney, rupeesToPaise, splitWalletGateway } from '../../utils/financial';
import {
  buildPaginatedResponse,
  toSkipTake,
  type PaginatedResponse,
} from '../../utils/pagination';
import { computeCheckoutSignature, razorpayClient, razorpayConfigured } from './razorpay.client';
import { emitAdminGlobalEvent, emitNewOrder, emitNotificationNew } from '../../realtime/realtime.emitters';
import type {
  AdminRefundInput,
  PaymentHistoryQuery,
  TopupVerifyInput,
  VerifyPaymentInput,
} from './payments.schema';

/**
 * Payment lifecycle — LIVE Razorpay wiring:
 *   create-order (server) → checkout (client) → verify signature (server)
 * plus the webhook channel as the redundant, idempotent second source of
 * truth. All money moves through utils/financial helpers (paise at the
 * gateway boundary, Decimal in the DB).
 */

async function notify(
  recipientId: string,
  recipientType: 'customer' | 'seller' | 'delivery_boy' | 'admin',
  type: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<void> {
  await NotificationModel.create({ recipientId, recipientType, type, title, body, data, channel: ['push'] });
  emitNotificationNew(recipientType, recipientId, { type, title, body, data }); // step 9 realtime
}

async function runSideEffects(label: string, effects: Array<() => Promise<unknown>>): Promise<void> {
  for (const effect of effects) {
    try {
      await effect();
    } catch (error) {
      logger.error('payment_side_effect_failed', {
        label,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

function assertGatewayConfigured(): void {
  if (!razorpayConfigured()) {
    throw ApiError.internal('Payment gateway is not configured (missing RAZORPAY_KEY_ID/SECRET)');
  }
}

// ── POST /api/payments/create-order ────────────────────────────────────────

export interface PaymentOrderResponse {
  razorpayOrderId: string;
  amount: number; // paise, integer — as the gateway expects
  currency: string;
  keyId: string;
  orderId: string;
}

export async function createPaymentOrder(
  customerId: string,
  orderId: string,
): Promise<PaymentOrderResponse> {
  const order = await prisma.order.findFirst({ where: { id: orderId, customerId } });
  if (!order) {
    throw ApiError.notFound('Order not found');
  }
  if (order.paymentStatus === 'paid') {
    throw ApiError.conflict('This order is already paid');
  }
  if (order.paymentStatus !== 'pending' && order.paymentStatus !== 'failed') {
    throw ApiError.badRequest(`Order payment cannot be initiated — status is "${order.paymentStatus}"`);
  }
  if (order.paymentMethod === 'cod') {
    throw ApiError.badRequest('Cash-on-delivery orders do not need online payment');
  }
  if (order.paymentMethod === 'wallet') {
    throw ApiError.badRequest('This order was placed with wallet balance — no online payment needed');
  }

  assertGatewayConfigured();
  // Charge only what the wallet didn't cover (partial wallet checkout):
  // order.walletAmount was already debited at placement, so the gateway
  // collects the remainder. Zero/negative should never happen — orders
  // covered entirely by the wallet are 'paid' before reaching here.
  const gatewayDue = roundMoney(Number(order.total) - Number(order.walletAmount ?? 0));
  if (gatewayDue <= 0) {
    throw ApiError.badRequest('Nothing left to pay — wallet already covers this order');
  }
  const amountPaise = rupeesToPaise(gatewayDue);
  const razorpayOrder = await razorpayClient().orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: order.id,
    notes: { orderId: order.id, customerId: order.customerId },
  });

  // Keep the mapping while checkout is open (30 min) — verify cross-checks it.
  await setCache(REDIS_KEYS.RAZORPAY_ORDER(order.id), razorpayOrder.id, REDIS_TTL.CACHE_RAZORPAY_ORDER);

  return {
    razorpayOrderId: razorpayOrder.id,
    amount: amountPaise,
    currency: 'INR',
    keyId: env.RAZORPAY_KEY_ID,
    orderId: order.id,
  };
}

// ── Shared: mark an order paid (verify + webhook paths) — IDEMPOTENT ───────

export async function markOrderPaid(orderId: string, paymentId: string): Promise<{ already: boolean }> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw ApiError.notFound('Order not found');
  }
  if (order.paymentStatus === 'paid') {
    // Double-processing (verify + webhook, retries) must not double-notify.
    return { already: true };
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: 'paid', paymentId },
  });

  // Gateway orders tell the seller only AFTER money lands (step-5 placement
  // notifies immediately for wallet/cod instead).
  const shortId = order.id.slice(-6).toUpperCase();
  await runSideEffects('order.paid', [
    async () => {
      // Real-time (step 9): the seller's first signal for gateway orders.
      emitNewOrder(order.sellerId, {
        orderId: order.id,
        total: Number(order.total),
        paymentMethod: order.paymentMethod,
        timestamp: new Date(),
      });
    },
    () =>
      notify(
        order.sellerId,
        'seller',
        'new_order',
        'Payment received — new order',
        `Payment of ₹${Number(order.total)} received for order #${shortId}.`,
        { orderId: order.id, paymentId },
      ),
    () =>
      notify(
        order.customerId,
        'customer',
        'payment_success',
        `Payment successful — order #${shortId}`,
        `We received your payment of ₹${Number(order.total)}.`,
        { orderId: order.id },
      ),
  ]);

  return { already: false };
}

export async function markOrderPaymentFailed(orderId: string, paymentId?: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.paymentStatus !== 'pending') {
    return; // only pending orders transition; idempotent
  }
  await prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: 'failed', ...(paymentId ? { paymentId } : {}) },
  });
  await runSideEffects('order.payment_failed', [
    async () => emitAdminGlobalEvent('payment.failed', { orderId: order.id, paymentId: paymentId ?? null }),
    () =>
      notify(
        order.customerId,
        'customer',
        'payment_failed',
        `Payment failed — order #${order.id.slice(-6).toUpperCase()}`,
        'Your payment did not go through. You can retry from your orders page.',
        { orderId: order.id },
      ),
  ]);
}

// ── POST /api/payments/verify ──────────────────────────────────────────────

export async function verifyPayment(
  customerId: string,
  input: VerifyPaymentInput,
): Promise<{ message: string; already: boolean }> {
  // 1. Signature proof first — rejects before any DB work happens.
  const expected = computeCheckoutSignature(input.razorpayOrderId, input.razorpayPaymentId);
  if (expected !== input.razorpaySignature) {
    throw ApiError.badRequest('Invalid payment signature');
  }

  // 2. Ownership + state checks.
  const order = await prisma.order.findFirst({ where: { id: input.orderId, customerId } });
  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  // Cross-check the checkout session we opened (expiry is OK — signature wins).
  const cachedRazorpayOrderId = await getCache<string>(REDIS_KEYS.RAZORPAY_ORDER(order.id));
  if (cachedRazorpayOrderId && cachedRazorpayOrderId !== input.razorpayOrderId) {
    throw ApiError.badRequest('Razorpay order mismatch — please restart checkout');
  }

  // 3. Idempotent mark-paid.
  return { message: 'Payment successful', ...(await markOrderPaid(order.id, input.razorpayPaymentId)) };
}

// ── POST /api/payments/refund (admin) ──────────────────────────────────────

export interface RefundResult {
  orderId: string;
  refunded: number;
  channel: 'wallet' | 'gateway' | 'split';
  newPaymentStatus: string;
  razorpayRefundId?: string;
}

export async function processAdminRefund(
  adminId: string,
  input: AdminRefundInput,
  meta: { ipAddress?: string; userAgent?: string } = {},
): Promise<RefundResult> {
  const order = await prisma.order.findUnique({ where: { id: input.orderId } });
  if (!order) {
    throw ApiError.notFound('Order not found');
  }
  if (order.paymentStatus !== 'paid') {
    throw ApiError.badRequest(`Only paid orders can be refunded — status is "${order.paymentStatus}"`);
  }
  const amount = roundMoney(input.amount);
  if (amount > Number(order.total)) {
    throw ApiError.badRequest(`Refund amount cannot exceed the order total of ₹${Number(order.total)}`);
  }

  const newPaymentStatus = amount < Number(order.total) ? 'partially_refunded' : 'refunded';

  // Route each leg to its source: what was taken from the wallet (capped at
  // walletAmount) returns to the wallet; anything above that returns to the
  // bank through the gateway. Pure 'wallet' orders have walletAmount ===
  // total, so the gateway leg stays 0 for them.
  const { walletPart, gatewayPart } = splitWalletGateway(amount, Number(order.walletAmount ?? 0));
  const channel: RefundResult['channel'] =
    walletPart > 0 && gatewayPart > 0 ? 'split' : walletPart > 0 ? 'wallet' : 'gateway';
  let razorpayRefundId: string | undefined;

  // Gateway leg FIRST — if it throws, nothing has committed and the admin can
  // simply retry. The wallet leg + status flip then land in one atomic tx.
  if (gatewayPart > 0) {
    // card / upi / razorpay — REAL gateway refund.
    if (!order.paymentId) {
      throw ApiError.badRequest('Order has no gateway payment reference to refund');
    }
    assertGatewayConfigured();
    const refund = await razorpayClient().payments.refund(order.paymentId, {
      amount: rupeesToPaise(gatewayPart),
      notes: { reason: input.reason, adminId },
      speed: 'normal',
    });
    razorpayRefundId = refund.id;
  }

  await prisma.$transaction(async (tx) => {
    if (walletPart > 0) {
      const wallet =
        (await tx.wallet.findUnique({ where: { userId: order.customerId } })) ??
        (await tx.wallet.create({ data: { userId: order.customerId } }));
      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: walletPart } } });
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'CREDIT',
          reason: 'REFUND',
          amount: walletPart,
          description: `Admin refund for order ${order.id}: ${input.reason}`,
          referenceId: order.id,
        },
      });
    }
    await tx.order.update({ where: { id: order.id }, data: { paymentStatus: newPaymentStatus } });
  });

  await runSideEffects('payment.refund', [
    () =>
      notify(
        order.customerId,
        'customer',
        'refund_initiated',
        `Refund of ₹${amount} initiated`,
        `Your refund for order #${order.id.slice(-6).toUpperCase()} is on its way (${channel}).`,
        { orderId: order.id, amount, channel },
      ),
    () =>
      ActivityLogModel.create({
        adminId,
        action: 'order.refunded',
        entityType: 'order',
        entityId: order.id,
        metadata: { amount, reason: input.reason, channel, razorpayRefundId: razorpayRefundId ?? null },
        ...(meta.ipAddress ? { ipAddress: meta.ipAddress } : {}),
        ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
      }),
  ]);

  return { orderId: order.id, refunded: amount, channel, newPaymentStatus, ...(razorpayRefundId ? { razorpayRefundId } : {}) };
}

/**
 * Automatic money-back when an order is cancelled or seller-rejected AFTER
 * being paid — the caller owns the status change, this owns the money:
 *  - the walletAmount part returns to the wallet instantly (ledgered
 *    Transaction row) — full for 'wallet' orders, partial for wallet-split
 *    checkouts;
 *  - the remainder goes back through the gateway on the stored payment id
 *    (real Razorpay refund, webhook confirms async);
 *  - pending/COD orders are a no-op.
 * Gateway failures never throw: they mark the order 'refund_failed' and
 * log, so the cancellation itself can complete and ops can retry from
 * Admin → Refund (processAdminRefund above).
 */
export async function refundOrderToSource(
  orderId: string,
  reasonLabel: string,
): Promise<{ refunded: boolean; channel: 'wallet' | 'gateway' | 'split' | 'none' }> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.paymentStatus !== 'paid') return { refunded: false, channel: 'none' };

  // Split on what was actually taken from the wallet at checkout: walletAmount
  // returns to the wallet instantly, the rest to the bank through the gateway.
  // (For pure 'wallet' orders walletAmount === total, so the gateway leg is 0.)
  const { walletPart, gatewayPart } = splitWalletGateway(
    Number(order.total),
    Number(order.walletAmount ?? 0),
  );
  const channel = walletPart > 0 && gatewayPart > 0 ? 'split' : walletPart > 0 ? 'wallet' : 'gateway';

  // Gateway leg FIRST: only once the bank-side refund is accepted do we touch
  // the wallet and flip the status — a gateway failure leaves the order
  // cleanly retryable ('refund_failed', nothing half-returned).
  if (gatewayPart > 0) {
    if (!order.paymentId) {
      logger.error('order_refund_failed', { orderId: order.id, reason: 'missing gateway paymentId' });
      await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'refund_failed' } });
      return { refunded: false, channel };
    }
    try {
      assertGatewayConfigured();
      await razorpayClient().payments.refund(order.paymentId, {
        amount: rupeesToPaise(gatewayPart),
        notes: { reason: reasonLabel },
        speed: 'normal',
      });
    } catch (error) {
      logger.error('order_refund_failed', {
        orderId: order.id,
        error: error instanceof Error ? error.message : String(error),
      });
      await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'refund_failed' } });
      return { refunded: false, channel };
    }
  }

  // Wallet leg + status flip, atomically.
  await prisma.$transaction(async (tx) => {
    if (walletPart > 0) {
      const wallet =
        (await tx.wallet.findUnique({ where: { userId: order.customerId } })) ??
        (await tx.wallet.create({ data: { userId: order.customerId } }));
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: walletPart } },
      });
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'CREDIT',
          reason: 'REFUND',
          amount: walletPart,
          description: `${reasonLabel} — refund for order ${order.id}`,
          referenceId: order.id,
        },
      });
    }
    await tx.order.update({ where: { id: order.id }, data: { paymentStatus: 'refunded' } });
  });
  return { refunded: true, channel };
}

// ── GET /api/payments/history (customer) ───────────────────────────────────

export async function getPaymentHistory(
  customerId: string,
  query: PaymentHistoryQuery,
): Promise<PaginatedResponse<unknown>> {
  const where: Prisma.OrderWhereInput = { customerId };
  const { skip, take } = toSkipTake({ page: query.page, limit: query.limit });
  const [total, orders] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        status: true,
        total: true,
        paymentMethod: true,
        paymentStatus: true,
        paymentId: true,
        createdAt: true,
        seller: { select: { storeName: true } },
      },
    }),
  ]);

  return buildPaginatedResponse(
    orders.map((order) => ({
      orderId: order.id,
      orderStatus: order.status,
      storeName: order.seller.storeName,
      amount: Number(order.total),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      paymentId: order.paymentId,
      date: order.createdAt,
    })),
    total,
    { page: query.page, limit: query.limit },
  );
}

// ══════════════════════════════════════════════════════════════════════════
// WALLET — Razorpay top-up (initiate → verify → atomic credit)
// ══════════════════════════════════════════════════════════════════════════

export interface PendingTopup {
  customerId: string;
  amount: number;
  createdAt: string;
}

export interface TopupInitiateResponse {
  razorpayOrderId: string;
  amount: number; // paise
  currency: string;
  keyId: string;
  topupAmount: number; // rupees
}

export async function initiateTopup(customerId: string, amount: number): Promise<TopupInitiateResponse> {
  assertGatewayConfigured();
  const amountPaise = rupeesToPaise(roundMoney(amount));
  const razorpayOrder = await razorpayClient().orders.create({
    amount: amountPaise,
    currency: 'INR',
    // Receipt doubles as the webhook's top-up discriminator.
    receipt: `topup:${customerId}:${Date.now()}`,
    notes: { topupCustomerId: customerId, topupAmount: roundMoney(amount) },
  });

  const pending: PendingTopup = { customerId, amount: roundMoney(amount), createdAt: new Date().toISOString() };
  await setCache(REDIS_KEYS.RAZORPAY_TOPUP(razorpayOrder.id), pending, REDIS_TTL.CACHE_RAZORPAY_ORDER);

  return {
    razorpayOrderId: razorpayOrder.id,
    amount: amountPaise,
    currency: 'INR',
    keyId: env.RAZORPAY_KEY_ID,
    topupAmount: roundMoney(amount),
  };
}

/**
 * Atomic, idempotent wallet credit. Both the verify route and the webhook
 * funnel here — the Transaction.referenceId = paymentId guard makes
 * double-crediting impossible (re-check inside the transaction).
 */
export async function creditWalletTopup(
  customerId: string,
  amount: number,
  paymentId: string,
): Promise<{ balance: number; alreadyCredited: boolean }> {
  return prisma.$transaction(async (tx) => {
    const wallet =
      (await tx.wallet.findUnique({ where: { userId: customerId } })) ??
      (await tx.wallet.create({ data: { userId: customerId } }));

    const existing = await tx.transaction.findFirst({
      where: { walletId: wallet.id, reason: 'WALLET_TOPUP', referenceId: paymentId },
    });
    if (existing) {
      return { balance: Number(wallet.balance), alreadyCredited: true };
    }

    const updated = await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: amount } },
    });
    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: 'CREDIT',
        reason: 'WALLET_TOPUP',
        amount,
        description: `Wallet top-up of ₹${amount} via Razorpay`,
        referenceId: paymentId,
      },
    });
    return { balance: Number(updated.balance), alreadyCredited: false };
  });
}

export async function verifyTopup(
  customerId: string,
  input: TopupVerifyInput,
): Promise<{ balance: number; message: string; alreadyCredited: boolean }> {
  const expected = computeCheckoutSignature(input.razorpayOrderId, input.razorpayPaymentId);
  if (expected !== input.razorpaySignature) {
    throw ApiError.badRequest('Invalid payment signature');
  }

  const pending = await getCache<PendingTopup>(REDIS_KEYS.RAZORPAY_TOPUP(input.razorpayOrderId));
  if (pending && pending.customerId !== customerId) {
    throw ApiError.forbidden('This checkout session does not belong to you');
  }
  if (pending && Math.abs(pending.amount - roundMoney(input.topupAmount)) > 0.001) {
    throw ApiError.badRequest('Top-up amount mismatch with the initiated checkout');
  }

  const result = await creditWalletTopup(customerId, roundMoney(input.topupAmount), input.razorpayPaymentId);
  return {
    ...result,
    message: result.alreadyCredited ? 'Already credited' : 'Wallet topped up successfully',
  };
}

export async function getWalletBalance(customerId: string): Promise<{ balance: number; loyaltyPoints: number }> {
  const wallet = await prisma.wallet.findUnique({ where: { userId: customerId } });
  return {
    balance: Number(wallet?.balance ?? 0),
    loyaltyPoints: wallet?.loyaltyPoints ?? 0,
  };
}
