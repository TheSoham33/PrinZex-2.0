import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { loginLimiter, otpSendLimiter } from '../../middlewares/rateLimiter';
import { validate } from '../../middlewares/validate';
import * as authController from './auth.controller';
import {
  forgotPasswordBody,
  loginBody,
  logoutBody,
  refreshBody,
  registerBody,
  resendOtpBody,
  resetPasswordBody,
  verifyEmailBody,
} from './auth.schema';

/** Customer auth — mounted at /api/auth. */
export const customerAuthRouter = Router();

customerAuthRouter.post('/register', validate({ body: registerBody }), authController.register);

customerAuthRouter.post('/login', loginLimiter, validate({ body: loginBody }), authController.login);

customerAuthRouter.post('/logout', authenticate, validate({ body: logoutBody }), authController.logout);

customerAuthRouter.post('/refresh', validate({ body: refreshBody }), authController.refresh);

customerAuthRouter.post('/verify-email', validate({ body: verifyEmailBody }), authController.verifyEmail);

customerAuthRouter.post('/resend-otp', otpSendLimiter, validate({ body: resendOtpBody }), authController.resendOtp);

customerAuthRouter.post('/forgot-password', otpSendLimiter, validate({ body: forgotPasswordBody }), authController.forgotPassword);

customerAuthRouter.post('/reset-password', validate({ body: resetPasswordBody }), authController.resetPassword);

customerAuthRouter.get('/me', authenticate, authController.me);
