import type { AuthUser, ValidatedKey } from './index.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      validated: Partial<Record<ValidatedKey, unknown>>;
    }
  }
}

export {};
