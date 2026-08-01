import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';
import type { ApiErrorBody } from '../types';

/**
 * Global error handler — must be the LAST middleware mounted.
 *
 * Maps every known error family onto the shared error envelope:
 *   { success: false, statusCode, message, errors }
 *
 * Stack traces are only exposed outside production.
 */
export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, _next) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors: unknown[] = [];

  if (err instanceof ApiError) {
    // Operational errors thrown by our own code
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Prisma engine errors keyed by stable error codes
    switch (err.code) {
      case 'P2002': {
        statusCode = 409;
        message = 'A record with this value already exists';
        const target = (err.meta?.target as string[] | undefined) ?? [];
        errors = target.map((field) => ({ field, message: `${field} must be unique` }));
        break;
      }
      case 'P2025': {
        statusCode = 404;
        message = 'Record not found';
        break;
      }
      case 'P2003': {
        statusCode = 409;
        message = 'Operation violates a foreign key constraint';
        errors = [{ field: err.meta?.field_name ?? null }];
        break;
      }
      default: {
        statusCode = 400;
        message = `Database request failed (${err.code})`;
      }
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Invalid database query payload';
  } else if (err instanceof ZodError) {
    // Schema validation failures -> field-level details
    statusCode = 422;
    message = 'Validation failed';
    errors = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      code: issue.code,
      message: issue.message,
    }));
  } else if (err instanceof TokenExpiredError) {
    statusCode = 401;
    message = 'Token expired';
  } else if (err instanceof JsonWebTokenError) {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err instanceof SyntaxError && 'body' in err) {
    // Malformed JSON body from express.json()
    statusCode = 400;
    message = 'Malformed JSON in request body';
  } else if (err instanceof Error) {
    message = err.message || message;
  }

  // 5xx errors are defects/infra issues -> full error log; 4xx -> concise warn.
  if (statusCode >= 500) {
    logger.error('unhandled_error', {
      method: req.method,
      url: req.originalUrl,
      statusCode,
      error: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : String(err),
    });
    // Never leak internals of unexpected errors to clients.
    if (!(err instanceof ApiError)) {
      message = 'Internal Server Error';
      errors = [];
    }
  } else {
    logger.warn('request_error', {
      method: req.method,
      url: req.originalUrl,
      statusCode,
      message,
    });
  }

  const body: ApiErrorBody = { success: false, statusCode, message, errors };
  if (!env.isProduction && err instanceof Error) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
};
