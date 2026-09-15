-- Pincode registry: single structured source of truth for delivery
-- geography. Replaces free-text rider zones (DeliveryBoyZone) and the
-- admin panel's hardcoded zone suggestions. Matching everywhere becomes an
-- exact pincode equality against this table; zone_label is display-only.

CREATE TABLE "Pincode" (
    "pincode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "zoneLabel" TEXT NOT NULL,
    "serviceable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pincode_pkey" PRIMARY KEY ("pincode")
);

CREATE INDEX "Pincode_city_idx" ON "Pincode"("city");
CREATE INDEX "Pincode_serviceable_idx" ON "Pincode"("serviceable");

-- Backfill the registry from every pincode already referenced anywhere
-- (store coverage, customer/store addresses) so the FK below cannot fail.
-- Labels start neutral; admins refine them in the delivery-zone UI.
INSERT INTO "Pincode" ("pincode", "city", "zoneLabel", "serviceable", "createdAt", "updatedAt")
SELECT DISTINCT p.pincode, 'Kolkata', 'Zone ' || p.pincode, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
  SELECT pincode FROM "SellerPincode"
  UNION
  SELECT pincode FROM "Seller"
  UNION
  SELECT pincode FROM "Address"
) p
WHERE p.pincode IS NOT NULL AND p.pincode <> ''
ON CONFLICT ("pincode") DO NOTHING;

-- Store coverage now references the registry.
ALTER TABLE "SellerPincode"
  ADD CONSTRAINT "SellerPincode_pincode_fkey"
  FOREIGN KEY ("pincode") REFERENCES "Pincode"("pincode") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rider coverage: structured pincode rows replacing free-text zone names.
CREATE TABLE "DeliveryBoyPincode" (
    "id" TEXT NOT NULL,
    "deliveryBoyId" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,

    CONSTRAINT "DeliveryBoyPincode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeliveryBoyPincode_deliveryBoyId_pincode_key"
  ON "DeliveryBoyPincode"("deliveryBoyId", "pincode");
CREATE INDEX "DeliveryBoyPincode_pincode_idx" ON "DeliveryBoyPincode"("pincode");

ALTER TABLE "DeliveryBoyPincode"
  ADD CONSTRAINT "DeliveryBoyPincode_deliveryBoyId_fkey"
  FOREIGN KEY ("deliveryBoyId") REFERENCES "DeliveryBoy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeliveryBoyPincode"
  ADD CONSTRAINT "DeliveryBoyPincode_pincode_fkey"
  FOREIGN KEY ("pincode") REFERENCES "Pincode"("pincode") ON DELETE CASCADE ON UPDATE CASCADE;

-- Free-text zones are gone: the registry is the only geographic truth.
DROP TABLE "DeliveryBoyZone";
