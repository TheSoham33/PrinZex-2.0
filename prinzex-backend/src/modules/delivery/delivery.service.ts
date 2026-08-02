import type { Prisma } from '@prisma/client';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';
import { redis, REDIS_KEYS, REDIS_TTL } from '../../config/redis';
import { NotificationModel } from '../../models/mongo/Notification.model';
import { ActivityLogModel } from '../../models/mongo/ActivityLog.model';
import { TrackingModel, type ILocationPoint } from '../../models/mongo/Tracking.model';
import type { DeliveryAddressSnapshot } from '../../types';
import { ApiError } from '../../utils/ApiError';
import { getCache, invalidateCache } from '../../utils/cache';
import { sendSms } from '../../utils/email';
import { estimateEtaMinutes, haversineDistanceKm } from '../../utils/geo';
import { isValidTransition } from '../../utils/stateMachine';
import { emitAdminGlobalEvent, emitNotificationNew, emitOrderStatusChanged } from '../../realtime/realtime.emitters';
import {
  buildPaginatedResponse,
  toSkipTake,
  type PaginatedResponse,
} from '../../utils/pagination';
import { round2 } from '../orders/orders.helpers';
import { appendTimelineEvent } from '../orders/orders.service';
import {
  bucketRevenueByDay,
  invalidateSellerAnalytics,
  maskAccountNumber,
  maskPhone,
  resolvePeriod,
} from '../seller/seller.service';
import type {
  AdminDeliveryBoysQuery,
  AdminDeliveryBoyStatusInput,
  AdminVerifyDocumentInput,
  AvailabilityInput,
  DeliverInput,
  EarningsQuery,
  FailDeliveryInput,
  LocationPingInput,
  PayoutsQuery,
  RegisterDeliveryInput,
  UpdateBankInput,
  UpdateDeliveryProfileInput,
} from './delivery.schema';
import type { DeliveryDocumentType } from '../../utils/fileUpload';
import { DELIVERY_DOCUMENT_TYPES, DOCUMENT_DIR, verifyMagicBytes } from '../../utils/fileUpload';
import fs from 'fs';
import path from 'path';

/**
 * Delivery boy lifecycle — registration, profile, availability, the active
 * delivery workflow (GPS pings, pickup, drop, failure), earnings and payouts.
 * `deliveryBoyId` always comes from the JWT, never the request.
 */

// ── Shared helpers ─────────────────────────────────────────────────────────

/** Delivery statuses that keep a rider "busy" (one active job at a time). */
export const DELIVERY_ACTIVE_STATUSES = ['assigned', 'picked_up', 'out_for_delivery'] as const;

/** Rider compensation = the order's delivery fee + rush premium, atomically
 *  credited on completion. */
export function deliveryEarningOf(order: { deliveryFee: unknown; rushFee: unknown }): number {
  return round2(Number(order.deliveryFee) + Number(order.rushFee));
}

