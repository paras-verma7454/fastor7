import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthUser } from '../types/index.js';
import { AppError } from '../utils/errors.js';
import { verifyAccessToken } from '../utils/jwt.js';

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.header('authorization');

  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    throw AppError.unauthorized(
      'TOKEN_MISSING',
      'Authorization header with a bearer token is required',
    );
  }

  const token = header.slice(7).trim();
  if (!token) {
    throw AppError.unauthorized('TOKEN_MISSING', 'Bearer token is empty');
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized('TOKEN_EXPIRED', 'Access token has expired');
    }
    throw AppError.unauthorized('TOKEN_INVALID', 'Access token is invalid');
  }
}

export function currentUser(req: Request): AuthUser {
  if (!req.user) {
    throw AppError.unauthorized('TOKEN_MISSING', 'Authentication required');
  }
  return req.user;
}
