-- GST invoice snapshot (gap #9): the taxable base the order's GST was
-- computed on and the GST rate used. Both are frozen at order time so the
-- downloadable invoice reproduces the exact charge even if the admin later
-- retunes the GST rate or the "GST on fees" toggle.

ALTER TABLE "Order" ADD COLUMN "taxableAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "gstRatePercent" DECIMAL(10,2) NOT NULL DEFAULT 0;
