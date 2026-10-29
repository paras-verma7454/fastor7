import { Router } from 'express';
import { publicFormLimiter } from '../../middleware/rateLimit.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './public.controller.js';
import { createEnquirySchema } from './public.schemas.js';

export const publicRouter = Router();

// Intentionally unauthenticated: this is the form shared with prospects.
publicRouter.post(
  '/enquiries',
  publicFormLimiter,
  validate({ body: createEnquirySchema }),
  controller.submitEnquiry,
);
