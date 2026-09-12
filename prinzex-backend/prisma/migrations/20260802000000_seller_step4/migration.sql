-- Step 4 (Seller APIs) schema additions:
--   1. Seller.metadata       — JSON blob for seller-defined configuration
--                              (bulk discount tiers, store hours)
--   2. Order.payoutId        — links a delivered order to the Payout that
--                              settled it; NULL = earnings still pending

-- AlterTable
ALTER TABLE "Seller" ADD COLUMN "metadata" JSONB;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "payoutId" TEXT;

-- CreateIndex
CREATE INDEX "Order_payoutId_idx" ON "Order"("payoutId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
