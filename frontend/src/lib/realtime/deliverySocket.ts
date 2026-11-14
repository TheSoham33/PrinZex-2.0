import { io, type Socket } from 'socket.io-client';

/**
 * Rider real-time client — a thin wrapper over the Socket.io `/orders`
 * namespace so the rider app hears about a new assignment instantly instead
 * of waiting for the next 30s poll.
 *
 * The backend (realtime.emitters.ts) emits `delivery.assigned` to the
 * `delivery:{deliveryBoyId}` room, which every DELIVERY_BOY socket auto-joins
 * on connect (orders.namespace.ts). We only pass the verified JWT in the
 * handshake — the room membership comes from the token, never from the client.
 */

/** Spec event name (gap #6): the backend's RT_EVENTS.DELIVERY_ASSIGNED. */
export const DELIVERY_ASSIGNED_EVENT = 'delivery.assigned' as const;

/** Mirrors the backend's DeliveryAssignedPayload (realtime.emitters.ts). */
export interface DeliveryAssignedEvent {
  orderId: string;
  deliveryId: string;
  pickupAddress: string;
  deliveryAddress: string;
  customerPhone: string | null;
  timestamp: string;
}

/**
 * The Socket.io server shares the API host; `NEXT_PUBLIC_SOCKET_URL` is an
 * optional override (mirrored in .env.example) for split deployments.
 */
export function getSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL.replace(/\/$/, '');
  }
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  return api.replace(/\/api\/?$/, '');
}

/**
 * Open the rider's real-time channel. Callers own the socket and MUST
 * `socket.disconnect()` when done (a rider logging out must not keep the room
 * alive on the server).
 */
export function connectDeliverySocket(accessToken: string): Socket {
  const socket = io(`${getSocketUrl()}/orders`, {
    auth: { token: accessToken },
    // Server preference (socket.server.ts) is websocket-first; keep polling
    // as an upgrade/fallback transport so restrictive proxies still work.
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
  });
  return socket;
}
