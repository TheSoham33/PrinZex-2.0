import rateLimit, { type IncrementResponse, type Store } from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import { redis } from '../config/redis';
import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * Boot-time global rate limiter: express-rate-limit backed by an ioredis
 * store (per step-1 architecture).
 *
 * Resilience contract (Redis is a hard dependency in production, but must
 * never crash the HTTP process — e.g. during brief reconnects or in test
 * environments without a server):
 *  - The inner RedisStore is only constructed once Redis reports `ready`
 *    (its constructor fires internal script-preload commands that reject
 *    uncaught if issued while disconnected).
 *  - If Redis never becomes ready, the limiter FAILS OPEN: requests sail
 *    through and a warning is logged. The per-route INCR/EXPIRE limiters in
 *    middlewares/rateLimiter.ts behave the same way.
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const READY_TIMEOUT_MS = 2000;

class LazyRedisStore implements Store {
  localKeys = false;
  prefix = 'rl:';

  private inner?: RedisStore;

  /** Cooldown between readiness probes so an outage can't stall requests. */
  private nextReadyProbeAt = 0;

  /** Resolve once the shared client is ready, reject on end/timeout. */
  private waitForReady(): Promise<void> {
    if (redis.status === 'ready') {
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      const cleanup = (): void => {
        clearTimeout(timer);
        redis.off('ready', onReady);
        redis.off('end', onEnd);
      };
      const onReady = (): void => {
        cleanup();
        resolve();
      };
      const onEnd = (): void => {
        cleanup();
        reject(new Error('redis connection closed before ready'));
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`redis not ready within ${READY_TIMEOUT_MS}ms`));
      }, READY_TIMEOUT_MS);
      redis.once('ready', onReady);
      redis.once('end', onEnd);
    });
  }

  private async ensure(): Promise<RedisStore | null> {
    if (this.inner) {
      return this.inner;
    }
    if (Date.now() < this.nextReadyProbeAt) {
      return null; // outage cooldown — fail open fast
    }
    try {
      await this.waitForReady();
      this.inner = new RedisStore({
        sendCommand: (command: string, ...args: string[]): Promise<RedisReply> =>
          redis.call(command, ...args) as Promise<RedisReply>,
      });
      return this.inner;
    } catch (error) {
      this.nextReadyProbeAt = Date.now() + READY_TIMEOUT_MS;
      logger.warn('rate_limit_store_unavailable, failing open', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private passThrough(): IncrementResponse {
    return { totalHits: 1, resetTime: new Date(Date.now() + WINDOW_MS) };
  }

  async increment(key: string): Promise<IncrementResponse> {
    const store = await this.ensure();
    if (!store) {
      return this.passThrough();
    }
    try {
      const result = await store.increment(key);
      return { totalHits: result.totalHits, resetTime: result.resetTime ?? undefined };
    } catch (error) {
      logger.warn('rate_limit_increment_failed, failing open', {
        error: error instanceof Error ? error.message : String(error),
      });
      return this.passThrough();
    }
  }

  async decrement(key: string): Promise<void> {
    try {
      await this.inner?.decrement(key);
    } catch {
      /* fail open */
    }
  }

  async resetKey(key: string): Promise<void> {
    try {
      await this.inner?.resetKey(key);
    } catch {
      /* fail open */
    }
  }
}

export function createGlobalRateLimiter(): ReturnType<typeof rateLimit> {
  return rateLimit({
    windowMs: WINDOW_MS,
    limit: env.isProduction ? 300 : 5000,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => env.isTest,
    store: new LazyRedisStore(),
    message: {
      success: false,
      statusCode: 429,
      message: 'Too many requests, please try again later',
      errors: [],
    },
  });
}