async function notify(
  recipientId: string,
  recipientType: 'customer' | 'seller' | 'delivery_boy' | 'admin',
  type: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<void> {
  await NotificationModel.create({
    recipientId,
    recipientType,
    type,
    title,
    body,
    data,
    channel: ['push'],
  });
  emitNotificationNew(recipientType, recipientId, { type, title, body, data }); // step 9 realtime
}

export interface CachedRiderLocation {
  lat: number;
  lng: number;
  etaMinutes?: number | null;
  at: string;
}

/**
 * Post-commit side effects: SQL already committed, so log loudly instead of
 * masking a successful mutation behind a 500 (same policy as orders module).
 */
async function runSideEffects(label: string, effects: Array<() => Promise<unknown>>): Promise<void> {
  for (const effect of effects) {
    try {
      await effect();
    } catch (error) {
      logger.error('delivery_side_effect_failed', {
        label,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

// ── POST /api/delivery/register (PUBLIC) ───────────────────────────────────

export async function register(input: RegisterDeliveryInput): Promise<{ message: string }> {
  // Phone is the login identifier — must be unique platform-wide for riders.
  const existing = await prisma.deliveryBoy.findUnique({ where: { phone: input.phone } });
  if (existing) {
    throw ApiError.conflict('This phone number is already registered');
  }
  const existingUser = await prisma.user.findUnique({ where: { phone: input.phone } });
  if (existingUser) {
    throw ApiError.conflict('This phone number is already in use');
  }

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: input.name, phone: input.phone, role: 'DELIVERY_BOY' },
    });
    const boy = await tx.deliveryBoy.create({
      data: {
        userId: user.id,
        name: input.name,
        phone: input.phone,
        email: input.email ?? null,
        city: input.city,
        status: 'PENDING',
        vehicleType: input.vehicleType,
        vehicleRegNo: input.vehicleRegNo,
        licenseNumber: input.licenseNumber,
      },
    });
    await tx.deliveryBoyBankDetails.create({
      data: {
        deliveryBoyId: boy.id,
        accountHolderName: input.bankDetails.accountHolderName,
        accountNumber: input.bankDetails.accountNumber,
        ifscCode: input.bankDetails.ifscCode,
      },
    });
  });

  await sendSms(
    input.phone,
    `Hi ${input.name}, your PrinZex delivery partner application is under review. We'll notify you once approved.`,
  );

  return { message: 'Application submitted. Pending review.' };
}

// ── POST /api/delivery/documents ───────────────────────────────────────────

type DocumentFiles = Partial<Record<DeliveryDocumentType, Express.Multer.File[]>>;

async function unlinkQuietly(filePath: string): Promise<void> {
  await fs.promises.unlink(filePath).catch(() => undefined);
}

export interface DeliveryDocumentStatus {
  id: string;
  docType: string;
  isVerified: boolean;
  uploadedAt: Date;
}

export async function uploadDocuments(
  deliveryBoyId: string,
  files: DocumentFiles | undefined,
): Promise<{ documents: DeliveryDocumentStatus[] }> {
  const provided = DELIVERY_DOCUMENT_TYPES.filter((type) => (files?.[type]?.length ?? 0) > 0).map(
    (type) => ({ type, file: files![type]![0] }),
  );
  if (provided.length === 0) {
    throw ApiError.badRequest('Attach at least one document file');
  }

  try {
    for (const { type, file } of provided) {
      await verifyMagicBytes(file.path);

      const fileUrl = `/uploads/documents/${file.filename}`;
      const existing = await prisma.deliveryBoyDocument.findFirst({
        where: { deliveryBoyId, docType: type },
      });
      if (existing) {
        const oldFile = path.basename(existing.fileUrl);
        if (existing.fileUrl.startsWith('/uploads/documents/') && oldFile) {
          await unlinkQuietly(path.join(DOCUMENT_DIR, oldFile));
        }
        await prisma.deliveryBoyDocument.update({
          where: { id: existing.id },
          data: { fileUrl, isVerified: false },
        });
      } else {
        await prisma.deliveryBoyDocument.create({
          data: { deliveryBoyId, docType: type, fileUrl },
        });
      }
    }
  } catch (error) {
    await Promise.all(provided.map(({ file }) => unlinkQuietly(file.path)));
    throw error;
  }

  const documents = await prisma.deliveryBoyDocument.findMany({ where: { deliveryBoyId } });
  return {
    documents: documents.map((doc) => ({
      id: doc.id,
      docType: doc.docType,
      isVerified: doc.isVerified,
      uploadedAt: doc.createdAt,
    })),
  };
}

// ── Profile ────────────────────────────────────────────────────────────────

export async function getProfile(deliveryBoyId: string) {
  const boy = await prisma.deliveryBoy.findUnique({
    where: { id: deliveryBoyId },
    include: { bankDetails: true, documents: true, zones: true },
  });
  if (!boy) {
    throw ApiError.notFound('Delivery profile not found');
  }

  return {
    id: boy.id,
    name: boy.name,
    phone: boy.phone,
    email: boy.email,
    city: boy.city,
    status: boy.status,
    isOnline: boy.isOnline,
    vehicleType: boy.vehicleType,
    vehicleRegNo: boy.vehicleRegNo,
    licenseNumber: boy.licenseNumber,
    averageRating: Number(boy.averageRating),
    totalDeliveries: boy.totalDeliveries,
    onTimeRate: Number(boy.onTimeRate),
    totalEarnings: Number(boy.totalEarnings),
    pendingEarnings: Number(boy.pendingEarnings),
    zones: boy.zones.map((zone) => zone.zoneName),
    documents: boy.documents.map((doc) => ({
      id: doc.id,
      docType: doc.docType,
      isVerified: doc.isVerified,
      uploadedAt: doc.createdAt,
    })),
    bankDetails: boy.bankDetails
      ? {
          accountHolderName: boy.bankDetails.accountHolderName,
          accountNumberMasked: maskAccountNumber(boy.bankDetails.accountNumber),
          ifscCode: boy.bankDetails.ifscCode,
        }
      : null,
    createdAt: boy.createdAt,
  };
}

export async function updateProfile(deliveryBoyId: string, input: UpdateDeliveryProfileInput) {
  const boy = await prisma.deliveryBoy.findUnique({ where: { id: deliveryBoyId } });
  if (!boy) {
    throw ApiError.notFound('Delivery profile not found');
  }

  const data: Prisma.DeliveryBoyUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.email !== undefined) data.email = input.email;
  if (input.city !== undefined) data.city = input.city;
  if (input.vehicleType !== undefined) data.vehicleType = input.vehicleType;

  await prisma.deliveryBoy.update({ where: { id: deliveryBoyId }, data });
  return getProfile(deliveryBoyId);
}

