import { getSessionOr401 } from "@/lib/auth-helpers";
import { canAccessModule } from "@/lib/permissions";
import { findAccessibleStore, ordersWhereForSession } from "@/lib/store-access";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export type OrderFilterCounts = {
  unmapped: number;
  pendingShip: number;
  shipped: number;
};

/** 按店铺统计订单筛选各状态数量（用于筛选菜单小红点） */
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

  const baseWhere = {
    ...ordersWhereForSession(session),
    storeId,
  };

  const [unmapped, pendingShip, shipped] = await Promise.all([
    prisma.order.count({
      where: {
        ...baseWhere,
        lines: { some: { mappingStatus: "unmapped" } },
      },
    }),
    prisma.order.count({
      where: {
        ...baseWhere,
        status: { in: ["PENDING", "READY"] },
      },
    }),
    prisma.order.count({
      where: {
        ...baseWhere,
        status: "SHIPPED",
      },
    }),
  ]);

  const counts: OrderFilterCounts = { unmapped, pendingShip, shipped };
  return NextResponse.json(counts);
}
