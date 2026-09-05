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
docker compose up -d          # PostgreSQL + MongoDB + Redis + Gotenberg (Office→PDF)
npm install
npm run db:migrate            # apply Prisma migrations
npm run db:seed               # seed PostgreSQL
npm run db:seed:mongo         # seed MongoDB (references PG rows — run after db:seed)
npm run dev                   # http://localhost:5000 (GET /health for liveness)
```

`docker compose up -d` uses the credentials already present in `.env.example`
(`postgres:password@localhost:5432/prinzex`, `mongodb://localhost:27017/prinzex`, `localhost:6379`),
so a fresh clone boots without editing anything. The `gotenberg` service is the
Office→PDF converter for order uploads; it binds `127.0.0.1:3200` only (never
expose it publicly; 3000 stays free for the Next.js dev server) and matches
`GOTENBERG_URL` in `.env.example`.

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
# customer login (seeded: soham@gmail.com / Customer@123)
curl -s localhost:5000/api/auth/login -H 'content-type: application/json' \
  -d '{"identifier":"soham@gmail.com","password":"Customer@123"}'

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

## Payment & Payout APIs (Step 7)

**`src/utils/financial.ts`** — the only money arithmetic outside quote computation: `roundMoney` (2dp), `rupeesToPaise`/`paiseToRupees` (integer paise at the gateway boundary), `calculateGST` (18% default), `sellerNetAmount`, `commissionOf`. DB storage stays Prisma `Decimal`; floats never persist.

**Webhook mounting (important)** — `paymentsWebhookRouter` is mounted at `/api/payments` **before `express.json()`** in `app.ts`, with `express.raw({ type: 'application/json' })` on `POST /webhook`: the HMAC-SHA256 check (`x-razorpay-signature` header, `RAZORPAY_WEBHOOK_SECRET`, `crypto.timingSafeEqual`) runs over the **raw bytes** Razorpay sent. No auth middleware — the signature is the trust. Events: `payment.captured` (wallet-topup discriminator via `notes.topupCustomerId`, else idempotent mark-order-paid), `payment.failed` (→ `failed` + customer notify), `refund.created`/`refund.processed` (customer notify). Bad/missing signature → 400; processing errors are logged and still ACKed — **always `200 { status: 'ok' }`** per spec, every handler idempotent so replays are safe.

