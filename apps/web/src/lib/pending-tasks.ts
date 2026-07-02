import { unmappedGroupKey } from "@shein-erp/core";
import { canAccessModule } from "@/lib/permissions";
import { exceptionOrderOr, shippableOrderWhere } from "@/lib/order-scope";
import { orderLinesWhereForSession, ordersWhereForSession } from "@/lib/store-access";
import { unresolvedBindingLineWhere } from "@/lib/order-scope";
import { prisma } from "@/lib/prisma";
import type { AppNotification, NotificationsSummary } from "@shein-erp/shared";
import type { UnmappedOrderLine, UnmappedSkcGroup } from "@shein-erp/shared";
import type { Session } from "next-auth";

export async function fetchUnmappedOrderLines(
  session: Session,
  storeId?: string,
): Promise<UnmappedOrderLine[]> {
  const lines = await prisma.orderLine.findMany({
    where: {
      AND: [
        unresolvedBindingLineWhere,
        orderLinesWhereForSession(session),
        ...(storeId ? [{ order: { storeId } }] : []),
      ],
    },
    include: {
      order: {
        include: { store: true },
      },
    },
    orderBy: [{ order: { createdAt: "desc" } }, { order: { orderNo: "asc" } }],
  });

  const results: UnmappedOrderLine[] = [];

  for (const line of lines) {
    const platformSku = line.platformSku.trim();
    const groupKey = unmappedGroupKey("", platformSku);
    if (!groupKey) continue;

    results.push({
      lineId: line.id,
      groupKey,
      platformSkc: line.platformSkc?.trim() || "",
      sellerSku: line.sellerSku?.trim() || "",
      platformSku,
      platformSpu: line.platformSpu || "",
      sheinProductName: line.productName,
      spec: line.spec?.trim() || "",
      articleNo: line.articleNo?.trim() || "",
      storeName: line.order.store?.name || "",
      orderCount: 1,
      sampleOrderNo: line.order.orderNo,
      orderNo: line.order.orderNo,
      orderCreatedAt: line.order.createdAt.toISOString(),
      shipBy: line.order.shipBy?.toISOString() ?? null,
      deliverBy: line.order.deliverBy?.toISOString() ?? null,
    });
  }

  return results;
}

export async function fetchUnmappedGroups(session: Session): Promise<UnmappedSkcGroup[]> {
  const lines = await fetchUnmappedOrderLines(session);
  const groups = new Map<string, UnmappedSkcGroup>();

  for (const line of lines) {
    const existing = groups.get(line.groupKey);
    if (existing) {
      existing.orderCount += 1;
      continue;
    }

    groups.set(line.groupKey, {
      groupKey: line.groupKey,
      platformSkc: line.platformSkc,
      sellerSku: line.sellerSku,
      platformSku: line.platformSku,
      platformSpu: line.platformSpu,
      sheinProductName: line.sheinProductName,
      spec: line.spec,
      articleNo: line.articleNo,
      storeName: line.storeName,
      orderCount: 1,
      sampleOrderNo: line.orderNo,
    });
  }

  return [...groups.values()];
}

export async function countPendingOrders(session: Session): Promise<number> {
  return prisma.order.count({
    where: {
      status: { in: ["PENDING", "READY"] },
      ...ordersWhereForSession(session),
      ...shippableOrderWhere,
    },
  });
}

export type PendingStoreCount = {
  storeId: string;
  storeName: string;
  platform: string;
  active: boolean;
  count: number;
};

export async function fetchPendingStoreCounts(session: Session): Promise<PendingStoreCount[]> {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["PENDING", "READY"] },
      storeId: { not: null },
      ...ordersWhereForSession(session),
      ...shippableOrderWhere,
    },
    select: {
      storeId: true,
      store: { select: { id: true, name: true, platform: true, active: true } },
    },
  });

  const byStore = new Map<string, PendingStoreCount>();

  for (const order of orders) {
    if (!order.storeId || !order.store) continue;
    const existing = byStore.get(order.storeId);
    if (existing) {
      existing.count += 1;
      continue;
    }
    byStore.set(order.storeId, {
      storeId: order.storeId,
      storeName: order.store.name,
      platform: order.store.platform,
      active: order.store.active,
      count: 1,
    });
  }

  return [...byStore.values()].sort((a, b) => b.count - a.count);
}

export type UnmappedStoreCount = {
  storeId: string;
  storeName: string;
  platform: string;
  active: boolean;
  count: number;
};

/** 按店铺统计含待绑定商品的异常订单数（整单计 1，不按行数累加） */
export async function fetchUnmappedStoreCounts(session: Session): Promise<UnmappedStoreCount[]> {
  const orders = await prisma.order.findMany({
    where: {
      ...ordersWhereForSession(session),
      OR: exceptionOrderOr,
    },
    select: {
      storeId: true,
      store: { select: { id: true, name: true, platform: true, active: true } },
    },
  });

  const byStore = new Map<string, UnmappedStoreCount>();

  for (const order of orders) {
    const storeId = order.storeId;
    const store = order.store;
    if (!storeId || !store) continue;
    const existing = byStore.get(storeId);
    if (existing) {
      existing.count += 1;
      continue;
    }
    byStore.set(storeId, {
      storeId,
      storeName: store.name,
      platform: store.platform,
      active: store.active,
      count: 1,
    });
  }

  return [...byStore.values()].sort((a, b) => b.count - a.count);
}

export async function buildNotificationsSummary(session: Session): Promise<NotificationsSummary> {
  if (!canAccessModule(session.user, "orderManagement")) {
    return { items: [], total: 0, unmappedCount: 0, pendingOrderCount: 0 };
  }

  const [groups, pendingOrderCount, pendingStores, unmappedStores] = await Promise.all([
    fetchUnmappedGroups(session),
    countPendingOrders(session),
    fetchPendingStoreCounts(session),
    fetchUnmappedStoreCounts(session),
  ]);

  const items: AppNotification[] = [];

  if (groups.length > 0) {
    const linkedOrders = groups.reduce((sum, group) => sum + group.orderCount, 0);
    const topUnmappedStore = unmappedStores.find((store) => store.count > 0);
    items.push({
      id: "order-bind",
      type: "order_bind",
      title: "待绑定商品",
      description: `${groups.length} 个 SKU、${linkedOrders} 笔订单待绑定内部商品`,
      count: groups.length,
      page: topUnmappedStore ? "storeManagement" : "orderManagement",
      ...(topUnmappedStore
        ? {
            storeTarget: {
              storeId: topUnmappedStore.storeId,
              tab: "binding" as const,
            },
          }
        : { taskId: "order_bind" as const }),
    });
  }

  if (pendingOrderCount > 0) {
    const topPendingStore = pendingStores.find((store) => store.count > 0);
    items.push({
      id: "pending-orders",
      type: "pending_order",
      title: "待发货",
      description: `${pendingOrderCount} 笔订单待发货`,
      count: pendingOrderCount,
      page: topPendingStore ? "storeManagement" : "orderManagement",
      ...(topPendingStore
        ? {
            storeTarget: {
              storeId: topPendingStore.storeId,
              tab: "orders" as const,
            },
          }
        : { taskId: "pending_ship" as const }),
    });
  }

  const total = items.reduce((sum, item) => sum + item.count, 0);

  return {
    items,
    total,
    unmappedCount: groups.length,
    pendingOrderCount,
  };
}
