import { getSessionOr401, requireModule } from "@/lib/auth-helpers";
import { createBatchPurchaseLogs } from "@/lib/internal-product-inventory-log";
import { NextResponse } from "next/server";

type BatchPurchaseBody = {
  logisticsNo?: string;
  lines?: { internalProductId: string; quantity: number }[];
};

export async function POST(request: Request) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const denied = requireModule(authResult.session, "inventoryManagement");
  if (denied) return denied;

  const body = (await request.json()) as BatchPurchaseBody;
  const result = await createBatchPurchaseLogs(authResult.session, {
    logisticsNo: body.logisticsNo?.trim() ?? "",
    lines: body.lines ?? [],
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    batchNo: result.batchNo,
    logs: result.logs,
  });
}
