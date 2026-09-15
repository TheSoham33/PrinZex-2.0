import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorizeRoles } from '../../middlewares/authorizeRoles';
import { validate } from '../../middlewares/validate';
import { deleteDeviceBody, registerDeviceBody } from './devices.schema';
import * as devicesController from './devices.controller';

/**
 * Device push-token registry (gap #10) — one router per actor lane, all
 * mounted under /api/devices so the frontend always POSTs to the same URL
 * regardless of who is signed in (the lane is implied by the JWT).
 */
export const devicesRouter = Router();

devicesRouter.use(authenticate, authorizeRoles('CUSTOMER', 'SELLER', 'DELIVERY_BOY'));

devicesRouter.post('/', validate({ body: registerDeviceBody }), devicesController.registerToken);
devicesRouter.get('/', devicesController.listTokens);
devicesRouter.delete('/', validate({ body: deleteDeviceBody }), devicesController.deleteToken);
