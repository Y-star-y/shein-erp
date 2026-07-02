import { lineNeedsInternalProductBinding } from "@/lib/order-scope";
import { getSessionOr401 } from "@/lib/auth-helpers";
import { canAccessModule } from "@/lib/permissions";
import { ordersWhereForSession } from "@/lib/store-access";
import { prisma } from "@/lib/prisma";
import type { StoreOrderDetail } from "@shein-erp/shared";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const { session } = authResult;
  const canStore = canAccessModule(session.user, "storeManagement");
  const canOrder = canAccessModule(session.user, "orderManagement");
  if (!canStore && !canOrder) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const { orderId } = await context.params;
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      ...ordersWhereForSession(session),
    },
    include: {
      store: { select: { name: true } },
      lines: {
        include: {
          sku: { select: { code: true } },
          sheinMapping: {
            include: {
              internalProduct: { select: { id: true } },
            },
          },
        },
        orderBy: { platformSku: "asc" },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "订单不存在或无权访问" }, { status: 404 });
  }

  const unmappedLineCount = order.lines.filter(lineNeedsInternalProductBinding).length;
  const excludedLineCount = order.lines.filter((line) => line.mappingStatus === "excluded").length;
  const mappedLineCount = order.lines.length - unmappedLineCount - excludedLineCount;
  const detail: StoreOrderDetail = {
    id: order.id,
    orderNo: order.orderNo,
    createdAt: order.createdAt.toISOString(),
    shipBy: order.shipBy?.toISOString() ?? null,
    deliverBy: order.deliverBy?.toISOString() ?? null,
    status: order.status,
    platformStatus: order.platformStatus,
    logisticsNo: order.logisticsNo,
    logisticsCompany: order.logisticsCompany,
    lineCount: order.lines.length,
    unmappedLineCount,
    mappedLineCount,
    excludedLineCount,
    storeName: order.store?.name ?? "",
    country: order.country,
    recipientName: order.recipientName,
    recipientPhone: order.recipientPhone,
    recipientAddress: order.recipientAddress,
    recipientPostalCode: order.recipientPostalCode,
    lines: order.lines.map((line) => ({
      id: line.id,
      sellerSku: line.sellerSku,
      platformSku: line.platformSku,
      platformSkc: line.platformSkc,
      platformSpu: line.platformSpu,
      productName: line.productName,
      spec: line.spec,
      articleNo: line.articleNo,
      quantity: line.quantity,
      price: line.price ? Number(line.price) : null,
      mappingStatus: line.mappingStatus,
      internalProductId:
        line.sheinMapping?.internalProduct?.id ?? line.sheinMapping?.internalProductId ?? null,
    })),
  };

  return NextResponse.json(detail);
}
