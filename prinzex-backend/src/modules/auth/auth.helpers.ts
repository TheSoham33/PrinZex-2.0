import { redis, REDIS_KEYS, REDIS_TTL } from '../../config/redis';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import {
  issueTokenPair,
  secondsUntilTokenExpiry,
  verifyRefreshToken,
  type TokenPayload,
} from '../../utils/jwt';

/**
 * Shared auth plumbing reused by every actor module:
 *  - refresh-token persistence & rotation (User-actor table)
 *  - access-token blacklisting (logout)
 *  - failed-login attempt tracking with a 15-minute lockout
 */

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const DURATION_UNITS: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };

/** Parse "15m" / "7d" style durations to milliseconds. */
export function durationToMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) {
    throw new Error(`Unsupported duration format: ${value}`);
  }
  return Number(match[1]) * DURATION_UNITS[match[2]] * 1000;
}

/** Sign a token pair and persist the refresh token against the user. */
export async function issueAndPersistTokens(userId: string, payload: TokenPayload): Promise<TokenPair> {
  const pair = issueTokenPair(payload);
  await prisma.refreshToken.create({
    data: {
      userId,
      token: pair.refreshToken,
      expiresAt: new Date(Date.now() + durationToMs(env.JWT_REFRESH_EXPIRES_IN)),
    },
  });
  return pair;
}

/**
 * Rotation: verify the presented refresh token (signature + DB row), revoke
 * the old row, then issue and persist a fresh pair.
 */
export async function rotateUserRefreshToken(
  presentedToken: string,
  expectedRole: TokenPayload['role'],
  buildPayload: (existing: TokenPayload) => TokenPayload,
): Promise<TokenPair> {
  // Throws JWT errors -> 401 via the global errorHandler.
  const payload = verifyRefreshToken(presentedToken);
  if (payload.role !== expectedRole) {
    throw ApiError.unauthorized('Invalid token type for this endpoint');
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token: presentedToken } });
  if (!stored || stored.isRevoked || stored.expiresAt.getTime() <= Date.now()) {
    throw ApiError.unauthorized('Refresh token is no longer valid, please log in again');
  }
  if (!('userId' in payload) || stored.userId !== payload.userId) {
    throw ApiError.unauthorized('Refresh token does not match its owner');
  }

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { isRevoked: true } });
  return issueAndPersistTokens(stored.userId, buildPayload(payload));
}

/** Revoke a specific refresh token (best-effort, idempotent). */
export async function revokeUserRefreshToken(userId: string, presentedToken: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token: presentedToken, userId, isRevoked: false },
    data: { isRevoked: true },
  });
}

/** Revoke every live refresh token for a user (e.g. after password reset). */
export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data: { isRevoked: true },
  });
}

/** Blacklist an access token until its natural expiry (used on logout). */
export async function blacklistAccessToken(accessToken: string): Promise<void> {
  const ttl = secondsUntilTokenExpiry(accessToken, durationToMs(env.JWT_ACCESS_EXPIRES_IN) / 1000);
  await redis.set(REDIS_KEYS.REFRESH_TOKEN_BLACKLIST(accessToken), '1', 'EX', ttl);
}

// ── Failed-login tracking ──────────────────────────────────────────────────

export const MAX_LOGIN_ATTEMPTS = 5;

export async function assertNotLockedOut(key: string): Promise<void> {
  const attempts = Number((await redis.get(key)) ?? '0');
  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    const ttl = Math.max(await redis.ttl(key), 1);
    throw new ApiError(
      429,
      `Too many failed login attempts — locked for ${Math.ceil(ttl / 60)} more minute(s)`,
    );
  }
}

export async function bumpLoginAttempts(key: string): Promise<void> {
  await redis.multi().incr(key).expire(key, REDIS_TTL.LOGIN_ATTEMPTS, 'NX').exec();
}

export async function clearLoginAttempts(key: string): Promise<void> {
  await redis.del(key);
}
