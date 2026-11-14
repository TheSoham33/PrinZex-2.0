import type { Request, RequestHandler } from 'express';
import { redis, REDIS_KEYS } from '../config/redis';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Global API rate limiting — ONE middleware, per-route overrides.
 *
 * Every request is counted in a fixed window keyed
 * `REDIS_KEYS.RATE_LIMIT(identity, bucket)`. The default bucket allows a
 * generous amount of normal traffic per IP; sensitive endpoints (logins,
 * OTP sends, registrations) declare tighter windows and/or a different
 * identity in `RATE_LIMIT_OVERRIDES`.
 *
 * On Redis failure the limiter FAILS OPEN (logs and lets the request
 * through) — availability of the API beats strictness of the limiter.
 * In the jest environment the limiter is skipped entirely (no Redis).
 */

export interface RouteRateLimitOverride {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  /** Full mounted path, e.g. `/api/auth/login`. Exact match only. */
  path: string;
  windowSeconds: number;
  maxRequests: number;
  /** Friendly bucket name for logs + Redis key. */
  name: string;
  /** Override the identity bucket (default: req.ip). */
  keyGenerator?: (req: Request) => string;
}

/** Extract an email/phone-style identifier from the request body. */
const identifierFromBody = (req: Request): string => {
  const body = req.body as Record<string, unknown>;
  const raw = body.identifier ?? body.email ?? body.phone;
  return typeof raw === 'string' && raw.length > 0 ? raw : (req.ip ?? 'unknown');
};

/** Default allowance for everything without an override: 100 req / min / IP. */
export const GLOBAL_RATE_LIMIT_DEFAULT = {
  windowSeconds: 60,
  maxRequests: 100,
  name: 'global',
} as const;

/** Paths exempt from rate limiting entirely. */
export const RATE_LIMIT_SKIP_PATHS: ReadonlySet<string> = new Set([
  // Load-balancer / uptime probes must never 429.
  '/health',
  // Razorpay retries webhook deliveries aggressively; rejecting one can
  // strand a payment. The signature check is the real guard here.
  '/api/payments/webhook',
]);

/**
 * Per-route overrides. Matched by exact `METHOD path`. Buckets stay
 * per-route (the path is part of the Redis key), so e.g. the customer and
 * admin logins don't share a counter — but an OTP identifier is throttled
 * on every endpoint that sends one.
 */
export const RATE_LIMIT_OVERRIDES: RouteRateLimitOverride[] = [
  // ── Credential logins: 5 / 15 min / IP ────────────────────────────────
  { method: 'POST', path: '/api/auth/login', windowSeconds: 15 * 60, maxRequests: 5, name: 'login' },
  { method: 'POST', path: '/api/seller/auth/login', windowSeconds: 15 * 60, maxRequests: 5, name: 'login' },
  { method: 'POST', path: '/api/admin/auth/login', windowSeconds: 15 * 60, maxRequests: 5, name: 'login' },

  // ── OTP sends: 3 / 10 min per identifier (email/phone, any IP) ───────
  { method: 'POST', path: '/api/auth/send-signup-otp', windowSeconds: 10 * 60, maxRequests: 3, name: 'otp_send', keyGenerator: identifierFromBody },
  { method: 'POST', path: '/api/auth/send-login-otp', windowSeconds: 10 * 60, maxRequests: 3, name: 'otp_send', keyGenerator: identifierFromBody },
  { method: 'POST', path: '/api/auth/resend-otp', windowSeconds: 10 * 60, maxRequests: 3, name: 'otp_send', keyGenerator: identifierFromBody },
  { method: 'POST', path: '/api/auth/forgot-password', windowSeconds: 10 * 60, maxRequests: 3, name: 'otp_send', keyGenerator: identifierFromBody },
  // Delivery login requests an OTP to the rider's phone.
  { method: 'POST', path: '/api/delivery/auth/login', windowSeconds: 10 * 60, maxRequests: 3, name: 'otp_send', keyGenerator: identifierFromBody },

  // ── Registrations: 5 / 15 min / IP ────────────────────────────────────
  { method: 'POST', path: '/api/auth/register', windowSeconds: 15 * 60, maxRequests: 5, name: 'registration' },
  { method: 'POST', path: '/api/seller/register', windowSeconds: 15 * 60, maxRequests: 5, name: 'registration' },
  { method: 'POST', path: '/api/delivery/register', windowSeconds: 15 * 60, maxRequests: 5, name: 'registration' },
];

const findOverride = (method: string, path: string): RouteRateLimitOverride | undefined =>
  RATE_LIMIT_OVERRIDES.find((entry) => entry.method === method && entry.path === path);

/** The single global rate-limit middleware — mount once in app.ts. */
export const globalRateLimiter: RequestHandler = asyncHandler(async (req, res, next) => {
  // No Redis in unit/integration tests — skip so suites never 429.
  if (process.env.NODE_ENV === 'test') {
    next();
    return;
  }

  const fullPath = `${req.baseUrl}${req.path}`;
  if (RATE_LIMIT_SKIP_PATHS.has(fullPath)) {
    next();
    return;
  }

  const override = findOverride(req.method, fullPath);
  const { windowSeconds, maxRequests, name } = override ?? GLOBAL_RATE_LIMIT_DEFAULT;
  const identity = override?.keyGenerator ? override.keyGenerator(req) : (req.ip ?? 'unknown');
  const key = REDIS_KEYS.RATE_LIMIT(identity, `${name}:${fullPath}`);

  try {
    const results = await redis.multi().incr(key).expire(key, windowSeconds, 'NX').exec();
    const count = Number(results?.[0]?.[1] ?? 1);

    if (count > maxRequests) {
      const ttl = Math.max(await redis.ttl(key), 1);
      res.set('Retry-After', String(ttl));
      logger.warn('rate_limit_exceeded', {
        bucket: name,
        identity,
        route: fullPath,
        count,
        maxRequests,
      });
      throw new ApiError(429, `Too many requests — try again in ${ttl} seconds`);
    }

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Redis hiccup: fail open.
    logger.warn('rate_limiter_unavailable, allowing request', {
      error: error instanceof Error ? error.message : String(error),
    });
    next();
  }
});
