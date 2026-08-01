# PrinZex — Local Print Shop Marketplace

A full-stack Next.js marketplace for local print shops. Customers browse shops,
upload print jobs, place orders and track delivery; sellers manage their shop,
orders, inventory and payouts; admins run the platform.

This is no longer a demo — every screen reads and writes through a real backend
(Next.js Route Handlers) backed by three databases: **PostgreSQL** (relational
core), **Redis** (sessions & cache) and **MongoDB** (notifications & content).

---

## Tech stack

| Layer     | Tech |
|-----------|------|
| Frontend  | Next.js 15 (App Router), React 19, Tailwind, Redux Toolkit, TanStack Query |
| Backend   | Next.js API Route Handlers (`src/app/api/**/route.ts`) |
| Postgres  | [`pg`](https://node-postgres.com/) pool — customers, sellers, orders, wallet, reviews, payouts |
| Redis     | [`ioredis`](https://www.npmjs.com/package/ioredis) — JWT sessions, short-lived cache |
| MongoDB   | [`mongodb`](https://www.npmjs.com/package/mongodb) driver — notifications, content |
| Auth      | bcrypt password hashing + JWT sessions stored in Redis |

No mock/demo data remains. Data flows: UI → `src/lib/api/*` (typed fetchers) →
`src/app/api/*` (route handlers) → Postgres / Mongo / Redis.

---

## Quick start (local, all three databases via Docker)

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start the databases** (Postgres + Redis + MongoDB)

   ```bash
   npm run db:up      # = docker compose up -d
   ```

3. **Point env at the local databases**

   ```bash
   cp .env.example .env.local
   ```

   The defaults already match the docker-compose services, so no edits are
   needed for local development.

4. **Create the schema + an initial admin**

   ```bash
   ADMIN_EMAIL=admin@prinzex.in ADMIN_PASSWORD='a-strong-password' npm run db:setup
   ```

5. **Run the app**

   ```bash
   npm run dev
   ```

   Visit http://localhost:3000. Sign up a customer at `/signup`, log in, and
   (once you register a store) use `/admin/login` with the admin you created.

---

## Going to free-tier cloud databases

Each database has a generous free tier. Once you create an account, paste the
connection string into `.env.local` (see `.env.example` for format).

| Database   | Free-tier provider   | Key env var            |
|------------|----------------------|------------------------|
| PostgreSQL | Neon or Supabase     | `DATABASE_URL`         |
| Redis      | Upstash              | `REDIS_URL`            |
| MongoDB    | Atlas (M0 cluster)   | `MONGODB_URI` / `MONGODB_DB` |

Then re-run `npm run db:setup` against the cloud database to create the schema
and admin. `JWT_SECRET` should be a long random value
(`openssl rand -base64 32`).

---

## Project structure

```
src/
  app/
    api/                 # Backend route handlers (auth, stores, orders,
                         # wallet, seller/*, admin/*)
    (auth)/ ...          # Customer auth pages
    dashboard/ ...       # Customer dashboard
    seller/ ...          # Seller onboarding + dashboard
    admin/ ...           # Admin console
    stores/ ...          # Store browsing + ordering
  components/            # UI components
  lib/
    api/                 # Typed client-side fetchers -> /api routes
    api-client.ts        # fetch wrapper (Bearer token, { data } envelope)
    api-helpers.ts       # auth guards + response helpers
    auth.ts              # bcrypt + JWT + Redis sessions
    db/
      postgres.ts        # pg pool
      redis.ts           # ioredis + cache helpers
      mongodb.ts         # Mongo client + collection helper
    mappers.ts           # DB rows -> UI-facing types
    server/store-queries.ts  # server-side store lookup
    types/               # Domain types + UI config constants (no demo data)
  store/                 # Redux (auth/seller/admin sessions)
db/
  schema.sql             # PostgreSQL schema (idempotent)
scripts/
  setup-db.mjs           # Apply schema + create initial admin
docker-compose.yml       # Local Postgres, Redis, MongoDB
```

---

## Database roles

- **PostgreSQL** — source of truth for relational data: users, sellers,
  services, orders, order items, addresses, wallet & transactions, reviews,
  inventory, payouts, categories.
- **Redis** — session store for JWTs, plus short-lived caching of store lists
  (gracefully no-ops when Redis is down so local dev never hard-fails).
- **MongoDB** — reserved for semi-structured content (notifications, banners,
  FAQ/content, support ticket threads). Collections are lazily created.

---

## API overview

All route handlers are under `src/app/api/`:

| Area | Routes |
|------|--------|
| Auth | `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/me` · `POST /api/auth/logout` |
| Customer | `GET/POST /api/addresses` · `GET/POST /api/orders` · `GET /api/orders/[id]` · `GET /api/wallet` · `GET /api/wallet/transactions` |
| Stores | `GET /api/stores` · `GET /api/stores/[id]` |
| Seller | `GET /api/seller/orders` · `/orders/[id]` · `/inventory` · `/payouts` · `/pricing` · `/reviews` · `/team` · `/analytics` |
| Admin | `GET /api/admin/analytics` · `/orders` · `/orders/[id]` · `/sellers` · `/sellers/[id]` · `/users` · `/users/[id]` · `/delivery` · `/payouts` · `/support/tickets` · `/content/*` |

Authenticated routes read a `Bearer` token (JWT) from the `Authorization`
header and check the corresponding role.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server |
| `npm run build` / `start` | Production build / start |
| `npm run db:up` / `db:down` | Start / stop local databases |
| `npm run db:setup` | Apply schema + create initial admin |
