import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middlewares/authenticate';
import { validate } from '../../middlewares/validate';
import { uploadDesignMiddleware } from '../../utils/fileUpload';
import * as uploadController from './upload.controller';

/** Design file uploads — mounted at /api/upload. Signed-in users of any role. */
export const uploadRouter = Router();

const filenameParams = z.object({
  filename: z
    .string()
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/, 'Invalid filename')
    .refine((value) => !value.includes('..'), 'Invalid filename'),
});

uploadRouter.use(authenticate);

uploadRouter.post('/design', uploadDesignMiddleware, uploadController.uploadDesign);

uploadRouter.delete(
  '/design/:filename',
  validate({ params: filenameParams }),
  uploadController.deleteDesign,
);
