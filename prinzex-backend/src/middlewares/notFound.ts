import type { RequestHandler } from 'express';
import { ApiError } from '../utils/ApiError';

/**
 * 404 catch-all — mounted after every router. Any request reaching this
 * point matched no route, so forward a structured ApiError downstream.
 */
export const notFound: RequestHandler = (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};
