import { auditActorId, writeAuditLog } from "@/lib/audit-log";
import { findAccessibleInternalProductById } from "@/lib/internal-product-access";
import { prisma } from "@/lib/prisma";
import type { MovementType } from "@prisma/client";

export type InventoryInboundType = "purchase" | "borrow";

const INBOUND_LABELS: Record<InventoryInboundType, string> = {
  purchase: "采购入库",
  borrow: "借货入库",
};

function movementTypeForInbound(inboundType: InventoryInboundType): MovementType {
  return inboundType === "purchase" ? "PURCHASE_IN" : "ADJUST_IN";
}

async function resolveSkuForInternalProduct(internalProductId: string, sellerSku: string | null) {
  const keys = [internalProductId, sellerSku?.trim()].filter(Boolean) as string[];
  if (!keys.length) return null;

  return prisma.sku.findFirst({
    where: {
      OR: keys.flatMap((key) => [{ code: key }, { sellerSku: key }]),
    },
  });
}

export async function executeInventoryInbound(input: {
  internalProductId: string;
  sellerSku: string | null;
  warehouseId: string;
  quantity: number;
  inboundType: InventoryInboundType;
  actorUserId: string;
  logisticsNo?: string | null;
}) {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: input.warehouseId, active: true },
  });
  if (!warehouse) {
    return { error: "仓库不存在或已停用" as const };
  }

  const sku = await resolveSkuForInternalProduct(input.internalProductId, input.sellerSku);
  if (!sku) {
    return { error: "未找到仓库 SKU，无法入库" as const };
  }

  const label = INBOUND_LABELS[input.inboundType];
  const referenceNo = `INV-${Date.now()}`;
  const inventorySource = input.inboundType === "purchase" ? "PURCHASE_INBOUND" : "BORROW_INBOUND";

  try {
    const movement = await prisma.$transaction(async (tx) => {
      const created = await tx.stockMovement.create({
        data: {
          warehouseId: warehouse.id,
          skuId: sku.id,
          type: movementTypeForInbound(input.inboundType),
          quantity: input.quantity,
          referenceNo,
          reason: label,
        },
      });

      const existing = await tx.stockBalance.findUnique({
        where: { warehouseId_skuId: { warehouseId: warehouse.id, skuId: sku.id } },
      });

      const nextQty = (existing?.quantity ?? 0) + input.quantity;
      await tx.stockBalance.upsert({
        where: { warehouseId_skuId: { warehouseId: warehouse.id, skuId: sku.id } },
        update: { quantity: nextQty },
        create: { warehouseId: warehouse.id, skuId: sku.id, quantity: nextQty },
      });

      await tx.internalProductInventoryLog.create({
        data: {
          internalProductId: input.internalProductId,
          direction: "IN",
          source: inventorySource,
          quantity: input.quantity,
          logisticsNo: input.logisticsNo?.trim() || null,
          warehouseId: warehouse.id,
          referenceNo,
          remark: label,
          createdById: input.actorUserId,
        },
      });

      return created;
    });

    await writeAuditLog({
      userId: input.actorUserId,
      action: label,
      entity: "StockMovement",
      entityId: movement.id,
      detail: {
        internalProductId: input.internalProductId,
        sku: sku.code,
        quantity: input.quantity,
        warehouse: warehouse.name,
        inboundType: input.inboundType,
      },
    });

    return { ok: true as const, movementId: movement.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "入库失败";
    return { error: message as const };
  }
}

export async function executeInventoryInboundForSession(
  session: Parameters<typeof findAccessibleInternalProductById>[0],
  body: {
    internalProductId: string;
    warehouseId: string;
    quantity: number;
    inboundType: InventoryInboundType;
    sellerSku?: string | null;
    logisticsNo?: string | null;
  },
) {
  const productResult = await findAccessibleInternalProductById(session, body.internalProductId);
  if ("error" in productResult) {
    return { error: productResult.error };
  }

  if (!Number.isInteger(body.quantity) || body.quantity <= 0) {
    return { error: "请输入有效入库数量" };
  }

  return executeInventoryInbound({
    internalProductId: body.internalProductId,
    sellerSku: body.sellerSku?.trim() || null,
    warehouseId: body.warehouseId,
    quantity: body.quantity,
    inboundType: body.inboundType,
    actorUserId: auditActorId(session),
    logisticsNo: body.logisticsNo,
  });
}
