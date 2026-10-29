/**
 * Drizzle wraps driver failures, so the Postgres code sits somewhere down the
 * `cause` chain.
 */
export type PgError = {
  code: string;
  constraint?: string;
  detail?: string;
  table?: string;
};

const PG_CODE = /^[0-9A-Z]{5}$/;

export function findPgError(error: unknown): PgError | undefined {
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (current !== null && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    const candidate = current as PgError & { cause?: unknown };

    if (typeof candidate.code === 'string' && PG_CODE.test(candidate.code)) {
      return candidate;
    }

    current = candidate.cause;
  }

  return undefined;
}
