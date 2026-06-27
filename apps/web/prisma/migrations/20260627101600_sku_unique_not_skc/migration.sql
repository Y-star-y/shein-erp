-- DropIndex
DROP INDEX IF EXISTS "SheinProductMapping_platformSkc_key";

-- AlterTable
ALTER TABLE "SheinProductMapping" ALTER COLUMN "platformSkc" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SheinProductMapping_platformSku_key" ON "SheinProductMapping"("platformSku");

-- CreateIndex
CREATE UNIQUE INDEX "SheinProductMapping_sellerSku_key" ON "SheinProductMapping"("sellerSku");

-- DropIndex
DROP INDEX IF EXISTS "OrderLine_platformSkc_mappingStatus_idx";

-- CreateIndex
CREATE INDEX "OrderLine_sellerSku_mappingStatus_idx" ON "OrderLine"("sellerSku", "mappingStatus");

-- CreateIndex
CREATE INDEX "OrderLine_platformSku_mappingStatus_idx" ON "OrderLine"("platformSku", "mappingStatus");

-- CreateIndex
CREATE INDEX "OrderLine_platformSkc_idx" ON "OrderLine"("platformSkc");
