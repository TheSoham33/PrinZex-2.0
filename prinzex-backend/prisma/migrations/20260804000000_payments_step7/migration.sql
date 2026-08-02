-- Step 7 (Payments & Payouts) schema addition:
--   Payout.transactionRef — manual bank-transfer reference set on mark-paid.

-- AlterTable
ALTER TABLE "Payout" ADD COLUMN "transactionRef" TEXT;
