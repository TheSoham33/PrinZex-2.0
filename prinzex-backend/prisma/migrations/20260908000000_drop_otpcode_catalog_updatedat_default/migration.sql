-- ponytail cleanup:
-- 1. Drop the leftover "OtpCode" table. OTPs are stored in Redis
--    (src/utils/otp.ts, key otp:{identifier}:{purpose}, TTL-guarded); the
--    Postgres model was never referenced by any code path, so the table is
--    guaranteed empty.
ALTER TABLE "OtpCode" DROP CONSTRAINT "OtpCode_userId_fkey";
DROP TABLE "OtpCode";

-- 2. Give "CatalogEntry"."updatedAt" a DB-level default. Catalogue content is
--    seeded by raw-SQL INSERTs in migrations; Prisma's @updatedAt only fills
--    the column on client writes, so a migration that forgets the column aborts
--    mid-deploy (P3006). The default makes raw inserts boring-safe.
ALTER TABLE "CatalogEntry" ALTER COLUMN "updatedAt" SET DEFAULT NOW();
