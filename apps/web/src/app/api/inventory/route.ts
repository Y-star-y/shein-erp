import { getSessionOr401, requireModule } from "@/lib/auth-helpers";
import { buildInternalProductInventoryForSession } from "@/lib/internal-product-inventory";
import { NextResponse } from "next/server";

/** 库存概览：按当前账号可访问的内部商品汇总各仓库数量 */
export async function GET() {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const denied = requireModule(authResult.session, "inventoryManagement");
  if (denied) return denied;

  const rows = await buildInternalProductInventoryForSession(authResult.session);
  return NextResponse.json({ rows });
}
