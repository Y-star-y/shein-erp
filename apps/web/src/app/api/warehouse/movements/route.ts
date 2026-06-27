import { MovementType } from "@prisma/client";
import { NextResponse } from "next/server";
import { auditActorId, writeAuditLog } from "@/lib/audit-log";
import { getSessionOr401, requireModule } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export type WarehouseMovementType = "inbound" | "outbound";

export interface WarehouseMovementRow {
  id: string;
  type: WarehouseMovementType;
  sku: string;
  productName: string;
  quantity: number;
  warehouse: string;
  operator: string;
  createdAt: string;
  remark?: string;
}

const INBOUND_TYPES: MovementType[] = ["PURCHASE_IN", "ADJUST_IN", "INITIAL"];
const OUTBOUND_TYPES: MovementType[] = ["SALES_OUT", "ADJUST_OUT"];

function mapMovementType(type: MovementType): WarehouseMovementType {
  return INBOUND_TYPES.includes(type) ? "inbound" : "outbound";
}

async function resolveWarehouse(warehouseName: string) {
  const trimmed = warehouseName.trim();
  const code = trimmed.replace(/\s+/g, "-").toUpperCase().slice(0, 32) || "DEFAULT";
  return prisma.warehouse.upsert({
    where: { code },
    update: { name: trimmed },
    create: { code, name: trimmed },
  });
}

/** 入出库流水 */
export async function GET(request: Request) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const denied = requireModule(authResult.session, "warehouseManagement");
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as WarehouseMovementType | null;

  const typeFilter =
    type === "inbound"
      ? { type: { in: INBOUND_TYPES } }
      : type === "outbound"
        ? { type: { in: OUTBOUND_TYPES } }
        : {};

  const movements = await prisma.stockMovement.findMany({
    where: typeFilter,
    include: {
      sku: { include: { product: { select: { name: true } } } },
      warehouse: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const rows: WarehouseMovementRow[] = movements.map((m) => ({
    id: m.id,
    type: mapMovementType(m.type),
    sku: m.sku.code,
    productName: m.sku.product.name,
    quantity: m.quantity,
    warehouse: m.warehouse.name,
    operator: "—",
    createdAt: m.createdAt.toISOString(),
    remark: m.reason ?? undefined,
  }));

  return NextResponse.json({ rows, type: type ?? "all" });
}

export async function POST(request: Request) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const denied = requireModule(authResult.session, "warehouseManagement");
  if (denied) return denied;

  const body = (await request.json()) as {
    type?: WarehouseMovementType;
    sku?: string;
    quantity?: number;
    warehouse?: string;
    remark?: string;
  };

  if (!body.type || !body.sku || !body.quantity || body.quantity <= 0 || !body.warehouse?.trim()) {
    return NextResponse.json({ error: "请填写类型、SKU、仓库与有效数量" }, { status: 400 });
  }

  const skuCode = body.sku.trim();
  const sku = await prisma.sku.findFirst({
    where: {
      OR: [{ code: skuCode }, { sellerSku: skuCode }],
    },
  });

  if (!sku) {
    return NextResponse.json({ error: "未找到该 SKU" }, { status: 400 });
  }

  const warehouse = await resolveWarehouse(body.warehouse);
  const movementType: MovementType =
    body.type === "inbound" ? "ADJUST_IN" : "ADJUST_OUT";
  const referenceNo = `WH-${Date.now()}`;

  try {
    const movement = await prisma.$transaction(async (tx) => {
    const created = await tx.stockMovement.create({
      data: {
        warehouseId: warehouse.id,
        skuId: sku.id,
        type: movementType,
        quantity: body.quantity!,
        referenceNo,
        reason: body.remark?.trim() || null,
      },
    });

    const existing = await tx.stockBalance.findUnique({
      where: { warehouseId_skuId: { warehouseId: warehouse.id, skuId: sku.id } },
    });

    const delta = body.type === "inbound" ? body.quantity! : -body.quantity!;
    const nextQty = (existing?.quantity ?? 0) + delta;

    if (nextQty < 0) {
      throw new Error("库存不足，无法出库");
    }

    await tx.stockBalance.upsert({
      where: { warehouseId_skuId: { warehouseId: warehouse.id, skuId: sku.id } },
      update: { quantity: nextQty },
      create: { warehouseId: warehouse.id, skuId: sku.id, quantity: nextQty },
    });

    return created;
    });

    await writeAuditLog({
    userId: auditActorId(authResult.session),
    action: body.type === "inbound" ? "登记入库" : "登记出库",
    entity: "StockMovement",
    entityId: movement.id,
    detail: {
      sku: skuCode,
      quantity: body.quantity,
      warehouse: warehouse.name,
      remark: body.remark,
    },
  });

  return NextResponse.json({ ok: true, id: movement.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "操作失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
