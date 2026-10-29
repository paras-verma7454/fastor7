import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * `claimed_by IS NULL` is the one definition of a public enquiry. There is no
 * separate is_public flag that could drift out of sync with ownership.
 */
export const enquiries = pgTable(
  'enquiries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    courseInterest: text('course_interest').notNull(),
    message: text('message'),
    source: text('source').notNull().default('web_form'),
    claimedBy: uuid('claimed_by').references(() => employees.id, {
      onDelete: 'set null',
    }),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Partial so the index stays small as claimed history grows.
    index('enquiries_unclaimed_idx')
      .on(table.createdAt.desc())
      .where(sql`claimed_by is null`),
    index('enquiries_claimed_by_idx')
      .on(table.claimedBy, table.claimedAt.desc())
      .where(sql`claimed_by is not null`),
    check(
      'enquiries_claim_pair_chk',
      sql`(claimed_by is null) = (claimed_at is null)`,
    ),
    check('enquiries_source_chk', sql`source in ('web_form', 'counselor')`),
  ],
);

export type Employee = typeof employees.$inferSelect;
export type Enquiry = typeof enquiries.$inferSelect;
export type NewEnquiry = typeof enquiries.$inferInsert;
