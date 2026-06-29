import { getSessionOr401 } from "@/lib/auth-helpers";
import { canAccessModule } from "@/lib/permissions";
import { fetchPendingStoreCounts } from "@/lib/pending-tasks";
import { NextResponse } from "next/server";

/** 按店铺统计待处理（PENDING）订单数 */
export async function GET() {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const canStore = canAccessModule(authResult.session.user, "storeManagement");
  const canOrder = canAccessModule(authResult.session.user, "orderManagement");
  if (!canStore && !canOrder) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const stores = await fetchPendingStoreCounts(authResult.session);
  const total = stores.reduce((sum, store) => sum + store.count, 0);

  return NextResponse.json({ stores, total });
}
