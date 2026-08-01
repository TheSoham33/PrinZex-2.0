-- ============================================================================
-- PrinZex PostgreSQL schema (primary relational store)
-- Apply with:  psql "$DATABASE_URL" -f db/schema.sql
-- or during setup:  node scripts/setup-db.mjs
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "users" (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  role          text NOT NULL DEFAULT 'CUSTOMER',
  name          text NOT NULL,
  email         text NOT NULL UNIQUE,
  phone         text,
  "passwordHash" text NOT NULL,
  status        text NOT NULL DEFAULT 'ACTIVE',
  "emailVerified" boolean NOT NULL DEFAULT false,
  "createdAt"   timestamptz NOT NULL DEFAULT now(),
  "updatedAt"   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "sellers" (
  id             text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"       text NOT NULL UNIQUE REFERENCES "users"(id) ON DELETE CASCADE,
  status         text NOT NULL DEFAULT 'PENDING',
  "storeName"    text NOT NULL,
  "ownerName"    text NOT NULL,
  email          text NOT NULL UNIQUE,
  phone          text,
  "gstNumber"    text,
  "businessType" text,
  "storeAddress" text,
  city           text,
  state          text,
  pincode        text,
  "openingTime"  text,
  "closingTime"  text,
  "storeLogo"    text,
  "storeBanner"  text,
  "accountNumber" text,
  "ifscCode"     text,
  "commissionRate" double precision NOT NULL DEFAULT 0.12,
  "rejectionReason" text,
  "createdAt"    timestamptz NOT NULL DEFAULT now(),
  "updatedAt"    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "categories" (
  id     text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name   text NOT NULL UNIQUE,
  slug   text NOT NULL UNIQUE,
  icon   text,
  ord    integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS "services" (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "sellerId"  text NOT NULL REFERENCES "sellers"(id) ON DELETE CASCADE,
  "categoryId" text REFERENCES "categories"(id) ON DELETE SET NULL,
  name        text NOT NULL,
  description text,
  price       double precision NOT NULL DEFAULT 0,
  "priceUnit" text,
  image       text,
  active      boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS "store_hours" (
  id      text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "storeId" text NOT NULL REFERENCES "sellers"(id) ON DELETE CASCADE,
  day     text NOT NULL,
  open    text,
  close   text,
  closed  boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS "addresses" (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"   text NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  label      text,
  "fullName" text,
  phone      text,
  street     text NOT NULL,
  city       text,
  state      text,
  pincode    text,
  "isDefault" boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS "orders" (
  id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "orderNumber"   text NOT NULL UNIQUE,
  "userId"        text NOT NULL REFERENCES "users"(id),
  "sellerId"      text NOT NULL REFERENCES "sellers"(id),
  status          text NOT NULL DEFAULT 'PENDING',
  "paymentStatus" text NOT NULL DEFAULT 'UNPAID',
  "paymentMethod" text,
  subtotal        double precision NOT NULL DEFAULT 0,
  tax             double precision NOT NULL DEFAULT 0,
  "deliveryFee"   double precision NOT NULL DEFAULT 0,
  total           double precision NOT NULL DEFAULT 0,
  "addressId"     text REFERENCES "addresses"(id) ON DELETE SET NULL,
  "deliverySpeed" text,
  "deliveryNotes" text,
  "deliveredAt"   timestamptz,
  "createdAt"     timestamptz NOT NULL DEFAULT now(),
  "updatedAt"     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "order_items" (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "orderId"  text NOT NULL REFERENCES "orders"(id) ON DELETE CASCADE,
  "serviceId" text REFERENCES "services"(id) ON DELETE SET NULL,
  name       text NOT NULL,
  quantity   integer NOT NULL DEFAULT 1,
  "unitPrice" double precision NOT NULL DEFAULT 0,
  "totalPrice" double precision NOT NULL DEFAULT 0,
  specs      jsonb
);

CREATE TABLE IF NOT EXISTS "order_timeline" (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "orderId"  text NOT NULL REFERENCES "orders"(id) ON DELETE CASCADE,
  status     text NOT NULL,
  label      text NOT NULL,
  note       text,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "wallets" (
  id      text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" text NOT NULL UNIQUE REFERENCES "users"(id) ON DELETE CASCADE,
  balance double precision NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "transactions" (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"   text NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  "walletId" text REFERENCES "wallets"(id) ON DELETE SET NULL,
  "orderId"  text REFERENCES "orders"(id) ON DELETE SET NULL,
  type       text NOT NULL,
  title      text NOT NULL,
  description text,
  amount     double precision NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "reviews" (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "orderId"  text NOT NULL REFERENCES "orders"(id) ON DELETE CASCADE,
  "sellerId" text NOT NULL REFERENCES "sellers"(id) ON DELETE CASCADE,
  "userId"   text NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
  rating     integer NOT NULL,
  title      text,
  body       text,
  response   text,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "inventory_items" (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "sellerId" text NOT NULL REFERENCES "sellers"(id) ON DELETE CASCADE,
  name       text NOT NULL,
  category   text,
  quantity   integer NOT NULL DEFAULT 0,
  unit       text,
  "minStock" integer NOT NULL DEFAULT 0,
  "costPerUnit" double precision
);

CREATE TABLE IF NOT EXISTS "payouts" (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "sellerId" text NOT NULL REFERENCES "sellers"(id) ON DELETE CASCADE,
  amount     double precision NOT NULL,
  status     text NOT NULL DEFAULT 'pending',
  period     text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "paidAt"   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON "orders"("userId");
CREATE INDEX IF NOT EXISTS idx_orders_seller ON "orders"("sellerId");
CREATE INDEX IF NOT EXISTS idx_services_seller ON "services"("sellerId");
CREATE INDEX IF NOT EXISTS idx_transactions_user ON "transactions"("userId");
CREATE INDEX IF NOT EXISTS idx_reviews_seller ON "reviews"("sellerId");
