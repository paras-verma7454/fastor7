import { z } from 'zod';
import { paginationSchema } from '../../utils/pagination.js';

const searchTerm = z.string().trim().min(1).max(120);

export const listQuerySchema = paginationSchema
  .extend({
    courseInterest: searchTerm.optional(),
    q: searchTerm.optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine(
    (value) => !value.from || !value.to || value.from <= value.to,
    { message: '`from` must be earlier than or equal to `to`', path: ['from'] },
  );

export const enquiryIdSchema = z.object({
  id: z.string().uuid('Enquiry id must be a valid UUID'),
});

export type ListQuery = z.infer<typeof listQuerySchema>;
export type EnquiryIdParams = z.infer<typeof enquiryIdSchema>;
