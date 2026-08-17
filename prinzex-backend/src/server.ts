import http, { type Server } from 'http';
import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectMongo, disconnectMongo } from './config/mongo';
import { connectRedis, disconnectRedis } from './config/redis';
import { closeSocketServer, initSocketServer } from './realtime/socket.server';

/**
 * Process entrypoint.
 *
 * Boot sequence: env validation (at import time) -> connect PostgreSQL,
 * MongoDB and Redis -> create the HTTP server around Express -> attach the
 * Socket.io real-time layer to the SAME server -> listen. If ANY database
 * connection fails the process exits with a non-zero code — a half-connected
 * service is worse than a fast crash.
 */
async function bootstrap(): Promise<void> {
  // Fail fast if any datastore is unreachable.
  await connectDatabase();
  await connectMongo();
  await connectRedis();

  // One HTTP server for BOTH the REST API and Socket.io (spec: no app.listen).
  const server: Server = http.createServer(app);
  initSocketServer(server);

  server.listen(env.PORT, () => {
    logger.info(`PrinZex API + realtime listening on http://localhost:${env.PORT}`, {
      port: env.PORT,
      nodeEnv: env.NODE_ENV,
      pid: process.pid,
    });
  });

  registerShutdown(server);
}

function registerShutdown(server: Server): void {
  const shutdown = (signal: string): void => {
    logger.info(`${signal} received, shutting down gracefully`);

    // Stop accepting new connections, then drain.
    server.close(() => {
      void (async () => {
        await Promise.allSettled([closeSocketServer(), disconnectDatabase(), disconnectMongo()]);
        disconnectRedis();
        logger.info('Shutdown complete');
        process.exit(0);
      })();
    });

    // Hard stop if connections refuse to drain.
    setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('unhandledRejection', {
    reason: reason instanceof Error ? reason.stack ?? reason.message : String(reason),
  });
});

process.on('uncaughtException', (error: Error) => {
  logger.error('uncaughtException', { error: error.stack ?? error.message });
  process.exit(1);
});

bootstrap().catch((error: unknown) => {
  logger.error('Fatal startup failure — exiting', {
    error: error instanceof Error ? error.stack ?? error.message : String(error),
  });
  process.exit(1);
});
