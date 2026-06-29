import { auditActorId, writeAuditLog } from "@/lib/audit-log";
import { getSessionOr401, requireModule } from "@/lib/auth-helpers";
import { databaseErrorOrFallback } from "@/lib/database-error";
import { generateUniqueInternalSku, isValidInternalProductCode } from "@/lib/internal-product-id";
import { resolveProductAttributesForSave, resolveProductCompanyName } from "@/lib/product-company";
import { getProductDisplayName } from "@shein-erp/shared";
import { productAttributesInput, toCompanySku } from "@/lib/master-data";
import { prisma } from "@/lib/prisma";
import type { CompanySku } from "@shein-erp/shared";
import { NextResponse } from "next/server";

function saveErrorResponse(error: unknown) {
  const message = databaseErrorOrFallback(error, "内部商品保存失败");

  return NextResponse.json({ error: message }, { status: 500 });
}

export async function POST(request: Request) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const denied = requireModule(authResult.session, "productManagement");
  if (denied) return denied;

  const body = (await request.json()) as CompanySku;

  const attributesResult = await resolveProductAttributesForSave(authResult.session, body.attributes ?? []);
  if ("error" in attributesResult) {
    return NextResponse.json({ error: attributesResult.error }, { status: 400 });
  }

  const companyResult = await resolveProductCompanyName(authResult.session, body.companyName);
  if ("error" in companyResult) {
    return NextResponse.json({ error: companyResult.error }, { status: 400 });
  }

  try {
    let internalSku = body.internalSku?.trim() ?? "";
    if (!isValidInternalProductCode(internalSku)) {
      internalSku = await generateUniqueInternalSku((sku) =>
        prisma.internalProduct.findUnique({ where: { internalSku: sku }, select: { id: true } }),
      );
    } else {
      const duplicate = await prisma.internalProduct.findUnique({ where: { internalSku }, select: { id: true } });
      if (duplicate) {
        return NextResponse.json({ error: "内部商品编码已存在，请重新打开对话框" }, { status: 409 });
      }
    }

    const product = await prisma.internalProduct.create({
      data: {
        internalSku,
        companyName: companyResult.companyName,
        attributes: attributesResult.attributes,
        status: body.status,
      },
    });

    const persisted = toCompanySku(product);

    await writeAuditLog({
      userId: auditActorId(authResult.session),
      action: "新增内部商品",
      entity: "InternalProduct",
      entityId: persisted.id,
      detail: {
        internalSku: persisted.internalSku,
        companyName: persisted.companyName,
        productName: getProductDisplayName(persisted),
      },
    });

    return NextResponse.json(persisted);
  } catch (error) {
    if (error instanceof Error && error.message === "INTERNAL_SKU_GENERATION_FAILED") {
      return NextResponse.json({ error: "内部商品编码生成失败，请重试" }, { status: 500 });
    }
    return saveErrorResponse(error);
  }
}
