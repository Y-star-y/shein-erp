import { getSessionOr401 } from "@/lib/auth-helpers";
import { canAccessModule } from "@/lib/permissions";
import { fetchUnmappedStoreCounts } from "@/lib/pending-tasks";
import { NextResponse } from "next/server";

/** 按店铺统计含待绑定商品的异常订单数 */
export async function GET() {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const canStore = canAccessModule(authResult.session.user, "storeManagement");
  const canOrder = canAccessModule(authResult.session.user, "orderManagement");
  if (!canStore && !canOrder) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const stores = await fetchUnmappedStoreCounts(authResult.session);
  const counts: Record<string, number> = {};
  for (const store of stores) {
    counts[store.storeId] = store.count;
  }

  return NextResponse.json({ counts, stores });
}
