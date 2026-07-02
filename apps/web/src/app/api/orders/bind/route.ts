import { auditActorId, writeAuditLog } from "@/lib/audit-log";
import { getSessionOr401, requireModule } from "@/lib/auth-helpers";
import { findActiveMappingByPlatformSku, validateMappingSkuKeys } from "@/lib/mapping-validation";
import { toPlatformSkuMapping } from "@/lib/master-data";
import { findAccessibleInternalProductById } from "@/lib/internal-product-access";
import { syncOrderStatuses } from "@/lib/order-sync";
import { prisma } from "@/lib/prisma";
import { resolveOrCreateStore } from "@/lib/store-access";
import type { OrderBindRequest, OrderBindResult } from "@shein-erp/shared";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const denied = requireModule(authResult.session, "orderManagement");
  if (denied) return denied;

  const body = (await request.json()) as OrderBindRequest;
  const platformSkc = body.platformSkc?.trim() || null;
  const storeName = body.storeName?.trim();
  const platformSku = body.platformSku?.trim() || "";
  const internalProductId = body.internalProductId?.trim() || "";

  if (!storeName) {
    return NextResponse.json({ error: "店铺不能为空" }, { status: 400 });
  }

  if (!platformSku) {
    return NextResponse.json({ error: "平台 SKU 不能为空" }, { status: 400 });
  }

  if (!internalProductId) {
    return NextResponse.json({ error: "必须选择内部商品" }, { status: 400 });
  }

  const skuValidation = await validateMappingSkuKeys("", platformSku);
  if (!skuValidation.ok) {
    return NextResponse.json({ error: skuValidation.error }, { status: 400 });
  }

  const activePlatform = await findActiveMappingByPlatformSku(platformSku);
  if (activePlatform) {
    return NextResponse.json({ error: "该平台 SKU 已有启用映射" }, { status: 409 });
  }

  const productResult = await findAccessibleInternalProductById(authResult.session, internalProductId);
  if ("error" in productResult) {
    const status = productResult.error === "内部商品不存在" ? 400 : 403;
    return NextResponse.json({ error: productResult.error }, { status });
  }
  const existing = productResult.product;

  if (existing.status !== "active") {
    return NextResponse.json({ error: "停用的内部商品不能绑定" }, { status: 400 });
  }

  const store = await resolveOrCreateStore(authResult.session, storeName, "SHEIN");

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.internalProduct.findUniqueOrThrow({
      where: { id: internalProductId },
    });

    const mapping = await tx.sheinProductMapping.create({
        data: {
          platform: "SHEIN",
          storeId: store.id,
          internalProductId: product.id,
          platformSkc,
          platformSku: platformSku || null,
          platformSpu: body.platformSpu?.trim() || null,
          sellerSku: null,
          sheinProductName: body.sheinProductName?.trim() || null,
          status: "active",
          remark: body.remark?.trim() || null,
        },
        include: { store: true, internalProduct: true },
      });

      const updateResult = await tx.orderLine.updateMany({
        where: {
          mappingStatus: "unmapped",
          platformSku,
        },
        data: {
          mappingStatus: "mapped",
          sheinMappingId: mapping.id,
          ...(platformSkc ? { platformSkc } : {}),
          ...(platformSku ? { platformSku } : {}),
        },
      });

      const affectedOrders = await tx.orderLine.findMany({
        where: { sheinMappingId: mapping.id },
        select: { orderId: true },
        distinct: ["orderId"],
      });
      await syncOrderStatuses(
        tx,
        affectedOrders.map((row) => row.orderId),
      );

    return { mapping, updatedLineCount: updateResult.count };
  });

  await writeAuditLog({
    userId: auditActorId(authResult.session),
    action: "绑定SHEIN订单SKU",
    entity: "SheinProductMapping",
    entityId: result.mapping.id,
    detail: {
      platformSku,
      internalProductId,
      updatedLineCount: result.updatedLineCount,
    },
  });

  const response: OrderBindResult = {
    mapping: toPlatformSkuMapping(result.mapping),
    updatedLineCount: result.updatedLineCount,
  };

  return NextResponse.json(response);
}
