-- Add store ownership: each store belongs to one employee; admin sees all.

ALTER TABLE "Store" ADD COLUMN "ownerId" TEXT;

UPDATE "Store"
SET "ownerId" = (
  SELECT "id" FROM "User" WHERE "role" = 'ADMIN' ORDER BY "createdAt" ASC LIMIT 1
);

ALTER TABLE "Store" ALTER COLUMN "ownerId" SET NOT NULL;

ALTER TABLE "Store" ADD CONSTRAINT "Store_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "Store_name_key";

CREATE UNIQUE INDEX "Store_ownerId_name_key" ON "Store"("ownerId", "name");
