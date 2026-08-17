import { PrismaClient } from '@prisma/client';
import { env } from './env';
import { logger } from './logger';

/**
 * PostgreSQL access layer — a single shared Prisma client.
 *
 * The instance is cached on globalThis so that hot-reload (nodemon/tsx)
 * does not create a new connection pool on every restart in development.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isProduction ? ['error'] : ['warn', 'error'],
  });

if (!env.isProduction) {
  globalForPrisma.prisma = prisma;
}

/** Connect on app boot. Throws (and the bootstrap exits) if unreachable. */
export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info('PostgreSQL connected', { engine: 'prisma' });
}

/** Graceful pool teardown — called on SIGINT/SIGTERM. */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('PostgreSQL disconnected', { engine: 'prisma' });
}
