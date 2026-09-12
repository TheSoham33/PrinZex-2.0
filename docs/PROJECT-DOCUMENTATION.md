# PrinZex 2.0 — Project Documentation

**A local print-on-demand marketplace: customers upload documents and order prints from nearby print shops; shops prepare them; delivery partners bring them to the door.**

Date: 10 September 2026
Branch: `arena/01a02d32-prinzex-2-0` (tip `449d4de`)
Maintainers: Soham Dey & contributors

---

## 1. Table of Contents

1. What PrinZex Is
2. Actors & Roles
3. Tech Stack
4. High-Level Architecture
5. Repository Layout
6. Data Stores
7. Core Domain Flows
8. Feature Inventory (implemented)
9. Platform Settings (database-driven)
10. Recent Hardening Log
11. API Surface Summary
12. Verification & Quality Gates
13. Local Runbook
14. Known Gaps & Next Implementations
15. Suggested Roadmap

---

## 2. What PrinZex Is

PrinZex connects three sides of a local printing market in **Kolkata**:

- **Customers** upload files (PDF/images/Office docs), configure print jobs (paper, colour, binding, lamination, photo formats), pay online and/or from an in-app wallet, and get doorstep delivery or store pickup.
- **Print shops (sellers)** manage their service catalog and page-rate pricing, accept and process orders, and hand parcels to riders.
- **Delivery partners (riders)** log in with phone + OTP, go online, and get auto-assigned orders from stores near them.
- **Admins** run the marketplace: sellers/rider onboarding and KYC, catalog, commissions, platform settings, payouts, support tickets, and full observability into orders.

Key product traits:

- Quote-first UX: the estimate updates live as the customer configures; the **server recomputes the authoritative quote** at checkout.
- Wallet + card split payments, with instant-to-wallet / gateway refunds that mirror the exact split.
- A configurable **platform fee** with a master ON/OFF switch.
- All business-critical numbers (GST, delivery fees, ETAs, rider radius, wallet caps) are **admin-editable in the database**, never hardcoded.

---

## 3. Actors & Roles

| Actor | Auth | Home |
|---|---|---|
| Customer | Email + password (`/auth`) | Storefront `/stores`, dashboard `/dashboard` |
| Seller | Email + password + approval | Seller dashboard `/seller/dashboard` |
| Delivery partner | Phone + OTP only | Rider app `/delivery` |
| Admin | Email + password, role-gated | Admin portal `/admin` |

Admin roles: `SUPER_ADMIN`, `OPS_MANAGER`, `SUPPORT_AGENT`, `FINANCE_MANAGER`, `CONTENT_MANAGER` — permissions are enforced per endpoint via `requirePermission` / `authorizeRoles`.

---

## 4. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Redux Toolkit, TanStack Query, next-pwa |
| Backend | Node.js 22, Express, TypeScript (tsx dev / tsc build), zod validation |
| Relational DB | PostgreSQL 16 via Prisma ORM (orders, users, stores, deliveries, payments, wallets) |
| Document DB | MongoDB 7 via Mongoose (content, banners, notifications, timeline, settings, support tickets) |
| Cache/presence | Redis 7 (sessions blacklist, OTP codes, rider presence, hot caches) |
| Payments | Razorpay (orders, verification, refunds) |
| File conversion | Gotenberg sidecar (Office -> PDF previews), `GOTENBERG_URL` |
| Realtime | Socket.IO (order status, notifications, live tracking) |
| Infra | docker-compose for Postgres/Mongo/Redis; Vercel-friendly frontend |

---

## 5. High-Level Architecture

