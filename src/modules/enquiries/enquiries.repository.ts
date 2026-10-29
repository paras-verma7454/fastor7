import { and, desc, eq, gte, ilike, isNull, lte, or, sql, type SQL } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { enquiries, type Enquiry, type NewEnquiry } from '../../db/schema.js';
import {
  buildMeta,
  offsetOf,
  type PaginationMeta,
} from '../../utils/pagination.js';
import type { ListQuery } from './enquiries.schemas.js';

export type EnquiryList = { rows: Enquiry[]; meta: PaginationMeta };

type Filters = Pick<
  ListQuery,
  'page' | 'limit' | 'courseInterest' | 'q' | 'from' | 'to'
>;

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function filterConditions(filters: Filters): SQL[] {
  const conditions: SQL[] = [];

  if (filters.courseInterest) {
    conditions.push(
      ilike(enquiries.courseInterest, `%${escapeLike(filters.courseInterest)}%`),
    );
  }

  if (filters.q) {
    const pattern = `%${escapeLike(filters.q)}%`;
    const search = or(
      ilike(enquiries.name, pattern),
      ilike(enquiries.email, pattern),
    );
    if (search) conditions.push(search);
  }

  if (filters.from) conditions.push(gte(enquiries.createdAt, filters.from));
  if (filters.to) conditions.push(lte(enquiries.createdAt, filters.to));

  return conditions;
}

export async function listUnclaimed(filters: Filters): Promise<EnquiryList> {
  const where = and(isNull(enquiries.claimedBy), ...filterConditions(filters));

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(enquiries)
      .where(where)
      .orderBy(desc(enquiries.createdAt))
      .limit(filters.limit)
      .offset(offsetOf(filters.page, filters.limit)),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(enquiries)
      .where(where),
  ]);

  return { rows, meta: buildMeta(filters.page, filters.limit, total ?? 0) };
}

export async function listClaimedBy(
  employeeId: string,
  filters: Filters,
): Promise<EnquiryList> {
  const where = and(
    eq(enquiries.claimedBy, employeeId),
    ...filterConditions(filters),
  );

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(enquiries)
      .where(where)
      .orderBy(desc(enquiries.claimedAt))
      .limit(filters.limit)
      .offset(offsetOf(filters.page, filters.limit)),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(enquiries)
      .where(where),
  ]);

  return { rows, meta: buildMeta(filters.page, filters.limit, total ?? 0) };
}

/**
 * The claim. A single conditional UPDATE is atomic: the predicate and the
 * write happen under one row lock, so concurrent callers produce one winner
 * and one empty result. An empty result is "lost the race or no such row".
 */
export async function claim(
  enquiryId: string,
  employeeId: string,
): Promise<Enquiry | undefined> {
  const [claimed] = await db
    .update(enquiries)
    .set({
      claimedBy: employeeId,
      claimedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(enquiries.id, enquiryId), isNull(enquiries.claimedBy)))
    .returning();

  return claimed;
}

export async function findOwnership(
  enquiryId: string,
): Promise<{ claimedBy: string | null } | undefined> {
  const [row] = await db
    .select({ claimedBy: enquiries.claimedBy })
    .from(enquiries)
    .where(eq(enquiries.id, enquiryId))
    .limit(1);

  return row;
}

export async function createEnquiry(
  values: Omit<
    NewEnquiry,
    'id' | 'claimedBy' | 'claimedAt' | 'createdAt' | 'updatedAt'
  >,
): Promise<Enquiry> {
  const [row] = await db.insert(enquiries).values(values).returning();

  if (!row) {
    throw new Error('Insert returned no row');
  }

  return row;
}