export async function updateBankDetails(deliveryBoyId: string, input: UpdateBankInput) {
  const bank = await prisma.deliveryBoyBankDetails.upsert({
    where: { deliveryBoyId },
    create: { deliveryBoyId, ...input },
    update: input,
  });
  return {
    accountHolderName: bank.accountHolderName,
    accountNumberMasked: maskAccountNumber(bank.accountNumber),
    ifscCode: bank.ifscCode,
  };
}

// ── Availability ───────────────────────────────────────────────────────────

export async function setAvailability(
  deliveryBoyId: string,
  input: AvailabilityInput,
): Promise<{ isOnline: boolean }> {
  const boy = await prisma.deliveryBoy.findUnique({ where: { id: deliveryBoyId } });
  if (!boy) {
    throw ApiError.notFound('Delivery profile not found');
  }
  if (input.isOnline && boy.status !== 'ACTIVE') {
    throw ApiError.forbidden('Only ACTIVE delivery partners can go online');
  }

  await prisma.deliveryBoy.update({
    where: { id: deliveryBoyId },
    data: { isOnline: input.isOnline },
  });

  // Redis set is the source used by auto-assignment — keep it in perfect sync.
  try {
    if (input.isOnline) {
      await redis.sadd(REDIS_KEYS.ONLINE_DELIVERY_BOYS(boy.city), deliveryBoyId);
    } else {
      await redis.srem(REDIS_KEYS.ONLINE_DELIVERY_BOYS(boy.city), deliveryBoyId);
      await invalidateCache(REDIS_KEYS.DELIVERY_LOCATION(deliveryBoyId));
    }
  } catch (error) {
    logger.warn('delivery_availability_redis_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return { isOnline: input.isOnline };
}

// ── Active delivery ────────────────────────────────────────────────────────

async function findActiveDeliveryOrThrow(deliveryBoyId: string) {
  const delivery = await prisma.delivery.findFirst({
    where: { deliveryBoyId, status: { in: [...DELIVERY_ACTIVE_STATUSES] } },
    orderBy: { createdAt: 'desc' },
    include: {
      order: {
        include: {
          customer: { select: { name: true, phone: true } },
          seller: {
            select: {
              id: true,
              storeName: true,
              storeAddress: true,
              city: true,
              pincode: true,
              lat: true,
              lng: true,
              phone: true,
            },
          },
          items: { select: { serviceName: true, quantity: true } },
        },
      },
    },
  });
  if (!delivery) {
    throw ApiError.notFound('No active delivery right now');
  }
  return delivery;
}

export async function getActiveDelivery(deliveryBoyId: string) {
  const delivery = await findActiveDeliveryOrThrow(deliveryBoyId);
  const { order } = delivery;
  const address = order.deliveryAddress as DeliveryAddressSnapshot | null;

  return {
    id: delivery.id,
    status: delivery.status,
    pickedUpAt: delivery.pickedUpAt,
    order: {
      id: order.id,
      status: order.status,
      total: Number(order.total),
      paymentMethod: order.paymentMethod,
      services: order.items.map((item) => `${item.serviceName} ×${item.quantity}`),
      specialInstructions: order.specialInstructions,
    },
    customer: {
      name: order.customer.name,
      maskedPhone: maskPhone(order.customer.phone),
    },
    pickup: {
      storeName: order.seller.storeName,
      address: order.seller.storeAddress,
      city: order.seller.city,
      pincode: order.seller.pincode,
      lat: order.seller.lat,
      lng: order.seller.lng,
      phone: maskPhone(order.seller.phone),
    },
    drop: address,
  };
}

// ── GPS ping (hot path — MUST stay fast) ───────────────────────────────────

export async function pingLocation(
  deliveryBoyId: string,
  input: LocationPingInput,
): Promise<{ etaMinutes: number | null }> {
  const delivery = await findActiveDeliveryOrThrow(deliveryBoyId);

  // Straight-line ETA to the customer's drop point (routing API lands later).
  const address = delivery.order.deliveryAddress as DeliveryAddressSnapshot | null;
  let etaMinutes: number | null = null;
  if (address?.lat != null && address?.lng != null) {
    etaMinutes = estimateEtaMinutes(
      haversineDistanceKm(input.lat, input.lng, address.lat, address.lng),
    );
  }

  const point = {
    lat: input.lat,
    lng: input.lng,
    timestamp: new Date(),
    ...(input.accuracy !== undefined ? { accuracy: input.accuracy } : {}),
    ...(input.speed !== undefined ? { speed: input.speed } : {}),
    ...(input.batteryLevel !== undefined ? { batteryLevel: input.batteryLevel } : {}),
  };

  // ── Blocking section: just Redis (few ms). Everything else is fire-and-
  //    forget so the hot path returns in <50ms (see acceptance criteria).
  const cached: CachedRiderLocation = {
    lat: input.lat,
    lng: input.lng,
    etaMinutes,
    at: new Date().toISOString(),
  };
  try {
    await redis.set(
      REDIS_KEYS.DELIVERY_LOCATION(deliveryBoyId),
      JSON.stringify(cached),
      'EX',
      REDIS_TTL.DELIVERY_LOCATION,
    );
    // Socket.io (step 9) subscribes to this channel for live map updates.
    await redis.publish(
      REDIS_KEYS.TRACKING_CHANNEL(delivery.id),
      JSON.stringify({ deliveryId: delivery.id, orderId: delivery.orderId, ...cached }),
    );
  } catch (error) {
    // Redis outage must not 500 a GPS ping — MongoDB still records history.
    logger.warn('delivery_location_redis_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // PostgreSQL latest-position write (one row) — background.
  prisma.deliveryBoy
    .update({
      where: { id: deliveryBoyId },
      data: { currentLat: input.lat, currentLng: input.lng },
    })
    .catch((error: unknown) => {
      logger.error('delivery_location_pg_failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    });

  // MongoDB breadcrumb trail — capped at the last 500 points ($slice), plus
  // the freshest point + ETA for Redis-miss fallbacks.
  TrackingAppend(delivery.id, point, etaMinutes).catch(() => undefined);

  return { etaMinutes };
}

async function TrackingAppend(
  deliveryId: string,
  point: {
    lat: number;
    lng: number;
    timestamp: Date;
    accuracy?: number;
    speed?: number;
    batteryLevel?: number;
  },
  etaMinutes: number | null,
): Promise<void> {
  const breadcrumb: ILocationPoint = { ...point, coordinates: [point.lng, point.lat] };
  await TrackingModel.updateOne(
    { deliveryId },
    {
      $set: { currentLocation: breadcrumb, ...(etaMinutes !== null ? { etaMinutes } : {}) },
      $push: {
        locationHistory: {
          $each: [breadcrumb],
          $slice: -500, // keep only the last 500 points — bounded growth
        },
      },
    },
    { upsert: true },
  ).catch((error: unknown) => {
    logger.error('delivery_location_mongo_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  });
}

// ── Pickup confirm ─────────────────────────────────────────────────────────

export async function confirmPickup(
  deliveryBoyId: string,
): Promise<{ deliveryId: string; status: string }> {
  const delivery = await findActiveDeliveryOrThrow(deliveryBoyId);
  if (delivery.status !== 'assigned') {
    throw ApiError.badRequest(`Cannot confirm pickup — delivery is "${delivery.status}"`);
  }

  const order = await prisma.$transaction(async (tx) => {
    await tx.delivery.update({
      where: { id: delivery.id },
      data: { status: 'picked_up', pickedUpAt: new Date() },
    });
    // The order visibly moves to out_for_delivery for the customer.
    if (isValidTransition(delivery.order.status, 'out_for_delivery')) {
      return tx.order.update({
        where: { id: delivery.orderId },
        data: { status: 'out_for_delivery' },
      });
    }
    return tx.order.findUniqueOrThrow({ where: { id: delivery.orderId } });
  });

  await runSideEffects('delivery.picked_up', [
    () =>
      appendTimelineEvent(
        delivery.orderId,
        'out_for_delivery',
        deliveryBoyId,
        'Package picked up — on the way',
      ),
    () =>
      notify(
        delivery.order.customerId,
        'customer',
        'order_update',
        `Order ${delivery.orderId.slice(-6).toUpperCase()} — out for delivery`,
        'Your order has been picked up and is on its way.',
        { orderId: delivery.orderId, podOtp: delivery.podOtp },
      ),
    () => invalidateSellerAnalytics(delivery.order.sellerId),
    async () => emitOrderStatusChanged(delivery.order, 'out_for_delivery'), // step 9 realtime
  ]);

  return { deliveryId: delivery.id, status: order.status };
}

// ── Deliver (with POD / OTP) ───────────────────────────────────────────────

export async function confirmDelivery(
  deliveryBoyId: string,
  input: DeliverInput,
): Promise<{ deliveryId: string; status: string; earned: number }> {
  const delivery = await findActiveDeliveryOrThrow(deliveryBoyId);
  if (delivery.status !== 'picked_up' && delivery.status !== 'out_for_delivery') {
    throw ApiError.badRequest(`Cannot mark delivered — delivery is "${delivery.status}"`);
  }

  // POD OTP: the customer hands it over at the door.
  if (delivery.podOtp && !delivery.podOtpVerified) {
    if (!input.otpProvided) {
      throw ApiError.badRequest('Ask the customer for the 4-digit delivery OTP');
    }
    if (input.otpProvided !== delivery.podOtp) {
      throw ApiError.badRequest('Invalid delivery OTP — please check with the customer');
    }
  }

  const earned = deliveryEarningOf(delivery.order);

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: delivery.orderId },
    select: { status: true, sellerId: true, customerId: true, items: { select: { serviceName: true } } },
  });

  // Earnings credit + delivery completion + order completion — one transaction.
  await prisma.$transaction(async (tx) => {
    await tx.delivery.update({
      where: { id: delivery.id },
      data: {
        status: 'delivered',
        deliveredAt: new Date(),
        earningsAmount: earned,
        podPhotoUrl: input.podPhotoUrl ?? null,
        podOtpVerified: delivery.podOtp ? true : delivery.podOtpVerified,
      },
    });

    if (isValidTransition(order.status, 'delivered')) {
      await tx.order.update({ where: { id: delivery.orderId }, data: { status: 'delivered' } });
    }

    await tx.deliveryBoy.update({
      where: { id: deliveryBoyId },
      data: {
        totalEarnings: { increment: earned },
        pendingEarnings: { increment: earned },
        totalDeliveries: { increment: 1 },
      },
    });
  });

  await runSideEffects('delivery.delivered', [
    () => appendTimelineEvent(delivery.orderId, 'delivered', deliveryBoyId, 'Order delivered'),
    () =>
      notify(
        order.customerId,
        'customer',
        'order_update',
        `Order ${delivery.orderId.slice(-6).toUpperCase()} — delivered`,
        'Your order has been delivered. Enjoy!',
        { orderId: delivery.orderId },
      ),
    () =>
      notify(
        order.sellerId,
        'seller',
        'order_update',
        `Order ${delivery.orderId.slice(-6).toUpperCase()} — delivered`,
        `Order #${delivery.orderId.slice(-6).toUpperCase()} was delivered successfully.`,
        { orderId: delivery.orderId },
      ),
    () => invalidateSellerAnalytics(order.sellerId),
    async () =>
      emitOrderStatusChanged(
        { id: delivery.orderId, customerId: order.customerId, sellerId: order.sellerId },
        'delivered',
      ), // step 9 realtime
    () =>
      redis.del(REDIS_KEYS.DELIVERY_LOCATION(deliveryBoyId)).catch((error: unknown) => {
        logger.warn('delivery_location_clear_failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }),
  ]);

  return { deliveryId: delivery.id, status: 'delivered', earned };
}

/**
 * Force the delivery boy offline after task completion ("remove from active
 * delivery"): their isOnline flag stays as they set it, but the active
 * delivery pointer simply stops existing. Auto-assignment picks them up again
 * because DELIVERY_ACTIVE_STATUSES no longer matches.
 */

// ── Fail ───────────────────────────────────────────────────────────────────

export async function failDelivery(
  deliveryBoyId: string,
  input: FailDeliveryInput,
): Promise<{ deliveryId: string; status: string }> {
  const delivery = await findActiveDeliveryOrThrow(deliveryBoyId);

  await prisma.delivery.update({
    where: { id: delivery.id },
    data: { status: 'failed', failedAt: new Date(), failReason: input.reason },
  });
  // The ORDER stays at out_for_delivery — ops retries/reassigns (TODO cron).

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: delivery.orderId },
    select: { sellerId: true, customerId: true },
  });

  await runSideEffects('delivery.failed', [
    () =>
      appendTimelineEvent(delivery.orderId, 'failed', deliveryBoyId, `Delivery attempt failed: ${input.reason}`),
    () =>
      notify(
        order.customerId,
        'customer',
        'order_update',
        `Order ${delivery.orderId.slice(-6).toUpperCase()} — delivery issue`,
        'We could not complete your delivery — our team will reach out shortly.',
        { orderId: delivery.orderId },
      ),
    () =>
      notify(
        order.sellerId,
        'seller',
        'delivery_alert',
        'Delivery failed',
        `Delivery for order #${delivery.orderId.slice(-6).toUpperCase()} failed: ${input.reason}`,
        { orderId: delivery.orderId, reason: input.reason },
      ),
    // Broadcast alert to the ops admin channel.
    () =>
      notify(
        'admin',
        'admin',
        'delivery_failed',
        'Delivery failed — action needed',
        `Delivery ${delivery.id} (order ${delivery.orderId.slice(-6).toUpperCase()}) failed: ${input.reason}`,
        { orderId: delivery.orderId, deliveryId: delivery.id },
      ),
    // Real-time (step 9): admin:global dashboard event.
    async () =>
      emitAdminGlobalEvent('delivery.failed', {
        deliveryId: delivery.id,
        orderId: delivery.orderId,
        reason: input.reason,
      }),
  ]);

  return { deliveryId: delivery.id, status: 'failed' };
}

// ── Earnings & payouts ─────────────────────────────────────────────────────

export async function getEarnings(deliveryBoyId: string, query: EarningsQuery) {
  const range = resolvePeriod(query.period);
  const deliveries = await prisma.delivery.findMany({
    where: {
      deliveryBoyId,
      status: 'delivered',
      deliveredAt: { gte: range.start, lt: range.end },
    },
    select: { earningsAmount: true, deliveredAt: true },
  });

  const totalEarnings = round2(
    deliveries.reduce((sum, delivery) => sum + Number(delivery.earningsAmount), 0),
  );
  const count = deliveries.length;

  const byDay = bucketRevenueByDay(
    deliveries
      .filter((delivery) => delivery.deliveredAt !== null)
      .map((delivery) => ({ total: delivery.earningsAmount, createdAt: delivery.deliveredAt as Date })),
    range,
  ).map((day) => ({ date: day.date, earnings: day.revenue, deliveries: day.orders }));

  const boy = await prisma.deliveryBoy.findUnique({
    where: { id: deliveryBoyId },
    select: { pendingEarnings: true, totalEarnings: true, totalDeliveries: true },
  });

  return {
    period: query.period,
    totalEarnings,
    deliveryCount: count,
    averagePerDelivery: count > 0 ? round2(totalEarnings / count) : 0,
    pendingEarnings: Number(boy?.pendingEarnings ?? 0),
    lifetimeEarnings: Number(boy?.totalEarnings ?? 0),
    lifetimeDeliveries: boy?.totalDeliveries ?? 0,
    earningsByDay: byDay,
  };
}

export async function listPayouts(
  deliveryBoyId: string,
  query: PayoutsQuery,
): Promise<PaginatedResponse<unknown>> {
  const where: Prisma.PayoutWhereInput = { deliveryBoyId, recipientType: 'delivery_boy' };
  const { skip, take } = toSkipTake({ page: query.page, limit: query.limit });
  const [total, payouts] = await prisma.$transaction([
    prisma.payout.count({ where }),
    prisma.payout.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
  ]);

  return buildPaginatedResponse(
    payouts.map((payout) => ({
      id: payout.id,
      status: payout.status,
      amount: Number(payout.amount),
      deliveriesIncluded: payout.ordersIncluded, // shared column: deliveries for riders
      bankAccount: payout.bankAccount,
      initiatedAt: payout.initiatedAt,
      processedAt: payout.processedAt,
      failReason: payout.failReason,
      createdAt: payout.createdAt,
    })),
    total,
    { page: query.page, limit: query.limit },
  );
}

export async function requestPayout(deliveryBoyId: string) {
  const bank = await prisma.deliveryBoyBankDetails.findUnique({ where: { deliveryBoyId } });
  if (!bank) {
    throw ApiError.badRequest('Add your bank details before requesting a payout');
  }
  const maskedAccount = maskAccountNumber(bank.accountNumber);

  const payout = await prisma.$transaction(async (tx) => {
    const blocking = await tx.payout.findFirst({
      where: { deliveryBoyId, recipientType: 'delivery_boy', status: { in: ['PENDING', 'PROCESSING'] } },
      select: { id: true },
    });
    if (blocking) {
      throw ApiError.conflict('You already have a payout request in progress');
    }

    // Completed deliveries whose earnings aren't locked into a payout yet.
    const eligible = await tx.delivery.findMany({
      where: { deliveryBoyId, status: 'delivered', payoutId: null },
      select: { id: true, earningsAmount: true },
    });
    const amount = round2(eligible.reduce((sum, d) => sum + Number(d.earningsAmount), 0));

    if (eligible.length === 0) {
      throw ApiError.badRequest('No completed deliveries are pending payout yet');
    }
    if (amount < env.DELIVERY_MIN_PAYOUT_THRESHOLD) {
      throw ApiError.badRequest(
        `Pending earnings ₹${amount} are below the minimum payout threshold of ₹${env.DELIVERY_MIN_PAYOUT_THRESHOLD}`,
      );
    }

    const created = await tx.payout.create({
      data: {
        recipientType: 'delivery_boy',
        deliveryBoyId,
        amount,
        ordersIncluded: eligible.length, // shared column: delivery count for riders
        status: 'PENDING',
        bankAccount: maskedAccount,
      },
    });

    // Lock those deliveries into the payout + move the balance out of pending.
    await tx.delivery.updateMany({
      where: { id: { in: eligible.map((d) => d.id) } },
      data: { payoutId: created.id },
    });
    await tx.deliveryBoy.update({
      where: { id: deliveryBoyId },
      data: { pendingEarnings: { decrement: amount } },
    });

    return created;
  });

  return {
    id: payout.id,
    status: payout.status,
    amount: Number(payout.amount),
    deliveriesIncluded: payout.ordersIncluded,
    bankAccount: payout.bankAccount,
    createdAt: payout.createdAt,
  };
}

// ══════════════════════════════════════════════════════════════════════════
// ADMIN — delivery fleet management
// ══════════════════════════════════════════════════════════════════════════

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
    entityType: 'delivery_boy',
    entityId,
    metadata,
    ...(meta.ipAddress ? { ipAddress: meta.ipAddress } : {}),
    ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
  });
}

export async function adminListDeliveryBoys(query: AdminDeliveryBoysQuery) {
  const where: Prisma.DeliveryBoyWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.city ? { city: { equals: query.city, mode: 'insensitive' } } : {}),
    ...(query.isOnline !== undefined ? { isOnline: query.isOnline } : {}),
  };
  const { skip, take } = toSkipTake({ page: query.page, limit: query.limit });
  const [total, boys] = await prisma.$transaction([
    prisma.deliveryBoy.count({ where }),
    prisma.deliveryBoy.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: { documents: { select: { docType: true, isVerified: true } } },
    }),
  ]);

  return buildPaginatedResponse(
    boys.map((boy) => ({
      id: boy.id,
      name: boy.name,
      phone: boy.phone,
      email: boy.email,
      city: boy.city,
      status: boy.status,
      isOnline: boy.isOnline,
      vehicleType: boy.vehicleType,
      averageRating: Number(boy.averageRating),
      totalDeliveries: boy.totalDeliveries,
      documents: {
        total: boy.documents.length,
        verified: boy.documents.filter((doc) => doc.isVerified).length,
      },
      createdAt: boy.createdAt,
    })),
    total,
    { page: query.page, limit: query.limit },
  );
}

