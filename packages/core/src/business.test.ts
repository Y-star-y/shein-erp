import { describe, expect, it } from "vitest";
import {
  availableStock,
  findActiveMappingByPlatformSku,
  findActiveMappingBySellerSku,
  inventoryForOrder,
  matchInventorySnapshot,
  matchOrder,
  orderKey,
  resolveOrderLineMapping,
  unmappedGroupKey,
} from "./business";
import { demoState } from "./demo-data";
import type { InventorySnapshot } from "./types";

describe("ERP business rules", () => {
  const order = {
    id: "ord-test",
    orderNo: "GSH-001",
    createdAt: "2026-06-16 10:00",
    shipBy: "2026-06-17 10:00",
    sellerSku: demoState.skus[0].sellerSku,
    skuCode: demoState.skus[0].code,
    productName: demoState.skus[0].name,
    spec: demoState.skus[0].spec,
    quantity: 1,
    price: 100,
    currency: "JPY",
    country: "Japan",
    warehouse: "义乌一仓",
    status: "待发货" as const,
  };

  it("uses order number and seller sku as dedupe key", () => {
    expect(orderKey(order)).toBe(`GSH-001|${demoState.skus[0].sellerSku}`);
  });

  it("maps known seller sku and flags unknown sku", () => {
    const base = { ...order, id: "x" };
    expect(matchOrder(base, demoState.skus).status).toBe("待发货");
    expect(matchOrder({ ...base, sellerSku: "UNKNOWN" }, demoState.skus).status).toBe("异常");
  });

  it("subtracts pending orders from available stock", () => {
    expect(availableStock({ ...demoState, orders: [order] }, demoState.skus[0].code)).toBe(-1);
  });

  it("matches inventory snapshots by seller sku first", () => {
    const snapshot = inventoryRow({ sellerSku: demoState.skus[0].sellerSku, fnsku: "UNKNOWN" });
    expect(matchInventorySnapshot(snapshot, demoState.skus).skuCode).toBe(demoState.skus[0].code);
  });

  it("matches inventory snapshots by fnsku when seller sku is unknown", () => {
    const sku = { ...demoState.skus[0], fnsku: "FNSKU-001" };
    const snapshot = inventoryRow({ sellerSku: "UNKNOWN", fnsku: "FNSKU-001" });
    expect(matchInventorySnapshot(snapshot, [sku]).skuCode).toBe(sku.code);
  });

  it("finds inventory for an order by seller sku and order warehouse first", () => {
    const snapshot = {
      ...inventoryRow({ sellerSku: order.sellerSku, warehouseName: order.warehouse, dropshipStockQty: 11 }),
      skuCode: "SKU-1",
      matchedStatus: "已匹配" as const,
    };
    expect(inventoryForOrder({ ...demoState, inventorySnapshots: [snapshot] }, order)?.dropshipStockQty).toBe(11);
  });

  it("resolves mapped order lines by platform sku only", () => {
    const mappings = [
      { sellerSku: "seller-1", platformSku: "plat-1", status: "active", internalProductId: "prod-1", id: "map-1" },
      { sellerSku: "seller-2", platformSku: "plat-2", status: "pending", internalProductId: null, id: "map-2" },
    ];

    expect(resolveOrderLineMapping({ sellerSku: "seller-1", platformSku: "" }, mappings)).toEqual({
      status: "unmapped",
    });
    expect(resolveOrderLineMapping({ sellerSku: "", platformSku: "plat-1" }, mappings)).toEqual({
      status: "mapped",
      mappingId: "map-1",
    });
    expect(resolveOrderLineMapping({ sellerSku: "seller-2", platformSku: "plat-2" }, mappings)).toEqual({
      status: "unmapped",
    });
  });

  it("builds unmapped group keys from platform sku only", () => {
    expect(unmappedGroupKey("seller-1", "plat-1")).toBe("platform:plat-1");
    expect(unmappedGroupKey("", "plat-1")).toBe("platform:plat-1");
    expect(unmappedGroupKey("", "")).toBe("");
  });

  it("finds active mappings by seller or platform sku", () => {
    const mappings = [
      { sellerSku: "seller-1", platformSku: "plat-1", status: "active", internalProductId: "prod-1", id: "map-1" },
    ];
    expect(findActiveMappingBySellerSku(mappings, "seller-1")?.id).toBe("map-1");
    expect(findActiveMappingByPlatformSku(mappings, "plat-1")?.id).toBe("map-1");
  });
});

function inventoryRow(
  patch: Partial<Omit<InventorySnapshot, "skuCode" | "matchedStatus">>,
): Omit<InventorySnapshot, "skuCode" | "matchedStatus"> {
  return {
    id: "inventory-test",
    fnsku: "",
    sellerSku: "SELLER-1",
    productName: "测试商品",
    warehouseName: "川崎日本倉庫",
    dropshipTransitQty: 0,
    dropshipStockQty: 0,
    transferTransitQty: 0,
    transferStockQty: 0,
    pendingQty: 0,
    sales10d: 0,
    sales30d: 0,
    stockAgeDays: 0,
    volume: 0,
    sourceWarningQty: 0,
    inboundAt: "",
    ...patch,
  };
}
