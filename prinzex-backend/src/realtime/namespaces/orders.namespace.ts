import type { Namespace, Server, Socket } from 'socket.io';
import { logger } from '../../config/logger';
import { socketAuthMiddleware, socketUser } from '../socket.auth';
import { RT_NAMESPACES, RT_ROOMS } from '../realtime.emitters';

/**
 * /orders namespace — order lifecycle events without polling. On connect
 * each party auto-joins its own room (identity comes from the verified JWT,
 * never from a client-supplied room name):
 *
 *   CUSTOMER     → customer:{userId}       (order:status_changed, notification:new)
 *   SELLER       → seller:{sellerId}       (order:new, order:status_changed, payout:processed)
 *   DELIVERY_BOY → delivery:{deliveryBoyId}(delivery:assigned, payout:processed)
 *   ADMIN        → (no room — admins use the /admin namespace)
 */
export function initOrdersNamespace(io: Server): void {
  const ordersNs: Namespace = io.of(RT_NAMESPACES.ORDERS);
  ordersNs.use(socketAuthMiddleware);

  ordersNs.on('connection', (socket: Socket) => {
    const user = socketUser(socket);
    const rooms: string[] = [];

    if (user.role === 'CUSTOMER') {
      rooms.push(RT_ROOMS.customer(user.userId));
    } else if (user.role === 'SELLER') {
      rooms.push(RT_ROOMS.seller(user.sellerId));
    } else if (user.role === 'DELIVERY_BOY') {
      rooms.push(RT_ROOMS.delivery(user.deliveryBoyId));
    }

    void socket.join(rooms);
    logger.debug('orders_socket_connected', { socketId: socket.id, role: user.role, rooms });

    socket.on('error', (error: Error) => {
      logger.error('orders_socket_error', { socketId: socket.id, error: error.message });
    });
  });
}