```
                         ┌──────────────────────────┐
 Browser (PWA)           │      Next.js frontend    │
  /stores /checkout      │  App Router + Redux +    │
  /seller/dashboard      │  TanStack Query          │
  /delivery /admin       └────────────┬─────────────┘
                                      │ REST /api (JWT per actor)
                                      ▼
                         ┌──────────────────────────┐
                         │     Express backend      │
                         │  modules per domain      │
                         │  auth/orders/delivery/…  │
                         └───┬───────┬───────┬──────┘
                             │       │       │
                Prisma ORM   │       │       │ Socket.IO
                             ▼       ▼       ▼
                      ┌──────────┐┌───────┐┌──────────┐
                      │PostgreSQL││Redis  ││ MongoDB  │
                      │ system   ││presence││ content, │
                      │ of record││ + cache││ settings │
                      └──────────┘└───┬───┘└──────────┘
                                      ▼
                          ONLINE_DELIVERY_BOYS(city)
                          OTP codes, token blacklist,
                          60s platform-settings cache

   Sidecars: Razorpay (payments/refunds), Gotenberg (Office->PDF),
   SMS gateway (currently a logger stub)
```

---

## 6. Repository Layout

```
PrinZex-2.0/
├── docker-compose.yml          # postgres:16, mongo:7, redis:7-alpine
├── docs/                       # this documentation (md + docx)
├── frontend/                   # Next.js 15 app
│   ├── src/app/                # routes: storefront, checkout, dashboard,
│   │                           #   seller/, delivery/, admin/
│   ├── src/components/         # order/, dashboard/, seller-dashboard/,
│   │                           #   admin/, ui primitives
│   ├── src/lib/api/            # typed REST wrappers (client.ts core)
│   ├── src/lib/domain/         # status maps, pricing helpers (pure)
│   ├── src/store/slices/       # auth, sellerAuth, deliveryAuth, adminAuth, cart
│   └── scripts/                # runnable check-*.ts asserts (10)
└── prinzex-backend/            # Express API
    ├── prisma/                 # schema + SQL seed (db:seed)
    ├── mongo-seed/             # content/settings seed (db:seed:mongo)
    ├── src/modules/            # one folder per domain (see 7. API)
    ├── src/utils/              # geo, jwt, otp, platformSettings, gotenberg…
    └── scripts/                # runnable check-*.ts guards (14)
```

Design conventions worth knowing:

- **Reuse ladder** everywhere: existing helpers and shared utils over new modules; deletion over addition; boring over clever.
- All money math happens server-side; the frontend only mirrors for UX.
- Every validation has a server-side source of truth; client checks exist only for friendly under-field errors.
- `scripts/check-*.ts` are **runnable asserts** (`npx tsx scripts/<name>.ts`) acting as the project's test harness (see §12).

---

## 7. Data Stores

### 7.1 PostgreSQL (via Prisma) — system of record

27 models. The important ones:

| Group | Models |
|---|---|
| Identity | `User`, `RefreshToken`, `OtpCode`, `Address` |
| Sellers | `Seller`, `SellerService`, `SellerPincode`, `SellerDocument`, `BankDetails` |
| Catalog | `Category`, `CatalogEntry`, `CatalogOption` |
| Commerce | `Order`, `OrderItem`, `Coupon`, `Review` |
| Fulfilment | `Delivery`, `DeliveryBoy`, `DeliveryBoyZone`, `DeliveryBoyDocument`, `DeliveryBoyBank` |
| Money | `WalletTransaction`, `Payment`, `PlatformFeeTransaction`, `Payout` |
| Ops | `AdminUser`, `ActivityLog`, `SupportTicket` |

### 7.2 MongoDB — content & ops documents

- `Content` docs by `type`: `banner`, `page`, `faq`, **`settings`** (singleton, see §9)
- `Notification` (per-recipient feed), `OrderTimeline` (status event log per order)
- Support-ticket chatter and CMS template documents

### 7.3 Redis — presence, cache, tokens

| Key shape | Purpose |
|---|---|
| `ONLINE_DELIVERY_BOYS(city)` | set of rider ids currently online per city (assignment pool) |
| `DELIVERY_LOCATION(riderId)` | last GPS ping (hot cache, DB is fallback) |
| OTP stores | one-time codes for delivery/customer login |
| token blacklist | revoked JWTs until natural expiry |
| platform settings cache | single cached settings document, **60 s TTL**, invalidated on save |

---

