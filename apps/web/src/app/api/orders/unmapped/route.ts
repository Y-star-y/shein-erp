import { getSessionOr401 } from "@/lib/auth-helpers";
import { canAccessModule } from "@/lib/permissions";
import { fetchUnmappedOrderLines } from "@/lib/pending-tasks";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const canStore = canAccessModule(authResult.session.user, "storeManagement");
  const canOrder = canAccessModule(authResult.session.user, "orderManagement");
  if (!canStore && !canOrder) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const storeId = new URL(request.url).searchParams.get("storeId")?.trim() || undefined;
  return NextResponse.json(await fetchUnmappedOrderLines(authResult.session, storeId));
}
