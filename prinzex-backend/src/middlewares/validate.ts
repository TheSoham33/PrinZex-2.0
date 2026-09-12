import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';

/**
 * Zod request validation middleware factory.
 *
 * Parses (and sanitizes) request parts; ZodError bubbles to the global
 * errorHandler which renders 422 with field-level details.
 *
 *   router.post('/login', validate({ body: loginBodySchema }), controller.login);
 */
export interface ValidationSchemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

export const validate = (schemas: ValidationSchemas): RequestHandler => {
  return (req, _res, next) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params;
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as typeof req.query;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};
