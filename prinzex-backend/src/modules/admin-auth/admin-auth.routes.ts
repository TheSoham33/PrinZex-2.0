import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeRoles } from '../../middlewares/authorizeRoles';
import { loginLimiter } from '../../middlewares/rateLimiter';
import { validate } from '../../middlewares/validate';
import * as adminAuthController from './admin-auth.controller';

/** Admin auth — mounted at /api/admin/auth. */

const adminLoginBody = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const adminRefreshBody = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const adminLogoutBody = z.object({
  refreshToken: z.string().min(1).optional(),
});

export const adminAuthRouter = Router();

adminAuthRouter.post('/login', loginLimiter, validate({ body: adminLoginBody }), adminAuthController.login);

adminAuthRouter.post(
  '/logout',
  authenticate,
  authorizeRoles('ADMIN'),
  validate({ body: adminLogoutBody }),
  adminAuthController.logout,
);

adminAuthRouter.post('/refresh', validate({ body: adminRefreshBody }), adminAuthController.refresh);

adminAuthRouter.get('/me', authenticate, authorizeRoles('ADMIN'), adminAuthController.me);
