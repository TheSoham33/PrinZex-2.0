-- City registry: operational cities become structured rows (the storefront
-- picker, per-city fee overrides and pincode grouping all read from here).
-- Presence/assignment were already city-keyed, so this completes the picture.

CREATE TABLE "City" (
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deliveryFees" JSONB,
    "deliveryEtaHours" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("slug")
);

CREATE UNIQUE INDEX "City_name_key" ON "City"("name");
CREATE INDEX "City_active_idx" ON "City"("active");

-- Every city already referenced by pincodes becomes a registry row (active),
-- plus the platform default Kolkata; admins tune/cull from the admin panel.
INSERT INTO "City" ("slug", "name", "active", "createdAt", "updatedAt")
SELECT DISTINCT LOWER(REPLACE(TRIM(city), ' ', '-')), TRIM(city), true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Pincode"
WHERE city IS NOT NULL AND TRIM(city) <> ''
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "City" ("slug", "name", "active", "createdAt", "updatedAt")
VALUES ('kolkata', 'Kolkata', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

-- Pincodes now reference the registry instead of carrying a free-text city.
ALTER TABLE "Pincode" ADD COLUMN "citySlug" TEXT;

UPDATE "Pincode" SET "citySlug" = LOWER(REPLACE(TRIM(city), ' ', '-')) WHERE city IS NOT NULL;

-- Anything unmapped (blank city) falls back to the default city so the FK
-- and NOT NULL can hold.
UPDATE "Pincode" SET "citySlug" = 'kolkata' WHERE "citySlug" IS NULL OR "citySlug" = '';

ALTER TABLE "Pincode" ALTER COLUMN "citySlug" SET NOT NULL;

DROP INDEX IF EXISTS "Pincode_city_idx";
CREATE INDEX "Pincode_citySlug_idx" ON "Pincode"("citySlug");

ALTER TABLE "Pincode"
  ADD CONSTRAINT "Pincode_citySlug_fkey"
  FOREIGN KEY ("citySlug") REFERENCES "City"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Pincode" DROP COLUMN "city";
