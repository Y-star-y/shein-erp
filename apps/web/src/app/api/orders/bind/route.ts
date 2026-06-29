import { auditActorId, writeAuditLog } from "@/lib/audit-log";

import { getSessionOr401, requireModule } from "@/lib/auth-helpers";

import {

  findActiveMappingByPlatformSku,

  findActiveMappingBySellerSku,

  validateMappingSkuKeys,

} from "@/lib/mapping-validation";

import { toPlatformSkuMapping } from "@/lib/master-data";

import { findAccessibleInternalProductBySku } from "@/lib/internal-product-access";

import { prisma } from "@/lib/prisma";

import { resolveOrCreateStore } from "@/lib/store-access";

import type { OrderBindRequest, OrderBindResult } from "@shein-erp/shared";

import type { Prisma } from "@prisma/client";

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

  const internalSku = body.internalSku?.trim();



  if (!storeName) {

    return NextResponse.json({ error: "店铺不能为空" }, { status: 400 });

  }



  if (!sellerSku) {

    return NextResponse.json({ error: "卖家 SKU 不能为空" }, { status: 400 });

  }



  if (!internalSku) {

    return NextResponse.json({ error: "必须选择内部商品" }, { status: 400 });

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



  const productResult = await findAccessibleInternalProductBySku(authResult.session, internalSku);
  if ("error" in productResult) {
    const status = productResult.error === "内部商品不存在" ? 400 : 403;
    return NextResponse.json({ error: productResult.error }, { status });
  }
  const existing = productResult.product;

  if (existing.status !== "active") {

    return NextResponse.json({ error: "停用的内部商品不能绑定" }, { status: 400 });

  }



  const store = await resolveOrCreateStore(authResult.session, storeName, "SHEIN");



  let result;

  try {

    result = await prisma.$transaction(async (tx) => {

      const product = await tx.internalProduct.findUniqueOrThrow({

        where: { internalSku },

      });



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



      return { mapping, updatedLineCount: updateResult.count };

    });

  } catch (error) {

    if (error instanceof Error && error.message === "STORE_PRODUCT_MAPPING_EXISTS") {

      return NextResponse.json({ error: "该店铺已经有这个内部商品的启用映射" }, { status: 409 });

    }

    throw error;

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

    },

  });



  const response: OrderBindResult = {

    mapping: toPlatformSkuMapping(result.mapping),

    updatedLineCount: result.updatedLineCount,

  };



  return NextResponse.json(response);

}

