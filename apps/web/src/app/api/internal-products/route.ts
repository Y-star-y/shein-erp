import { parseWarningQuantity, toCompanySku } from "@/lib/master-data";
import { prisma } from "@/lib/prisma";
import type { CompanySku } from "@shein-erp/shared";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json()) as CompanySku;
  const product = await prisma.internalProduct.create({
    data: {
      internalSku: body.internalSku.trim(),
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

  return NextResponse.json(toCompanySku(product));
}
