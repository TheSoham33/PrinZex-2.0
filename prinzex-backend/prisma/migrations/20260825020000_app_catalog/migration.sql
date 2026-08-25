-- Admin-managed catalogue: services, paper types/sizes and every
-- customization option group now live in the database (one JSON row per
-- group key). Seeded with the previously hard-coded defaults; admin edits
-- propagate to seller and customer UIs without a deploy.

-- CreateTable
CREATE TABLE "CatalogEntry" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogEntry_pkey" PRIMARY KEY ("key")
);
