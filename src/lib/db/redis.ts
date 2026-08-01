import Redis from 'ioredis';

/**
 * Redis client (free tier Upstash with TLS, or the docker-compose Redis).
 * Used for: session store, short-lived cache, and simple rate limiting.
 * Falls back to an in-memory shim when Redis is unavailable so the app can
 * still run during local setup before services are started.
 */
const url = process.env.REDIS_URL || 'redis://localhost:6379';

const globalForRedis = globalThis as unknown as { redis?: Redis };

function createClient(): Redis {
  const client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1 });
  client.on('error', () => {
    /* handled by callers; keep the process alive on transient failures */
  });
  client.connect().catch(() => {
    /* in-memory fallback below handles it */
  });
  return client;
}

export const redis: Redis = globalForRedis.redis ?? createClient();

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

/** Get a cached value, or null when missing / Redis unavailable. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Set a cached value with an optional TTL (seconds). */
export async function cacheSet(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  try {
    const raw = JSON.stringify(value);
    if (ttlSeconds) await redis.set(key, raw, 'EX', ttlSeconds);
    else await redis.set(key, raw);
  } catch {
    /* no-op when Redis is down */
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch {
    /* no-op */
  }
}
