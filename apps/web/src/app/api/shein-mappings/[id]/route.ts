import { auditActorId, writeAuditLog } from "@/lib/audit-log";
import { getSessionOr401 } from "@/lib/auth-helpers";
import { canAccessMappings } from "@/lib/permissions";
import { toPlatformSkuMapping } from "@/lib/master-data";
import { findAccessibleInternalProductBySku } from "@/lib/internal-product-access";
import { prisma } from "@/lib/prisma";
import { findAccessibleMapping, resolveOrCreateStore } from "@/lib/store-access";
import type { PlatformSkuMapping } from "@shein-erp/shared";
import type { Session } from "next-auth";
import { NextResponse } from "next/server";

async function resolveRefs(session: Session, body: Partial<PlatformSkuMapping>) {
  const storeName = body.storeName?.trim();
  const internalSku = body.internalSku?.trim();

  const [store, productResult] = await Promise.all([
    storeName ? resolveOrCreateStore(session, storeName, body.platform?.trim() || "SHEIN") : Promise.resolve(null),
    internalSku ? findAccessibleInternalProductBySku(session, internalSku) : Promise.resolve(null),
  ]);

  if (internalSku && productResult && "error" in productResult) {
    const status = productResult.error === "内部商品不存在" ? 400 : 403;
    return { error: NextResponse.json({ error: productResult.error }, { status }) };
  }

  const product = productResult && "product" in productResult ? productResult.product : null;

  return { store, product };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  if (!canAccessMappings(authResult.session.user)) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const { id } = await params;
  const current = await findAccessibleMapping(authResult.session, id);
  if (!current) {
    return NextResponse.json({ error: "映射不存在或无权访问" }, { status: 404 });
  }

  const body = (await request.json()) as Partial<PlatformSkuMapping>;
  const refs = await resolveRefs(authResult.session, body);
  if ("error" in refs) return refs.error;

  if (body.status === "active" || body.storeName || body.internalSku) {
    const storeId = refs.store?.id || current.storeId;
    const internalProductId = refs.product?.id || current.internalProductId;

    if (internalProductId) {
      const activeDuplicate = await prisma.sheinProductMapping.findFirst({
        where: {
          id: { not: id },
          storeId,
          internalProductId,
          status: "active",
        },
      });

      if (activeDuplicate && (body.status || current.status) === "active") {
        return NextResponse.json({ error: "该店铺已经有这个内部商品的启用映射" }, { status: 409 });
      }
    }
  }

  const mapping = await prisma.sheinProductMapping.update({
    where: { id },
    data: {
      ...(body.platform !== undefined ? { platform: body.platform.trim() || "SHEIN" } : {}),
      ...(refs.store ? { storeId: refs.store.id } : {}),
      ...(refs.product ? { internalProductId: refs.product.id } : {}),
      ...(body.platformSkc !== undefined ? { platformSkc: body.platformSkc.trim() || null } : {}),
      ...(body.platformSku !== undefined ? { platformSku: body.platformSku.trim() || null } : {}),
      ...(body.platformSpu !== undefined ? { platformSpu: body.platformSpu.trim() || null } : {}),
      ...(body.sheinProductId !== undefined ? { sheinProductId: body.sheinProductId.trim() || null } : {}),
      ...(body.sellerSku !== undefined ? { sellerSku: body.sellerSku.trim() || null } : {}),
      ...(body.sheinProductName !== undefined ? { sheinProductName: body.sheinProductName.trim() || null } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.remark !== undefined ? { remark: body.remark.trim() || null } : {}),
    },
    include: { store: true, internalProduct: true },
  });

  await writeAuditLog({
    userId: auditActorId(authResult.session),
    action: "编辑SHEIN映射",
    entity: "SheinProductMapping",
    entityId: mapping.id,
    detail: { platformSkc: mapping.platformSkc, storeName: mapping.store.name },
  });

  return NextResponse.json(toPlatformSkuMapping(mapping));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  if (!canAccessMappings(authResult.session.user)) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await findAccessibleMapping(authResult.session, id);
  if (!existing) {
    return NextResponse.json({ error: "映射不存在或无权访问" }, { status: 404 });
  }

  await prisma.sheinProductMapping.delete({ where: { id } });

  await writeAuditLog({
    userId: auditActorId(authResult.session),
    action: "删除SHEIN映射",
    entity: "SheinProductMapping",
    entityId: id,
    detail: { platformSkc: existing.platformSkc, storeName: existing.store.name },
  });

  return NextResponse.json({ ok: true });
}
