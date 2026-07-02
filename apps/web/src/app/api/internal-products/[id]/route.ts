import { auditActorId, writeAuditLog } from "@/lib/audit-log";
import { getSessionOr401, requireModule } from "@/lib/auth-helpers";
import { databaseErrorOrFallback } from "@/lib/database-error";
import { getProductDisplayName } from "@shein-erp/shared";
import { productAttributesInput, toCompanySku } from "@/lib/master-data";
import { readStoredEmployeeIdNumber, resolveProductAttributesForSave, resolveProductCompanyName } from "@/lib/product-company";
import {
  findAccessibleInternalProductById,
  internalProductAccessDeniedResponse,
} from "@/lib/internal-product-access";
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

  const current = await findAccessibleInternalProductById(authResult.session, id);
  if ("error" in current) {
    return internalProductAccessDeniedResponse(
      current.error,
      current.error === "内部商品不存在",
    );
  }

  const existing = body.attributes !== undefined ? current.product : null;

  let attributesUpdate: ReturnType<typeof productAttributesInput> | undefined;
  if (body.attributes !== undefined) {
    const preserveIdNumber = existing ? readStoredEmployeeIdNumber(existing.attributes) : undefined;
    const attributesResult = await resolveProductAttributesForSave(
      authResult.session,
      body.attributes,
      preserveIdNumber ? { preserveIdNumber } : undefined,
    );
    if ("error" in attributesResult) {
      return NextResponse.json({ error: attributesResult.error }, { status: 400 });
    }
    attributesUpdate = attributesResult.attributes;
  }

  let companyNameUpdate: string | undefined;
  if (body.companyName !== undefined && authResult.session.user.role === "ADMIN") {
    const companyResult = await resolveProductCompanyName(authResult.session, body.companyName);
    if ("error" in companyResult) {
      return NextResponse.json({ error: companyResult.error }, { status: 400 });
    }
    companyNameUpdate = companyResult.companyName;
  }

  try {
    const product = await prisma.internalProduct.update({
      where: { id },
      data: {
        ...(companyNameUpdate !== undefined ? { companyName: companyNameUpdate } : {}),
        ...(attributesUpdate !== undefined ? { attributes: attributesUpdate } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
      },
    });

    const persisted = toCompanySku(product);

    await writeAuditLog({
      userId: auditActorId(authResult.session),
      action: "编辑内部商品",
      entity: "InternalProduct",
      entityId: persisted.id,
      detail: {
        internalProductId: persisted.id,
        companyName: persisted.companyName,
        productName: getProductDisplayName(persisted),
      },
    });

    return NextResponse.json(persisted);
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
    const current = await findAccessibleInternalProductById(authResult.session, id);
    if ("error" in current) {
      return internalProductAccessDeniedResponse(
        current.error,
        current.error === "内部商品不存在",
      );
    }

    const existing = current.product;
    await prisma.internalProduct.delete({ where: { id } });

    if (existing) {
      await writeAuditLog({
        userId: auditActorId(authResult.session),
        action: "删除内部商品",
        entity: "InternalProduct",
        entityId: id,
        detail: {
          internalProductId: existing.id,
          companyName: existing.companyName,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return productErrorResponse(error, "内部商品删除失败");
  }
}
