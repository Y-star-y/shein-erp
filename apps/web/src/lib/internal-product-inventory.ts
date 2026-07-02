import { findInternalProductsForSession } from "@/lib/internal-product-access";
import { getInTransitQtyByProductIds } from "@/lib/internal-product-inventory-log";
import { prisma } from "@/lib/prisma";
import { mappingsWhereForSession, ordersWhereForSession } from "@/lib/store-access";
import { getProductDisplayName, normalizeProductAttributes } from "@shein-erp/shared";
import type { InternalProductInventoryRow, InternalProductWarehouseStock } from "@shein-erp/shared";
import type { Session } from "next-auth";

/**
 * 分仓库存暂用占位数据（全 0）。
 * 后续接入真实库存时改为 false，并走 resolveWarehouseStockFromSku 逻辑。
 */
const USE_PLACEHOLDER_WAREHOUSE_QTY = true;

type WarehouseRef = { id: string; code: string; name: string };

type MatchedSku = {
  id: string;
  code: string;
  sellerSku: string;
  stocks: {
    quantity: number;
    warehouse: WarehouseRef;
  }[];
};

function resolveMatchedSku(
  internalProductId: string,
  sellerSku: string | null,
  skuByKey: Map<string, MatchedSku>,
): MatchedSku | undefined {
  return skuByKey.get(internalProductId) ?? (sellerSku ? skuByKey.get(sellerSku) : undefined);
}

function buildPlaceholderWarehouseRows(warehouses: WarehouseRef[]): InternalProductWarehouseStock[] {
  return warehouses.map((warehouse) => ({
    warehouseId: warehouse.id,
    warehouseCode: warehouse.code,
    warehouseName: warehouse.name,
    totalQty: 0,
    availableQty: 0,
    inTransitQty: 0,
    occupiedQty: 0,
  }));
}

function buildWarehouseRowsFromSku(
  warehouses: WarehouseRef[],
  matchedSku: MatchedSku | undefined,
  occupiedByWarehouseId: Map<string, number>,
): InternalProductWarehouseStock[] {
  const qtyByWarehouseId = new Map(
    matchedSku?.stocks.map((stock) => [stock.warehouse.id, stock.quantity]) ?? [],
  );

  return warehouses.map((warehouse) => {
    const totalQty = qtyByWarehouseId.get(warehouse.id) ?? 0;
    const occupiedQty = occupiedByWarehouseId.get(warehouse.id) ?? 0;
    const inTransitQty = 0;
    const availableQty = Math.max(0, totalQty - occupiedQty);
    return {
      warehouseId: warehouse.id,
      warehouseCode: warehouse.code,
      warehouseName: warehouse.name,
      totalQty,
      availableQty,
      inTransitQty,
      occupiedQty,
    };
  });
}

async function getReservedQtyByProductId(session: Session, productIds: string[]) {
  const reserved = new Map<string, number>();
  if (!productIds.length) {
    return reserved;
  }

  const lines = await prisma.orderLine.findMany({
    where: {
      mappingStatus: "mapped",
      sheinMapping: {
        internalProductId: { in: productIds },
        ...mappingsWhereForSession(session),
      },
      order: {
        status: { in: ["PENDING", "READY"] },
        ...ordersWhereForSession(session),
      },
    },
    select: {
      quantity: true,
      sheinMapping: { select: { internalProductId: true } },
    },
  });

  for (const line of lines) {
    const productId = line.sheinMapping?.internalProductId;
    if (!productId) continue;
    reserved.set(productId, (reserved.get(productId) ?? 0) + line.quantity);
  }

  return reserved;
}

async function getOccupiedQtyByProductAndWarehouse(session: Session, productIds: string[]) {
  const occupied = new Map<string, Map<string, number>>();
  if (!productIds.length) {
    return occupied;
  }

  const lines = await prisma.orderLine.findMany({
    where: {
      mappingStatus: "mapped",
      sheinMapping: {
        internalProductId: { in: productIds },
        ...mappingsWhereForSession(session),
      },
      order: {
        status: { in: ["PENDING", "READY"] },
        warehouseId: { not: null },
        ...ordersWhereForSession(session),
      },
    },
    select: {
      quantity: true,
      sheinMapping: { select: { internalProductId: true } },
      order: { select: { warehouseId: true } },
    },
  });

  for (const line of lines) {
    const productId = line.sheinMapping?.internalProductId;
    const warehouseId = line.order.warehouseId;
    if (!productId || !warehouseId) continue;

    const byWarehouse = occupied.get(productId) ?? new Map<string, number>();
    byWarehouse.set(warehouseId, (byWarehouse.get(warehouseId) ?? 0) + line.quantity);
    occupied.set(productId, byWarehouse);
  }

  return occupied;
}

