import { getSessionOr401, requireModule } from "@/lib/auth-helpers";
import { findAccessibleStore } from "@/lib/store-access";
import { prisma } from "@/lib/prisma";
import type { StoreInventoryRow } from "@shein-erp/shared";
import { getProductDisplayName, normalizeProductAttributes } from "@shein-erp/shared";
import { NextResponse } from "next/server";

function isLowStock(warehouseQty: number | null, warningQuantity: number) {
  return warningQuantity > 0 && warehouseQty !== null && warehouseQty <= warningQuantity;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const denied = requireModule(authResult.session, "storeManagement");
  if (denied) return denied;

  const { id } = await params;
  const store = await findAccessibleStore(authResult.session, id);
  if (!store) {
    return NextResponse.json({ error: "店铺不存在或无权访问" }, { status: 404 });
  }

  const mappings = await prisma.sheinProductMapping.findMany({
    where: { storeId: id, status: "active" },
    include: {
      internalProduct: {
        select: {
          id: true,
          companyName: true,
          attributes: true,
        },
      },
    },
    orderBy: { sellerSku: "asc" },
  });

  const internalProductIds = [
    ...new Set(
      mappings
        .map((mapping) => mapping.internalProductId)
        .filter((productId): productId is string => Boolean(productId)),
    ),
  ];

  const warningRecords =
    internalProductIds.length > 0
      ? await prisma.storeProductInventoryWarning.findMany({
          where: { storeId: id, internalProductId: { in: internalProductIds } },
          select: { internalProductId: true, warningQuantity: true },
        })
      : [];

  const warningByProductId = new Map(
    warningRecords.map((record) => [record.internalProductId, record.warningQuantity]),
  );

  const lookupKeys = new Set<string>();
  for (const mapping of mappings) {
    if (mapping.sellerSku) lookupKeys.add(mapping.sellerSku);
    if (mapping.internalProduct?.id) lookupKeys.add(mapping.internalProduct.id);
  }

  const skuRecords =
    lookupKeys.size > 0
      ? await prisma.sku.findMany({
          where: {
            OR: [
              { code: { in: [...lookupKeys] } },
              { sellerSku: { in: [...lookupKeys] } },
            ],
          },
          select: {
            id: true,
            code: true,
            sellerSku: true,
            product: { select: { name: true } },
            stocks: { select: { quantity: true } },
          },
        })
      : [];

  const skuByKey = new Map<string, (typeof skuRecords)[number]>();
  for (const sku of skuRecords) {
    skuByKey.set(sku.code, sku);
    skuByKey.set(sku.sellerSku, sku);
  }

  const rows: StoreInventoryRow[] = mappings.map((mapping) => {
    const internalProductId = mapping.internalProductId;
    const sellerSku = mapping.sellerSku?.trim() ?? "";
    const matchedSku =
      (internalProductId ? skuByKey.get(internalProductId) : undefined) ??
      (sellerSku ? skuByKey.get(sellerSku) : undefined);

    const warehouseQty = matchedSku ? matchedSku.stocks.reduce((sum, s) => sum + s.quantity, 0) : null;
    const warningQuantity = internalProductId ? (warningByProductId.get(internalProductId) ?? 0) : 0;

    const productName = mapping.internalProduct
      ? getProductDisplayName({
          id: mapping.internalProduct.id,
          attributes: normalizeProductAttributes(mapping.internalProduct.attributes),
        })
      : mapping.sheinProductName || sellerSku || "—";

    return {
      mappingId: mapping.id,
      internalProductId,
      sellerSku,
      productName,
      sku: matchedSku?.code ?? null,
      warehouseQty,
      inTransitQty: 0,
      availableQty: warehouseQty,
      warningQuantity,
      isLowStock: isLowStock(warehouseQty, warningQuantity),
    };
  });

  return NextResponse.json({ rows });
}
