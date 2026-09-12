-- Seller configurable minimum order quantity:
--   SellerService.minQuantity — lowest quantity a customer may order for the
--   service; the storefront defaults the order quantity to this value and
--   refuses to go below it. Existing rows start at 1 (no behaviour change).

-- AlterTable
ALTER TABLE "SellerService" ADD COLUMN "minQuantity" INTEGER NOT NULL DEFAULT 1;