**`/api/payments`** (`authenticate`; JSON-mounted sibling of the webhook router):
- `POST /create-order` (CUSTOMER, `{ orderId }`) — ownership/state guards (only `pending`/`failed`, not cod/wallet, not already paid) → `razorpay.orders.create({ amount: rupeesToPaise(total), currency: 'INR', receipt: order.id, notes: { orderId, customerId } })`; rzp-order-id cached at `cache:razorpay_order:{orderId}` for 30 min.
- `POST /verify` (CUSTOMER) — signature proof FIRST (HMAC-SHA256 of `<razorpayOrderId>|<razorpayPaymentId>` under `RAZORPAY_KEY_SECRET`; mismatch → 400 before any DB work), then ownership, cached-session cross-check, idempotent `markOrderPaid`; the seller is notified "Payment received — new order" only now (step-5 placement notifies at order placement for wallet/cod instead).
- `GET /history?page&limit` (CUSTOMER) — own orders' payment view, paginated (spec said "all orders" — we cap at 100/page like every other list).
- `POST /refund` (ADMIN + `payouts.manage` — spec's `canManagePayouts`) — amount ≤ order total (Zod: positive, ≤2dp, reason 3–500). `wallet` orders: direct in-transaction credit + `REFUND` ledger entry, never touches the gateway. `card`/`upi`: **real** `razorpay.payments.refund(paymentId, { amount: rupeesToPaise(amount), notes: { reason, adminId }, speed: 'normal' })`. Status → `refunded` (full) or `partially_refunded` (added to `PAYMENT_STATUSES`).

**`/api/wallet`** (CUSTOMER) — `POST /topup/initiate` (`amount` ₹10–₹50,000 → rzp order with `receipt: topup:<customerId>:<ts>`, `notes.topupCustomerId`; pending session cached 30 min), `POST /topup/verify` (same signature proof as payments/verify + `topupAmount` cross-check against the cached session), `GET /balance`. Crediting funnels through one atomic idempotent path: `Transaction.referenceId = paymentId` re-checked **inside** the transaction — verify + webhook can never double-credit.

**`/api/admin/payouts`** (spec's `canManagePayouts` → reads `payouts.view`, mutations `payouts.manage`):
- `GET /` (`recipientType= seller|delivery_boy`, `status`, page/limit) — with recipient details (store name/owner or rider name) and `transactionRef`.
- `GET /summary` — pending + processing amounts per recipient type (`groupBy` + `_sum`), pending count, **next scheduled payout date** (weekly Monday 10:00 runs — `nextPayoutDate()` pure helper).
- `POST /:payoutId/approve` — PENDING→PROCESSING + `initiatedAt`, recipient notify, ActivityLog.
- `POST /bulk-approve` — **one single `updateMany`** (no per-row loop), returns affected count.
- `POST /:payoutId/mark-paid` `{ transactionRef }` — PROCESSING→PAID + `processedAt`; for sellers a virtual-ledger DEBIT (`PAYOUT`) Transaction row is recorded when the seller's user has a wallet (informational only); migration `20260804000000_payments_step7` adds `Payout.transactionRef`.
- `POST /:payoutId/fail` `{ reason }` — →FAILED, and the locked earnings are released: `Order.payoutId`/`Delivery.payoutId` set to null and rider `pendingEarnings` re-credited (extension beyond spec, keeps rows re-payable).

**`/api/admin/financials`** (ADMIN + `payouts.manage`): `GET /overview?startDate&endDate` (defaults to current month) — totalGMV / totalCommission / totalDeliveryRevenue / totalPayouts / netRevenue (= commission + deliveryRevenue) / pendingPayouts / refundsIssued (⚠ approximated from refunded orders' totals until a refund-ledger table lands — TODO). `GET /commission-report` — per-seller `{ sellerId, storeName, grossRevenue, commissionRate, commissionEarned, ordersCount, payoutsPaid, pendingBalance }` computed via `groupBy` + `_sum` (never in-memory sums), **Redis-cached 5 min** (`cache:admin:commission-report:<start>:<end>`).

Env: `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` (all default to empty — app boots fine: the SDK singleton stays `null` and the first guarded gateway call fails loudly with 500 "Payment gateway is not configured").

```bash
# checkout flow (customer JWT)
curl -X POST $B/api/payments/create-order -H "Authorization: Bearer $CUST" -H 'Content-Type: application/json' -d '{"orderId":"ord_123"}'
curl -X POST $B/api/payments/verify     -H "Authorization: Bearer $CUST" -H 'Content-Type: application/json' \
  -d '{"orderId":"ord_123","razorpayOrderId":"order_…","razorpayPaymentId":"pay_…","razorpaySignature":"…"}'
# wallet top-up + balance
curl -X POST $B/api/wallet/topup/initiate -H "Authorization: Bearer $CUST" -H 'Content-Type: application/json' -d '{"amount":500}'
curl $B/api/wallet/balance -H "Authorization: Bearer $CUST"
# admin finance ops
curl "$B/api/admin/payouts?status=PENDING&recipientType=seller" -H "Authorization: Bearer $ADMIN"
curl -X POST $B/api/admin/payouts/bulk-approve -H "Authorization: Bearer $ADMIN" -H 'Content-Type: application/json' -d '{"payoutIds":["po_1","po_2"]}'
curl $B/api/admin/financials/commission-report -H "Authorization: Bearer $ADMIN"
```

Deviation notes: `@types/razorpay` does not exist on npm (the request 404s) — `razorpay@2.9.8` bundles its own complete TypeScript declarations, used instead. Spec's literal `razorpay.orders.create` singleton is kept but constructed only when keys are non-empty (the SDK constructor throws on empty `key_id` — with blank dev credentials we hold `null` and fail loudly at the first guarded gateway call, matching how AWS/SMTP stubs boot clean).

## Admin Control Plane (Step 8)

**`src/utils/activityLogger.ts`** — `logActivity({ adminId, adminName, adminRole, action, entityType, entityId, metadata?, req })` writes the MongoDB ActivityLog (dot-notation actions like `seller.approved`). **Fire-and-forget**: controllers call it with `void logActivity(...)` (never awaited); it catches its own errors so a slow Mongo can never block or fail a response. `adminIdentity(req)` pulls the acting admin from the JWT — which is why admin access tokens now carry a `name` claim (added to login + refresh payloads; older tokens fall back to `''`).

**Mounting** — per spec, one parent `adminRouter` (`authenticate` + `authorizeRoles('ADMIN')`) at `/api/admin` with sub-routers `/users` `/sellers` `/analytics` `/content` `/support` `/admins` `/reviews` `/activity-log`; `/api/content` is a separate **public** router (no auth). The step-6/7 admin mounts (`/orders` `/delivery` `/payouts` `/financials`) predate this parent and keep their own guards — no path overlap.

**Permission mapping** (spec name → platform vocabulary, all enforced per-route via `requirePermission`):

| Spec | Reads | Mutations |
|---|---|---|
| canManageUsers (users) | `users.view` | `users.manage` |
| canManageSellers (sellers) | `sellers.view` | approve/reject/verify-document → `sellers.verify` · suspend/commission → `sellers.manage` |
| canViewAnalytics | `analytics.view` | — (read-only) |
| canManageContent | `content.view` | `content.manage` |
| canManageOrders (support) | `support.view` | `support.manage` |
| canManageAdmins | `admins.view` **`requireSuperAdmin`** | `admins.manage` **`requireSuperAdmin`** |
| activity log | `logs.view` | — |
| canManageSellers (reviews) | `sellers.view` | `sellers.manage` |

**`/api/admin/users`** — list (role/status/search email|phone|name ci/date range → id, contact, role, isActive, order count, wallet balance, paginated); detail (profile + addresses + last 10 orders + wallet + last 5 transactions + ticket count); `PATCH /:userId/suspend` (isActive=false + **all refresh tokens revoked** + notify, `user.suspended`); `unsuspend` (sessions stay revoked — log in again); `POST /:userId/wallet-credit` (wallet upsert + CREDIT/ADJUSTMENT ledger row + increment, one interactive tx; `wallet.credited`).

**`/api/admin/sellers`** — list (status/city/search + rating, totalOrders, **pendingDocuments count**); detail (services, documents incl. verification, **masked bank**, performance, exact pending payout balance via the delivered-unpaid math); `POST /:sellerId/approve` **verifies all 4 KYC doc types are uploaded first** (gst_certificate, business_license, owner_id, address_proof → 400 listing the missing ones) → APPROVED + isVerified, store-list + KPI caches invalidated, approval email stub, notify; `reject` (min-10 reason stored); `suspend` (status + sessions revoked + cache invalidated); `verify-document` (`verifiedAt`/`verifiedBy` set or cleared); `PATCH /:sellerId/commission` (0–50%, drops the commission-report cache).

**`/api/admin/analytics`** — `GET /kpi` (12 platform counters via Prisma aggregates; **Redis-cached at `ADMIN_STATS()` for 60s and invalidated on significant events**: new order → orders.service, new seller → seller-registration, approve/reject → admin-sellers; `startDate/endDate` override the month window under a suffixed cache key); `GET /revenue` **`$queryRaw` + `DATE_TRUNC`** (`{date, revenue, orders, commission}` per bucket, revenue = delivered only via SQL `FILTER`); `GET /orders` (SQL-grouped volume + status distribution, top-5 sellers by `Order.groupBy`, top-5 services by `OrderItem.groupBy`); `GET /geography` (orders + delivered revenue grouped by `deliveryAddress->>'city'`); `GET /sellers?sort=revenue|orders|rating` (revenue/orders sorted + paginated at the DB via groupBy `orderBy`+`skip/take`; rating via Seller orderBy).

**`/api/admin/content`** (MongoDB Content) — banners CRUD sorted by `order` (create defaults to end of list); **`PATCH /banners/reorder` registered before `/banners/:id`** and executed as ONE MongoDB **`bulkWrite`** (index = new order); FAQs CRUD, listed **grouped by category**. Public: `GET /api/content/banners?isActive=true`, `GET /api/content/faqs?category=…` (active only).

**`/api/admin/support`** — tickets list (status/priority/category/assignedTo/search-subject ci); detail (messages asc, linked order, customer profile, assignee name); `POST …/reply` (TicketMessage senderType admin + **OPEN→IN_PROGRESS in the same transaction** via conditional updateMany, notify); `assign` (validates target admin is active, `ticket.assigned`); `priority`; `resolve` (RESOLVED + resolvedAt + optional final message, notify, `ticket.resolved`); `close`; `GET /stats` — openCount, inProgressCount, resolvedThisWeek (Monday window), **avgResponseTimeHours via SQL `LATERAL` per-ticket first-admin-reply average**, resolutionRate = resolved/(resolved+closed+open) per spec.

**`/api/admin/admins`** — SUPER_ADMIN-only: `requireSuperAdmin` asserts the JWT claim AND the `admins.*` permission keys exist only in SUPER_ADMIN's role map (a hand-crafted token with the permission but the wrong role still 403s — smoke-verified). Invite (CSPRNG 12-char temp password → bcrypt → invite email stub, `admin.invited`); role change (revokes all AdminRefreshTokens — re-login picks up new permissions); deactivate (blocks self-deactivation and **removing the last active SUPER_ADMIN**, sessions revoked).

**`/api/admin/reviews`** — list (isFlagged/min-max rating/sellerId, customer + store names); flag (`review.flagged`); DELETE (hard delete + **seller averageRating recalculated inside the same Prisma transaction**, notify seller, `review.deleted`).

**`/api/admin/activity-log`** — MongoDB ActivityLog query (adminId/entityType/date range), newest first, paginated; the schema's `(adminId, createdAt -1)` compound index covers the primary access pattern.

Deviation notes: the spec's file-structure list names 6 admin sub-modules but its endpoint list also includes review management (`/api/admin/reviews`) and the activity-log viewer (`/api/admin/activity-log`) — these live in their own `admin/reviews/` and `admin/logs/` folders (one-folder-per-feature). Admin JWTs gained a `name` claim so fire-and-forget audit logs carry `adminName` without a per-action DB lookup.

## Real-Time Layer (Step 9) — Socket.io + Redis pub/sub

**Topology** — `server.ts` builds `http.createServer(app)` and attaches Socket.io to the SAME server (`initSocketServer(httpServer)`; never `app.listen`). Ping 10s / timeout 20s, websocket+polling. Horizontal scaling: a **`redis` (v4-lineage) pub/sub client pair** drives `@socket.io/redis-adapter` (two separate clients, as required — a subscribed client cannot issue commands). Fail-open everywhere: unreachable Redis → adapter unattached (single-node) and the tracking bridge disabled — the server boots and REST never breaks.

**`realtime/socket.registry.ts`** — dependency-free Io handle (`registerSocketServer` / `getSocketServer` [throws] / `getSocketServerOrNull` [null-safe] / `clearSocketServer`). Service files emit via **`realtime/realtime.emitters.ts`**, which reads the registry per-emission — import graph is cycle-free by construction (emitters never import socket.server). Event + room names exist ONLY there (`RT_EVENTS`, `RT_ROOMS` — same discipline as `REDIS_KEYS`). Every helper is a safe no-op when sockets are down and swallows its own errors, so REST services emit unconditionally post-commit.

**Auth** — `socket.auth.ts` middleware on every namespace: token from `handshake.auth.token` or the `Authorization: Bearer` header, verified with the REST `verifyAccessToken`; payload pinned to `socket.data.user`. `/admin` adds a second middleware rejecting non-ADMIN roles at the connection (`connect_error: "Admin only"`).

**Namespaces**

| NS | Joins | Events (server → client) |
|---|---|---|
| `/tracking` | `join:order` (customer + DB ownership check; immediate last-known location from the Redis hot cache) | `location:update` to `order:{orderId}` |
| `/orders` | auto-rooms on connect: `customer:{userId}`, `seller:{sellerId}`, `delivery:{deliveryBoyId}` | `order:new`, `order:status_changed`, `delivery:assigned`, `payout:processed`, `notification:new` |
| `/chat` | `chat:join` (customer-owns OR seller-owns the order; last 20 msgs replayed) | `chat:history`, `chat:message`, `chat:read_ack` |
| `/admin` | `admin:global`; `admin:watch_delivery` → `delivery:watch:{deliveryId}` | `admin:event` envelope, `location:update` (watched deliveries) |

**GPS fan-out** — rider pings (REST hot path, step 6) → ioredis `PUBLISH tracking:{deliveryId}` (self-describing `{deliveryId, orderId, lat, lng, etaMinutes}` payload) → the socket server's dedicated ioredis `PSUBSCRIBE tracking:*` bridge → `location:update` to the customer's order room AND the admin watch room; the Redis adapter then routes the emission to whichever node holds the socket.

**REST↔socket wiring (post-commit side effects)** — `order:new`: order placement (wallet/cod) in orders.service + payment capture (gateway) in payments.service. `order:status_changed` (customer + seller rooms): customer cancel, seller transitions, admin force-status, pickup→out_for_delivery, delivered. `delivery:assigned`: auto + manual assignment (payload carries pickup/drop addresses + masked customer phone). `payout:processed`: mark-paid (seller room; rider room extension). `notification:new`: the central notify() helpers of orders/payments/payouts/delivery/assignment. `admin:event` (`admin:global`): seller.registered, delivery.failed, order.high_value (>₹5000), payment.failed, support.high_priority (helper ready — no customer ticket-creation route exists yet; wired when it lands).

**Chat history REST** — `GET /api/chat/:orderId/messages?before=<messageId>&limit=20` (CUSTOMER/SELLER), same `verifyOrderAccess` rule as the socket (404, never 403, for foreign orders), cursor pagination on the ObjectId (`hasMore` + `nextCursor` for scroll-up). MongoDB `ChatMessage` model: `orderId+createdAt` compound index, ≤1000-char content.

**Rooms & leaks** — Socket.io drops a disconnected socket's room memberships automatically (asserted in tests); riders' online status is governed by the REST availability endpoint + location-key TTL, NOT socket lifetime.

**Docker** — `docker-compose.yml` now exists at the REPO ROOT per spec (`postgres:16`/`mongo:7`/`redis:7-alpine` + volumes) and `package.json` gained `docker:up`/`docker:down`/`docker:logs` (run from `prinzex-backend/`). The richer `prinzex-backend/docker-compose.yml` (healthchecks, restart policies, container names) is kept — either stack maps the same ports; root = spec-minimal, backend = hardened.

Deviation notes: CORS for the socket server reuses `CORS_ORIGIN` (the project's single source of truth for frontend origins) instead of introducing a duplicate `FRONTEND_URL` var. `@types/socket.io` was installed per spec (it's a deprecated stub — socket.io ships its own declarations). `InitSocketOptions` (`withRedisAdapter`/`withTrackingSubscriber`) is the documented test seam used by the offline verification suite; `server.ts` always passes neither flag (full setup).

```js
// client quick-start (any namespace)
import { io } from 'socket.io-client';
const s = io('http://localhost:4000/orders', { auth: { token: accessToken } }); // customer
s.on('order:status_changed', ({ orderId, status }) => renderStatus(orderId, status));
const t = io('http://localhost:4000/tracking', { auth: { token: accessToken } });
t.emit('join:order', orderId);
t.on('location:update', ({ lat, lng, etaMinutes }) => moveRiderPin(lat, lng, etaMinutes));
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
| `npm run docker:up/down/logs` | local Postgres+Mongo+Redis stack (compose)      |

## Layout

```
prisma/            schema.prisma, migrations/, seed.ts
src/
  config/          env (envalid), database (Prisma), mongo (Mongoose), redis (ioredis), logger (Winston)
  models/mongo/    OrderTimeline, Tracking, Notification, ActivityLog, Content, ChatMessage
  middlewares/     requestLogger, authenticate, authorizeRoles, rateLimiter, validate, notFound, errorHandler
  modules/         auth, seller-auth, delivery-auth, admin-auth, customer, stores, upload,
                   seller-registration, seller, orders, delivery, tracking, payments, payouts,
                   chat, admin/{users,sellers,analytics,content,support,admins,reviews,logs}
                   (one folder per feature: routes/controller/service/schema)
  realtime/        socket.server (init+adapter), socket.registry (Io handle), socket.auth,
                   realtime.emitters (typed events/rooms), namespaces/{tracking,orders,chat,admin}
  utils/           ApiError, ApiResponse, asyncHandler, jwt, hash, otp, email, pagination,
                   cache, fileUpload, rateLimitStore, geo, financial, activityLogger
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
- All planned backend steps (1–9) are complete. Coupons and customer-facing support-ticket creation may land as future extensions.