export async function buildInternalProductInventoryForSession(
  session: Session,
): Promise<InternalProductInventoryRow[]> {
  const products = await findInternalProductsForSession(session);
  if (!products.length) {
    return [];
  }

  const allWarehouses = await prisma.warehouse.findMany({
    where: { active: true },
    select: { id: true, code: true, name: true },
    orderBy: { name: "asc" },
  });

  const productIds = products.map((product) => product.id);
  const sellerSkuByProductId = new Map<string, string>();
  let skuByKey = new Map<string, MatchedSku>();
  let reservedByProductId = new Map<string, number>();
  let occupiedByProductAndWarehouse = new Map<string, Map<string, number>>();

  if (!USE_PLACEHOLDER_WAREHOUSE_QTY) {
    const mappings = await prisma.sheinProductMapping.findMany({
      where: {
        internalProductId: { in: productIds },
        status: "active",
        ...mappingsWhereForSession(session),
      },
      select: {
        internalProductId: true,
        sellerSku: true,
      },
      orderBy: [{ sellerSku: "asc" }, { updatedAt: "desc" }],
    });

    const lookupKeys = new Set<string>(productIds);
    for (const mapping of mappings) {
      if (!mapping.internalProductId) continue;
      const sellerSku = mapping.sellerSku?.trim() ?? "";
      if (sellerSku && !sellerSkuByProductId.has(mapping.internalProductId)) {
        sellerSkuByProductId.set(mapping.internalProductId, sellerSku);
      }
      if (sellerSku) lookupKeys.add(sellerSku);
    }

    const skuRecords =
      lookupKeys.size > 0
        ? await prisma.sku.findMany({
            where: {
              OR: [
                { code: { in: [...lookupKeys] } },
                { sellerSku: { in: [...lookupKeys] } },
              ],
            },
            select: {
              id: true,
              code: true,
              sellerSku: true,
              stocks: {
                select: {
                  quantity: true,
                  warehouse: { select: { id: true, code: true, name: true } },
                },
                orderBy: { warehouse: { name: "asc" } },
              },
            },
          })
        : [];

    skuByKey = new Map<string, MatchedSku>();
    for (const sku of skuRecords) {
      skuByKey.set(sku.code, sku);
      skuByKey.set(sku.sellerSku, sku);
    }

    reservedByProductId = await getReservedQtyByProductId(session, productIds);
    occupiedByProductAndWarehouse = await getOccupiedQtyByProductAndWarehouse(session, productIds);
  } else {
    const mappings = await prisma.sheinProductMapping.findMany({
      where: {
        internalProductId: { in: productIds },
        status: "active",
        ...mappingsWhereForSession(session),
      },
      select: {
        internalProductId: true,
        sellerSku: true,
      },
      orderBy: [{ sellerSku: "asc" }, { updatedAt: "desc" }],
    });

    for (const mapping of mappings) {
      if (!mapping.internalProductId) continue;
      const sellerSku = mapping.sellerSku?.trim() ?? "";
      if (sellerSku && !sellerSkuByProductId.has(mapping.internalProductId)) {
        sellerSkuByProductId.set(mapping.internalProductId, sellerSku);
      }
    }
  }

  const inTransitByProductId = await getInTransitQtyByProductIds(productIds);

  return products.map((product) => {
    const sellerSku = sellerSkuByProductId.get(product.id) ?? null;
    const productName = getProductDisplayName({
      id: product.id,
      attributes: normalizeProductAttributes(product.attributes),
    });
    const inTransitQty = inTransitByProductId.get(product.id) ?? 0;

    if (USE_PLACEHOLDER_WAREHOUSE_QTY) {
      return {
        internalProductId: product.id,
        productName,
        sellerSku,
        totalQty: 0,
        availableQty: 0,
        inTransitQty,
        warehouses: buildPlaceholderWarehouseRows(allWarehouses),
      };
    }

    const matchedSku = resolveMatchedSku(product.id, sellerSku, skuByKey);
    const occupiedByWarehouseId = occupiedByProductAndWarehouse.get(product.id) ?? new Map<string, number>();
    const warehouses = buildWarehouseRowsFromSku(allWarehouses, matchedSku, occupiedByWarehouseId);

    if (!matchedSku) {
      return {
        internalProductId: product.id,
        productName,
        sellerSku,
        totalQty: null,
        availableQty: null,
        inTransitQty,
        warehouses,
      };
    }

    const totalQty = matchedSku.stocks.reduce((sum, stock) => sum + stock.quantity, 0);
    const reservedQty = reservedByProductId.get(product.id) ?? 0;
    const availableQty = Math.max(0, totalQty - reservedQty);

    return {
      internalProductId: product.id,
      productName,
      sellerSku,
      totalQty,
      availableQty,
      inTransitQty,
      warehouses,
    };
  });
}
