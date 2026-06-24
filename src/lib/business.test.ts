import { describe, expect, it } from "vitest";
import {
  availableStock,
  createSkuDraftFromOrder,
  inventoryForOrder,
  matchInventorySnapshot,
  matchOrder,
  orderKey,
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

  it("creates a pending sku draft from a new order seller sku", () => {
    const draft = createSkuDraftFromOrder({ ...order, sellerSku: "NEW-SELLER-SKU", productName: "新商品" });
    expect(draft.sellerSku).toBe("NEW-SELLER-SKU");
    expect(draft.code).toBe("NEW-SELLER-SKU");
    expect(draft.confirmStatus).toBe("待确认");
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
