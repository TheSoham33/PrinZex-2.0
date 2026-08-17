import type { Server } from 'socket.io';

/**
 * Socket.io server handle — deliberately dependency-free so ANY module
 * (services, namespaces, emitters) can read the live server without
 * importing socket.server.ts. That is what keeps emission call-sites free
 * of circular imports (spec acceptance).
 *
 *   socket.server.ts  → registers on init, clears on close
 *   realtime.emitters → reads per emission (never at module-eval time)
 */

let ioInstance: Server | null = null;

export function registerSocketServer(io: Server): void {
  ioInstance = io;
}

export function clearSocketServer(): void {
  ioInstance = null;
}

/** Throws when the socket server has not been initialized (programming error). */
export function getSocketServer(): Server {
  if (!ioInstance) {
    throw new Error('Socket.io not initialized — call initSocketServer(httpServer) first');
  }
  return ioInstance;
}

/**
 * Null-safe variant for service emission sites: REST must keep working when
 * the socket server is down/disabled (tests, single-process cron, etc.).
 */
export function getSocketServerOrNull(): Server | null {
  return ioInstance;
}
