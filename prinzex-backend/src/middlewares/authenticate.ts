import { redis, REDIS_KEYS } from '../config/redis';
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

  const blacklisted = await redis.get(REDIS_KEYS.REFRESH_TOKEN_BLACKLIST(token));
  if (blacklisted) {
    throw ApiError.unauthorized('Token has been revoked, please log in again');
  }

  req.user = payload;
  req.token = token;
  next();
});
