-- CreateEnum
CREATE TYPE "InternalProductInventoryDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "InternalProductInventorySource" AS ENUM (
  'BATCH_PURCHASE',
  'PURCHASE_INBOUND',
  'BORROW_INBOUND',
  'SALES_OUTBOUND',
  'ADJUST_IN',
  'ADJUST_OUT'
);

-- CreateTable
CREATE TABLE "InternalProductInventoryLog" (
    "id" TEXT NOT NULL,
    "internalProductId" TEXT NOT NULL,
    "direction" "InternalProductInventoryDirection" NOT NULL,
    "source" "InternalProductInventorySource" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "logisticsNo" TEXT,
    "warehouseId" TEXT,
    "batchNo" TEXT,
    "referenceNo" TEXT,
    "remark" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalProductInventoryLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InternalProductInventoryLog_internalProductId_createdAt_idx" ON "InternalProductInventoryLog"("internalProductId", "createdAt");

-- CreateIndex
CREATE INDEX "InternalProductInventoryLog_logisticsNo_idx" ON "InternalProductInventoryLog"("logisticsNo");

-- CreateIndex
CREATE INDEX "InternalProductInventoryLog_batchNo_idx" ON "InternalProductInventoryLog"("batchNo");

-- AddForeignKey
ALTER TABLE "InternalProductInventoryLog" ADD CONSTRAINT "InternalProductInventoryLog_internalProductId_fkey" FOREIGN KEY ("internalProductId") REFERENCES "InternalProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalProductInventoryLog" ADD CONSTRAINT "InternalProductInventoryLog_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalProductInventoryLog" ADD CONSTRAINT "InternalProductInventoryLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