export async function adminGetDeliveryBoy(id: string) {
  const boy = await prisma.deliveryBoy.findUnique({
    where: { id },
    include: {
      bankDetails: true,
      documents: true,
      zones: true,
      deliveries: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { order: { select: { id: true, status: true, total: true, createdAt: true } } },
      },
    },
  });
  if (!boy) {
    throw ApiError.notFound('Delivery partner not found');
  }

  return {
    id: boy.id,
    name: boy.name,
    phone: boy.phone,
    email: boy.email,
    city: boy.city,
    status: boy.status,
    isOnline: boy.isOnline,
    vehicleType: boy.vehicleType,
    vehicleRegNo: boy.vehicleRegNo,
    licenseNumber: boy.licenseNumber,
    zones: boy.zones.map((zone) => zone.zoneName),
    performance: {
      averageRating: Number(boy.averageRating),
      totalDeliveries: boy.totalDeliveries,
      onTimeRate: Number(boy.onTimeRate),
      totalEarnings: Number(boy.totalEarnings),
      pendingEarnings: Number(boy.pendingEarnings),
    },
    documents: boy.documents.map((doc) => ({
      id: doc.id,
      docType: doc.docType,
      fileUrl: doc.fileUrl,
      isVerified: doc.isVerified,
      uploadedAt: doc.createdAt,
    })),
    bankDetails: boy.bankDetails
      ? {
          accountHolderName: boy.bankDetails.accountHolderName,
          accountNumberMasked: maskAccountNumber(boy.bankDetails.accountNumber),
          ifscCode: boy.bankDetails.ifscCode,
        }
      : null,
    recentDeliveries: boy.deliveries.map((delivery) => ({
      id: delivery.id,
      orderId: delivery.orderId,
      status: delivery.status,
      earningsAmount: Number(delivery.earningsAmount),
      orderStatus: delivery.order.status,
      orderTotal: Number(delivery.order.total),
      deliveredAt: delivery.deliveredAt,
      createdAt: delivery.createdAt,
    })),
    createdAt: boy.createdAt,
  };
}

