import { getSessionOr401, requireModule } from "@/lib/auth-helpers";
import {
  executeInventoryInboundForSession,
  type InventoryInboundType,
} from "@/lib/inventory-inbound";
import { NextResponse } from "next/server";

type InboundBody = {
  internalProductId?: string;
  warehouseId?: string;
  quantity?: number;
  inboundType?: InventoryInboundType;
  sellerSku?: string | null;
};

export async function POST(request: Request) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const denied = requireModule(authResult.session, "inventoryManagement");
  if (denied) return denied;

  const body = (await request.json()) as InboundBody;
  const internalProductId = body.internalProductId?.trim();
  const warehouseId = body.warehouseId?.trim();
  const inboundType = body.inboundType;

  if (!internalProductId || !warehouseId || !inboundType) {
    return NextResponse.json({ error: "缺少内部产品、仓库或入库类型" }, { status: 400 });
  }

  if (inboundType !== "purchase" && inboundType !== "borrow") {
    return NextResponse.json({ error: "无效的入库类型" }, { status: 400 });
  }

  const result = await executeInventoryInboundForSession(authResult.session, {
    internalProductId,
    warehouseId,
    quantity: body.quantity ?? 0,
    inboundType,
    sellerSku: body.sellerSku,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: result.movementId }, { status: 201 });
}
