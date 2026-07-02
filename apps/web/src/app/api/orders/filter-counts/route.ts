import { shippableOrderWhere } from "@/lib/order-scope";
import { getSessionOr401 } from "@/lib/auth-helpers";
import { canAccessModule } from "@/lib/permissions";
import { findAccessibleStore, ordersWhereForSession } from "@/lib/store-access";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export type OrderFilterCounts = {
  pendingShip: number;
  shipped: number;
  pendingLineCount: number;
  pendingUniquePlatformSkuCount: number;
};

/** 按店铺统计订单管理筛选各状态数量（正常订单，不含异常/待绑定） */
export async function GET(request: Request) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const { session } = authResult;
  const canStore = canAccessModule(session.user, "storeManagement");
  const canOrder = canAccessModule(session.user, "orderManagement");
  if (!canStore && !canOrder) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const storeId = new URL(request.url).searchParams.get("storeId")?.trim();
  if (!storeId) {
    return NextResponse.json({ error: "缺少 storeId 参数" }, { status: 400 });
  }

  const store = await findAccessibleStore(session, storeId);
  if (!store) {
    return NextResponse.json({ error: "店铺不存在或无权访问" }, { status: 404 });
  }

  const normalWhere = {
    ...ordersWhereForSession(session),
    storeId,
    ...shippableOrderWhere,
  };

  const [pendingShip, shipped, pendingOrders] = await Promise.all([
    prisma.order.count({
      where: {
        ...normalWhere,
        status: { in: ["PENDING", "READY"] },
      },
    }),
    prisma.order.count({
      where: {
        ...normalWhere,
        status: "SHIPPED",
      },
    }),
    prisma.order.findMany({
      where: {
        ...normalWhere,
        status: { in: ["PENDING", "READY"] },
      },
      select: { lines: { select: { platformSku: true } } },
    }),
  ]);

  const pendingLineCount = pendingOrders.reduce((sum, order) => sum + order.lines.length, 0);
  const pendingPlatformSkus = new Set<string>();
  for (const order of pendingOrders) {
    for (const line of order.lines) {
      const platformSku = line.platformSku.trim();
      if (platformSku) pendingPlatformSkus.add(platformSku);
    }
  }

  const counts: OrderFilterCounts = {
    pendingShip,
    shipped,
    pendingLineCount,
    pendingUniquePlatformSkuCount: pendingPlatformSkus.size,
  };
  return NextResponse.json(counts);
}
