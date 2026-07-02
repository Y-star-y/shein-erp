import { getSessionOr401, requireModule } from "@/lib/auth-helpers";
import { findInternalProductsForSession } from "@/lib/internal-product-access";
import { toCompanySku } from "@/lib/master-data";
import { NextResponse } from "next/server";

/** 当前账号可访问的内部产品（用于库存批量采购选品） */
export async function GET() {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const denied = requireModule(authResult.session, "inventoryManagement");
  if (denied) return denied;

  const products = await findInternalProductsForSession(authResult.session);
  return NextResponse.json({
    products: products.map(toCompanySku).filter((product) => product.status === "active"),
  });
}
