import { redis } from '../config/redis';
import { logger } from '../config/logger';

/**
 * Redis cache helpers.
 *
 * All helpers FAIL OPEN (log + behave as a cache miss / no-op) so that a
 * Redis hiccup never breaks reads, consistent with the rate limiter.
 */

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch (error) {
    logger.warn('cache_get_failed', { key, error: errorMessage(error) });
    return null;
  }
}

export async function setCache<T>(key: string, value: T, ttl: number): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
  } catch (error) {
    logger.warn('cache_set_failed', { key, error: errorMessage(error) });
  }
}

export async function invalidateCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    logger.warn('cache_invalidate_failed', { key, error: errorMessage(error) });
  }
}

/** Delete every key matching a glob pattern, discovered via SCAN. */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  } catch (error) {
    logger.warn('cache_invalidate_pattern_failed', { pattern, error: errorMessage(error) });
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
