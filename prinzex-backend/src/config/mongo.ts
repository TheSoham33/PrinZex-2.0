import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

/**
 * MongoDB access layer (Mongoose).
 *
 * Stores document-heavy / high-write data: order timelines, live delivery
 * tracking, notifications, admin activity logs and CMS content.
 */
mongoose.set('strictQuery', true);

mongoose.connection.on('connected', () => {
  logger.info('MongoDB connection established', { engine: 'mongoose' });
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB connection lost', { engine: 'mongoose' });
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected', { engine: 'mongoose' });
});

mongoose.connection.on('error', (error) => {
  logger.error('MongoDB connection error', { engine: 'mongoose', error: String(error) });
});

/** Connect on app boot. Throws (and the bootstrap exits) if unreachable. */
export async function connectMongo(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    autoIndex: !env.isProduction,
  });
  logger.info('MongoDB connected', { engine: 'mongoose', uri: redactMongoUri(env.MONGODB_URI) });
}

/** Graceful teardown — called on SIGINT/SIGTERM. */
export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected', { engine: 'mongoose' });
}

/** Never log credentials embedded in the URI. */
function redactMongoUri(uri: string): string {
  return uri.replace(/\/\/([^:@/]+):([^@/]+)@/, '//$1:***@');
}
