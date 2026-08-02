import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import { uploadSellerDocumentsMiddleware } from '../../utils/fileUpload';
import * as registrationController from './seller-registration.controller';
import { registerSellerBody } from './seller-registration.schema';

/**
 * Seller onboarding wizard — mounted at /api/seller/register (BEFORE the
 * /api/seller router, which would otherwise gate these with requireSELLER).
 *
 * There is no seller token yet: the applicant presents their CUSTOMER JWT.
 * /documents and /status accept either a CUSTOMER or a SELLER token so the
 * flow works both immediately after applying and after re-login. (A PENDING
 * seller cannot obtain a seller JWT — the login route 403s PENDING accounts.)
 */
export const sellerRegistrationRouter = Router();

sellerRegistrationRouter.use(authenticate);

sellerRegistrationRouter.post(
  '/',
  validate({ body: registerSellerBody }),
  registrationController.register,
);

sellerRegistrationRouter.post(
  '/documents',
  uploadSellerDocumentsMiddleware,
  registrationController.uploadDocuments,
);

sellerRegistrationRouter.get('/status', registrationController.getStatus);
