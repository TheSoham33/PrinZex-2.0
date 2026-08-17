import type { RequestHandler } from 'express';
import { logger } from '../config/logger';

/**
 * Logs one structured line per completed HTTP request (method, url, status,
 * duration, ip, user-agent). Runs before routes; emits on response finish.
 */
export const requestLogger: RequestHandler = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info('http_request', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      ip: req.ip,
      userAgent: req.get('user-agent') ?? '',
    });
  });

  next();
};
