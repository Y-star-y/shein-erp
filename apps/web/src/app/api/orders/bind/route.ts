import { auditActorId, writeAuditLog } from "@/lib/audit-log";
import { getSessionOr401, requireModule } from "@/lib/auth-helpers";
import {
  findActiveMappingByPlatformSku,
  findActiveMappingBySellerSku,
  validateMappingSkuKeys,
} from "@/lib/mapping-validation";
import { productGroupRelation, toCompanySku, toPlatformSkuMapping } from "@/lib/master-data";
import { prisma } from "@/lib/prisma";
import { resolveOrCreateStore } from "@/lib/store-access";
import type { OrderBindRequest, OrderBindResult } from "@shein-erp/shared";
import type { InternalProduct, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

function unmappedLineWhere(sellerSku: string, platformSku: string): Prisma.OrderLineWhereInput {
  const conditions: Prisma.OrderLineWhereInput[] = [];

  if (sellerSku) {
    conditions.push({ sellerSku });
  }

  if (platformSku) {
    conditions.push({ platformSku });
  }

  return {
    mappingStatus: "unmapped",
    OR: conditions.length ? conditions : undefined,
  };
}

export async function POST(request: Request) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const denied = requireModule(authResult.session, "orderManagement");
  if (denied) return denied;

  const body = (await request.json()) as OrderBindRequest;
  const platformSkc = body.platformSkc?.trim() || null;
  const storeName = body.storeName?.trim();
  const sellerSku = body.sellerSku?.trim() || "";
  const platformSku = body.platformSku?.trim() || "";
  const productMode = body.productMode === "create" ? "create" : "existing";

  if (!storeName) {
    return NextResponse.json({ error: "店铺不能为空" }, { status: 400 });
  }

  const skuValidation = await validateMappingSkuKeys(sellerSku, platformSku);
  if (!skuValidation.ok) {
    return NextResponse.json({ error: skuValidation.error }, { status: 400 });
  }

  if (sellerSku) {
    const activeSeller = await findActiveMappingBySellerSku(sellerSku);
    if (activeSeller) {
      return NextResponse.json({ error: "该卖家 SKU 已有启用映射" }, { status: 409 });
    }
  }

  if (platformSku) {
    const activePlatform = await findActiveMappingByPlatformSku(platformSku);
    if (activePlatform) {
      return NextResponse.json({ error: "该平台 SKU 已有启用映射" }, { status: 409 });
    }
  }

  let internalSku = body.internalSku?.trim();
  let createdProduct = false;

  if (productMode === "create") {
    internalSku = body.newProduct?.internalSku?.trim() || "";
    const productNameCn = body.newProduct?.productNameCn?.trim() || "";

    if (!internalSku) {
      return NextResponse.json({ error: "内部商品编码不能为空" }, { status: 400 });
    }
    if (!productNameCn) {
      return NextResponse.json({ error: "商品名称不能为空" }, { status: 400 });
    }

    const duplicate = await prisma.internalProduct.findUnique({ where: { internalSku } });
    if (duplicate) {
      return NextResponse.json({ error: "内部商品编码已存在" }, { status: 409 });
    }
  } else {
    if (!internalSku) {
      return NextResponse.json({ error: "必须选择内部商品" }, { status: 400 });
    }

    const existing = await prisma.internalProduct.findUnique({ where: { internalSku } });
    if (!existing) {
      return NextResponse.json({ error: "内部商品不存在" }, { status: 400 });
    }
    if (existing.status !== "active") {
      return NextResponse.json({ error: "停用的内部商品不能绑定" }, { status: 400 });
    }
  }

  const store = await resolveOrCreateStore(authResult.session, storeName, "SHEIN");

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      let product: InternalProduct & { productGroup?: { nameCn: string } | null };

      if (productMode === "create") {
        createdProduct = true;
        product = await tx.internalProduct.create({
          data: {
            internalSku: internalSku!,
            ...(body.newProduct?.productGroupName?.trim()
              ? { productGroup: productGroupRelation(body.newProduct.productGroupName) }
              : {}),
            productNameCn: body.newProduct!.productNameCn.trim(),
            specification: body.newProduct?.specification?.trim() || null,
            color: body.newProduct?.color?.trim() || null,
            size: body.newProduct?.size?.trim() || null,
            status: "active",
            source: "shein_order",
          },
          include: { productGroup: true },
        });
      } else {
        product = await tx.internalProduct.findUniqueOrThrow({
          where: { internalSku: internalSku! },
          include: { productGroup: true },
        });
      }

      const storeDuplicate = await tx.sheinProductMapping.findFirst({
        where: {
          storeId: store.id,
          internalProductId: product.id,
          status: "active",
        },
      });

      if (storeDuplicate) {
        throw new Error("STORE_PRODUCT_MAPPING_EXISTS");
      }

      const mapping = await tx.sheinProductMapping.create({
        data: {
          platform: "SHEIN",
          storeId: store.id,
          internalProductId: product.id,
          platformSkc,
          platformSku: platformSku || null,
          platformSpu: body.platformSpu?.trim() || null,
          sellerSku: sellerSku || null,
          sheinProductName: body.sheinProductName?.trim() || null,
          status: "active",
          remark: body.remark?.trim() || null,
        },
        include: { store: true, internalProduct: true },
      });

      const updateResult = await tx.orderLine.updateMany({
        where: unmappedLineWhere(sellerSku, platformSku),
        data: {
          mappingStatus: "mapped",
          sheinMappingId: mapping.id,
          ...(platformSkc ? { platformSkc } : {}),
          ...(platformSku ? { platformSku } : {}),
        },
      });

      return { mapping, product, updatedLineCount: updateResult.count };
    });
  } catch (error) {
    if (error instanceof Error && error.message === "STORE_PRODUCT_MAPPING_EXISTS") {
      return NextResponse.json({ error: "该店铺已经有这个内部商品的启用映射" }, { status: 409 });
    }
    throw error;
  }

  if (createdProduct) {
    await writeAuditLog({
      userId: auditActorId(authResult.session),
      action: "新增内部商品",
      entity: "InternalProduct",
      entityId: result.product.id,
      detail: { internalSku: result.product.internalSku, source: "shein_order_bind" },
    });
  }

  await writeAuditLog({
    userId: auditActorId(authResult.session),
    action: "绑定SHEIN订单SKU",
    entity: "SheinProductMapping",
    entityId: result.mapping.id,
    detail: {
      sellerSku,
      platformSku,
      internalSku,
      updatedLineCount: result.updatedLineCount,
      createdProduct,
    },
  });

  const response: OrderBindResult = {
    mapping: toPlatformSkuMapping(result.mapping),
    updatedLineCount: result.updatedLineCount,
    ...(createdProduct ? { companySku: toCompanySku(result.product) } : {}),
  };

  return NextResponse.json(response);
}
