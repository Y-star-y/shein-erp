import { describe, expect, it } from "vitest";
import { availableStock, matchOrder, orderKey, suggestedQuantity } from "./business";
import { demoState } from "./demo-data";

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

  it("never suggests a negative purchase quantity", () => {
    expect(suggestedQuantity(demoState, demoState.skus[0])).toBeGreaterThanOrEqual(0);
  });
});
