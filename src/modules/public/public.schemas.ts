import { z } from 'zod';

export const createEnquirySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z
    .string()
    .trim()
    .min(3)
    .max(254)
    .email('Must be a valid email address')
    .transform((value) => value.toLowerCase()),
  phone: z
    .string()
    .trim()
    .min(6)
    .max(20)
    .regex(/^[+0-9()\-\s]+$/, 'Phone may only contain digits, spaces and +-()')
    .optional(),
  courseInterest: z.string().trim().min(2).max(120),
  message: z.string().trim().max(2000).optional(),
});

export type CreateEnquiryInput = z.infer<typeof createEnquirySchema>;
