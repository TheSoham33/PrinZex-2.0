import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import { env } from './config/env';
import { redis } from './config/redis';
import { requestLogger } from './middlewares/requestLogger';
import { notFound } from './middlewares/notFound';
import { errorHandler } from './middlewares/errorHandler';
import { generalLimiter } from './middlewares/rateLimiter';
import { customerAuthRouter } from './modules/auth/auth.routes';
import { sellerAuthRouter } from './modules/seller-auth/seller-auth.routes';
import { deliveryAuthRouter } from './modules/delivery-auth/delivery-auth.routes';
import { adminAuthRouter } from './modules/admin-auth/admin-auth.routes';
import { ApiResponse } from './utils/ApiResponse';

/**
 * Bootstrap the Express app.
 *
 * Middleware order is contractual:
 *   1. helmet()              — security headers
 *   2. cors()                — allow the Next.js frontend origin(s) from env
 *   3. express.json()        — 10mb limit (file-upload metadata payloads)
 *   4. requestLogger         — Winston access log
 *   5. rate limiting         — express-rate-limit backed by the ioredis store
 *   6. routes                — mounted in subsequent steps (placeholder below)
 *   7. notFound              — 404 handler
 *   8. errorHandler          — global error envelope
 */
export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // 1. Security headers
  app.use(helmet());

  // 2. CORS for the Next.js frontend (comma-separated origins in CORS_ORIGIN)
  const allowedOrigins = env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.use(cors({ origin: allowedOrigins, credentials: true }));

  // 3. Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 4. Access logging
  app.use(requestLogger);

  // 5. Global rate limiting, counters in Redis (shared across replicas).
  //    Two layers: the ioredis INCR/EXPIRE fixed-window limiter from step 2,
  //    plus the express-rate-limit + RedisStore guard configured at boot.
  app.use(generalLimiter);

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: env.isProduction ? 300 : 5000,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => env.isTest,
    store: new RedisStore({
      sendCommand: (command: string, ...args: string[]): Promise<RedisReply> =>
        redis.call(command, ...args) as Promise<RedisReply>,
    }),
    message: {
      success: false,
      statusCode: 429,
      message: 'Too many requests, please try again later',
      errors: [],
    },
  });
  app.use(limiter);

  // 6. Routes
  app.get('/health', (_req, res) => {
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { status: 'ok', service: 'prinzex-backend', uptimeSeconds: Math.floor(process.uptime()) },
          'Healthy',
        ),
      );
  });

  // Auth — one router per actor; shared JWT infra, separate payloads/guards.
  app.use('/api/auth', customerAuthRouter);
  app.use('/api/seller/auth', sellerAuthRouter);
  app.use('/api/delivery/auth', deliveryAuthRouter);
  app.use('/api/admin/auth', adminAuthRouter);

  // 7. 404 for anything unmatched
  app.use(notFound);

  // 8. Global error envelope
  app.use(errorHandler);

  return app;
}

export const app = createApp();
