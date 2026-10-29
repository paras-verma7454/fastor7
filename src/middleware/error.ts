import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors.js';
import { findPgError } from '../utils/pg.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(
    new AppError(
      404,
      'ROUTE_NOT_FOUND',
      `No route matches ${req.method} ${req.originalUrl}`,
    ),
  );
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    });
    return;
  }

  if (
    error instanceof SyntaxError &&
    'body' in (error as unknown as Record<string, unknown>)
  ) {
    res.status(400).json({
      error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' },
    });
    return;
  }

  const pgError = findPgError(error);
  if (pgError?.code === '23505') {
    res.status(409).json({
      error: { code: 'DUPLICATE_RESOURCE', message: 'Resource already exists' },
    });
    return;
  }

  console.error('[error] unhandled', error);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
  });
}
