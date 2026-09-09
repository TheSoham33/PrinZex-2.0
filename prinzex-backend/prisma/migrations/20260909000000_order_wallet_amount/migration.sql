-- Partial wallet payment: an order can settle part of its total from the
-- customer's wallet (rest through the gateway / COD). Refunds split on this
-- column — walletAmount returns to the wallet, the remainder to the bank.

ALTER TABLE "Order" ADD COLUMN "walletAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