## 8. Core Domain Flows

### 8.1 Order lifecycle (state machine)

```
placed → confirmed → processing → ready_for_pickup
  │                                 │  (rider assignment kicks off here)
  │                                 ▼
  │                             picked_up          ← SELLER confirms the parcel handover
  │                                 ▼
  │                           out_for_delivery     ← RIDER, only from picked_up
  │                                 ▼
  └────────── cancelled ──►    delivered  |  returned
```

Hard rules, enforced server-side in `stateMachine.ts` + `seller.service` + `delivery.service`:

1. Sellers advance **exactly one step at a time**, forward only, up to `picked_up`.
2. `ready_for_pickup → out_for_delivery` is **not** a legal jump — the handover step cannot be skipped (pinned by `check-delivery-endpoints.ts`).
3. The rider's pickup-confirm requires the order to be `picked_up`; anything else returns **409** (“The store has not handed this order over yet”).
4. Marking `ready_for_pickup` (seller or admin override) triggers **rider auto-assignment**; assignment failure never fails the status write.
5. Customer delivery is OTP-verified (4-digit POD code).
6. Self-pickup orders (speed = Pickup) never create a `Delivery`; the customer sees a “Ready at store” card at `ready_for_pickup`.

### 8.2 Quote & pricing pipeline

`orders.helpers.ts#computeQuote` is the single pricing engine:

- Service base price from the seller’s catalog row, with **seller page-rate overrides** (`Seller.metadata.pricingOverrides`) for B&W / colour per-page rates.
- Duplex **sheet math** (2 pages = 1 sheet, odd pages round up), mixed-colour page pairing per sheet.
- Binding/Finishing/extras per option (spiral, hard/tape/glue/twin-loop covers, lamination, stapling).
- Photo-print tiers (per-set pricing, photo sheets).
- Then: **GST %** (settings), **delivery fee by speed** (settings), **platform fee** (settings, when enabled) → `subtotal, taxableAmount, tax, deliveryFee, platformFee, rushFee, total`. GST applies to the composite supply (subtotal + delivery + rush + platform fee) by default; the admin can flip `gstOnFees` off for subtotal-only GST (Settings → Platform). The math lives in `orders/taxation.ts` — the server is the only source of truth, never client-calculated.

Every one of those numbers comes from the settings document with code defaults mirroring the historical constants (verified by `check-platform-settings.ts`).

### 8.3 Payments, wallet, refunds

- Checkout may split a total: **wallet first, remainder via Razorpay** (or all-wallet / all-card).
- Wallet usage is **admin-capped**: per-credit max and bulk-credit batch max live in settings; the API enforces both (fail fast on bulk).
- **Platform fee gating**: while the fee switch is ON, wallet credit optionally MAY NOT cover the fee — `platformFeeFromWallet` flag decides.
- Refunds mirror the split exactly: gateway leg refunded via Razorpay **first**; only once accepted is the wallet leg returned and status flipped. A gateway failure parks the order in `refund_failed`, cleanly retryable.
- Automatic refund on seller rejection of paid orders.

### 8.4 Delivery assignment engine

