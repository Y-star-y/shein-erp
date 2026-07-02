import { getSessionOr401, requireModule } from "@/lib/auth-helpers";
import { listPurchaseOrdersForSession } from "@/lib/internal-product-inventory-log";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const denied = requireModule(authResult.session, "inventoryManagement");
  if (denied) return denied;

  const result = await listPurchaseOrdersForSession(authResult.session);
  return NextResponse.json(result);
}
