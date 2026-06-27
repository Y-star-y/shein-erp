import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOr401, requireModule } from "@/lib/auth-helpers";

/** 库存概览：按 SKU 汇总各仓库数量 */
export async function GET() {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const denied = requireModule(authResult.session, "inventoryManagement");
  if (denied) return denied;

  const skus = await prisma.sku.findMany({
    select: {
      id: true,
      code: true,
      product: { select: { name: true } },
      stocks: { select: { quantity: true } },
    },
    orderBy: { code: "asc" },
    take: 500,
  });

  const rows = skus.map((sku) => {
    const warehouseQty = sku.stocks.reduce((sum, s) => sum + s.quantity, 0);
    return {
      productId: sku.id,
      sku: sku.code,
      name: sku.product.name,
      warehouseQty,
      inTransitQty: 0,
      availableQty: warehouseQty,
    };
  });

  return NextResponse.json({ rows });
}
