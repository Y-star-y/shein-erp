import { getSessionOr401 } from "@/lib/auth-helpers";
import { canAccessMappings } from "@/lib/permissions";
import { toPlatformSkuMapping } from "@/lib/master-data";
import { findAccessibleStore, mappingsWhereForSession } from "@/lib/store-access";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

/** 店铺下平台 SKU 与内部商品的映射列表 */
export async function GET(_request: Request, context: RouteContext) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  if (!canAccessMappings(authResult.session.user)) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const { id: storeId } = await context.params;
  const store = await findAccessibleStore(authResult.session, storeId);
  if (!store) {
    return NextResponse.json({ error: "店铺不存在或无权访问" }, { status: 404 });
  }

  const mappings = await prisma.sheinProductMapping.findMany({
    where: {
      storeId,
      ...mappingsWhereForSession(authResult.session),
    },
    include: { store: true, internalProduct: true },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json({
    mappings: mappings.map(toPlatformSkuMapping),
  });
}
