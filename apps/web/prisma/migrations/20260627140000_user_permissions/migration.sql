-- CreateEnum
CREATE TYPE "AppModule" AS ENUM ('dashboard', 'companySku', 'platformMappings', 'userManagement');

-- AlterEnum
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'OPERATIONS', 'LOGISTICS');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING (
  CASE "role"::text
    WHEN 'ADMIN' THEN 'ADMIN'::"Role_new"
    ELSE 'OPERATIONS'::"Role_new"
  END
);
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";

-- AlterTable
ALTER TABLE "User" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "permissions" "AppModule"[] DEFAULT ARRAY[]::"AppModule"[],
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
