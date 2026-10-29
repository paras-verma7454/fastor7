import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './enquiries.controller.js';
import { enquiryIdSchema, listQuerySchema } from './enquiries.schemas.js';

export const enquiriesRouter = Router();

enquiriesRouter.use(requireAuth);

enquiriesRouter.get(
  '/unclaimed',
  validate({ query: listQuerySchema }),
  controller.unclaimed,
);

enquiriesRouter.get(
  '/claimed',
  validate({ query: listQuerySchema }),
  controller.claimed,
);

enquiriesRouter.post(
  '/:id/claim',
  validate({ params: enquiryIdSchema }),
  controller.claimOne,
);
