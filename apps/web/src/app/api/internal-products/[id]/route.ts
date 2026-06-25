import { parseWarningQuantity, productGroupRelation, toCompanySku } from "@/lib/master-data";
import { prisma } from "@/lib/prisma";
import type { CompanySku } from "@shein-erp/shared";
import { NextResponse } from "next/server";

function productErrorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error && error.message.includes("Can't reach database server")
    ? "数据库连接失败，请检查 PostgreSQL 服务或 DATABASE_URL"
    : fallback;

  return NextResponse.json({ error: message }, { status: 500 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    return NextResponse.json(toCompanySku(persisted));
  } catch (error) {
    return productErrorResponse(error, "内部商品保存失败");
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.internalProduct.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return productErrorResponse(error, "内部商品删除失败");
  }
}
