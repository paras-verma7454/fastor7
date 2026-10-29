# CRM Enquiry Pool API

REST API for a CRM where counselors work a shared pool of student enquiries and
claim the ones they want to own.

Ownership is one nullable column: `enquiries.claimed_by`. `NULL` means the
enquiry is public and every counselor can see it. A UUID means it belongs to
that counselor and is invisible to everyone else.

```
prospect ──POST /api/public/enquiries──▶  public pool (claimed_by IS NULL)
                                             │
                                  POST /api/enquiries/:id/claim
                                             ▼
                              private to one counselor (GET /claimed)
```

## Stack

- Node 20+ and TypeScript, Express 5
- PostgreSQL 16 in Docker (database only; the API runs on the host)
- Drizzle ORM with committed SQL migrations
- JWT access tokens (HS256, 1 day) and bcrypt password hashes
- Zod for request validation

## Running it

Requires Node 20+ and a running Docker daemon.

```bash
docker compose up -d db
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

The API listens on `http://localhost:3000`. The seed creates two counselors,
`paras@fastor7.com` and `ananya@fastor7.com`, both with password `Password123`,
plus six unclaimed enquiries.

Other scripts: `npm run typecheck`, `npm run build` then `npm start`,
`npm run db:studio`. To start over, run `docker compose down -v` and repeat the
steps above.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | no | liveness and database check |
| POST | `/api/auth/register` | no | create an employee account |
| POST | `/api/auth/login` | no | get a JWT |
| GET | `/api/auth/me` | yes | current employee |
| POST | `/api/public/enquiries` | no | enquiry form intake |
| GET | `/api/enquiries/unclaimed` | yes | the public pool |
| GET | `/api/enquiries/claimed` | yes | leads owned by the caller |
| POST | `/api/enquiries/:id/claim` | yes | claim a lead |

Authenticated routes expect `Authorization: Bearer <token>`.

Success responses are `{ "data": ... }`, lists also include `meta`
(`page`, `limit`, `total`, `totalPages`). Errors are always:

```json
{ "error": { "code": "ALREADY_CLAIMED", "message": "...", "details": { "claimedByMe": false } } }
```

### Public form

`POST /api/public/enquiries` takes `name`, `email`, `courseInterest`, and
optional `phone` and `message`. It returns only a reference:

```json
{ "data": { "id": "3b94…", "reference": "3B940D0D", "createdAt": "2026-10-29T09:12:44.101Z" } }
```

`source` is assigned by the server, so a caller cannot forge a counselor lead.
The endpoint is limited to 10 submissions per IP per 10 minutes.

### List filters

`/unclaimed` and `/claimed` accept `page` (default 1), `limit` (default 20, max
100), `courseInterest` (partial match), `q` (searches name and email), and
`from` / `to` (ISO dates on `created_at`). `/claimed` is ordered by claim time.

### Claim

`POST /api/enquiries/:id/claim` returns `200` with the enquiry, `404` if it does
not exist, `400` if the id is not a UUID, or:

```json
409 { "error": { "code": "ALREADY_CLAIMED", "details": { "claimedByMe": true } } }
```

### curl walkthrough

```bash
BASE=http://localhost:3000

TOKEN=$(curl -s -X POST $BASE/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"paras@fastor7.com","password":"Password123"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.token')

curl -s $BASE/api/enquiries/unclaimed -H "authorization: Bearer $TOKEN"

LEAD=$(curl -s -X POST $BASE/api/public/enquiries \
  -H 'content-type: application/json' \
  -d '{"name":"Riya Sharma","email":"riya@example.com","courseInterest":"Data Science & AI"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.id')

curl -s -X POST $BASE/api/enquiries/$LEAD/claim -H "authorization: Bearer $TOKEN"
curl -s $BASE/api/enquiries/claimed -H "authorization: Bearer $TOKEN"
```

## Design notes

**Claiming is one atomic statement.** It is not a read followed by a write,
because that leaves a window where two counselors both see `claimed_by = NULL`
and both claim the lead. The query is:

```sql
UPDATE enquiries
   SET claimed_by = $1, claimed_at = now(), updated_at = now()
 WHERE id = $2 AND claimed_by IS NULL
RETURNING *;
```

Postgres evaluates the predicate and writes the row under a single row lock, so
two concurrent callers get one row and one empty result. An empty result means
either the lead does not exist or somebody else won; a second lookup, only on
that path, decides between `404` and `409`.

**There is no `is_public` column.** `claimed_by IS NULL` already answers the
question, and a second flag could disagree with it. A check constraint keeps
`claimed_by` and `claimed_at` in sync.

**Visibility is enforced in SQL.** `/unclaimed` filters on `claimed_by IS NULL`
and `/claimed` filters on the authenticated employee id, so there is no code
path that loads every enquiry and hides rows afterwards. Partial indexes on
those two conditions keep both listings cheap as claimed history grows.

**JWTs are stateless.** No database lookup to authenticate. The trade off is
that a stolen token stays valid until it expires, which is acceptable for this
scope; production would add refresh tokens and revocation.

**The public form is the only unauthenticated write**, so it is the only route
with a rate limit, a server assigned `source`, and a response that returns
nothing about the lead.

## Verification

No automated suite is included. The API was exercised manually with curl,
including simultaneous claim requests against a single lead to confirm that
exactly one counselor wins.

## Layout

```
src/
  app.ts              express wiring, /health, routers, error handler
  index.ts            migrations on boot, listen, graceful shutdown
  config/env.ts       validated environment
  db/                 schema, pool, migrator, seed
  middleware/         auth, validate, error, rate limit
  modules/
    auth/             schemas, service, controller, routes
    enquiries/        schemas, repository, serializer, controller, routes
    public/           unauthenticated intake
  types/              request augmentation
  utils/              errors, jwt, pagination, postgres error unwrapping
```

## Assumptions and possible next steps

- Single company and a single pool. Multi tenancy would add a tenant id to both
  tables and to every query.
- Any authenticated employee can claim. An admin read only role would be a
  `role` column plus a guard.
- Releasing a lead, counselor notes, and a claim audit trail are the obvious
  next features. Releasing is a matter of setting both claim columns back to
  `NULL`.
- The rate limiter uses an in memory store, so it is per process. More than one
  API instance needs a shared store such as Redis.
- `RUN_MIGRATIONS_ON_BOOT` is convenient locally. A real deployment should run
  migrations separately and switch it off.
