import type { ErpState, InventorySnapshot, Order, Sku } from "./types";

export function availableStock(state: ErpState, skuCode: string) {
  const pending = state.orders
    .filter((order) => order.skuCode === skuCode && order.status === "待发货")
    .reduce((sum, order) => sum + order.quantity, 0);
  const snapshotQty = state.inventorySnapshots
    .filter((item) => item.skuCode === skuCode)
    .reduce((sum, item) => sum + item.dropshipStockQty, 0);
  if (state.inventorySnapshots.length) return snapshotQty - pending;

  const onHand = state.stocks
    .filter((item) => item.skuCode === skuCode)
    .reduce((sum, item) => sum + item.quantity, 0);
  return onHand - pending;
}

function same(left: string | undefined, right: string | undefined) {
  return Boolean(left?.trim() && right?.trim() && left.trim() === right.trim());
}

export function matchInventorySnapshot(
  row: Omit<InventorySnapshot, "skuCode" | "matchedStatus">,
  skus: Sku[],
): InventorySnapshot {
  const sellerMatches = skus.filter((sku) => same(sku.sellerSku, row.sellerSku));
  const fnskuMatches = sellerMatches.length
    ? []
    : skus.filter((sku) => same(sku.fnsku, row.fnsku) || same(sku.platformSku, row.fnsku));
  const matches = sellerMatches.length ? sellerMatches : fnskuMatches;

  return {
    ...row,
    skuCode: matches.length === 1 ? matches[0].code : undefined,
    matchedStatus: matches.length === 1 ? "已匹配" : "未匹配",
  };
}

export function availableFromSnapshot(state: ErpState, skuCode: string, warehouseName: string) {
  const snapshot = state.inventorySnapshots.find(
    (item) => item.skuCode === skuCode && item.warehouseName === warehouseName,
  );
  return snapshot?.dropshipStockQty;
}

export function inventoryForOrder(state: ErpState, order: Pick<Order, "sellerSku" | "warehouse">) {
  return (
    state.inventorySnapshots.find((item) => item.sellerSku === order.sellerSku && item.warehouseName === order.warehouse) ||
    state.inventorySnapshots.find((item) => item.sellerSku === order.sellerSku)
  );
}

export function createSkuDraftFromOrder(order: Omit<Order, "skuCode" | "status">): Sku {
  const sellerSku = order.sellerSku.trim();
  return {
    id: `sku-draft-${sellerSku || Date.now()}`,
    code: sellerSku || `SKU-${Date.now()}`,
    fnsku: "",
    sellerSku,
    platformSku: "",
    platformSkc: "",
    platformSpu: "",
    name: order.productName || sellerSku || "待补充商品",
    spec: order.spec || "",
    sellerCode: "",
    shippingName: order.productName || sellerSku,
    shippingMethod: "",
    imageUrl: "",
    supplier: "",
    purchaseLink: "",
    purchasePrice: 0,
    leadTimeDays: 15,
    safetyDays: 7,
    safetyStock: 0,
    reorderPoint: 0,
    targetStock: 0,
    confirmStatus: "待确认",
    owner: "",
  };
}

export function suggestInventoryReplenishment(snapshot: InventorySnapshot) {
  const dailySales = snapshot.sales30d > 0 ? snapshot.sales30d / 30 : 0;
  const targetStock = Math.ceil(dailySales * 7);
  const transit = snapshot.dropshipTransitQty + snapshot.transferTransitQty;
  const suggestion = Math.max(0, targetStock - snapshot.dropshipStockQty - transit);
  return {
    dailySales,
    targetStock,
    transit,
    suggestion,
  };
}

export function inTransit(state: ErpState, skuCode: string) {
  return state.purchases
    .filter((item) => item.skuCode === skuCode && !["已完成", "已取消"].includes(item.status))
    .reduce((sum, item) => sum + item.quantity - item.receivedQty, 0);
}

export function recentSales(state: ErpState, skuCode: string) {
  return state.orders
    .filter((order) => order.skuCode === skuCode)
    .reduce((sum, order) => sum + order.quantity, 0);
}

export function suggestedQuantity(state: ErpState, sku: Sku) {
  const currentAvailable = availableStock(state, sku.code);
  const transit = inTransit(state, sku.code);
  if (sku.reorderPoint || sku.targetStock) {
    return currentAvailable + transit < sku.reorderPoint
      ? Math.max(0, sku.targetStock - currentAvailable - transit)
      : 0;
  }
  const dailySales = recentSales(state, sku.code) / 30;
  const demand = Math.ceil(dailySales * (sku.leadTimeDays + sku.safetyDays));
  return Math.max(0, demand + sku.safetyStock - currentAvailable - transit);
}

export function matchOrder(order: Omit<Order, "skuCode" | "status">, skus: Sku[]): Order {
  const matches = skus.filter((sku) => sku.sellerSku.trim() === order.sellerSku.trim());
  return {
    ...order,
    skuCode: matches.length === 1 ? matches[0].code : undefined,
    status: matches.length === 1 ? "待发货" : "异常",
  };
}

export function orderKey(order: Pick<Order, "orderNo" | "sellerSku">) {
  return `${order.orderNo}|${order.sellerSku}`;
}
