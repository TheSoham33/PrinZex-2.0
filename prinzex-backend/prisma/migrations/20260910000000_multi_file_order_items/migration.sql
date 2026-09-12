-- Multi-file order items: an order can carry several design files (all with
-- the same specifications) when the service's catalogue entry allows it.
-- fileUrl stays as the legacy single-file read path, mirrored from the array.

ALTER TABLE "OrderItem" ADD COLUMN "fileUrls" TEXT[] NOT NULL DEFAULT '{}';

-- Existing single-file orders join the array representation.
UPDATE "OrderItem" SET "fileUrls" = ARRAY["fileUrl"] WHERE "fileUrl" IS NOT NULL;
