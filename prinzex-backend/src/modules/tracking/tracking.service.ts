import { prisma } from '../../config/database';
import { REDIS_KEYS } from '../../config/redis';
import { OrderTimelineModel } from '../../models/mongo/Order.model';
import { TrackingModel, type ILocationPoint } from '../../models/mongo/Tracking.model';
import type { DeliveryAddressSnapshot } from '../../types';
import { ApiError } from '../../utils/ApiError';
import { getCache } from '../../utils/cache';
import { maskPhone } from '../seller/seller.service';
import type { CachedRiderLocation } from '../delivery/delivery.service';

/**
 * Customer-facing live tracking. The freshest rider position lives in Redis
 * (30s TTL, written every GPS ping); MongoDB holds the durable fallback.
 */

interface TimelineEvent {
  status: string;
  label?: string;
  timestamp: Date;
  note?: string;
  updatedBy: string;
}

export interface TrackingResponse {
  orderId: string;
  status: string;
  timeline: TimelineEvent[];
  delivery: {
    deliveryBoyName: string;
    deliveryBoyPhone: string | null;
    currentLocation: { lat: number; lng: number } | null;
    etaMinutes: number | null;
    pickedUpAt: Date | null;
  } | null;
  storeLocation: { lat: number | null; lng: number | null; address: string };
  deliveryAddress: { lat: number | null; lng: number | null; fullAddress: string };
}

export async function getTracking(customerId: string, orderId: string): Promise<TrackingResponse> {
  // Ownership check: customer's JWT userId, never the URL alone.
  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId },
    include: {
      seller: { select: { storeAddress: true, city: true, lat: true, lng: true } },
      delivery: {
        include: { deliveryBoy: { select: { id: true, name: true, phone: true } } },
      },
    },
  });
  if (!order) {
    throw ApiError.notFound('Order not found');
  }

  // Timeline always from MongoDB.
  const timelineDoc = await OrderTimelineModel.findOne({ orderId: order.id });
  const timeline: TimelineEvent[] = (timelineDoc?.timeline ?? []).map((event) => ({
    status: event.status,
    ...(event.label !== undefined ? { label: event.label } : {}),
    timestamp: event.timestamp,
    ...(event.note !== undefined ? { note: event.note } : {}),
    updatedBy: event.updatedBy,
  }));

  let delivery: TrackingResponse['delivery'] = null;
  if (order.delivery) {
    let currentLocation: { lat: number; lng: number } | null = null;
    let etaMinutes: number | null = null;

    // Redis first (freshest — 30s TTL).
    if (order.delivery.deliveryBoyId) {
      const cached = await getCache<CachedRiderLocation>(
        REDIS_KEYS.DELIVERY_LOCATION(order.delivery.deliveryBoyId),
      );
      if (cached) {
        currentLocation = { lat: cached.lat, lng: cached.lng };
        etaMinutes = cached.etaMinutes ?? null;
      }
    }

    // MongoDB fallback (updated on every ping, durable).
    if (!currentLocation) {
      const doc = await TrackingModel.findOne({ deliveryId: order.delivery.id });
      if (doc?.currentLocation) {
        currentLocation = { lat: doc.currentLocation.lat, lng: doc.currentLocation.lng };
        etaMinutes = doc.etaMinutes ?? null;
      }
    }

    delivery = {
      deliveryBoyName: order.delivery.deliveryBoy?.name ?? 'Assigning…',
      deliveryBoyPhone: maskPhone(order.delivery.deliveryBoy?.phone ?? null),
      currentLocation,
      etaMinutes,
      pickedUpAt: order.delivery.pickedUpAt,
    };
  }

  const address = order.deliveryAddress as DeliveryAddressSnapshot | null;

  return {
    orderId: order.id,
    status: order.status,
    timeline,
    delivery,
    storeLocation: {
      lat: order.seller.lat,
      lng: order.seller.lng,
      address: `${order.seller.storeAddress}, ${order.seller.city}`,
    },
    deliveryAddress: {
      lat: address?.lat ?? null,
      lng: address?.lng ?? null,
      fullAddress: address?.fullAddress ?? '',
    },
  };
}

// ── Location history (route polyline) ──────────────────────────────────────

const MAX_HISTORY_POINTS = 200;

/** Downsample long trails to at most MAX_HISTORY_POINTS (every Nth point,
 *  keeping the first/last so the drawn route stays correct end-to-end). */
export function downsample(points: ILocationPoint[], maxPoints = MAX_HISTORY_POINTS): ILocationPoint[] {
  if (points.length <= maxPoints) {
    return points;
  }
  const step = Math.ceil(points.length / maxPoints);
  const sampled = points.filter((_, index) => index % step === 0);
  const last = points[points.length - 1];
  if (sampled[sampled.length - 1] !== last) {
    sampled.push(last);
  }
  return sampled;
}

export interface LocationHistoryResponse {
  deliveryId: string;
  orderId: string;
  points: Array<{
    lat: number;
    lng: number;
    timestamp: Date;
    accuracy?: number;
    speed?: number;
    batteryLevel?: number;
  }>;
  totalPoints: number;
  downsampled: boolean;
}

export async function getLocationHistory(
  customerId: string,
  orderId: string,
): Promise<LocationHistoryResponse> {
  // Ownership first — never enumerate another customer's routes.
  const order = await prisma.order.findFirst({
    where: { id: orderId, customerId },
    include: { delivery: { select: { id: true } } },
  });
  if (!order) {
    throw ApiError.notFound('Order not found');
  }
  if (!order.delivery) {
    throw ApiError.notFound('No delivery assigned to this order yet');
  }

  const doc = await TrackingModel.findOne({ deliveryId: order.delivery.id });
  const history = doc?.locationHistory ?? [];
  const points = downsample(history).map((point) => ({
    lat: point.lat,
    lng: point.lng,
    timestamp: point.timestamp,
    ...(point.accuracy !== undefined ? { accuracy: point.accuracy } : {}),
    ...(point.speed !== undefined ? { speed: point.speed } : {}),
    ...(point.batteryLevel !== undefined ? { batteryLevel: point.batteryLevel } : {}),
  }));

  return {
    deliveryId: order.delivery.id,
    orderId: order.id,
    points,
    totalPoints: history.length,
    downsampled: history.length > MAX_HISTORY_POINTS,
  };
}
