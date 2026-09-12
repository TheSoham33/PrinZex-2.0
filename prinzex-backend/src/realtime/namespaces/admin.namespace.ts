import type { ExtendedError, Namespace, Server, Socket } from 'socket.io';
import { logger } from '../../config/logger';
import { socketAuthMiddleware, socketUser } from '../socket.auth';
import { RT_NAMESPACES, RT_ROOMS } from '../realtime.emitters';

/**
 * /admin namespace — live monitoring dashboard for admins.
 * Two gates: a valid token (socketAuthMiddleware) AND the ADMIN role —
 * any customer/seller/rider JWT gets a connection-level error.
 */
function adminOnlyMiddleware(socket: Socket, next: (err?: ExtendedError) => void): void {
  if (socketUser(socket).role !== 'ADMIN') {
    next(new Error('Admin only'));
    return;
  }
  next();
}

export function initAdminNamespace(io: Server): void {
  const adminNs: Namespace = io.of(RT_NAMESPACES.ADMIN);
  adminNs.use(socketAuthMiddleware);
  adminNs.use(adminOnlyMiddleware);

  adminNs.on('connection', (socket: Socket) => {
    const user = socketUser(socket);
    void socket.join(RT_ROOMS.adminGlobal);
    logger.info('admin_socket_connected', { socketId: socket.id, adminId: user.role === 'ADMIN' ? user.adminId : null });

    // Watch one delivery live (receives the same GPS fan-out as the customer).
    socket.on('admin:watch_delivery', (deliveryId: unknown) => {
      if (typeof deliveryId === 'string' && deliveryId.length > 0) {
        void socket.join(RT_ROOMS.deliveryWatch(deliveryId));
      }
    });

    socket.on('admin:unwatch_delivery', (deliveryId: unknown) => {
      if (typeof deliveryId === 'string' && deliveryId.length > 0) {
        void socket.leave(RT_ROOMS.deliveryWatch(deliveryId));
      }
    });

    socket.on('error', (error: Error) => {
      logger.error('admin_socket_error', { socketId: socket.id, error: error.message });
    });
  });
}
