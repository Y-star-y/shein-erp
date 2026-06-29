import { getSessionOr401 } from "@/lib/auth-helpers";
import { canAccessModule } from "@/lib/permissions";
import { findAccessibleStore, ordersWhereForSession } from "@/lib/store-access";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export type StoreTabCounts = {
  orders: number;
  binding: number;
  inventory: number;
  exceptions: number;
};

type RouteContext = { params: Promise<{ id: string }> };

/** 店铺详情 Tab 数据量（用于菜单小红点） */
export async function GET(_request: Request, context: RouteContext) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const { session } = authResult;
  const canStore = canAccessModule(session.user, "storeManagement");
  const canOrder = canAccessModule(session.user, "orderManagement");
  if (!canStore && !canOrder) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const { id: storeId } = await context.params;
  const store = await findAccessibleStore(session, storeId);
  if (!store) {
    return NextResponse.json({ error: "店铺不存在或无权访问" }, { status: 404 });
  }

  const orderWhere = {
    ...ordersWhereForSession(session),
    storeId,
  };

  const [orders, binding, inventory, exceptions] = await Promise.all([
    prisma.order.count({ where: orderWhere }),
    prisma.orderLine.count({
      where: {
        mappingStatus: "unmapped",
        order: orderWhere,
      },
    }),
    prisma.sheinProductMapping.count({
      where: { storeId, status: "active" },
    }),
    prisma.order.count({
      where: {
        ...orderWhere,
        status: "EXCEPTION",
      },
    }),
  ]);

  const counts: StoreTabCounts = { orders, binding, inventory, exceptions };
  return NextResponse.json(counts);
}
