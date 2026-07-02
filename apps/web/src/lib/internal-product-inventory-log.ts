import { auditActorId, writeAuditLog } from "@/lib/audit-log";
import { findAccessibleInternalProductById, findInternalProductsForSession } from "@/lib/internal-product-access";
import { prisma } from "@/lib/prisma";
import { getProductDisplayName, normalizeProductAttributes } from "@shein-erp/shared";
import type { PurchaseOrderSummary } from "@shein-erp/shared";
import type {
  InternalProductInventoryDirection,
  InternalProductInventorySource,
} from "@prisma/client";
import type { InternalProductInventoryLogRow } from "@shein-erp/shared";
import type { Session } from "next-auth";

export const INVENTORY_SOURCE_LABELS: Record<InternalProductInventorySource, string> = {
  BATCH_PURCHASE: "批量采购",
  PURCHASE_INBOUND: "采购入库",
  BORROW_INBOUND: "借货入库",
  SALES_OUTBOUND: "销售出库",
  ADJUST_IN: "调整入库",
  ADJUST_OUT: "调整出库",
};

export const INVENTORY_DIRECTION_LABELS: Record<InternalProductInventoryDirection, string> = {
  IN: "入库",
  OUT: "出库",
};

function toLogRow(log: {
  id: string;
  direction: InternalProductInventoryDirection;
  source: InternalProductInventorySource;
  quantity: number;
  logisticsNo: string | null;
  batchNo: string | null;
  referenceNo: string | null;
  remark: string | null;
  createdAt: Date;
  warehouse: { name: string } | null;
  createdBy: { name: string } | null;
}): InternalProductInventoryLogRow {
  return {
    id: log.id,
    direction: log.direction,
    directionLabel: INVENTORY_DIRECTION_LABELS[log.direction],
    source: log.source,
    sourceLabel: INVENTORY_SOURCE_LABELS[log.source],
    quantity: log.quantity,
    logisticsNo: log.logisticsNo,
    warehouseName: log.warehouse?.name ?? null,
    batchNo: log.batchNo,
    referenceNo: log.referenceNo,
    remark: log.remark,
    operatorName: log.createdBy?.name ?? null,
    createdAt: log.createdAt.toLocaleString("zh-CN", { hour12: false }),
  };
}

const logInclude = {
  warehouse: { select: { name: true } },
  createdBy: { select: { name: true } },
} as const;

export async function listInternalProductInventoryLogs(session: Session, internalProductId: string) {
  const productResult = await findAccessibleInternalProductById(session, internalProductId);
  if ("error" in productResult) {
    return productResult;
  }

  const logs = await prisma.internalProductInventoryLog.findMany({
    where: { internalProductId },
    orderBy: { createdAt: "desc" },
    include: logInclude,
  });

  return { logs: logs.map(toLogRow) };
}

export async function getInTransitQtyByProductIds(productIds: string[]) {
  const result = new Map<string, number>();
  if (!productIds.length) {
    return result;
  }

  const groups = await prisma.internalProductInventoryLog.groupBy({
    by: ["internalProductId"],
    where: {
      internalProductId: { in: productIds },
      direction: "IN",
      source: "BATCH_PURCHASE",
    },
    _sum: { quantity: true },
  });

  for (const group of groups) {
    result.set(group.internalProductId, group._sum.quantity ?? 0);
  }

  return result;
}

export async function createBatchPurchaseLogs(
  session: Session,
  input: {
    logisticsNo: string;
    lines: { internalProductId: string; quantity: number }[];
  },
) {
  const logisticsNo = input.logisticsNo.trim();
  if (!logisticsNo) {
    return { error: "请填写物流单号" as const };
  }

  if (!input.lines.length) {
    return { error: "请至少添加一条采购明细" as const };
  }

  const batchNo = `BP-${Date.now()}`;
  const actorId = auditActorId(session);
  const createdLogs = [];

  for (const line of input.lines) {
    const productResult = await findAccessibleInternalProductById(session, line.internalProductId);
    if ("error" in productResult) {
      return { error: productResult.error };
    }
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      return { error: "采购数量必须为正整数" as const };
    }
  }

  const duplicateIds = new Set<string>();
  for (const line of input.lines) {
    if (duplicateIds.has(line.internalProductId)) {
      return { error: "采购清单中不能重复添加同一内部产品" as const };
    }
    duplicateIds.add(line.internalProductId);
  }

  await prisma.$transaction(async (tx) => {
    for (const line of input.lines) {
      const log = await tx.internalProductInventoryLog.create({
        data: {
          internalProductId: line.internalProductId,
          direction: "IN",
          source: "BATCH_PURCHASE",
          quantity: line.quantity,
          logisticsNo,
          batchNo,
          referenceNo: batchNo,
          remark: "批量采购在途",
          createdById: actorId,
        },
        include: logInclude,
      });
      createdLogs.push(log);
    }
  });

  await writeAuditLog({
    userId: actorId,
    action: "批量采购",
    entity: "InternalProductInventoryLog",
    entityId: batchNo,
    detail: {
      logisticsNo,
      batchNo,
      lineCount: input.lines.length,
      totalQuantity: input.lines.reduce((sum, line) => sum + line.quantity, 0),
    },
  });

  return {
    ok: true as const,
    batchNo,
    logs: createdLogs.map(toLogRow),
  };
}

