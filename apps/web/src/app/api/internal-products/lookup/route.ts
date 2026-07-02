import { getSessionOr401 } from "@/lib/auth-helpers";
import { findAccessibleInternalProductById } from "@/lib/internal-product-access";
import { toCompanySku } from "@/lib/master-data";
import { canAccessModule } from "@/lib/permissions";
import { NextResponse } from "next/server";

/** 按内部商品 id 查询可访问的内部商品详情 */
export async function GET(request: Request) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const { session } = authResult;
  const canProducts = canAccessModule(session.user, "productManagement");
  const canStore = canAccessModule(session.user, "storeManagement");
  const canOrder = canAccessModule(session.user, "orderManagement");
  if (!canProducts && !canStore && !canOrder) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!id) {
    return NextResponse.json({ error: "缺少 id 参数" }, { status: 400 });
  }

  const result = await findAccessibleInternalProductById(session, id);
  if ("error" in result) {
    const status = result.error === "内部商品不存在" ? 404 : 403;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ product: toCompanySku(result.product) });
}
