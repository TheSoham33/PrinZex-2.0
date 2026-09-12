import type { RequestHandler } from 'express';

/**
 * Wrap every async route handler to catch rejections and forward them to
 * next() — i.e. the global errorHandler.
 *
 *   router.get('/x', asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export { asyncHandler };
