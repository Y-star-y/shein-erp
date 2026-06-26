import { toCompanySku, toPlatformSkuMapping } from "@/lib/master-data";
import { databaseErrorDetail, databaseErrorMessage } from "@/lib/database-error";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [products, mappings] = await Promise.all([
      prisma.internalProduct.findMany({ include: { productGroup: true }, orderBy: { updatedAt: "desc" } }),
      prisma.sheinProductMapping.findMany({
        include: { store: true, internalProduct: true },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      companySkus: products.map(toCompanySku),
      mappings: mappings.map(toPlatformSkuMapping),
    });
  } catch (error) {
    return NextResponse.json(
      { error: databaseErrorMessage(error), detail: databaseErrorDetail(error) },
      { status: 500 },
    );
  }
}
