-- Seller configurable minimum page count:
--   SellerService.minPages — when set, a customer's uploaded PDF must contain
--   at least this many pages for the service (e.g. Hard Binding theses often
--   need a minimum thickness). NULL (the default) means no page minimum.

-- AlterTable
ALTER TABLE "SellerService" ADD COLUMN "minPages" INTEGER;
