import { applyOrderListScope, lineNeedsInternalProductBinding, unresolvedBindingLineWhere } from "@/lib/order-scope";
import { canAccessModule } from "@/lib/permissions";
import { getSessionOr401 } from "@/lib/auth-helpers";
import { findAccessibleStore, ordersWhereForSession } from "@/lib/store-access";
import { prisma } from "@/lib/prisma";
import type { StoreOrderSummary, StoreOrdersListResponse } from "@shein-erp/shared";
import { NextResponse } from "next/server";
import type { OrderStatus } from "@prisma/client";

const validStatuses: OrderStatus[] = ["PENDING", "READY", "SHIPPED", "EXCEPTION"];

export async function GET(request: Request) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const { session } = authResult;
  const canStore = canAccessModule(session.user, "storeManagement");
  const canOrder = canAccessModule(session.user, "orderManagement");
  if (!canStore && !canOrder) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const url = new URL(request.url);
  const storeId = url.searchParams.get("storeId")?.trim();
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize")) || 20));
  const statusParam = url.searchParams.get("status")?.trim();
  const statusesParam = url.searchParams.get("statuses")?.trim();
  const hasUnmapped = url.searchParams.get("hasUnmapped") === "true";
  const scope = url.searchParams.get("scope")?.trim();
  const q = url.searchParams.get("q")?.trim();

  if (!storeId) {
    return NextResponse.json({ error: "缺少 storeId 参数" }, { status: 400 });
  }

  const store = await findAccessibleStore(session, storeId);
  if (!store) {
    return NextResponse.json({ error: "店铺不存在或无权访问" }, { status: 404 });
  }

  const statusFilter = statusesParam
    ? statusesParam
        .split(",")
        .map((value) => value.trim())
        .filter((value): value is OrderStatus => validStatuses.includes(value as OrderStatus))
    : statusParam && validStatuses.includes(statusParam as OrderStatus)
      ? [statusParam as OrderStatus]
      : null;

  const where = applyOrderListScope(
    {
      ...ordersWhereForSession(session),
      storeId,
      ...(statusFilter?.length ? { status: { in: statusFilter } } : {}),
      ...(hasUnmapped ? { lines: { some: unresolvedBindingLineWhere } } : {}),
      ...(q ? { orderNo: { contains: q, mode: "insensitive" as const } } : {}),
    },
    scope,
  );

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        store: { select: { name: true } },
        lines: {
          select: {
            mappingStatus: true,
            sheinMappingId: true,
            sheinMapping: {
              select: {
                status: true,
                internalProductId: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  const summaries: StoreOrderSummary[] = orders.map((order) => {
    const unmappedLineCount = order.lines.filter(lineNeedsInternalProductBinding).length;
    const excludedLineCount = order.lines.filter((line) => line.mappingStatus === "excluded").length;
    const mappedLineCount = order.lines.length - unmappedLineCount - excludedLineCount;

    return {
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
      storeName: order.store?.name ?? store.name,
    };
  });

  const response: StoreOrdersListResponse = {
    orders: summaries,
    total,
    page,
    pageSize,
  };

  return NextResponse.json(response);
}
