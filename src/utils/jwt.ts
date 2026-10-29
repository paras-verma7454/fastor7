import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

export type AccessTokenPayload = {
  sub: string;
  email: string;
};

const ISSUER = 'crm-api';
const AUDIENCE = 'crm-web';

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    issuer: ISSUER,
    audience: AUDIENCE,
  });

  if (
    typeof decoded === 'string' ||
    typeof decoded.sub !== 'string' ||
    typeof (decoded as { email?: unknown }).email !== 'string'
  ) {
    throw new jwt.JsonWebTokenError('Malformed token payload');
  }

  return { sub: decoded.sub, email: (decoded as { email: string }).email };
}
