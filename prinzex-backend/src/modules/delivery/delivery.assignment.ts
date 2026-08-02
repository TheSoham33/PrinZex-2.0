import { logger } from '../../config/logger';
import { prisma } from '../../config/database';
import { redis, REDIS_KEYS } from '../../config/redis';
import { NotificationModel } from '../../models/mongo/Notification.model';
import { TrackingModel } from '../../models/mongo/Tracking.model';
import { ApiError } from '../../utils/ApiError';
import { getCache } from '../../utils/cache';
import { boundingBox, haversineDistanceKm } from '../../utils/geo';

// NOTE: mirrored deliberately instead of imported from delivery.service —
// seller.service (ready_for_pickup hook) imports THIS module, and
// delivery.service imports seller.service; importing back would create a
// circular dependency in the module graph.
const DELIVERY_ACTIVE_STATUSES = ['assigned', 'picked_up', 'out_for_delivery'] as const;

interface CachedRiderLocation {
  lat: number;
  lng: number;
  etaMinutes?: number | null;
  at: string;
}

/**
 * Delivery assignment engine.
 *
 * `autoAssignDelivery` fires when an order reaches `ready_for_pickup` (called
 * from the seller order-status flow). It scores every online, idle, ACTIVE
 * rider within 10km of the store by haversine distance and assigns the
 * nearest. When nobody qualifies, the Delivery row is created unassigned
 * (`pending_assignment`) for a retry cron to pick up.
 */

/** Maximum rider→store distance for auto-assignment. */
export const AUTO_ASSIGN_RADIUS_KM = 10;

/** 4-digit proof-of-delivery OTP (customer hands it to the rider). */
export function generatePodOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export interface AssignmentResult {
  deliveryId: string;
  deliveryBoyId: string | null;
  status: 'assigned' | 'pending_assignment' | 'already_exists';
  distanceKm?: number;
}

interface RiderCandidate {
  id: string;
  lat: number;
  lng: number;
  distanceKm: number;
}

