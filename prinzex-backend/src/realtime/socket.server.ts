import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient, type RedisClientType } from 'redis'; // 'redis' v4-lineage client — REQUIRED by the adapter
import { env } from '../config/env';
import { logger } from '../config/logger';
import { clearSocketServer, getSocketServerOrNull, registerSocketServer } from './socket.registry';
import { initTrackingNamespace } from './namespaces/tracking.namespace';
import { initOrdersNamespace } from './namespaces/orders.namespace';
import { initChatNamespace } from './namespaces/chat.namespace';
import { initAdminNamespace } from './namespaces/admin.namespace';

/**
 * Socket.io real-time layer. The server is attached to the SAME http.Server
 * as Express (server.ts) and horizontally scalable via the Redis adapter:
 * any node can emit to a room and the adapter fans it out through pub/sub
 * to the node holding the target socket.
 *
 * The singleton lives in socket.registry.ts (dependency-free); service files
 * emit through realtime.emitters.ts — neither imports this module, so there
 * are no circular imports (getSocketServer is re-exported here per spec).
 */
export { getSocketServer, getSocketServerOrNull } from './socket.registry';

export interface InitSocketOptions {
  /** Attach the Redis adapter (multi-node). Default true; tests pass false. */
  withRedisAdapter?: boolean;
  /** Start the tracking:* psubscribe bridge. Default true; tests pass false. */
  withTrackingSubscriber?: boolean;
}

let adapterClients: RedisClientType[] = [];
let trackingStop: (() => Promise<void>) | null = null;

export function initSocketServer(httpServer: HttpServer, options: InitSocketOptions = {}): Server {
  const { withRedisAdapter = true, withTrackingSubscriber = true } = options;

  // CORS mirrors the Express layer's allowed origins (spec's env.FRONTEND_URL —
  // this project models the frontend list as CORS_ORIGIN, one source of truth).
  const allowedOrigins = env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 20000,
    pingInterval: 10000,
  });

  if (withRedisAdapter) {
    void connectRedisAdapter(io);
  }

  // Mount namespaces (tracking returns its subscriber teardown).
  trackingStop = initTrackingNamespace(io, { withSubscriber: withTrackingSubscriber });
  initOrdersNamespace(io);
  initChatNamespace(io);
  initAdminNamespace(io);

  registerSocketServer(io);

  // Connection lifecycle on the default namespace (all ns connections log too
  // at their own layer — this one catches '/' and unknown-namespace traffic).
  io.on('connection', (socket) => {
    logger.info('socket_connected', {
      socketId: socket.id,
      user: (socket.data.user as { userId?: string } | undefined)?.userId ?? null,
    });
    socket.on('disconnect', (reason: string) => {
      // Rooms are torn down by Socket.io itself on disconnect — nothing to
      // clean up manually (no stale-room accumulation). A disconnected rider
      // stays in the Redis online set: availability is governed by the REST
      // endpoint and the location key's TTL, not by socket lifetime.
      logger.info('socket_disconnected', { socketId: socket.id, reason });
    });
    socket.on('error', (error: Error) => {
      logger.error('socket_error', { socketId: socket.id, error: error.message });
    });
  });

  logger.info('socket.io initialized', { adapter: withRedisAdapter ? 'redis' : 'single-node' });
  return io;
}

/**
 * Redis adapter pub/sub pair. Two SEPARATE clients are required (one to
 * publish, one to subscribe — a subscribed client cannot issue commands).
 * Fail-open: with Redis unreachable the server runs single-node instead of
 * crashing, matching the cache/rate-limiter degradation policy.
 */
async function connectRedisAdapter(io: Server): Promise<void> {
  const url = `redis://${env.REDIS_HOST}:${env.REDIS_PORT}`;
  const pubClient = createClient({ url, socket: { reconnectStrategy: false } });
  const subClient = pubClient.duplicate();

  for (const client of [pubClient, subClient]) {
    client.on('error', (error: Error) => {
      logger.warn('socket_redis_adapter_client_error', { error: error.message });
    });
  }

  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    adapterClients = [pubClient, subClient];
    logger.info('socket.io Redis adapter connected');
  } catch (error) {
    logger.warn('socket.io Redis adapter unavailable — running in single-node mode', {
      error: error instanceof Error ? error.message : String(error),
    });
    for (const client of [pubClient, subClient]) {
      try {
        await client.disconnect();
      } catch {
        // already down
      }
    }
  }
}

/** Graceful teardown (server shutdown / tests). */
export async function closeSocketServer(): Promise<void> {
  if (trackingStop) {
    await trackingStop().catch(() => {});
    trackingStop = null;
  }
  for (const client of adapterClients) {
    try {
      await client.quit();
    } catch {
      client.disconnect();
    }
  }
  adapterClients = [];
  const io = getSocketServerOrNull();
  clearSocketServer();
  if (io) {
    await io.close();
  }
}
