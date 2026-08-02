import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeRoles } from '../../middlewares/authorizeRoles';
import { otpSendLimiter } from '../../middlewares/rateLimiter';
import { validate } from '../../middlewares/validate';
import { otpField, phoneField } from '../auth/auth.schema';
import * as deliveryAuthController from './delivery-auth.controller';

/** Delivery boy auth — mounted at /api/delivery/auth. OTP-only, no passwords. */

const deliveryLoginBody = z.object({ phone: phoneField });

const deliveryVerifyOtpBody = z.object({
  phone: phoneField,
  otp: otpField,
});

const deliveryRefreshBody = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const deliveryLogoutBody = z.object({
  refreshToken: z.string().min(1).optional(),
});

export const deliveryAuthRouter = Router();

// Request an OTP (rate limited per phone number).
deliveryAuthRouter.post(
  '/login',
  otpSendLimiter,
  validate({ body: deliveryLoginBody }),
  deliveryAuthController.login,
);

// Exchange phone + OTP for tokens.
deliveryAuthRouter.post(
  '/verify-otp',
  validate({ body: deliveryVerifyOtpBody }),
  deliveryAuthController.verifyOtp,
);

deliveryAuthRouter.post(
  '/logout',
  authenticate,
  authorizeRoles('DELIVERY_BOY'),
  validate({ body: deliveryLogoutBody }),
  deliveryAuthController.logout,
);

deliveryAuthRouter.post(
  '/refresh',
  validate({ body: deliveryRefreshBody }),
  deliveryAuthController.refresh,
);

deliveryAuthRouter.get('/me', authenticate, authorizeRoles('DELIVERY_BOY'), deliveryAuthController.me);
