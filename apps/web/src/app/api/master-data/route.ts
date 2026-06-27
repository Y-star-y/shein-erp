import { getSessionOr401 } from "@/lib/auth-helpers";
import { canAccessModule } from "@/lib/permissions";
import { toCompanySku, toPlatformSkuMapping } from "@/lib/master-data";
import { databaseErrorDetail, databaseErrorMessage } from "@/lib/database-error";
import { prisma } from "@/lib/prisma";
import { mappingsWhereForSession } from "@/lib/store-access";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const { session } = authResult;
  const canProducts = canAccessModule(session.user, "productManagement");
  const canMappings = canAccessModule(session.user, "platformMappings");

  if (!canProducts && !canMappings) {
    return NextResponse.json({ companySkus: [], mappings: [] });
  }

  try {
    const [products, mappings] = await Promise.all([
      canProducts
        ? prisma.internalProduct.findMany({ include: { productGroup: true }, orderBy: { updatedAt: "desc" } })
        : Promise.resolve([]),
      canMappings
        ? prisma.sheinProductMapping.findMany({
            where: mappingsWhereForSession(session),
            include: { store: true, internalProduct: true },
            orderBy: { updatedAt: "desc" },
          })
        : Promise.resolve([]),
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
