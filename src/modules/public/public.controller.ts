import type { RequestHandler } from 'express';
import { validated } from '../../middleware/validate.js';
import { createEnquiry } from '../enquiries/enquiries.repository.js';
import type { CreateEnquiryInput } from './public.schemas.js';

export const submitEnquiry: RequestHandler = async (req, res) => {
  const input = validated<CreateEnquiryInput>(req, 'body');

  // source is set here, never taken from the body.
  const enquiry = await createEnquiry({
    name: input.name,
    email: input.email,
    phone: input.phone ?? null,
    courseInterest: input.courseInterest,
    message: input.message ?? null,
    source: 'web_form',
  });

  res.status(201).json({
    data: {
      id: enquiry.id,
      reference: enquiry.id.slice(0, 8).toUpperCase(),
      createdAt: enquiry.createdAt.toISOString(),
    },
  });
};
