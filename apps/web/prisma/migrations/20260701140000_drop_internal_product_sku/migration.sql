-- DropIndex
DROP INDEX IF EXISTS "InternalProduct_internalSku_key";

-- AlterTable
ALTER TABLE "InternalProduct" DROP COLUMN IF EXISTS "internalSku";
