import { logger } from '../config/logger';
import { getSocketServerOrNull } from './socket.registry';

/**
 * Typed real-time emission API — the ONLY place event names and room names
 * are defined (mirroring the REDIS_KEYS convention: no inline strings
 * elsewhere). Every helper is a SAFE no-op when the socket server is not
 * running, so REST services can emit unconditionally.
 *
 * Wire-in convention: services call these AFTER the database commit, inside
 * their existing post-commit side-effect runners.
 */

export const RT_NAMESPACES = {
  TRACKING: '/tracking',
  ORDERS: '/orders',
  CHAT: '/chat',
  ADMIN: '/admin',
} as const;

export const RT_EVENTS = {
  ORDER_NEW: 'order:new',
  ORDER_STATUS_CHANGED: 'order:status_changed',
  DELIVERY_ASSIGNED: 'delivery:assigned',
  LOCATION_UPDATE: 'location:update', // /tracking order room (spec name)
  PAYOUT_PROCESSED: 'payout:processed',
  NOTIFICATION_NEW: 'notification:new',
  CHAT_MESSAGE: 'chat:message',
  CHAT_HISTORY: 'chat:history',
  CHAT_READ_ACK: 'chat:read_ack',
  ADMIN_EVENT: 'admin:event', // envelope onto /admin → admin:global room
  ERROR: 'error',
} as const;

export const RT_ROOMS = {
  order: (orderId: string) => `order:${orderId}`,
  customer: (customerId: string) => `customer:${customerId}`,
  seller: (sellerId: string) => `seller:${sellerId}`,
  delivery: (deliveryBoyId: string) => `delivery:${deliveryBoyId}`,
  chat: (orderId: string) => `chat:${orderId}`,
  adminGlobal: 'admin:global',
  deliveryWatch: (deliveryId: string) => `delivery:watch:${deliveryId}`,
} as const;

// ── Generic safe emitter ───────────────────────────────────────────────────

export function emitToRoom(namespace: string, room: string, event: string, payload: unknown): void {
  const io = getSocketServerOrNull();
  if (!io) {
    return; // socket layer offline — REST stays authoritative
  }
  try {
    io.of(namespace).to(room).emit(event, payload);
  } catch (error) {
    // Emission must NEVER break a REST request.
    logger.warn('realtime_emit_failed', {
      namespace,
      room,
      event,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ── Order events (/orders namespace) ───────────────────────────────────────

export interface OrderNewPayload {
  orderId: string;
  total: number;
  paymentMethod: string;
  timestamp: Date;
}

/** Seller hears about a new settled order without polling. */
export function emitNewOrder(sellerId: string, payload: OrderNewPayload): void {
  emitToRoom(RT_NAMESPACES.ORDERS, RT_ROOMS.seller(sellerId), RT_EVENTS.ORDER_NEW, payload);
}

export interface OrderStatusPayload {
  orderId: string;
  status: string;
  timestamp: Date;
}

/** Any status change → BOTH parties' rooms (customer + seller). */
export function emitOrderStatusChanged(order: { id: string; customerId: string; sellerId: string }, status: string): void {
  const payload: OrderStatusPayload = { orderId: order.id, status, timestamp: new Date() };
  emitToRoom(RT_NAMESPACES.ORDERS, RT_ROOMS.customer(order.customerId), RT_EVENTS.ORDER_STATUS_CHANGED, payload);
  emitToRoom(RT_NAMESPACES.ORDERS, RT_ROOMS.seller(order.sellerId), RT_EVENTS.ORDER_STATUS_CHANGED, payload);
}

export interface DeliveryAssignedPayload {
  orderId: string;
  deliveryId: string;
  pickupAddress: string;
  deliveryAddress: string;
  customerPhone: string | null;
  timestamp: Date;
}

export function emitDeliveryAssigned(deliveryBoyId: string, payload: DeliveryAssignedPayload): void {
  emitToRoom(RT_NAMESPACES.ORDERS, RT_ROOMS.delivery(deliveryBoyId), RT_EVENTS.DELIVERY_ASSIGNED, payload);
}

export interface PayoutProcessedPayload {
  payoutId: string;
  amount: number;
  transactionRef: string;
  timestamp: Date;
}

/** Seller room per spec; delivery-boy room for rider payouts (extension —
 * the /orders namespace already has a delivery:{id} room for job events). */
export function emitPayoutProcessed(recipientType: 'seller' | 'delivery_boy', recipientId: string, payload: PayoutProcessedPayload): void {
  const room = recipientType === 'seller' ? RT_ROOMS.seller(recipientId) : RT_ROOMS.delivery(recipientId);
  emitToRoom(RT_NAMESPACES.ORDERS, room, RT_EVENTS.PAYOUT_PROCESSED, payload);
}

// ── Generic notification fan-out (/orders namespace) ───────────────────────

export interface NotificationNewPayload {
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * "notification:new → any user room". Wired into the central notify()
 * helpers of the operational modules (orders/payments/payouts/delivery/
 * assignment). Admin recipients are skipped — admins have the /admin feed.
 */
export function emitNotificationNew(
  recipientType: string,
  recipientId: string,
  payload: Omit<NotificationNewPayload, 'timestamp'>,
): void {
  const room =
    recipientType === 'customer'
      ? RT_ROOMS.customer(recipientId)
      : recipientType === 'seller'
        ? RT_ROOMS.seller(recipientId)
        : recipientType === 'delivery_boy'
          ? RT_ROOMS.delivery(recipientId)
          : null;
  if (!room) {
    return;
  }
  emitToRoom(RT_NAMESPACES.ORDERS, room, RT_EVENTS.NOTIFICATION_NEW, { ...payload, timestamp: new Date() });
}

// ── Tracking fan-out (/tracking namespace + admin delivery watch) ──────────

export interface TrackingLocationPayload {
  deliveryId: string;
  orderId: string;
  lat: number;
  lng: number;
  etaMinutes: number | null;
  at?: string;
  timestamp?: Date;
}

/** Customer's live map — the /tracking order room. */
export function broadcastLocationToOrder(orderId: string, payload: TrackingLocationPayload): void {
  emitToRoom(RT_NAMESPACES.TRACKING, RT_ROOMS.order(orderId), RT_EVENTS.LOCATION_UPDATE, payload);
}

/** Admin live-watch of a specific delivery (spec: re-publish to watch room). */
export function broadcastAdminDeliveryWatch(deliveryId: string, payload: TrackingLocationPayload): void {
  emitToRoom(RT_NAMESPACES.ADMIN, RT_ROOMS.deliveryWatch(deliveryId), RT_EVENTS.LOCATION_UPDATE, payload);
}

// ── Admin global events (/admin namespace) ─────────────────────────────────

export type AdminGlobalEventType =
  | 'seller.registered'
  | 'delivery.failed'
  | 'order.high_value'
  | 'payment.failed'
  | 'support.high_priority';

/** Significant platform events → every connected admin (admin:global room). */
export function emitAdminGlobalEvent(type: AdminGlobalEventType, payload: Record<string, unknown>): void {
  emitToRoom(RT_NAMESPACES.ADMIN, RT_ROOMS.adminGlobal, RT_EVENTS.ADMIN_EVENT, { type, ...payload, timestamp: new Date() });
}
