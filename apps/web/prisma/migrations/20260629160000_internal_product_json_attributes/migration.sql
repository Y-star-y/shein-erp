-- AlterTable: add new columns
ALTER TABLE "InternalProduct" ADD COLUMN "companyName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "InternalProduct" ADD COLUMN "attributes" JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Migrate company name from product group
UPDATE "InternalProduct" AS ip
SET "companyName" = COALESCE(pg."nameCn", '')
FROM "ProductGroup" AS pg
WHERE pg."id" = ip."productGroupId";

-- Migrate legacy scalar fields into JSON attributes
UPDATE "InternalProduct" AS ip
SET "attributes" = COALESCE(
  (
    SELECT jsonb_agg(attr ORDER BY ord)
    FROM (
      SELECT 1 AS ord, jsonb_build_object('key', '产品名称', 'type', 'string', 'value', ip."productNameCn") AS attr
      WHERE COALESCE(BTRIM(ip."productNameCn"), '') <> ''
      UNION ALL
      SELECT 2, jsonb_build_object('key', '规格', 'type', 'string', 'value', ip."specification")
      WHERE COALESCE(BTRIM(ip."specification"), '') <> ''
      UNION ALL
      SELECT 3, jsonb_build_object('key', '颜色', 'type', 'string', 'value', ip."color")
      WHERE COALESCE(BTRIM(ip."color"), '') <> ''
      UNION ALL
      SELECT 4, jsonb_build_object('key', '尺码', 'type', 'string', 'value', ip."size")
      WHERE COALESCE(BTRIM(ip."size"), '') <> ''
      UNION ALL
      SELECT 5, jsonb_build_object('key', '型号', 'type', 'string', 'value', ip."model")
      WHERE COALESCE(BTRIM(ip."model"), '') <> ''
      UNION ALL
      SELECT 6, jsonb_build_object('key', '产品产地', 'type', 'string', 'value', ip."originCountry")
      WHERE COALESCE(BTRIM(ip."originCountry"), '') <> ''
      UNION ALL
      SELECT 7, jsonb_build_object('key', '图片 URL', 'type', 'string', 'value', ip."imageUrl")
      WHERE COALESCE(BTRIM(ip."imageUrl"), '') <> ''
      UNION ALL
      SELECT 8, jsonb_build_object('key', '供应商链接', 'type', 'string', 'value', ip."supplierUrl")
      WHERE COALESCE(BTRIM(ip."supplierUrl"), '') <> ''
    ) AS rows
  ),
  '[]'::jsonb
);

-- Drop legacy columns
ALTER TABLE "InternalProduct" DROP CONSTRAINT IF EXISTS "InternalProduct_productGroupId_fkey";
ALTER TABLE "InternalProduct" DROP COLUMN IF EXISTS "productGroupId";
ALTER TABLE "InternalProduct" DROP COLUMN IF EXISTS "productNameCn";
ALTER TABLE "InternalProduct" DROP COLUMN IF EXISTS "productNameEn";
ALTER TABLE "InternalProduct" DROP COLUMN IF EXISTS "specification";
ALTER TABLE "InternalProduct" DROP COLUMN IF EXISTS "color";
ALTER TABLE "InternalProduct" DROP COLUMN IF EXISTS "size";
ALTER TABLE "InternalProduct" DROP COLUMN IF EXISTS "model";
ALTER TABLE "InternalProduct" DROP COLUMN IF EXISTS "shippingName";
ALTER TABLE "InternalProduct" DROP COLUMN IF EXISTS "description";
ALTER TABLE "InternalProduct" DROP COLUMN IF EXISTS "imageUrl";
ALTER TABLE "InternalProduct" DROP COLUMN IF EXISTS "supplierUrl";
ALTER TABLE "InternalProduct" DROP COLUMN IF EXISTS "purchaseLeadDays";
ALTER TABLE "InternalProduct" DROP COLUMN IF EXISTS "declaredValue";
ALTER TABLE "InternalProduct" DROP COLUMN IF EXISTS "declaredCurrency";
ALTER TABLE "InternalProduct" DROP COLUMN IF EXISTS "weightGram";
ALTER TABLE "InternalProduct" DROP COLUMN IF EXISTS "lengthCm";
ALTER TABLE "InternalProduct" DROP COLUMN IF EXISTS "widthCm";
ALTER TABLE "InternalProduct" DROP COLUMN IF EXISTS "heightCm";
ALTER TABLE "InternalProduct" DROP COLUMN IF EXISTS "hsCode";
ALTER TABLE "InternalProduct" DROP COLUMN IF EXISTS "originCountry";
ALTER TABLE "InternalProduct" DROP COLUMN IF EXISTS "hasBattery";
ALTER TABLE "InternalProduct" DROP COLUMN IF EXISTS "isSensitiveCargo";
