import { auditActorId, writeAuditLog } from "@/lib/audit-log";
import { getSessionOr401, requireModule } from "@/lib/auth-helpers";
import { parseWarningQuantity } from "@/lib/master-data";
import { findAccessibleStore } from "@/lib/store-access";
import { prisma } from "@/lib/prisma";
import { getProductDisplayName, normalizeProductAttributes } from "@shein-erp/shared";
import { NextResponse } from "next/server";

type WarningBody = {
  internalProductId?: string;
  warningQuantity?: number | string;
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const denied = requireModule(authResult.session, "storeManagement");
  if (denied) return denied;

  const { id: storeId } = await params;
  const store = await findAccessibleStore(authResult.session, storeId);
  if (!store) {
    return NextResponse.json({ error: "店铺不存在或无权访问" }, { status: 404 });
  }

  const body = (await request.json()) as WarningBody;
  const internalProductId = body.internalProductId?.trim();
  if (!internalProductId) {
    return NextResponse.json({ error: "内部商品不能为空" }, { status: 400 });
  }

  const warningQuantity = parseWarningQuantity(String(body.warningQuantity ?? "0"));

  const mapping = await prisma.sheinProductMapping.findFirst({
    where: { storeId, internalProductId, status: "active" },
    select: { id: true },
  });
  if (!mapping) {
    return NextResponse.json({ error: "该店铺未绑定此外部商品" }, { status: 400 });
  }

  const record = await prisma.storeProductInventoryWarning.upsert({
    where: {
      storeId_internalProductId: { storeId, internalProductId },
    },
    create: { storeId, internalProductId, warningQuantity },
    update: { warningQuantity },
    select: {
      internalProductId: true,
      warningQuantity: true,
      internalProduct: { select: { internalSku: true, companyName: true, attributes: true } },
    },
  });

  await writeAuditLog({
    userId: auditActorId(authResult.session),
    action: "设置店铺库存预警",
    entity: "StoreProductInventoryWarning",
    entityId: `${storeId}:${internalProductId}`,
    detail: {
      storeId,
      storeName: store.name,
      internalSku: record.internalProduct.internalSku,
      companyName: record.internalProduct.companyName,
      productName: getProductDisplayName({
        internalSku: record.internalProduct.internalSku,
        attributes: normalizeProductAttributes(record.internalProduct.attributes),
      }),
      warningQuantity,
    },
  });

  return NextResponse.json({
    internalProductId: record.internalProductId,
    warningQuantity: record.warningQuantity,
  });
}