export async function adminUpdateDeliveryBoyStatus(
  meta: AdminActionMeta,
  id: string,
  input: AdminDeliveryBoyStatusInput,
) {
  const boy = await prisma.deliveryBoy.findUnique({ where: { id } });
  if (!boy) {
    throw ApiError.notFound('Delivery partner not found');
  }

  const data: Prisma.DeliveryBoyUpdateInput = { status: input.status };
  // Suspension/deactivation forces them offline immediately.
  const mustGoOffline = input.status === 'SUSPENDED' || input.status === 'INACTIVE';
  if (mustGoOffline) {
    data.isOnline = false;
  }
  await prisma.deliveryBoy.update({ where: { id }, data });

  await runSideEffects('delivery_boy.status_changed', [
    () =>
      logActivity(meta, 'delivery_boy.status_changed', id, {
        from: boy.status,
        to: input.status,
        reason: input.reason ?? null,
      }),
    ...(mustGoOffline
      ? [
          async () => {
            try {
              await redis.srem(REDIS_KEYS.ONLINE_DELIVERY_BOYS(boy.city), id);
              await redis.del(REDIS_KEYS.DELIVERY_LOCATION(id));
            } catch (error) {
              logger.warn('delivery_boy_offline_redis_failed', {
                error: error instanceof Error ? error.message : String(error),
              });
            }
          },
        ]
      : []),
    ...(input.status === 'APPROVED' || input.status === 'ACTIVE' || input.status === 'SUSPENDED'
      ? [
          () =>
            sendSms(
              boy.phone,
              input.status === 'SUSPENDED'
                ? 'Your PrinZex delivery account has been suspended. Contact support.'
                : 'Congratulations! Your PrinZex delivery account is approved — you can go online now.',
            ),
        ]
      : []),
  ]);

  return { id, status: input.status };
}

