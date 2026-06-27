-- Prisma @updatedAt columns should not keep a DB-level default after backfill.
ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;
