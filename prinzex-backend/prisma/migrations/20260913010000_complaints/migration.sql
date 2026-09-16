-- Complaints / disputes: customer claim on a delivered order, routed to the
-- fulfilling seller first (response window), admin as final escalation tier.
-- See prisma/schema.prisma model Complaint for the lifecycle commentary.

CREATE TYPE "ComplaintType" AS ENUM ('missing_pages', 'wrong_item', 'print_quality', 'damaged_in_transit');

CREATE TYPE "ComplaintStatus" AS ENUM ('pending_seller', 'seller_accepted', 'seller_rejected', 'escalated', 'refunded', 'closed');

CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "type" "ComplaintType" NOT NULL,
    "description" TEXT NOT NULL,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "videoUrl" TEXT,
    "sealIntact" BOOLEAN,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'pending_seller',
    "sellerRespondBy" TIMESTAMP(3) NOT NULL,
    "sellerResponseAt" TIMESTAMP(3),
    "sellerRejectReason" TEXT,
    "escalatedBy" TEXT,
    "escalatedAt" TIMESTAMP(3),
    "escalationReason" TEXT,
    "resolvedBy" TEXT,
    "resolutionNote" TEXT,
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Complaint_orderId_idx" ON "Complaint"("orderId");
CREATE INDEX "Complaint_customerId_idx" ON "Complaint"("customerId");
CREATE INDEX "Complaint_sellerId_idx" ON "Complaint"("sellerId");
CREATE INDEX "Complaint_status_idx" ON "Complaint"("status");
CREATE INDEX "Complaint_status_sellerRespondBy_idx" ON "Complaint"("status", "sellerRespondBy");

ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
