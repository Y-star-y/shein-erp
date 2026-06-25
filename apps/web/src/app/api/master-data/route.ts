import { toCompanySku, toPlatformSkuMapping } from "@/lib/master-data";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const [products, mappings] = await Promise.all([
    prisma.internalProduct.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.sheinProductMapping.findMany({
      include: { store: true, internalProduct: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    companySkus: products.map(toCompanySku),
    mappings: mappings.map(toPlatformSkuMapping),
  });
}
