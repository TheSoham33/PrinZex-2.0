import type { Request, RequestHandler } from 'express';
import { redis, REDIS_KEYS } from '../config/redis';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Fixed-window rate limiter backed by ioredis INCR + EXPIRE.
 *
 * The counter key is `REDIS_KEYS.RATE_LIMIT(identity, route)` where identity
 * defaults to the client IP but can be overridden (e.g. rate-limit OTP sends
 * per email/phone regardless of IP).
 *
 * On Redis failure the limiter FAILS OPEN (logs and lets the request
 * through) — availability of the API beats strictness of the limiter.
 */

export interface RateLimiterOptions {
  /** Override the identity bucket (default: req.ip). */
  keyGenerator?: (req: Request) => string;
  /** Friendly bucket name used in the warning log. */
  name?: string;
  /** Custom 429 message. */
  message?: string;
}

export const createRateLimiter = (
  windowSeconds: number,
  maxRequests: number,
  options: RateLimiterOptions = {},
): RequestHandler => {
  return asyncHandler(async (req, res, next) => {
    const identity = options.keyGenerator?.(req) ?? req.ip ?? 'unknown';
    const route = `${req.baseUrl}${req.path}`;
    const key = REDIS_KEYS.RATE_LIMIT(identity, route);

    try {
      const results = await redis.multi().incr(key).expire(key, windowSeconds, 'NX').exec();
      const count = Number(results?.[0]?.[1] ?? 1);

      if (count > maxRequests) {
        const ttl = Math.max(await redis.ttl(key), 1);
        res.set('Retry-After', String(ttl));
        logger.warn('rate_limit_exceeded', {
          bucket: options.name ?? 'default',
          identity,
          route,
          count,
          maxRequests,
        });
        throw new ApiError(
          429,
          options.message ?? `Too many requests — try again in ${ttl} seconds`,
        );
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
};

/** Extract an email/phone-style identifier from the request body. */
const identifierFromBody = (req: Request): string => {
  const body = req.body as Record<string, unknown>;
  const raw = body.identifier ?? body.email ?? body.phone;
  return typeof raw === 'string' && raw.length > 0 ? raw : (req.ip ?? 'unknown');
};

// ── Shared, spec-defined limiters ──────────────────────────────────────────
/** Login endpoints: 5 requests / 15 minutes / IP. */
export const loginLimiter = createRateLimiter(15 * 60, 5, { name: 'login' });

/** OTP send endpoints: 3 requests / 10 minutes / identifier. */
export const otpSendLimiter = createRateLimiter(10 * 60, 3, {
  name: 'otp_send',
  keyGenerator: identifierFromBody,
});

/** General API traffic: 100 requests / minute / IP. */
export const generalLimiter = createRateLimiter(60, 100, { name: 'general' });
