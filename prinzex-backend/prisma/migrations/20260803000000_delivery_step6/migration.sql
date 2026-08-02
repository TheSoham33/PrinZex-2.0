-- Step 6 (Delivery & Tracking) schema additions:
--   1. DeliveryBoy.pendingEarnings — withdrawable earnings balance
--   2. Delivery.earningsAmount     — per-delivery earning (fee + rush premium)
--   3. Delivery.payoutId           — locks earnings into a delivery payout

-- AlterTable
ALTER TABLE "DeliveryBoy" ADD COLUMN "pendingEarnings" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN "earningsAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Delivery" ADD COLUMN "payoutId" TEXT;

-- CreateIndex
CREATE INDEX "Delivery_payoutId_idx" ON "Delivery"("payoutId");

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
