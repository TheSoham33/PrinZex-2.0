import type { RequestHandler } from 'express';
import { ApiError } from '../utils/ApiError';
import type { AdminTokenPayload, TokenPayload } from '../utils/jwt';

/**
 * Authorization guards — mount AFTER `authenticate`.
 *
 *   router.get('/x', authenticate, authorizeRoles('SELLER'), handler)
 *   router.post('/y', authenticate, requirePermission('payouts.manage'), handler)
 */

export const authorizeRoles = (...roles: Array<TokenPayload['role']>): RequestHandler => {
  return (req, _res, next) => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(ApiError.forbidden(`Access denied — requires role: ${roles.join(', ')}`));
      return;
    }
    next();
  };
};

/** Admin-only: asserts a granular permission from the JWT permissions map. */
export const requirePermission = (permission: string): RequestHandler => {
  return (req, _res, next) => {
    if (!req.user) {
      next(ApiError.unauthorized());
      return;
    }
    if (req.user.role !== 'ADMIN') {
      next(ApiError.forbidden('Admin access required'));
      return;
    }
    const permissions = (req.user as AdminTokenPayload).permissions;
    if (!permissions[permission]) {
      next(ApiError.forbidden(`Missing permission: ${permission}`));
      return;
    }
    next();
  };
};
