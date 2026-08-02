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

## Customer APIs (Step 3)

**`/api/customer`** — all require `authenticate` + CUSTOMER role:
- `GET /profile` (safe user + wallet), `PATCH /profile` (name/avatarUrl), `PATCH /profile/change-password` (revokes all sessions)
- Addresses: `GET/POST /addresses`, `PATCH/DELETE /addresses/:id`, `PATCH /addresses/:id/set-default` — ownership checked on every mutation (404 for foreign addresses); deleting your only address or the default one is blocked with a clear 400
- Wallet: `GET /wallet` (balance, points, last 10 txns), `POST /wallet/add-money` (stub top-up — balance+ledger in one `$transaction`, TODO: Razorpay), `GET /wallet/transactions` (paginated, type/reason/date-range filters)
- Notifications (MongoDB): `GET /notifications` (paginated, `isRead` filter, `X-Unread-Count` header), `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`

**`/api/stores`** — PUBLIC: `GET /` (filters: `city`, `q`, `services` (all-of, comma list), `minRating`, `sort=relevance|rating|distance|price_asc`, page/limit — Redis cached with `X-Cache: HIT|MISS`), `GET /:sellerId` (detail + latest 5 reviews, cached), `GET /:sellerId/services` (grouped by category), `GET /:sellerId/reviews` (paginated, masked names like "Rahul K."), `GET /search/suggestions?q=…` (top 5 stores + top 5 services, 60s cache). Only APPROVED sellers are ever exposed; bank details/documents/GST/commission never selected.

**`/api/upload`** — `authenticate` (any role): `POST /design` (multer disk storage to `uploads/designs/`, `.pdf/.png/.jpg/.jpeg/.ai/.psd`, 50MB max, magic-byte verification, ownership metadata in Redis 24h — TODO: S3), `DELETE /design/:filename` (owner-only). Served statically at `/uploads/…`.

Try the cache behavior: `curl -si localhost:5000/api/stores | grep -i x-cache` twice — second response shows `HIT`.

## Seller APIs (Step 4)

