import { unmappedGroupKey } from "@shein-erp/core";
import { canAccessModule } from "@/lib/permissions";
import { orderLinesWhereForSession, ordersWhereForSession } from "@/lib/store-access";
import { prisma } from "@/lib/prisma";
import type { AppNotification, NotificationsSummary } from "@shein-erp/shared";
import type { UnmappedOrderLine, UnmappedSkcGroup } from "@shein-erp/shared";
import type { Session } from "next-auth";

export async function fetchUnmappedOrderLines(session: Session): Promise<UnmappedOrderLine[]> {
  const lines = await prisma.orderLine.findMany({
    where: {
      mappingStatus: "unmapped",
      ...orderLinesWhereForSession(session),
    },
    include: {
      order: {
        include: { store: true },
      },
    },
    orderBy: [{ order: { createdAt: "desc" } }, { order: { orderNo: "asc" } }],
  });

  return lines
    .map((line) => {
      const sellerSku = line.sellerSku.trim();
      const platformSku = line.platformSku?.trim() || "";
      const groupKey = unmappedGroupKey(sellerSku, platformSku);
      if (!groupKey) return null;

      return {
        lineId: line.id,
        groupKey,
        platformSkc: line.platformSkc?.trim() || "",
        sellerSku,
        platformSku,
        platformSpu: line.platformSpu || "",
        sheinProductName: line.productName,
        storeName: line.order.store?.name || "",
        orderCount: 1,
        sampleOrderNo: line.order.orderNo,
        orderNo: line.order.orderNo,
        orderCreatedAt: line.order.createdAt.toISOString(),
        shipBy: line.order.shipBy?.toISOString() ?? null,
      } satisfies UnmappedOrderLine;
    })
    .filter((item): item is UnmappedOrderLine => item !== null);
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
      status: "PENDING",
      ...ordersWhereForSession(session),
    },
  });
}

export async function buildNotificationsSummary(session: Session): Promise<NotificationsSummary> {
  if (!canAccessModule(session.user, "orderManagement")) {
    return { items: [], total: 0, unmappedCount: 0, pendingOrderCount: 0 };
  }

  const [groups, pendingOrderCount] = await Promise.all([
    fetchUnmappedGroups(session),
    countPendingOrders(session),
  ]);

  const items: AppNotification[] = [];

  if (groups.length > 0) {
    const linkedOrders = groups.reduce((sum, group) => sum + group.orderCount, 0);
    items.push({
      id: "order-bind",
      type: "order_bind",
      title: "待绑定商品",
      description: `${groups.length} 个 SKU、${linkedOrders} 笔订单待绑定内部商品`,
      count: groups.length,
      page: "orderManagement",
      tab: "unmapped",
    });
  }

  if (pendingOrderCount > 0) {
    items.push({
      id: "pending-orders",
      type: "pending_order",
      title: "新订单",
      description: `${pendingOrderCount} 笔订单待处理`,
      count: pendingOrderCount,
      page: "orderManagement",
      tab: "import",
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
