# PrinZex Backend

Multi-vendor printing marketplace API — Node.js 20 + Express + TypeScript (strict), with three datastores:

| Store        | Purpose                                                                 |
| ------------ | ----------------------------------------------------------------------- |
| PostgreSQL   | Structured relational data (users, sellers, orders, payouts, reviews…) via **Prisma** |
| MongoDB      | Document-heavy / high-write data (order timelines, live tracking, notifications, activity logs, CMS) via **Mongoose** |
| Redis        | Cache, rate limiting, OTP/blacklist, live location, pub/sub via **ioredis** |

## Quick start

```bash
cp .env.example .env          # then fill in secrets
docker compose up -d          # PostgreSQL + MongoDB + Redis
npm install
npm run db:migrate            # apply Prisma migrations
npm run db:seed               # seed PostgreSQL
npm run db:seed:mongo         # seed MongoDB (references PG rows — run after db:seed)
npm run dev                   # http://localhost:5000 (GET /health for liveness)
```

`docker compose up -d` uses the credentials already present in `.env.example`
(`postgres:password@localhost:5432/prinzex`, `mongodb://localhost:27017/prinzex`, `localhost:6379`),
so a fresh clone boots without editing anything.

### Seed credentials

| Actor          | Email                | Password      |
| -------------- | -------------------- | ------------- |
| Super admin    | `admin@prinzex.com`  | `Admin@123`   |
| Customers (×5) | `*.@example.com`     | `Customer@123`|
| Sellers (×4)   | `sellerN@prinzex.com`| `Seller@123`  |
| Delivery (×3)  | `*.@example.com`     | `Delivery@123`|

## Auth (Step 2)

Four actor routers, one shared JWT layer (access 15m + refresh 7d, rotation on
every refresh call, Redis blacklist on logout):

| Router               | Flow                                                        |
| -------------------- | ----------------------------------------------------------- |
| `/api/auth`          | Customer — register/login (+wallet in one transaction), logout, refresh, verify-email, resend-otp, forgot/reset-password, `me` |
| `/api/seller/auth`   | Seller — email+password login with status gates (PENDING/SUSPENDED/REJECTED → 403), logout, refresh, `me` |
| `/api/delivery/auth` | Delivery boy — **OTP-only** (`login` sends OTP, `verify-otp` issues tokens), logout, refresh, `me` |
| `/api/admin/auth`    | Admin — email+password login, JWT carries `permissions` map built from `ADMIN_PERMISSIONS` per role, logout, refresh, `me` |

Guards: `authenticate` (Bearer verify + Redis blacklist check) →
`authorizeRoles(...)` / `requirePermission('payouts.manage')`.
Rate limits: login 5/15min per IP (locks the account attempts counter too),
OTP send 3/10min per identifier, general 100/min per IP. OTPs are delivered via
the email/SMS stubs (visible in dev logs; delivery login also returns `devOtp`
outside production so the flow is end-to-end testable).

### Quick smoke (after `npm run dev` + seeds)

```bash
# customer login (seeded: aarav.sharma@example.com / Customer@123)
curl -s localhost:5000/api/auth/login -H 'content-type: application/json' \
  -d '{"identifier":"aarav.sharma@example.com","password":"Customer@123"}'

# pending seller is rejected with a message
curl -s localhost:5000/api/seller/auth/login -H 'content-type: application/json' \
  -d '{"email":"seller4@prinzex.com","password":"Seller@123"}'

# admin (permissions in payload), rate limit trips on the 6th attempt within 15 min
for i in 1 2 3 4 5 6; do curl -s -o /dev/null -w "%{http_code} " localhost:5000/api/admin/auth/login \
  -H 'content-type: application/json' -d '{"email":"admin@prinzex.com","password":"wrong"}'; done

# delivery OTP login (OTP appears in server logs / devOtp field)
curl -s localhost:5000/api/delivery/auth/login -H 'content-type: application/json' \
  -d '{"phone":"+919700000001"}'
```

## Scripts

| Command                    | What it does                                         |
| -------------------------- | ---------------------------------------------------- |
| `npm run dev`              | nodemon + tsx, hot reload                            |
| `npm run build` / `start`  | compile to `dist/` and run                           |
| `npm run db:migrate`       | `prisma migrate dev`                                 |
| `npm run db:generate`      | regenerate the Prisma client                         |
| `npm run db:seed`          | wipe + seed PostgreSQL                               |
| `npm run db:seed:mongo`    | wipe + seed MongoDB (run after `db:seed`)            |
| `npm run db:reset`         | full reset: migrate reset + both seeds               |
| `npm run lint`             | ESLint over `src/`                                   |
| `npm run typecheck`        | `tsc --noEmit` over the whole project (incl. seeds)  |
| `npm test`                 | Jest (ts-jest) — harness only, tests come in later steps |

## Layout

```
prisma/            schema.prisma, migrations/, seed.ts
src/
  config/          env (envalid), database (Prisma), mongo (Mongoose), redis (ioredis), logger (Winston)
  models/mongo/    OrderTimeline, Tracking, Notification, ActivityLog, Content
  middlewares/     requestLogger, notFound, errorHandler
  utils/           ApiError, ApiResponse, asyncHandler
  types/           shared domain types (status unions, snapshots, envelopes)
  app.ts           Express app factory (helmet → cors → json → logger → rate limit → routes → 404 → errors)
  server.ts        entrypoint: connect all 3 DBs, then listen (fail-fast on any DB error)
mongo-seed/        MongoDB seed
```

## Notes

- **Prisma version**: pinned to `^5.22` — the schema uses the classic `prisma-client-js`
  generator with `url = env("DATABASE_URL")` in the datasource block (both removed in
  Prisma 7). This keeps the layout exactly as specified for this project.
- **Initial migration**: `prisma/migrations/20260801000000_init/migration.sql` mirrors
  `schema.prisma` 1:1 (27 tables / 12 enums / 26 FKs / 79 indexes). On a machine with
  Docker and network access, `npm run db:migrate` (`prisma migrate dev`) applies it and
  runs the seed automatically. If you ever prefer engine-generated output instead, delete
  `prisma/migrations/` and run `npx prisma migrate dev --name init`.
- `src/server.ts` connects PostgreSQL → MongoDB → Redis and exits non-zero if any
  connection fails, before the HTTP listener starts.

## Conventions

- **Redis keys** come only from `REDIS_KEYS` / `REDIS_TTL` in `src/config/redis.ts` — never inline strings.
- **Errors**: throw `ApiError`; Zod failures, Prisma P2002/P2025 and JWT errors are normalised by the global `errorHandler`.
- **Env**: everything is validated at boot via envalid in `src/config/env.ts`; the process refuses to start when a required variable is missing.
- Route handlers/controllers, JWT auth, uploads, Razorpay and Socket.io land in subsequent steps (see `app.ts` step-6 placeholder).
