import { io, type Socket } from 'socket.io-client';
import { getSocketUrl } from './deliverySocket';

/**
 * Customer real-time channel — same `/orders` namespace the rider client
 * uses. The backend auto-joins every verified socket to its own user room
 * (orders.namespace.ts) and emits `notification:new` there the moment any
 * operational module writes a notification, so the inbox repaints without
 * polling. Identity comes from the JWT handshake only.
 */

/** Mirrors the backend's RT_EVENTS.NOTIFICATION_NEW. */
export const NOTIFICATION_NEW_EVENT = 'notification:new' as const;

/** Mirrors NotificationNewPayload (realtime.emitters.ts). */
export interface NotificationNewEvent {
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export function connectNotificationSocket(accessToken: string): Socket {
  return io(`${getSocketUrl()}/orders`, {
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
    reconnection: true,
  });
}
