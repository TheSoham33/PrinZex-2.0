/**
 * Operational error with an HTTP status code.
 *
 * Throw this anywhere in a request lifecycle; the global errorHandler
 * translates it into a consistent JSON error envelope.
 */
export class ApiError extends Error {
  statusCode: number;
  errors: unknown[];
  isOperational: boolean;

  constructor(statusCode: number, message: string, errors: unknown[] = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  // ── Convenience factories (typed, keeps call-sites terse) ──────────────
  static badRequest(message: string, errors: unknown[] = []): ApiError {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Unauthorized', errors: unknown[] = []): ApiError {
    return new ApiError(401, message, errors);
  }

  static forbidden(message = 'Forbidden', errors: unknown[] = []): ApiError {
    return new ApiError(403, message, errors);
  }

  static notFound(message = 'Not found', errors: unknown[] = []): ApiError {
    return new ApiError(404, message, errors);
  }

  static conflict(message: string, errors: unknown[] = []): ApiError {
    return new ApiError(409, message, errors);
  }

  static unprocessable(message = 'Validation failed', errors: unknown[] = []): ApiError {
    return new ApiError(422, message, errors);
  }

  static internal(message = 'Internal Server Error'): ApiError {
    return new ApiError(500, message);
  }
}