export async function adminVerifyDocument(
  meta: AdminActionMeta,
  id: string,
  input: AdminVerifyDocumentInput,
) {
  const doc = await prisma.deliveryBoyDocument.findFirst({
    where: { id: input.docId, deliveryBoyId: id },
  });
  if (!doc) {
    throw ApiError.notFound('Document not found');
  }

  await prisma.deliveryBoyDocument.update({
    where: { id: doc.id },
    data: { isVerified: input.isVerified },
  });

  await logActivity(meta, 'delivery_boy.document_verified', id, {
    docId: doc.id,
    docType: doc.docType,
    isVerified: input.isVerified,
    note: input.note ?? null,
  });

  return { docId: doc.id, isVerified: input.isVerified };
}

export async function adminListActiveDeliveries() {
  const deliveries = await prisma.delivery.findMany({
    where: { status: { in: [...DELIVERY_ACTIVE_STATUSES] } },
    orderBy: { createdAt: 'desc' },
    include: {
      deliveryBoy: { select: { id: true, name: true, phone: true } },
      order: {
        select: {
          id: true,
          status: true,
          total: true,
          isRush: true,
          customer: { select: { name: true } },
          seller: { select: { storeName: true, city: true } },
        },
      },
    },
  });

  // Real-time positions for every busy rider from Redis (freshest source).
  const locations = await Promise.all(
    deliveries.map((delivery) =>
      delivery.deliveryBoyId
        ? getCache<CachedRiderLocation>(REDIS_KEYS.DELIVERY_LOCATION(delivery.deliveryBoyId))
        : Promise.resolve(null),
    ),
  );

  return deliveries.map((delivery, index) => ({
    delivery: {
      id: delivery.id,
      status: delivery.status,
      pickedUpAt: delivery.pickedUpAt,
      createdAt: delivery.createdAt,
    },
    deliveryBoy: delivery.deliveryBoy
      ? { ...delivery.deliveryBoy, phone: maskPhone(delivery.deliveryBoy.phone) }
      : null,
    currentLocation: locations[index],
    order: {
      id: delivery.order.id,
      status: delivery.order.status,
      total: Number(delivery.order.total),
      isRush: delivery.order.isRush,
      customerName: delivery.order.customer.name,
      storeName: delivery.order.seller.storeName,
      city: delivery.order.seller.city,
    },
  }));
}
