import { auditActorId, writeAuditLog } from "@/lib/audit-log";
import { getSessionOr401 } from "@/lib/auth-helpers";
import { canAccessMappings } from "@/lib/permissions";
import { validateMappingSkuKeys } from "@/lib/mapping-validation";
import { toPlatformSkuMapping } from "@/lib/master-data";
import { findAccessibleInternalProductBySku } from "@/lib/internal-product-access";
import { prisma } from "@/lib/prisma";
import { resolveOrCreateStore } from "@/lib/store-access";
import type { PlatformSkuMapping } from "@shein-erp/shared";
import type { Session } from "next-auth";
import { NextResponse } from "next/server";

async function resolveMappingRefs(session: Session, body: PlatformSkuMapping) {
  const [store, productResult] = await Promise.all([
    resolveOrCreateStore(session, body.storeName, body.platform.trim() || "SHEIN"),
    findAccessibleInternalProductBySku(session, body.internalSku.trim()),
  ]);

  if ("error" in productResult) {
    const status = productResult.error === "内部商品不存在" ? 400 : 403;
    return { error: NextResponse.json({ error: productResult.error }, { status }) };
  }

  return { store, product: productResult.product };
}

export async function POST(request: Request) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  if (!canAccessMappings(authResult.session.user)) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const body = (await request.json()) as PlatformSkuMapping;
  const refs = await resolveMappingRefs(authResult.session, body);
  if ("error" in refs) return refs.error;

  const activeDuplicate = await prisma.sheinProductMapping.findFirst({
    where: {
      storeId: refs.store.id,
      internalProductId: refs.product.id,
      status: "active",
    },
  });

  if (activeDuplicate && body.status === "active") {
    return NextResponse.json({ error: "该店铺已经有这个内部商品的启用映射" }, { status: 409 });
  }

  const skuValidation = await validateMappingSkuKeys(body.sellerSku || "", body.platformSku || "");
  if (!skuValidation.ok) {
    return NextResponse.json({ error: skuValidation.error }, { status: 400 });
  }

  const mapping = await prisma.sheinProductMapping.create({
    data: {
      platform: body.platform.trim() || "SHEIN",
      storeId: refs.store.id,
      internalProductId: refs.product.id,
      platformSkc: body.platformSkc.trim() || null,
      platformSku: body.platformSku.trim() || null,
      platformSpu: body.platformSpu.trim() || null,
      sheinProductId: body.sheinProductId.trim() || null,
      sellerSku: body.sellerSku.trim() || null,
      sheinProductName: body.sheinProductName.trim() || null,
      status: body.status,
      remark: body.remark.trim() || null,
    },
    include: { store: true, internalProduct: true },
  });

  await writeAuditLog({
    userId: auditActorId(authResult.session),
    action: "新增SHEIN映射",
    entity: "SheinProductMapping",
    entityId: mapping.id,
    detail: {
      platformSkc: mapping.platformSkc,
      storeName: mapping.store.name,
      internalSku: mapping.internalProduct?.internalSku ?? body.internalSku,
    },
  });

  return NextResponse.json(toPlatformSkuMapping(mapping));
}
