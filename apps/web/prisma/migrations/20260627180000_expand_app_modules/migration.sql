-- Replace AppModule enum and remap existing User.permissions arrays.

CREATE TYPE "AppModule_new" AS ENUM (
  'productManagement',
  'storeManagement',
  'inventoryManagement',
  'orderManagement',
  'platformMappings',
  'warehouseManagement',
  'userManagement'
);

ALTER TABLE "User" ADD COLUMN "permissions_new" "AppModule_new"[] NOT NULL DEFAULT ARRAY[]::"AppModule_new"[];

UPDATE "User" AS u
SET "permissions_new" = COALESCE(
  (
    SELECT array_agg(mapped ORDER BY mapped)
    FROM unnest(u.permissions) AS elem
    CROSS JOIN LATERAL (
      SELECT CASE elem::text
        WHEN 'companySku' THEN 'productManagement'::"AppModule_new"
        WHEN 'platformMappings' THEN 'platformMappings'::"AppModule_new"
        WHEN 'userManagement' THEN 'userManagement'::"AppModule_new"
        WHEN 'productManagement' THEN 'productManagement'::"AppModule_new"
        WHEN 'storeManagement' THEN 'storeManagement'::"AppModule_new"
        WHEN 'inventoryManagement' THEN 'inventoryManagement'::"AppModule_new"
        WHEN 'orderManagement' THEN 'orderManagement'::"AppModule_new"
        WHEN 'warehouseManagement' THEN 'warehouseManagement'::"AppModule_new"
        ELSE NULL
      END AS mapped
    ) AS mapped_row
    WHERE mapped IS NOT NULL
  ),
  ARRAY[]::"AppModule_new"[]
);

ALTER TABLE "User" DROP COLUMN "permissions";
ALTER TABLE "User" RENAME COLUMN "permissions_new" TO "permissions";

DROP TYPE "AppModule";
ALTER TYPE "AppModule_new" RENAME TO "AppModule";
