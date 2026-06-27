import { auditActorId, writeAuditLog } from "@/lib/audit-log";
import { getSessionOr401, requireModule } from "@/lib/auth-helpers";
import { databaseErrorOrFallback } from "@/lib/database-error";
import { parseWarningQuantity, productGroupRelation, toCompanySku } from "@/lib/master-data";
import { prisma } from "@/lib/prisma";
import type { CompanySku } from "@shein-erp/shared";
import { NextResponse } from "next/server";

function productErrorResponse(error: unknown, fallback: string) {
  const message = databaseErrorOrFallback(error, fallback);
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const denied = requireModule(authResult.session, "productManagement");
  if (denied) return denied;

  const { id } = await params;
  const body = (await request.json()) as Partial<CompanySku>;
  try {
    const product = await prisma.internalProduct.update({
      where: { id },
      data: {
        ...(body.internalSku !== undefined ? { internalSku: body.internalSku.trim() } : {}),
        ...(body.productGroupName !== undefined
          ? body.productGroupName.trim()
            ? { productGroup: productGroupRelation(body.productGroupName) }
            : { productGroup: { disconnect: true } }
          : {}),
        ...(body.productNameCn !== undefined ? { productNameCn: body.productNameCn.trim() } : {}),
        ...(body.specification !== undefined ? { specification: body.specification.trim() || null } : {}),
        ...(body.color !== undefined ? { color: body.color.trim() || null } : {}),
        ...(body.size !== undefined ? { size: body.size.trim() || null } : {}),
        ...(body.model !== undefined ? { model: body.model.trim() || null } : {}),
        ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl.trim() || null } : {}),
        ...(body.supplierUrl !== undefined ? { supplierUrl: body.supplierUrl.trim() || null } : {}),
        ...(body.defaultWarningQuantity !== undefined ? { defaultWarningQuantity: parseWarningQuantity(body.defaultWarningQuantity) } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
      },
    });

    const persisted = await prisma.internalProduct.findUniqueOrThrow({
      where: { id: product.id },
      include: { productGroup: true },
    });

    await writeAuditLog({
      userId: auditActorId(authResult.session),
      action: "编辑内部商品",
      entity: "InternalProduct",
      entityId: persisted.id,
      detail: { internalSku: persisted.internalSku, productNameCn: persisted.productNameCn },
    });

    return NextResponse.json(toCompanySku(persisted));
  } catch (error) {
    return productErrorResponse(error, "内部商品保存失败");
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const denied = requireModule(authResult.session, "productManagement");
  if (denied) return denied;

  const { id } = await params;
  try {
    const existing = await prisma.internalProduct.findUnique({ where: { id } });
    await prisma.internalProduct.delete({ where: { id } });

    if (existing) {
      await writeAuditLog({
        userId: auditActorId(authResult.session),
        action: "删除内部商品",
        entity: "InternalProduct",
        entityId: id,
        detail: { internalSku: existing.internalSku, productNameCn: existing.productNameCn },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return productErrorResponse(error, "内部商品删除失败");
  }
}
