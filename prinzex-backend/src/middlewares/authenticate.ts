import { redis, REDIS_KEYS } from '../config/redis';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { verifyAccessToken } from '../utils/jwt';

/**
 * Authentication guard.
 *
 *  1. Extract `Authorization: Bearer <token>`
 *  2. Verify the access token (signature + expiry)
 *  3. Reject tokens revoked via logout (Redis blacklist)
 *  4. Attach the decoded payload as `req.user` and the raw token as `req.token`
 *
 * Role/permission gates are separate concerns — see authorizeRoles.ts.
 */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Missing or malformed Authorization header');
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    throw ApiError.unauthorized('Missing access token');
  }

  // Throws JsonWebTokenError/TokenExpiredError -> errorHandler maps to 401.
  const payload = verifyAccessToken(token);

  // Blacklist check FAILS OPEN (same policy as cache/rate-limiter): a Redis
  // outage degrades to "revocation unavailable" instead of 500ing every
  // authenticated request in the system.
  let blacklisted: string | null = null;
  try {
    blacklisted = await redis.get(REDIS_KEYS.REFRESH_TOKEN_BLACKLIST(token));
  } catch (error) {
    logger.warn('token_blacklist_check_unavailable, allowing request', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  if (blacklisted) {
    throw ApiError.unauthorized('Token has been revoked, please log in again');
  }

  req.user = payload;
  req.token = token;
  next();
});