export async function createInternalProductInventoryLog(input: {
  internalProductId: string;
  direction: InternalProductInventoryDirection;
  source: InternalProductInventorySource;
  quantity: number;
  logisticsNo?: string | null;
  warehouseId?: string | null;
  referenceNo?: string | null;
  remark?: string | null;
  createdById?: string | null;
}) {
  return prisma.internalProductInventoryLog.create({
    data: {
      internalProductId: input.internalProductId,
      direction: input.direction,
      source: input.source,
      quantity: input.quantity,
      logisticsNo: input.logisticsNo?.trim() || null,
      warehouseId: input.warehouseId ?? null,
      referenceNo: input.referenceNo?.trim() || null,
      remark: input.remark?.trim() || null,
      createdById: input.createdById ?? null,
    },
    include: logInclude,
  });
}

export async function listPurchaseOrdersForSession(session: Session) {
  const products = await findInternalProductsForSession(session);
  const productIds = products.map((product) => product.id);
  if (!productIds.length) {
    return { orders: [] as PurchaseOrderSummary[] };
  }

  const productNameById = new Map(
    products.map((product) => [
      product.id,
      getProductDisplayName({
        id: product.id,
        attributes: normalizeProductAttributes(product.attributes),
      }),
    ]),
  );

  const logs = await prisma.internalProductInventoryLog.findMany({
    where: {
      internalProductId: { in: productIds },
      source: "BATCH_PURCHASE",
      batchNo: { not: null },
    },
    orderBy: [{ createdAt: "desc" }],
    include: logInclude,
  });

  const grouped = new Map<
    string,
    {
      batchNo: string;
      logisticsNo: string;
      createdAt: Date;
      operatorName: string | null;
      lines: { internalProductId: string; productName: string; quantity: number }[];
    }
  >();

  for (const log of logs) {
    const batchNo = log.batchNo ?? log.referenceNo;
    if (!batchNo) continue;

    const existing = grouped.get(batchNo);
    const line = {
      internalProductId: log.internalProductId,
      productName: productNameById.get(log.internalProductId) ?? log.internalProductId,
      quantity: log.quantity,
    };

    if (!existing) {
      grouped.set(batchNo, {
        batchNo,
        logisticsNo: log.logisticsNo?.trim() || "—",
        createdAt: log.createdAt,
        operatorName: log.createdBy?.name ?? null,
        lines: [line],
      });
      continue;
    }

    if (log.createdAt > existing.createdAt) {
      existing.createdAt = log.createdAt;
    }
    if (!existing.operatorName && log.createdBy?.name) {
      existing.operatorName = log.createdBy.name;
    }
    if (existing.logisticsNo === "—" && log.logisticsNo?.trim()) {
      existing.logisticsNo = log.logisticsNo.trim();
    }
    existing.lines.push(line);
  }

  const orders = [...grouped.values()]
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .map((group) => {
      const totalQuantity = group.lines.reduce((sum, line) => sum + line.quantity, 0);
      const lineCount = group.lines.length;
      const purchaseType = lineCount === 1 ? ("single" as const) : ("batch" as const);
      return {
        orderNo: group.batchNo,
        purchaseType,
        purchaseTypeLabel: purchaseType === "single" ? "单独采购" : "批量采购",
        logisticsNo: group.logisticsNo,
        lineCount,
        totalQuantity,
        operatorName: group.operatorName,
        createdAt: group.createdAt.toLocaleString("zh-CN", { hour12: false }),
        lines: group.lines,
      };
    });

  return { orders };
}
