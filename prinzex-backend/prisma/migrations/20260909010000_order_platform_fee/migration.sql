-- Platform fee: a flat per-order amount the admin configures in Settings →
-- Platform (Mongo settings doc). Added to the quote total; sellers never earn
-- it and, by default, it must be paid online — never from the wallet.

ALTER TABLE "Order" ADD COLUMN "platformFee" DECIMAL(10,2) NOT NULL DEFAULT 0;