- Trigger: order reaches `ready_for_pickup` (seller advance or admin override).
- Pool: riders in `ONLINE_DELIVERY_BOYS(store.city)` — Redis presence, mirrored to DB `isOnline` on every toggle; **DB fallback** if Redis is cold.
- Filter: riders within the **auto-assign radius** (settings `assignRadiusKm`, default 10 km — haversine), `status = ACTIVE`.
- Guardrails: seed geo check guarantees every seeded store has a rider in radius out of the box.
- Unassigned deliveries park at `pending_assignment` (see §14 gap #1 — retry loop).

### 8.5 Payouts

- Sellers: weekly/monthly schedule + minimum threshold from settings; commission per category (admin-visible); payout records tracked in PostgreSQL.
- Riders: per-delivery earnings with pending balance; `/delivery/earnings` + `/delivery/payouts/request`; admin settlement flow.

### 8.6 Realtime

Socket.IO emits per order/user room: order status changes, in-app notifications, rider location for live customer tracking. All emits are post-commit and fail-safe (socket outage never breaks a mutation).

---

## 9. Platform Settings (database-driven)

Single MongoDB `settings` document; public read endpoint `GET /api/content/settings`; admin `GET/PATCH /api/admin/content/settings` (requires `content.view` / `content.manage`). 60-second cached read path, invalidated on every admin save. Every key validated server-side with a 400 naming the field; code defaults mirror the old constants.

| Key | Default | Bounds | Consumed by |
|---|---|---|---|
| `gstRatePercent` | 18 | 0–28, 2dp | quote engine, checkout labels |
| `deliveryFees[STANDARD/EXPRESS/SAME_DAY/PICKUP]` | 0/50/120/0 | ₹0–10,000, 2dp | quote engine, speed tiles |
| `deliveryEtaHours[…]` | 48/12/6/4 | 1–168 h, whole | ordered ETA, tile labels |
| `assignRadiusKm` | 10 | 1–100, 1dp | rider auto-assignment |
| `walletMaxCredit` | 100000 | ₹1–10,000,000, 2dp | admin wallet credit API |
| `walletMaxBatchSize` | 500 | 1–2000, whole | bulk wallet credit API |
| `platformFeeEnabled` | false | on/off | platform fee master switch |
| `platformFee` | 0 | 0–`platformFeeMax`, 2dp | order totals, own line at payment |
| `platformFeeFromWallet` | false | on/off | may wallet cover the fee |
| `platformFeeMax` | 10000 | ₹1–1,000,000, 2dp | fee input validation ceiling |
| `maxUploadFileSizeMb` | 100 | 1–128 | customer file uploads |
| `schedule` / `minPayout` | weekly / 500 | — | seller payout engine |
| `supportEmail` | support@prinzex.in | email | surfaces |

---

## 10. Feature Inventory

### 10.1 Storefront & customer

- Store listing sorted by distance (Kolkata default coords + browser geolocation), search, ratings.
- Full order builder per service: documents (duplex, colour mixing, page ranges), binding (8 types incl. hard/tape/glue/twin-loop with cover sources), lamination, photo prints & sheets, large format, card studio, multi-file upload with per-file specs.
- Live estimate sidebar; server-authoritative recomputation at quote/checkout.
- Cart, checkout with wallet split, coupon codes, delivery-speed selection with admin-tuned fees/ETAs.
- Dashboard: orders with data-driven timeline, live tracking map for `out_for_delivery`, reviews, wallet ledger, addresses, referrals.

### 10.2 Seller dashboard

- Order queue by tab (New / Active / Dispatched / History), one-step forward actions: Accept → Start processing → Mark ready for pickup → **Hand over to delivery partner**.
- Reject-with-reason flow that auto-refunds paid orders.
- Service & pricing management (page-rate overrides per store), orders analytics, payout view, KYC documents.

### 10.3 Delivery partner app

- OTP login, availability toggle (syncs Redis presence), dashboard that polls active delivery (quiet 200 when idle), pickup gate tied to seller handover, GPS location pings, OTP-verified delivery, fail-with-reason, earnings & payout requests, profile/bank management.

### 10.4 Admin portal

- Dashboard KPIs, order oversight with status forcing (audited), user/seller/rider management with KYC verification, reviews moderation, catalog & commission config, banner/CMS management, support tickets, activity log, settings (§9), admin account invites, logout-everywhere safety.

### 10.5 Platform & ops

- Seeds: 3 approved + 1 pending seller in Kolkata, 3 riders, 5 customers, coupons, settings — all wiped & recreated idempotently (`check-seed-wipe.ts`).
- 24 runnable check scripts guard pricing, geo coverage, settings parity, phone canonicalisation, uploads.
- **JWT `jti` (2026-09-12)**: every access/refresh token now carries a random `jti` — before, two token pairs issued for the same user within one second were byte-identical and the second `refreshToken.create` failed the UNIQUE constraint (P2002). Found by the new auth integration test; previously live in register→login-immediately and concurrent-device logins.
- **Exact-equality wallet debit (2026-09-12)**: the guarded wallet debit passed the amount as a JS double; the query engine compares it against the NUMERIC balance via the double's binary expansion, so at exact equality (`balance == amount`) the epsilon made `gte` false and the debit matched zero rows. Full-wallet payment with balance exactly equal to the total was rejected ("need ₹X, have ₹X"); partial-wallet orders silently skipped the wallet debit and charged the gateway everything. Both debit sites now compare/decrement in exact `Prisma.Decimal` space. Found by the order integration suite.

---

## 11. Recent Hardening Log

| Commit | Change |
|---|---|
| `c63e4f2`/`9736597` | Customer wallet: balance, split checkout, admin credits |
| `f35d8cb`/`326265a` | Admin-set platform fee + ON/OFF master switch |
| `8124fc1` | Complete delivery-partner frontend (login → payout) |
| `2497601` | Seed wipe fix for stale OTP codes |
| `71b582c` | Phone canonicalisation (+91/91 stripping) everywhere |
| `fef593b` | Fixed refresh-vs-logout race (80 ms rehydration gate) |
| `854739f` | Auto-assign falls back to DB when Redis presence is cold |
| `48f78cf`/`8fd224b` | Removed demo orders/deliveries from seeds |
| `220f926` | GST, delivery fees/ETAs, radius, wallet caps, fee ceiling → DB settings |
| `22af8df` | All seeded geography moved Bengaluru → Kolkata |
| `3736cf7` | Rider idle state 200 + idempotent logout 200 (console-clean) |
| `0acd18b` | Rider pickup blocked until seller ready |
| `449d4de` | Seller handover step `picked_up`; rider moves order only after it |

---

## 12. API Surface Summary

Base URL `/api`. JWT per actor in `Authorization: Bearer`.

| Group | Mount | Notable endpoints |
|---|---|---|
| Customer auth | `/auth` | register, login, refresh, OTP flows |
| Stores & catalog | `/stores`, `/catalog` | listing, detail, services, options |
| Orders | `/orders` | quote, place order, my orders, cancel, review |
| Payments | `/payments` | create/verify Razorpay order, webhook |
| Wallet | `/wallet` | balance, ledger |
| Upload | `/upload` | file upload → Gotenberg conversion |
| Delivery (rider) | `/delivery` | profile, availability, active-delivery (200-null), pickup-confirm (409-gated), deliver, fail, earnings, payouts |
| Delivery auth | `/delivery/auth` | OTP login, verify-otp, idempotent logout, refresh, me |
| Seller | `/seller` | orders state machine, services, pricing, payouts, KYC |
| Seller auth | `/seller/auth` | login, refresh |
| Tracking | `/tracking` | live order tracking for customers |
| Chat & support | `/chat`, `/support` | tickets, messages |
| Admin | `/admin/…` | users, sellers, delivery, orders, catalog, content, settings, payouts, analytics, logs, reviews, support |
| Public settings | `/content/settings` | storefront-consumable settings subset |

---

## 13. Verification & Quality Gates

**Jest suites** (bootstrapped 2026-09-12, both run in CI):

- *Unit* (`prinzex-backend` → `npm test`, 88 tests): the pure cores — `computeQuote` (every pricing branch: per-page, duplex sheet math, binding incl. spiral/twin-loop customizations and spine estimates, slabs, per-piece, photo prints, override precedence, scoped add-ons), the order `stateMachine`, the `platformSettings` parsers + defaults-mirror guard, and `pickSlabRate`. No databases needed (`src/__tests__/setup-unit-env.ts` satisfies envalid with placeholders).
- *Integration* (`npm run test:integration`, disposable Postgres schema): the jest global setup creates `prinzex_test_<run>` via `prisma db execute`, runs `prisma migrate deploy` into it, hands the URL to workers via a tmp file, and the teardown drops it `CASCADE`. Current suites: **auth** (register/login/duplicate conflicts, wallet + refresh-token persistence, bcrypt hashing), **order placement** (server-side re-quote, full/partial wallet payment with atomic debit + ledger row, wallet/gateway split, insufficient-balance + foreign-address rejections, Mongo timeline + seller notification, gateway-pending no-notify rule) and **seller payouts** (pending balance from delivered orders, bank/threshold gates, payout locks orders, approve → mark-paid lifecycle, fail releases the locked orders). Redis (OTP storage, login lockout) and MongoDB (order timeline, notifications) are required — locally `docker compose up -d postgres redis mongodb`; CI provides service containers.
- *Frontend unit* (`frontend` → `npm test`, 38 tests): ports of the check scripts for the pure order-flow math — `computeCost` duplex/stapling/lamination branches, wrap-cover binding helpers (spine + 300-DPI artwork rules), and order-draft persistence (drop/recount browser files, tamper/expiry guards, sign-out wipe). The remaining check scripts stay under `scripts/` (and run in CI) until ported.

The rest of the safety net is **runnable check scripts** plus compiler/lint gates. Run any of them with `npx tsx scripts/<name>.ts` from the package root.

Backend (`prinzex-backend/scripts/`):

| Script | Guards |
|---|---|
| `check-platform-settings.ts` | settings parsers, bounds, defaults mirror quote fallbacks |
| `check-delivery-endpoints.ts` | idle-200, idempotent logout, pickup handover 409, state machine |
| `check-delivery-geo.ts` | every seed store has a rider within the assign radius |
| `check-delivery-phone.ts` | phone canonicalisation against seeded numbers |
| `check-seed-wipe.ts` | seed accessors match all 27 Prisma models |
| `check-wallet-split.ts` | wallet/gateway split + refund mirror |
| `check-doc-duplex.ts`(+) | duplex sheet math |
| `check-card-pricing.ts`, `check-catalog-schemas.ts`, `check-photo-print.ts`, `check-multi-file-order.ts`, `check-office-convert.ts`, `check-upload-file-types.ts`, `check-upload-limits.ts`, `check-analytics-sql.mjs` | per-feature pricing/upload asserts |

Frontend (`frontend/scripts/`): 10 mirrors for order-draft, duplex, binding covers, card studio, lamination, photo flows, multi-upload, upload types, platform-settings overlay.

CI gates used during development: backend `tsc --noEmit` baseline (153 pre-existing Prisma-client errors — compare, never regress), frontend `tsc --noEmit` clean, `next lint` ≤ 336 warnings.

**These gates are now enforced in CI** (`.github/workflows/ci.yml`, added 2026-09-12): two GitHub Actions jobs (backend, frontend) run on every PR and on pushes to `main` — install (`npm ci`) → `tsc --noEmit` → lint → every `scripts/check-*` script (auto-discovered; a new check script joins the gate with no workflow edit). The backend job runs `prisma generate` before `tsc`, which eliminates the old "baseline" Prisma-client errors entirely — they were an artifact of typechecking without a generated client, so the gate is a true zero-error gate, not a diff-against-baseline. Turn the jobs into required status checks on `main` to block regressions from merging.

---

## 14. Local Runbook

```bash
docker compose up -d                      # postgres, mongo, redis
cd prinzex-backend
npm install && npm run db:generate
npm run db:migrate && npm run db:seed && npm run db:seed:mongo
docker compose up -d gotenberg            # office→PDF sidecar (GOTENBERG_URL)
npm run dev                               # http://localhost:5000

cd ../frontend && npm install && npm run dev   # http://localhost:3000
```

Tests (backend, from `prinzex-backend/`):

```bash
npm test                                  # unit tests — no services needed
docker compose up -d postgres redis mongodb   # integration tests need these
npm run test:integration                  # builds + drops its own schema
```

Demo accounts (after seeding):

| Role | Login |
|---|---|
| Admin | admin@prinzex.com / Admin@123 |
| Sellers | seller1..3@prinzex.com / Seller@123 |
| Sellers | seller4@prinzex.com (PENDING, for KYC review demo) |
| Riders | 9700000001/2/3 via phone OTP (dev returns `devOtp`) |
| Customers | soham@gmail.com … (see `prisma/seed.ts`) |

Full reset: `npm run db:reset` (migrate reset + both seeds).

---

## 15. Known Gaps & Next Implementations

Priority: **P0** = launch blocker · **P1** = strong product/ops need · **P2** = polish & scale.

### 15.1 P0 — before going live

| # | Gap | Why it matters | Suggested approach |
|---|---|---|---|
| 1 | **No pending-assignment retry loop.** A delivery with no online rider in radius parks at `pending_assignment` forever (code TODO). | Orders silently stall. | Interval worker (node-cron or `setInterval` in a `src/jobs/` module): re-run `autoAssignDelivery` every N minutes for stale `pending_assignment`, with backoff + admin alert after M failures. |
| 2 | **SMS is a logger stub.** Rider OTP and customer OTPs only log (`sms_stub`); `devOtp` in the response is dev-only. | Nobody can actually log in via OTP in production. | Integrate an Indian DLT-compliant gateway (MSG91 / Twilio / Fast2SMS) behind the existing `sendOtpSms`/`sendSms` wrappers; keep the stub for dev. Rate-limit and alert on failure. |
| 3 | **Production payment credentials & webhook hardening.** Razorpay TEST keys are in use. | Money can’t move without live keys; webhook spoofing risk. | Move keys to env-only secrets, enforce signature verification on every webhook path, add an allow-list + retry monitoring; run a staging end-to-end payment + refund rehearsal. |
| 4 | **No CI pipeline.** No `.github/workflows`; all gates are manual. | Regressions can merge unnoticed. | GitHub Actions: install, `tsc --noEmit` both packages, lint, run all 24 check scripts on every PR. |
| 5 | **Zero unit/integration tests** (jest configured, unused). ~~Only check scripts stand between a refactor and production.~~ **Bootstrapped 2026-09-12** — jest suites now run in CI: unit tests for the pure cores (computeQuote — all pricing branches, stateMachine, platformSettings parsers, pickSlabRate) and a service-level auth integration test against a disposable Postgres schema (per-run schema, migrate deploy, CASCADE drop). | Only check scripts stand between a refactor and production. | Start with the pure cores: computeQuote, stateMachine, platformSettings parsers (they already have check scripts — port them 1:1 to jest), then service-level integration tests with a disposable Postgres schema. *(Backend unit + auth/order/payout integration + frontend unit suites done — next: more services, port the remaining frontend check scripts.)* |

### 15.2 P1 — product & operations

| # | Gap | Why it matters | Suggested approach |
|---|---|---|---|
| 6 | **Rider learns about assignments by polling** (30 s refetch). **Done** — Socket.IO now pushes `delivery.assigned` to the rider room on assignment; the rider app plays a chime + toast and refetches immediately, with the 30 s poll kept as fallback (`check-delivery-socket.ts` guards both sides). | Slow pickups, battery waste. | Push a Socket.IO event `delivery.assigned` to the rider room on assignment; add a sound/toast cue in the rider app; keep polling as fallback. |
| 7 | **Seller KYC upload UI missing.** Backend document upload + admin verification exist; sellers can’t self-serve documents. **Done** — seller settings gained a KYC documents section that reuses the onboarding multipart lane (`POST /seller/register/documents`, `GET /seller/register/status`) and feeds the existing admin verification queue (`check-seller-kyc.ts` guards the wiring). | Onboarding stalls on support. | Seller settings → KYC section reusing the existing multipart upload endpoints and admin verify queue. |
| 8 | **Store listing default location hardcoded** (`StoreListing.tsx` “Default to Kolkata for demo”). **Done** — the listing now geolocates the shopper via `useUserLocation`, falls back to Kolkata gracefully on denial/timeout, and remembers the last resolved location in `localStorage` so returning visitors get real distances instantly (`check-store-location.ts` + `location.test.ts` guard the helpers). | Wrong distances for real users. | Browser geolocation with graceful Kolkata fallback + remember the last chosen location. |
| 9 | **Tax/invoice story.** GST applies to the subtotal only; whether delivery/platform fees are taxable is unresolved; no downloadable invoice. **Done** — taxability decided and documented in `orders/taxation.ts`: GST applies to the composite supply (subtotal + delivery + rush + platform fee) by default (`gstOnFees: true`), reversible via Settings → Platform pending CA sign-off. Quotes return a `taxableAmount` base and each order freezes `taxableAmount` + `gstRatePercent` (migration `20260912000000_order_gst_taxable_amount`); `GET /orders/:orderId/invoice` streams an order-owned GST invoice PDF rendered in-process with pdf-lib (`invoicePdf.ts` — Gotenberg's HTML routes stay off to keep the SSRF surface closed). Guarded by `check-tax-invoice.ts`, `invoicePdf.test.ts`, `computeQuote.test.ts`, `platformSettings.test.ts`. | Compliance + B2B customers need GST invoices. | Decide taxability (with CA input), extend quote breakdown, generate invoice PDF order-wise (Gotenberg can render it). |
| 10 | **Push notifications channel is a placeholder** (`channel: ['push']`, nothing sends). | Customers miss order updates off-site. | FCM integration: register device tokens per user, send on the existing notification hooks. |
| 11 | **Gotenberg sidecar has no production story.** | Office uploads (DOCX/PPT) 404 without it. | Add to production compose/k8s with healthcheck; queue conversions if load grows. |
| 12 | **Returned/failed-delivery money path.** Orders can go `returned`, and deliveries can be failed, but the customer-facing refund policy isn’t automatic. | Refund disputes. | Auto-refund unclaimed/returned orders (reusing `refundOrderToSource`) with a policy switch in settings. |

### 15.3 P2 — polish & scale

| # | Gap | Suggested approach |
|---|---|
| 13 | `supportEmail`/platform name duplicated in a few screens — single-source from settings. | Sweep frontend for stray literals; settings merge already supports it. |
| 14 | Admin delivery-zone list is static suggestions; rider zones are free text. | Pincode-based zones or a city-zone registry shared with stores. |
| 15 | Single-city assumption (Kolkata) in copy; presence is city-keyed already. | City registry table; storefront city picker; per-city settings if fees diverge. |
| 16 | No metrics/APM (pino logs only). | Prometheus endpoint + Grafana, or a hosted APM; alert on assignment failures, payment webhook errors, refund_failed count. |
| 17 | Rider payout settlement is manual-request based. | Scheduled batch settlement mirroring the seller payout engine. |
| 18 | API rate limiting exists only for OTP send. | Global limiter middleware with per-route overrides. |
| 19 | PWA/service-worker caching strategy unverified against the new buyer flows. | Cache audit; bump precache, verify offline fallbacks. |
| 20 | Accessibility pass beyond form errors (color-contrast, focus traps in modals). | Axe audit in CI. |

---

## 16. Suggested Roadmap

1. **Week 1** — Gaps 1–3: assignment retry worker, SMS gateway, live payment keys + webhook verification (rehearse a real payment, refund, and failed-payment cycle in staging).
2. **Week 2** — Gaps 4–5: CI pipeline running all check scripts + jest bootstrap; port computeQuote/stateMachine checks into jest.
3. **Week 3** — Gaps 6–8: rider assignment socket push, seller KYC upload UI, geolocation-based store listing.
4. **Week 4** — Gaps 9–12: invoice/tax decision + PDF invoices, FCM push, Gotenberg production deploy, return/refund policy automation.
5. **Ongoing** — P2 items as scale demands (multi-city, metrics, automated payouts).

---

*Document generated for the current branch state. Settings table reflects `PLATFORM_SETTING_DEFAULTS` in `prinzex-backend/src/utils/platformSettings.ts`; lifecycle reflects `stateMachine.ts` and the guard `check-delivery-endpoints.ts` — both enforced by runnable checks.*
