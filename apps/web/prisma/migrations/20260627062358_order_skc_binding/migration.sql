-- CreateEnum
CREATE TYPE "OrderLineMappingStatus" AS ENUM ('mapped', 'unmapped');

-- AlterTable
ALTER TABLE "ImportJob" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'shein_order';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "importJobId" TEXT,
ADD COLUMN     "storeId" TEXT;

-- AlterTable
ALTER TABLE "OrderLine" ADD COLUMN     "mappingStatus" "OrderLineMappingStatus" NOT NULL DEFAULT 'unmapped',
ADD COLUMN     "platformSkc" TEXT,
ADD COLUMN     "platformSpu" TEXT,
ADD COLUMN     "sheinMappingId" TEXT;

-- CreateIndex
CREATE INDEX "Order_storeId_idx" ON "Order"("storeId");

-- CreateIndex
CREATE INDEX "Order_importJobId_idx" ON "Order"("importJobId");

-- CreateIndex
CREATE INDEX "OrderLine_platformSkc_mappingStatus_idx" ON "OrderLine"("platformSkc", "mappingStatus");

-- CreateIndex
CREATE INDEX "OrderLine_sheinMappingId_idx" ON "OrderLine"("sheinMappingId");

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_sheinMappingId_fkey" FOREIGN KEY ("sheinMappingId") REFERENCES "SheinProductMapping"("id") ON DELETE SET NULL ON UPDATE CASCADE;
