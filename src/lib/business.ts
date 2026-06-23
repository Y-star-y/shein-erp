import type { ErpState, Order, Sku } from "./types";

export function availableStock(state: ErpState, skuCode: string) {
  const onHand = state.stocks
    .filter((item) => item.skuCode === skuCode)
    .reduce((sum, item) => sum + item.quantity, 0);
  const pending = state.orders
    .filter((order) => order.skuCode === skuCode && order.status === "待发货")
    .reduce((sum, order) => sum + order.quantity, 0);
  return onHand - pending;
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
