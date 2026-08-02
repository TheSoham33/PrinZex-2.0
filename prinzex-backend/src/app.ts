import express, { type Express } from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { requestLogger } from './middlewares/requestLogger';
import { notFound } from './middlewares/notFound';
import { errorHandler } from './middlewares/errorHandler';
import { generalLimiter } from './middlewares/rateLimiter';
import { createGlobalRateLimiter } from './utils/rateLimitStore';
import { customerAuthRouter } from './modules/auth/auth.routes';
import { sellerAuthRouter } from './modules/seller-auth/seller-auth.routes';
import { deliveryAuthRouter } from './modules/delivery-auth/delivery-auth.routes';
import { adminAuthRouter } from './modules/admin-auth/admin-auth.routes';
import { customerRouter } from './modules/customer/customer.routes';
import { storesRouter } from './modules/stores/stores.routes';
import { uploadRouter } from './modules/upload/upload.routes';
import { sellerRegistrationRouter } from './modules/seller-registration/seller-registration.routes';
import { sellerRouter } from './modules/seller/seller.routes';
import { adminOrdersRouter, ordersRouter } from './modules/orders/orders.routes';
import {
  adminDeliveryRouter,
  deliveryRegistrationRouter,
  deliveryRouter,
} from './modules/delivery/delivery.routes';
import { trackingRouter } from './modules/tracking/tracking.routes';
import { paymentsRouter, paymentsWebhookRouter, walletRouter } from './modules/payments/payments.routes';
import { adminFinancialsRouter, adminPayoutsRouter } from './modules/payouts/payouts.routes';
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

  // 2.5 Razorpay webhook — MUST be mounted BEFORE express.json(): the
  //     HMAC signature is computed over the exact raw bytes Razorpay sent.
  app.use('/api/payments', paymentsWebhookRouter);

  // 3. Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 4. Access logging
  app.use(requestLogger);

  // 5. Global rate limiting, counters in Redis (shared across replicas).
  //    Two layers: the ioredis INCR/EXPIRE fixed-window limiter from step 2,
  //    plus the express-rate-limit + RedisStore guard (lazily constructed, see
  //    utils/rateLimitStore).
  app.use(generalLimiter);
  app.use(createGlobalRateLimiter());

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

  // Customer APIs (profile, addresses, wallet, notifications) — authenticated.
  app.use('/api/customer', customerRouter);

  // Public store discovery/search — no auth.
  app.use('/api/stores', storesRouter);

  // Seller onboarding (customer JWT) — MUST mount before /api/seller because
  // that router gates every sub-route with authorizeRoles('SELLER').
  app.use('/api/seller/register', sellerRegistrationRouter);

  // Seller store management (services, pricing, inventory, team, analytics,
  // orders, payouts, settings) — SELLER role required.
  app.use('/api/seller', sellerRouter);

  // Customer order flow (quote, place, track, cancel, review) — CUSTOMER role.
  app.use('/api/orders', ordersRouter);

  // Admin order operations (list, detail, force-status, refund, dispute).
  app.use('/api/admin/orders', adminOrdersRouter);

  // Public delivery-boy registration — MUST mount before /api/delivery which
  // gates every sub-route with authorizeRoles('DELIVERY_BOY').
  app.use('/api/delivery/register', deliveryRegistrationRouter);

  // Delivery boy self-service (profile, availability, active delivery, GPS
  // pings, earnings) — DELIVERY_BOY role required.
  app.use('/api/delivery', deliveryRouter);

  // Admin delivery fleet management.
  app.use('/api/admin/delivery', adminDeliveryRouter);

  // Customer live tracking (order ownership enforced in the service).
  app.use('/api/tracking', trackingRouter);

  // Payments — Razorpay checkout lifecycle (JSON routes; webhook mounted above).
  app.use('/api/payments', paymentsRouter);

  // Wallet — Razorpay top-up + balance (customer).
  app.use('/api/wallet', walletRouter);

  // Admin payout management + financial reporting.
  app.use('/api/admin/payouts', adminPayoutsRouter);
  app.use('/api/admin/financials', adminFinancialsRouter);

  // Design file uploads — authenticated (any role).
  app.use('/api/upload', uploadRouter);

  // Static serving for uploaded files (S3 replaces this in the storage step).
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // 7. 404 for anything unmatched
  app.use(notFound);

  // 8. Global error envelope
  app.use(errorHandler);

  return app;
}

export const app = createApp();
