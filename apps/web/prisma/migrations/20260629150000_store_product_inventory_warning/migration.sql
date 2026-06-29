-- CreateTable
CREATE TABLE "StoreProductInventoryWarning" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "internalProductId" TEXT NOT NULL,
    "warningQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreProductInventoryWarning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreProductInventoryWarning_storeId_idx" ON "StoreProductInventoryWarning"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreProductInventoryWarning_storeId_internalProductId_key" ON "StoreProductInventoryWarning"("storeId", "internalProductId");

-- AddForeignKey
ALTER TABLE "StoreProductInventoryWarning" ADD CONSTRAINT "StoreProductInventoryWarning_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreProductInventoryWarning" ADD CONSTRAINT "StoreProductInventoryWarning_internalProductId_fkey" FOREIGN KEY ("internalProductId") REFERENCES "InternalProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "InternalProduct" DROP COLUMN "defaultWarningQuantity";