async function notifyBoy(
  deliveryBoyId: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<void> {
  await NotificationModel.create({
    recipientId: deliveryBoyId,
    recipientType: 'delivery_boy',
    type: 'delivery_assigned',
    title,
    body,
    data,
    channel: ['push', 'sms'],
  });
}

async function createTrackingDoc(deliveryId: string, orderId: string, deliveryBoyId: string | null): Promise<void> {
  await TrackingModel.create({
    deliveryId,
    orderId,
    ...(deliveryBoyId ? { deliveryBoyId } : {}),
    locationHistory: [],
  });
}

async function publishAssignment(deliveryId: string, orderId: string, deliveryBoyId: string): Promise<void> {
  try {
    await redis.publish(
      REDIS_KEYS.ORDER_STATUS_CHANNEL(orderId),
      JSON.stringify({ event: 'delivery_assigned', deliveryId, orderId, deliveryBoyId }),
    );
  } catch (error) {
    logger.warn('assignment_publish_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Automatic assignment. Idempotent per order: an existing non-terminal
 * Delivery row short-circuits the search.
 */
export async function autoAssignDelivery(orderId: string): Promise<AssignmentResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      seller: { select: { id: true, storeName: true, city: true, lat: true, lng: true } },
    },
  });
  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  const existing = await prisma.delivery.findUnique({ where: { orderId: order.id } });
  if (existing && existing.status !== 'failed') {
    return {
      deliveryId: existing.id,
      deliveryBoyId: existing.deliveryBoyId,
      status: 'already_exists',
    };
  }

  // ── Candidate pool: online riders in the store's city (Redis set). ──────
  let onlineIds: string[] = [];
  try {
    onlineIds = await redis.smembers(REDIS_KEYS.ONLINE_DELIVERY_BOYS(order.seller.city));
  } catch (error) {
    logger.warn('auto_assign_redis_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const storeLat = order.seller.lat;
  const storeLng = order.seller.lng;
  const box = storeLat != null && storeLng != null ? boundingBox(storeLat, storeLng, AUTO_ASSIGN_RADIUS_KM) : null;

  const candidates: RiderCandidate[] = [];
  for (const riderId of onlineIds) {
    const boy = await prisma.deliveryBoy.findUnique({
      where: { id: riderId },
      select: { id: true, status: true, currentLat: true, currentLng: true },
    });
    if (!boy || boy.status !== 'ACTIVE') continue;

    // Already on a job → ineligible (one active delivery per rider).
    const busy = await prisma.delivery.count({
      where: { deliveryBoyId: riderId, status: { in: [...DELIVERY_ACTIVE_STATUSES] } },
    });
    if (busy > 0) continue;

    // Fresh position: Redis first, PostgreSQL last-known as fallback.
    const cached = await getCache<CachedRiderLocation>(REDIS_KEYS.DELIVERY_LOCATION(riderId));
    const lat = cached?.lat ?? boy.currentLat;
    const lng = cached?.lng ?? boy.currentLng;
    if (lat == null || lng == null || storeLat == null || storeLng == null || !box) continue;

    // Cheap bounding-box pre-filter, then the exact haversine check.
    if (lat < box.minLat || lat > box.maxLat || lng < box.minLng || lng > box.maxLng) continue;
    const distanceKm = haversineDistanceKm(storeLat, storeLng, lat, lng);
    if (distanceKm <= AUTO_ASSIGN_RADIUS_KM) {
      candidates.push({ id: riderId, lat, lng, distanceKm });
    }
  }

  // Nearest available rider wins.
  candidates.sort((a, b) => a.distanceKm - b.distanceKm);
  const winner = candidates[0];

  if (!winner) {
    // Nobody available right now: park the delivery for the retry cron.
    const delivery = existing
      ? await prisma.delivery.update({
          where: { id: existing.id },
          data: { status: 'pending_assignment', deliveryBoyId: null, podOtp: existing.podOtp ?? generatePodOtp() },
        })
      : await prisma.delivery.create({
          data: { orderId: order.id, deliveryBoyId: null, status: 'pending_assignment', podOtp: generatePodOtp() },
        });

    // TODO(cron): schedule autoAssignDelivery retry every 5 min while a
    // Delivery remains in pending_assignment.
    await NotificationModel.create({
      recipientId: 'admin',
      recipientType: 'admin',
      type: 'delivery_unassigned',
      title: 'No delivery partner available',
      body: `Order #${order.id.slice(-6).toUpperCase()} is ready for pickup but no rider is available in ${order.seller.city}.`,
      data: { orderId: order.id, deliveryId: delivery.id },
    });

    return { deliveryId: delivery.id, deliveryBoyId: null, status: 'pending_assignment' };
  }

  const delivery = existing
    ? await prisma.delivery.update({
        where: { id: existing.id },
        data: {
          status: 'assigned',
          deliveryBoyId: winner.id,
          podOtp: existing.podOtp ?? generatePodOtp(),
          failedAt: null,
          failReason: null,
        },
      })
    : await prisma.delivery.create({
        data: { orderId: order.id, deliveryBoyId: winner.id, status: 'assigned', podOtp: generatePodOtp() },
      });

  await Promise.all([
    createTrackingDoc(delivery.id, order.id, winner.id).catch((error: unknown) => {
      logger.error('assignment_tracking_failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }),
    notifyBoy(
      winner.id,
      'New delivery assigned',
      `Pickup from ${order.seller.storeName} — order #${order.id.slice(-6).toUpperCase()}.`,
      { orderId: order.id, deliveryId: delivery.id, distanceKm: Math.round(winner.distanceKm * 100) / 100 },
    ).catch((error: unknown) => {
      logger.error('assignment_notify_failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }),
    publishAssignment(delivery.id, order.id, winner.id),
  ]);

  return {
    deliveryId: delivery.id,
    deliveryBoyId: winner.id,
    status: 'assigned',
    distanceKm: Math.round(winner.distanceKm * 100) / 100,
  };
}

/**
 * Admin manual assignment — bypasses online/distance/availability checks
 * (ops may stage work ahead of a rider coming online). The rider must exist;
 * an active non-terminal delivery for the order is re-pointed at the new
 * rider instead of erroring.
 */
export async function manualAssignDelivery(orderId: string, deliveryBoyId: string): Promise<AssignmentResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { seller: { select: { storeName: true } } },
  });
  if (!order) {
    throw ApiError.notFound('Order not found');
  }
  const boy = await prisma.deliveryBoy.findUnique({ where: { id: deliveryBoyId } });
  if (!boy) {
    throw ApiError.notFound('Delivery partner not found');
  }

  const existing = await prisma.delivery.findUnique({ where: { orderId: order.id } });
  if (existing && (existing.status === 'delivered')) {
    throw ApiError.badRequest('This order has already been delivered');
  }

  const delivery = existing
    ? await prisma.delivery.update({
        where: { id: existing.id },
        data: {
          deliveryBoyId,
          status: 'assigned',
          podOtp: existing.podOtp ?? generatePodOtp(),
          failedAt: null,
          failReason: null,
        },
      })
    : await prisma.delivery.create({
        data: { orderId: order.id, deliveryBoyId, status: 'assigned', podOtp: generatePodOtp() },
      });

  await Promise.all([
    createTrackingDoc(delivery.id, order.id, deliveryBoyId).catch((error: unknown) => {
      logger.error('assignment_tracking_failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }),
    notifyBoy(
      deliveryBoyId,
      'Delivery assigned by operations',
      `Pickup from ${order.seller.storeName} — order #${order.id.slice(-6).toUpperCase()}.`,
      { orderId: order.id, deliveryId: delivery.id, manual: true },
    ).catch((error: unknown) => {
      logger.error('assignment_notify_failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }),
    publishAssignment(delivery.id, order.id, deliveryBoyId),
  ]);

  return { deliveryId: delivery.id, deliveryBoyId, status: 'assigned' };
}