**`/api/seller/register`** — onboarding wizard (mounted BEFORE `/api/seller`, so it is NOT seller-gated; the applicant presents their CUSTOMER JWT):
- `POST /` — full application in one call (store info, services, bank details). Zod validates GST/IFSC/PAN/phone formats. Creates Seller (PENDING) + SellerService rows + SellerBankDetails + flips `User.role` to SELLER in ONE Prisma transaction, invalidates store-list caches, sends welcome email stub → `201 { seller }`
- `POST /documents` — multer `.fields()` for all 4 KYC docs at once (`gst_certificate`, `business_license`, `owner_id`, `address_proof`), `.pdf/.jpg/.png`, 5MB each, magic-byte verified, re-upload replaces + resets verification. Customer JWT from the wizard works here (a PENDING seller can't log in as seller yet — seller JWT also accepted)
- `GET /status` — application status + per-document uploaded/verified flags

**`/api/seller`** — all require `authenticate` + SELLER role; sellerId always comes from the JWT:
- Store: `GET /store` (services, documents WITHOUT file URLs, bank details with masked account number), `PATCH /store` (name/description/address/hours/logo/banner — invalidates store detail + list caches)
- Services: `GET/POST /store/services` (grouped by category / add with duplicate check), `PATCH/DELETE /store/services/:id` — DELETE is a SOFT delete (`isActive=false`) when active orders reference the service, hard delete otherwise
- Pricing: `GET /pricing` (active services + bulk discount tiers), `PATCH /pricing/bulk` (body is a bare array — batch update in one transaction), `PATCH /pricing/bulk-discounts` (tiers merged into `Seller.metadata`)
- Inventory: `GET /inventory?lowStockOnly=true`, `POST /inventory`, `PATCH/DELETE /inventory/:itemId` (restock timestamp when stock increases), `GET /inventory/low-stock-alerts` (also writes a MongoDB notification when count > 0)
- Team: `GET/POST /team`, `PATCH/DELETE /team/:memberId` (roles manager|operator|support, invite email stub)
- Analytics: `GET /analytics/overview?period=7d|30d|this_month|last_month` (Redis cached, `X-Cache` header), `GET /analytics/revenue-by-day`, `GET /analytics/service-breakdown` (delivered orders grouped per service)
- Orders: `GET /orders?status&isRush&page&limit` (customer first-name only), `GET /orders/:orderId` (masked phone, items, MongoDB timeline), `PATCH /orders/:orderId/status` — state machine `placed → confirmed → processing → ready_for_pickup`, one step forward only (400 on skip/backwards/no-op), appends MongoDB timeline event + customer notification + analytics cache invalidation; `PATCH /orders/:orderId/reject` (only from `placed`, sets cancelReason, refund TODO)
- Payouts: `GET /payouts` (paginated), `GET /payouts/pending-balance` (delivered orders not yet in a payout: `total − commission − deliveryFee`), `POST /payouts/request` (min `MIN_PAYOUT_THRESHOLD` ₹, blocked while a PENDING/PROCESSING payout exists — orders are locked to the new payout via `Order.payoutId` inside the same transaction)
- Settings: `PATCH /settings/delivery` (radius + full pincode replacement in a transaction), `PATCH /settings/hours` (7-day schedule merged into `Seller.metadata.hours`)

Schema changes this step (migration `20260802000000_seller_step4`): `Seller.metadata Json?` (bulk tiers + hours) and `Order.payoutId` (payout linkage — the only sane way to compute "orders not yet paid out"). New env var: `MIN_PAYOUT_THRESHOLD` (default `500`).

Quick checks after seeds: seller login → `seller1@prinzex.com / Seller@123` → `GET /api/seller/analytics/overview?period=30d` twice (second shows `X-Cache: HIT`); try `PATCH /api/seller/orders/:id/status` with `{"status":"processing"}` on a `placed` order → 400 "next allowed: confirmed".

## Order APIs (Step 5)

**Shared state machine** (`src/utils/stateMachine.ts`) — the spec'd `ORDER_TRANSITIONS` map is now the single source of truth for every lifecycle mutation; unknown statuses and any transition outside the map → 400 with the allowed list. Admin force-status is the only path that bypasses it.

**`/api/orders`** — all `authenticate` + CUSTOMER role; ownership always checked against the JWT userId:
- `POST /quote` — deterministic server-side pricing: `subtotal = basePrice×qty + finishing upcharges` (flat constants: lamination ₹20, spiral_binding ₹60, hard_binding ₹120, stapling ₹5, folding ₹10, cutting ₹15; unknown finishing → 400), rushFee ₹0/50/120/0, deliveryFee ₹30/60/100/0, **18% GST** on subtotal, commission = `subtotal × Seller.commissionRate`, total minus coupon discount. Coupon validated but NOT consumed. Quote cached in Redis 15 min (`quoteKey` returned).
- `POST /` — place order. Address ownership + same-day pincode rule (SAME_DAY only into a served, non-excluded pincode), quote fully **recalculated server-side (client prices ignored)**, then ONE Prisma `$transaction`: Order + OrderItem + coupon `usageCount++` (the order row doubles as the per-user usage record) + wallet debit & DEBIT ledger entry (insufficient balance → 400, atomic). `paymentMethod: card|upi|wallet|cod`; wallet → `paymentStatus: paid`, others `pending` (Razorpay TODO). MongoDB OrderTimeline created (`placed` event) + seller "New order received" notification; `isRush` auto-set for EXPRESS/SAME_DAY.
- `GET /` (paginated, status filter: store + services + totals) · `GET /:orderId` (all fields except internal payoutId + Mongo timeline)
- `POST /:orderId/cancel` — only from `placed|confirmed` (state machine); wallet → instant atomic CREDIT refund + `paymentStatus: refunded`; card/upi → `refunded` + Razorpay TODO; cod → nothing to refund. Timeline event + seller notification.
- `POST /:orderId/reviews` — delivered-only, one per order (unique `orderId`), creates STORE review + recalculates `Seller.averageRating` via aggregate **in the same transaction**; seller notification + store-cache invalidation.

**`/api/admin/orders`** — `authenticate` + ADMIN + permission gates (spec's `canManageOrders` maps to the platform vocabulary: reads → `orders.view`, mutations → `orders.manage`):
- `GET /` — filters: status, sellerId, customerId, startDate/endDate, isRush + pagination; includes customer/seller/delivery-boy names · `GET /:orderId` — full internals (commissionAmount, payoutId, delivery assignment) + timeline
- `PATCH /:orderId/status` — force ANY status (bypasses state machine) yet still appends the MongoDB timeline event (`updatedBy: adminId`) + ActivityLog
- `POST /:orderId/refund` — `amount ≤ order.total`, blocks double-refund (409); wallet credit + ledger, gateway orders stubbed (`// TODO: Razorpay refund`), sets `paymentStatus: refunded`, ActivityLog
- `POST /:orderId/dispute` — writes MongoDB `disputeDetails` (resolution customer|seller + note) + ActivityLog

Quick curl after seeds: `POST /api/orders/quote` with a seeded `sellerServiceId` → deterministic totals; place a wallet-funded order then `GET /api/customer/wallet` to see the DEBIT entry.

## Delivery & Tracking APIs (Step 6)

**`src/utils/geo.ts`** — haversine distance, radius bounding-box prefilter, straight-line ETA (30 km/h rider speed).

**`/api/delivery/register`** — PUBLIC (mounted before the rider router). Zod-validated (phone/IFSC), one `$transaction`: User(DELIVERY_BOY) + DeliveryBoy(PENDING) + bank details; welcome SMS stub. Login stays OTP-only via `/api/delivery/auth`.

**`/api/delivery`** — all `authenticate` + DELIVERY_BOY role, id always from the JWT:
- `POST /documents` — 4 multer slots (`id_proof`, `license`, `address_proof`, `vehicle_insurance`), 5MB + magic bytes, replace resets verification
- `GET/PATCH /profile` (phone NOT updatable — login identifier), `PATCH /profile/bank` (masked read-back)
- `PATCH /availability` — Redis online-set is kept in sync; going offline removes the rider from `online:delivery:{city}` and clears their location key immediately; only ACTIVE riders may go online
- `GET /active-delivery` — current job with pickup (seller) + drop (snapshot), customer name, masked phone
- `PATCH /active-delivery/location` — **GPS hot path**: straight-line ETA computed, Redis `location:{riderId}` (30s TTL) + pub/sub `tracking:{deliveryId}` awaited (~ms), then PostgreSQL column update and MongoDB `$push … $slice: -500` breadcrumb run fire-and-forget — response stays <50ms; history capped at 500 points
- `PATCH .../pickup-confirm` — Delivery→`picked_up`, Order→`out_for_delivery`, timeline + customer notification (includes the POD OTP)
- `PATCH .../deliver` — verifies 4-digit POD OTP when set, completes Delivery + Order, **atomically credits `earningsAmount = deliveryFee + rushFee`** to `totalEarnings` + `pendingEarnings` + `totalDeliveries`, notifies customer + seller
- `PATCH .../fail` — failed + reason, customer/seller notifications + admin broadcast alert

- Earnings: `GET /earnings?period=7d|30d|this_month` (totals, avg/delivery, per-day buckets for charting, pending + lifetime) · `GET /payouts` · `POST /payouts/request` — same transaction pattern as seller payouts, threshold `DELIVERY_MIN_PAYOUT_THRESHOLD` (default ₹200), deliveries locked via `Delivery.payoutId`

**Assignment engine** (`delivery.assignment.ts`) — `autoAssignDelivery(orderId)` fires on `ready_for_pickup` (seller status hook + admin force-status hook): online riders from the Redis city set → Redis/Mongo-fallback positions → bounding-box + haversine ≤10km filter → idle + ACTIVE only → nearest wins (Delivery + MongoDB Tracking doc + rider notify + pub/sub). Nobody available → `pending_assignment` row with null rider + admin alert (`// TODO: cron retry every 5 min`). `manualAssignDelivery` skips all checks (admin), re-points an in-flight delivery instead of erroring, exposed at `POST /api/admin/orders/:orderId/assign-delivery` (+ ActivityLog).

**`/api/tracking/:orderId`** (+ `/history`) — CUSTOMER role + ownership. Location read order: Redis (freshest) → MongoDB `currentLocation` fallback; timeline from Mongo; history downsampled to ≤200 points.

**`/api/admin/delivery`** — spec's `canManageUsers` maps to `delivery.view|delivery.manage|delivery.verify`: boys list (status/city/isOnline filters), full detail (performance + last 10 deliveries), `PATCH /boys/:id/status` (suspend/inactive forces Redis offline too), `POST /boys/:id/verify-document`, `GET /active` (all in-flight deliveries with live Redis positions).

Schema (migration `20260803000000_delivery_step6`): `DeliveryBoy.pendingEarnings`, `Delivery.earningsAmount`, `Delivery.payoutId` FK (mirrors `Order.payoutId` — exact unpaid-earnings math). POD OTP timing note: the spec's "set at order creation" — our Delivery row is born at assignment (the spec's own trigger), so the OTP is minted then and shared with the customer at pickup.

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
  middlewares/     requestLogger, authenticate, authorizeRoles, rateLimiter, validate, notFound, errorHandler
  modules/         auth, seller-auth, delivery-auth, admin-auth, customer, stores, upload,
                   seller-registration, seller, orders, delivery, tracking
                   (one folder per feature: routes/controller/service/schema)
  utils/           ApiError, ApiResponse, asyncHandler, jwt, hash, otp, email, pagination,
                   cache, fileUpload, rateLimitStore
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
- Admin store/user management, admin analytics, coupons, content, support, Razorpay and Socket.io land in subsequent steps.
