import { getSessionOr401, requireModule } from "@/lib/auth-helpers";
import { listInternalProductInventoryLogs } from "@/lib/internal-product-inventory-log";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const denied = requireModule(authResult.session, "inventoryManagement");
  if (denied) return denied;

  const { id } = await params;
  const result = await listInternalProductInventoryLogs(authResult.session, id);
  if ("error" in result) {
    const status = result.error === "内部商品不存在" ? 404 : 403;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ logs: result.logs });
}
