import rateLimit from 'express-rate-limit';
import { env, isTest } from '../config/env.js';

/**
 * Only the unauthenticated intake is rate limited. The default memory store is
 * per-process, so a multi-instance deployment needs a shared store.
 */
export const publicFormLimiter = rateLimit({
  windowMs: env.PUBLIC_FORM_RATE_WINDOW_MS,
  limit: env.PUBLIC_FORM_RATE_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => isTest,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many submissions. Please try again later.',
      },
    });
  },
});
