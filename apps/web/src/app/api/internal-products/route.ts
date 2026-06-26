import { databaseErrorOrFallback } from "@/lib/database-error";
import { parseWarningQuantity, productGroupRelation, toCompanySku } from "@/lib/master-data";
import { prisma } from "@/lib/prisma";
import type { CompanySku } from "@shein-erp/shared";
import { NextResponse } from "next/server";

function saveErrorResponse(error: unknown) {
  const message = databaseErrorOrFallback(error, "内部商品保存失败");

  return NextResponse.json({ error: message }, { status: 500 });
}

export async function POST(request: Request) {
  const body = (await request.json()) as CompanySku;
  try {
    const product = await prisma.internalProduct.create({
      data: {
        internalSku: body.internalSku.trim(),
        ...(body.productGroupName.trim() ? { productGroup: productGroupRelation(body.productGroupName) } : {}),
        productNameCn: body.productNameCn.trim(),
        specification: body.specification.trim() || null,
        color: body.color.trim() || null,
        size: body.size.trim() || null,
        model: body.model.trim() || null,
        imageUrl: body.imageUrl.trim() || null,
        supplierUrl: body.supplierUrl.trim() || null,
        defaultWarningQuantity: parseWarningQuantity(body.defaultWarningQuantity),
        status: body.status,
        source: body.source || "manual",
      },
    });

    const persisted = await prisma.internalProduct.findUniqueOrThrow({
      where: { id: product.id },
      include: { productGroup: true },
    });

    return NextResponse.json(toCompanySku(persisted));
  } catch (error) {
    return saveErrorResponse(error);
  }
}
