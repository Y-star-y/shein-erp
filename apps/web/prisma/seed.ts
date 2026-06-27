import { PrismaClient, type AppModule } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_PERMISSIONS: AppModule[] = [
  "productManagement",
  "storeManagement",
  "inventoryManagement",
  "orderManagement",
  "platformMappings",
  "warehouseManagement",
  "userManagement",
];

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@example.com").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "change-me-on-first-login";
  const name = process.env.ADMIN_NAME ?? "超级管理员";
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      role: "ADMIN",
      passwordHash,
      active: true,
      permissions: ADMIN_PERMISSIONS,
      mustChangePassword: true,
    },
    create: {
      email,
      name,
      role: "ADMIN",
      passwordHash,
      active: true,
      permissions: ADMIN_PERMISSIONS,
      mustChangePassword: true,
    },
  });

  console.log(`Seeded admin user: ${admin.email} (${admin.id})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
