import { Redis, type RedisOptions } from 'ioredis';
import { env } from './env';
import { logger } from './logger';

/**
 * Redis access layer (ioredis).
 *
 * ────────────────────────────────────────────────────────────────────────
 * REDIS KEY DESIGN (all keys MUST come from `REDIS_KEYS` — never inline
 * string literals anywhere else in the codebase):
 *
 *   auth:
 *     blacklist:{token}                       revoked refresh tokens (lookup on refresh)
 *     otp:{identifier}:{purpose}              hashed OTP per email/phone + purpose
 *     login_attempts:{identifier}             failed login counter (brute-force guard)
 *
 *   rate limiting / sessions:
 *     rate:{ip}:{route}                       fixed-window request counter
 *
 *   cache:
 *     cache:store:{sellerId}                  public store profile + services
 *     cache:stores:{city}:{page}              paginated store list per city
 *     cache:analytics:{sellerId}:{period}     seller dashboard aggregates
 *     cache:admin:stats                       admin overview KPIs
 *
 *   real-time:
 *     location:{deliveryBoyId}                latest GPS fix (refreshed every ping)
 *     online:delivery:{city}                  SET of online delivery boy ids per city
 *
 *   pub/sub channels:
 *     order:status:{orderId}                  order status fan-out (Socket.io bridge)
 *     tracking:{deliveryId}                   live location fan-out (Socket.io bridge)
 *
 * NOTE: pub/sub needs dedicated subscriber connections (a client in
 * subscribe mode cannot run other commands). Separate pub/sub clients will
 * be created in the real-time step, reusing this file's options.
 * ────────────────────────────────────────────────────────────────────────
 */
export const REDIS_KEYS = {
  // Auth
  REFRESH_TOKEN_BLACKLIST: (token: string) => `blacklist:${token}`,
  OTP: (identifier: string, purpose: string) => `otp:${identifier}:${purpose}`,
  LOGIN_ATTEMPTS: (identifier: string) => `login_attempts:${identifier}`,

  // Sessions / rate limiting
  RATE_LIMIT: (ip: string, route: string) => `rate:${ip}:${route}`,

  // Cache
  STORE_DETAIL: (sellerId: string) => `cache:store:${sellerId}`,
  STORE_LIST: (city: string, page: number) => `cache:stores:${city}:${page}`,
  SELLER_ANALYTICS: (sellerId: string, period: string) => `cache:analytics:${sellerId}:${period}`,
  ADMIN_STATS: () => 'cache:admin:stats',

  // Real-time
  DELIVERY_LOCATION: (deliveryBoyId: string) => `location:${deliveryBoyId}`,
  ONLINE_DELIVERY_BOYS: (city: string) => `online:delivery:${city}`,

  // Pub/Sub channels
  ORDER_STATUS_CHANNEL: (orderId: string) => `order:status:${orderId}`,
  TRACKING_CHANNEL: (deliveryId: string) => `tracking:${deliveryId}`,
} as const;

/** TTLs in seconds for the keys above. */
export const REDIS_TTL = {
  OTP: 600, // 10 minutes
  CACHE_STORE: 300, // 5 minutes
  CACHE_LIST: 120, // 2 minutes
  CACHE_ANALYTICS: 1800, // 30 minutes
  CACHE_ADMIN: 60, // 1 minute
  LOGIN_ATTEMPTS: 900, // 15 minutes
  DELIVERY_LOCATION: 30, // 30 seconds (refreshed on each GPS ping)
} as const;

const redisOptions: RedisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD === '' ? undefined : env.REDIS_PASSWORD,
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  // Exponential backoff, give up after 3 attempts (returns null -> stop).
  retryStrategy: (times: number): number | null => {
    if (times > 3) {
      logger.error('Redis retry limit reached, giving up', { attempts: times });
      return null;
    }
    const delayMs = Math.min(2 ** times * 200, 2000);
    logger.warn('Redis reconnecting', { attempt: times, delayMs });
    return delayMs;
  },
  reconnectOnError: (error: Error): boolean => {
    logger.error('Redis error — attempting reconnect', { error: error.message });
    return true;
  },
};

export const redis = new Redis(redisOptions);

redis.on('connect', () => {
  logger.info('Redis socket connected', { host: env.REDIS_HOST, port: env.REDIS_PORT });
});

redis.on('ready', () => {
  logger.info('Redis ready', { engine: 'ioredis' });
});

redis.on('error', (error: Error) => {
  logger.error('Redis error', { error: error.message });
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

/**
 * Connect on app boot. With `lazyConnect: true`, `connect()` rejects once
 * the retry strategy gives up — the bootstrap then exits with a non-zero
 * code, per the fail-fast requirement.
 */
export async function connectRedis(): Promise<void> {
  await redis.connect();
  await redis.ping();
  logger.info('Redis connected', { engine: 'ioredis', host: env.REDIS_HOST, port: env.REDIS_PORT });
}

/** Graceful teardown — called on SIGINT/SIGTERM. */
export function disconnectRedis(): void {
  redis.disconnect();
  logger.info('Redis disconnected');
}
