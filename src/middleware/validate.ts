import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import type { ValidatedKey } from '../types/index.js';
import { AppError } from '../utils/errors.js';

type ValidationSchemas = Partial<Record<ValidatedKey, ZodTypeAny>>;

export function validated<T>(req: Request, key: ValidatedKey): T {
  return req.validated[key] as T;
}

// Parsed values go to req.validated: req.query and req.params are getters in
// Express 5 and cannot be reassigned.
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.validated ??= {};

    const issues: { path: string; message: string }[] = [];

    for (const key of ['params', 'query', 'body'] as const) {
      const schema = schemas[key];
      if (!schema) continue;

      const result = schema.safeParse(req[key]);
      if (result.success) {
        req.validated[key] = result.data;
        continue;
      }

      for (const issue of result.error.issues) {
        issues.push({
          path: [key, ...issue.path.map(String)].join('.'),
          message: issue.message,
        });
      }
    }

    if (issues.length > 0) {
      next(AppError.badRequest('Request validation failed', issues));
      return;
    }

    next();
  };
}
