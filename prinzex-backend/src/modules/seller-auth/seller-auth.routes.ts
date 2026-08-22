import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeRoles } from '../../middlewares/authorizeRoles';
import { loginLimiter } from '../../middlewares/rateLimiter';
import { validate } from '../../middlewares/validate';
import * as sellerAuthController from './seller-auth.controller';
import {
  sellerLoginBody,
  sellerLogoutBody,
  sellerRefreshBody,
} from './seller-auth.schema';

/** Seller auth — mounted at /api/seller/auth. */
export const sellerAuthRouter = Router();

sellerAuthRouter.post('/login', loginLimiter, validate({ body: sellerLoginBody }), sellerAuthController.login);

sellerAuthRouter.post(
  '/logout',
  authenticate,
  authorizeRoles('SELLER'),
  validate({ body: sellerLogoutBody }),
  sellerAuthController.logout,
);

sellerAuthRouter.post('/refresh', validate({ body: sellerRefreshBody }), sellerAuthController.refresh);

sellerAuthRouter.get('/me', authenticate, authorizeRoles('SELLER'), sellerAuthController.me);
