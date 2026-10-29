import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;
export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export function buildMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export function offsetOf(page: number, limit: number): number {
  return (page - 1) * limit;
}
