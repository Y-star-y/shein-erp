import { parseWarningQuantity, toCompanySku } from "@/lib/master-data";
import { prisma } from "@/lib/prisma";
import type { CompanySku } from "@shein-erp/shared";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as Partial<CompanySku>;
  const product = await prisma.internalProduct.update({
    where: { id },
    data: {
      ...(body.internalSku !== undefined ? { internalSku: body.internalSku.trim() } : {}),
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

  return NextResponse.json(toCompanySku(product));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.internalProduct.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
