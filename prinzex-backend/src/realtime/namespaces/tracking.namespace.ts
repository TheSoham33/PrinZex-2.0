import type { Namespace, Server, Socket } from 'socket.io';
import Redis from 'ioredis';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { prisma } from '../../config/database';
import { redis, REDIS_KEYS } from '../../config/redis';
import { socketAuthMiddleware, socketUser } from '../socket.auth';
import {
  broadcastAdminDeliveryWatch,
  broadcastLocationToOrder,
  RT_EVENTS,
  RT_NAMESPACES,
  RT_ROOMS,
  type TrackingLocationPayload,
} from '../realtime.emitters';

/**
 * /tracking namespace — customers watch their active order's rider on the
 * live map.
 *
 * Pipeline (multi-instance safe):
 *   rider POSTs GPS (REST, step 6) → ioredis PUBLISH tracking:{deliveryId}
 *     → this server's dedicated subscriber (PSUBSCRIBE tracking:*) →
 *     broadcast to the order room here (and the admin watch room).
 * Across instances the Socket.io Redis adapter (socket.server.ts) further
 * fans the room emission out to whichever node holds the customer's socket.
 */

export interface JoinOrderPayload {
  orderId: string;
}

/** Exported for tests: the join handler, decoupled from the connection event. */
export async function handleJoinOrder(ns: Namespace, socket: Socket, orderId: string): Promise<void> {
  const user = socketUser(socket);
  if (user.role !== 'CUSTOMER') {
    socket.emit(RT_EVENTS.ERROR, 'Only customers track orders');
    return;
  }

  let order: { id: string; delivery: { id: string; deliveryBoyId: string | null } | null } | null;
  try {
    order = await prisma.order.findFirst({
      where: { id: orderId, customerId: user.userId },
      select: { id: true, delivery: { select: { id: true, deliveryBoyId: true } } },
    });
  } catch (error) {
    logger.error('tracking_join_lookup_failed', { orderId, error: error instanceof Error ? error.message : String(error) });
    socket.emit(RT_EVENTS.ERROR, 'Unable to verify order ownership');
    return;
  }
  if (!order) {
    socket.emit(RT_EVENTS.ERROR, 'Order not found');
    return;
  }

  await socket.join(RT_ROOMS.order(order.id));
  logger.debug('tracking_room_joined', { socketId: socket.id, orderId: order.id });

  // Push the freshest known position immediately so the map is never blank
  // while the customer waits for the next ping. Redis first (30s TTL from the
  // GPS hot path) — a MongoDB fallback already exists in the REST tracking API.
  const delivery = order.delivery;
  if (delivery?.deliveryBoyId) {
    try {
      const cached = await redis.get(REDIS_KEYS.DELIVERY_LOCATION(delivery.deliveryBoyId));
      if (cached) {
        const location = JSON.parse(cached) as { lat: number; lng: number; etaMinutes: number | null; at: string };
        const payload: TrackingLocationPayload = {
          deliveryId: delivery.id,
          orderId: order.id,
          lat: location.lat,
          lng: location.lng,
          etaMinutes: location.etaMinutes,
          at: location.at,
        };
        socket.emit(RT_EVENTS.LOCATION_UPDATE, payload);
      }
    } catch {
      // Redis hiccup on join is fine — the next pub/sub ping will paint the map.
    }
  }
}

/**
 * Redis psubscribe fan-out. Own client (a connected client in subscriber mode
 * cannot run other commands), fail-open: if Redis is unreachable the server
 * simply runs without the location bridge (REST tracking API still works).
 */
export function startTrackingSubscriber(): () => Promise<void> {
  const subscriber = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null, // one attempt — do not pile reconnects in a degraded env
  });

  subscriber.on('error', (error: Error) => {
    logger.warn('tracking_subscriber_error', { error: error.message });
  });

  const pattern = REDIS_KEYS.TRACKING_CHANNEL('*'); // 'tracking:*'
  subscriber
    .connect()
    .then(() => subscriber.psubscribe(pattern))
    .catch((error: unknown) => {
      logger.warn('tracking_subscriber_unavailable — live location fan-out disabled', {
        error: error instanceof Error ? error.message : String(error),
      });
    });

  subscriber.on('pmessage', (_pattern: string, channel: string, message: string) => {
    try {
      // The step-6 GPS pipeline publishes self-describing payloads:
      // { deliveryId, orderId, lat, lng, etaMinutes, at }.
      const payload = JSON.parse(message) as TrackingLocationPayload;
      if (!payload.orderId || typeof payload.lat !== 'number' || typeof payload.lng !== 'number') {
        logger.warn('tracking_malformed_pubsub_message', { channel });
        return;
      }
      broadcastLocationToOrder(payload.orderId, payload);
      broadcastAdminDeliveryWatch(payload.deliveryId, payload); // admin live-watch (spec)
    } catch (error) {
      logger.warn('tracking_pubsub_parse_failed', { channel, error: error instanceof Error ? error.message : String(error) });
    }
  });

  return async () => {
    try {
      await subscriber.punsubscribe(pattern);
    } catch {
      // best-effort
    }
    subscriber.disconnect();
  };
}

export function initTrackingNamespace(io: Server, options: { withSubscriber?: boolean } = {}): () => Promise<void> {
  const trackingNs: Namespace = io.of(RT_NAMESPACES.TRACKING);
  trackingNs.use(socketAuthMiddleware);

  trackingNs.on('connection', (socket: Socket) => {
    logger.debug('tracking_socket_connected', { socketId: socket.id });

    socket.on('join:order', (orderId: unknown) => {
      if (typeof orderId !== 'string' || orderId.length === 0) {
        socket.emit(RT_EVENTS.ERROR, 'join:order expects an order id');
        return;
      }
      void handleJoinOrder(trackingNs, socket, orderId);
    });

    socket.on('leave:order', (orderId: unknown) => {
      if (typeof orderId === 'string' && orderId.length > 0) {
        void socket.leave(RT_ROOMS.order(orderId)); // no-op if never joined
      }
    });

    socket.on('error', (error: Error) => {
      logger.error('tracking_socket_error', { socketId: socket.id, error: error.message });
    });
  });

  const stopSubscriber = options.withSubscriber === false ? async () => {} : startTrackingSubscriber();
  return stopSubscriber;
}
