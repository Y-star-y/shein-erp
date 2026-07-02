import { auditActorId, writeAuditLog } from "@/lib/audit-log";
import { getSessionOr401, requireModule } from "@/lib/auth-helpers";
import { syncOrderStatuses } from "@/lib/order-sync";
import { ordersWhereForSession } from "@/lib/store-access";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ orderId: string }> };

/** 强制发货：将未绑定商品行标记为排除，仅已绑定商品进入发货列表 */
export async function POST(_request: Request, context: RouteContext) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const denied = requireModule(authResult.session, "orderManagement");
  if (denied) return denied;

  const { orderId } = await context.params;
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      ...ordersWhereForSession(authResult.session),
    },
    include: {
      lines: { select: { id: true, mappingStatus: true, productName: true } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "订单不存在或无权访问" }, { status: 404 });
  }

  const unmappedLines = order.lines.filter((line) => line.mappingStatus === "unmapped");
  const mappedLines = order.lines.filter((line) => line.mappingStatus === "mapped");

  if (!unmappedLines.length) {
    return NextResponse.json({ error: "该订单没有待绑定商品" }, { status: 400 });
  }

  if (!mappedLines.length) {
    return NextResponse.json({ error: "该订单没有已绑定商品，无法强制发货" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.orderLine.updateMany({
      where: { orderId, mappingStatus: "unmapped" },
      data: { mappingStatus: "excluded" },
    });
    await syncOrderStatuses(tx, [orderId]);
  });

  await writeAuditLog({
    userId: auditActorId(authResult.session),
    action: "强制发货已绑定商品",
    entity: "Order",
    entityId: order.id,
    detail: {
      orderNo: order.orderNo,
      excludedLineCount: unmappedLines.length,
      shippedLineCount: mappedLines.length,
    },
  });

  return NextResponse.json({
    orderId: order.id,
    excludedLineCount: unmappedLines.length,
    shippedLineCount: mappedLines.length,
  });
}
