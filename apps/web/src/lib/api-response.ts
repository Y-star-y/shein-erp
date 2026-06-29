import { $Enums, Prisma, Role } from "@prisma/client";

const REQUIRED_ROLE = "OPERATIONS";
const REQUIRED_MODULE = "productManagement";

export function getPrismaClientStaleMessage(): string | null {
  const roleValues = Object.values(Role) as string[];
  const moduleValues = Object.values($Enums.AppModule) as string[];
  const storeFields = Object.values(Prisma.StoreScalarFieldEnum) as string[];

  if (!roleValues.includes(REQUIRED_ROLE) || !moduleValues.includes(REQUIRED_MODULE)) {
    return "服务端 Prisma Client 未更新。请先 Ctrl+C 停止 pnpm dev，在 apps/web 执行 pnpm db:generate，再重新 pnpm dev。";
  }

  if (!storeFields.includes("ownerId")) {
    return "店铺归属字段未生效：请先 Ctrl+C 停止 pnpm dev，在 apps/web 执行 pnpm exec prisma migrate deploy && pnpm db:generate，再重新 pnpm dev。";
  }

  const userFields = Object.values(Prisma.UserScalarFieldEnum) as string[];
  if (!userFields.includes("sessionVersion")) {
    return "登录会话字段未生效：请先停止 pnpm dev，执行 pnpm db:generate，再重新 pnpm dev。";
  }

  const orderFields = Object.values(Prisma.OrderScalarFieldEnum) as string[];
  if (!orderFields.includes("deliverBy")) {
    return "订单签收时间字段未生效：请先 Ctrl+C 停止 pnpm dev，在 apps/web 执行 pnpm db:generate，再重新 pnpm dev。";
  }
  if (!orderFields.includes("platformStatus")) {
    return "订单发货状态字段未生效：请先 Ctrl+C 停止 pnpm dev，在 apps/web 执行 pnpm exec prisma migrate deploy && pnpm db:generate，再重新 pnpm dev。";
  }
  if (!orderFields.includes("recipientName")) {
    return "订单发货地址字段未生效：请先 Ctrl+C 停止 pnpm dev，在 apps/web 执行 pnpm exec prisma migrate deploy && pnpm db:generate，再重新 pnpm dev。";
  }

  return null;
}

export async function readJsonResponse<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
