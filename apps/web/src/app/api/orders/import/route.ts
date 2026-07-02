import { auditActorId, writeAuditLog } from "@/lib/audit-log";

import { getSessionOr401 } from "@/lib/auth-helpers";

import { canAccessModule } from "@/lib/permissions";

import {

  normalizeOrderLineKey,

  parseImportDate,

  parseOptionalDate,

  deriveOrderStatusFromPlatform,

  resolveImportOrderLineMapping,

} from "@/lib/order-import";

import { filterMappingsForStore } from "@/lib/order-scope";

import { syncOrderStatuses } from "@/lib/order-sync";

import { prisma } from "@/lib/prisma";

import { findAccessibleStore, resolveOrCreateStore } from "@/lib/store-access";

import { parseSheinOrderImportExcel } from "@shein-erp/core";

import type { OrderImportResult } from "@shein-erp/shared";

import { NextResponse } from "next/server";

import { databaseErrorDetail, databaseErrorMessage } from "@/lib/database-error";

import { getPrismaClientStaleMessage } from "@/lib/api-response";



export async function POST(request: Request) {

  try {

    const staleMessage = getPrismaClientStaleMessage();

    if (staleMessage) {

      return NextResponse.json({ error: staleMessage }, { status: 503 });

    }



    return await handleImport(request);

  } catch (error) {

    console.error("[orders/import]", error);

    return NextResponse.json(

      {

        error: databaseErrorMessage(error),

        detail: databaseErrorDetail(error),

      },

      { status: 500 },

    );

  }

}



async function handleImport(request: Request) {

  const authResult = await getSessionOr401();

  if ("error" in authResult) return authResult.error;



  const canStore = canAccessModule(authResult.session.user, "storeManagement");

  const canOrder = canAccessModule(authResult.session.user, "orderManagement");

  if (!canStore && !canOrder) {

    return NextResponse.json({ error: "无权访问" }, { status: 403 });

  }



  const formData = await request.formData();

  const file = formData.get("file");

  const storeIdParam = String(formData.get("storeId") || "").trim();

  const defaultStoreName = String(formData.get("storeName") || "").trim();



  let fixedStore: { id: string } | null = null;

  if (storeIdParam) {

    const store = await findAccessibleStore(authResult.session, storeIdParam);

    if (!store) {

      return NextResponse.json({ error: "店铺不存在或无权访问" }, { status: 404 });

    }

    fixedStore = { id: store.id };

  }



  if (!(file instanceof File)) {

    return NextResponse.json({ error: "请上传 Excel 文件" }, { status: 400 });

  }



  let lines;

  try {

    lines = (await parseSheinOrderImportExcel(file)).map(normalizeOrderLineKey);

  } catch (error) {

    const message = error instanceof Error ? error.message : "解析 Excel 失败";

    return NextResponse.json({ error: message }, { status: 400 });

  }



  if (!lines.length) {

    return NextResponse.json({ error: "未找到可导入的订单明细（需包含 GSP订单号 与 平台SKU）" }, { status: 400 });

  }



  if (!fixedStore && !defaultStoreName && !lines.some((line) => line.storeName)) {

    return NextResponse.json({ error: "请指定店铺或填写默认店铺名称" }, { status: 400 });

  }



  const platformSkus = [...new Set(lines.map((line) => line.platformSku).filter(Boolean))];



  const existingMappings = platformSkus.length

    ? await prisma.sheinProductMapping.findMany({

        where: {

          platformSku: { in: platformSkus },

          status: "active",

          internalProductId: { not: null },

        },

        select: {

          id: true,

          storeId: true,

          platformSku: true,

          status: true,

          internalProductId: true,

        },

      })

    : [];



  let mappedCount = 0;

  let unmappedCount = 0;

  const unmappedPlatformSkus = new Set<string>();

  const affectedOrderIds = new Set<string>();



  const result = await prisma.$transaction(async (tx) => {

    const importJob = await tx.importJob.create({

      data: {

        filename: file.name,

        type: "shein_order",

        totalRows: lines.length,

        successRows: 0,

        errorRows: 0,

        createdById: auditActorId(authResult.session),

      },

    });



    for (const line of lines) {

      let resolvedStore = fixedStore;

      if (!resolvedStore) {

        const storeName = line.storeName || defaultStoreName;

        if (storeName) {

          const created = await resolveOrCreateStore(authResult.session, storeName, "SHEIN");

          resolvedStore = { id: created.id };

        }

      }

      const createdAt = parseImportDate(line.createdAt);

      const shipBy = parseOptionalDate(line.shipBy);

      const deliverBy = parseOptionalDate(line.deliverBy);



      const mappingResult = resolveImportOrderLineMapping(

        { platformSku: line.platformSku },

        filterMappingsForStore(existingMappings, resolvedStore?.id),

      );



      if (mappingResult.status === "mapped") {

        mappedCount += 1;

      } else {

        unmappedCount += 1;

        unmappedPlatformSkus.add(line.platformSku);

      }



      const platformStatus = line.processingStatus.trim() || null;

      const logisticsNo = line.logisticsNo.trim() || null;

      const logisticsCompany = line.logisticsCompany.trim() || null;

      const recipientName = line.recipientName.trim() || null;

      const recipientPhone = line.recipientPhone.trim() || null;

      const recipientAddress = line.recipientAddress.trim() || null;

      const recipientPostalCode = line.recipientPostalCode.trim() || null;

      const archivedSellerSku = line.sellerSku.trim() || null;



      const order = await tx.order.upsert({

        where: { orderNo: line.orderNo },

        create: {

          platform: "SHEIN",

          orderNo: line.orderNo,

          createdAt,

          shipBy,

          deliverBy,

          country: line.country || null,

          currency: line.currency || null,

          storeId: resolvedStore?.id ?? null,

          importJobId: importJob.id,

          platformStatus,

          logisticsNo,

          logisticsCompany,

          recipientName,

          recipientPhone,

          recipientAddress,

          recipientPostalCode,

          status: mappingResult.status === "unmapped" ? "PENDING" : deriveOrderStatusFromPlatform(line.processingStatus),

        },

        update: {

          createdAt,

          shipBy,

          deliverBy,

          country: line.country || null,

          currency: line.currency || null,

          ...(fixedStore

            ? { storeId: fixedStore.id }

            : resolvedStore

              ? { storeId: resolvedStore.id }

              : {}),

          importJobId: importJob.id,

          platformStatus,

          logisticsNo,

          logisticsCompany,

          recipientName,

          recipientPhone,

          recipientAddress,

          recipientPostalCode,

        },

      });



      const lineData = {
        sellerSku: archivedSellerSku,
        platformSkc: line.platformSkc || null,
        platformSpu: line.platformSpu || null,
        productName: line.productName || line.platformSku,
        spec: line.spec || null,
        articleNo: line.articleNo || null,
        quantity: line.quantity,
        price: line.price || null,
        mappingStatus: mappingResult.status,
        sheinMappingId: mappingResult.mappingId ?? null,
      };

      const existingLine = await tx.orderLine.findFirst({
        where: { orderId: order.id, platformSku: line.platformSku },
      });

      if (existingLine) {
        await tx.orderLine.update({
          where: { id: existingLine.id },
          data: lineData,
        });
      } else {
        await tx.orderLine.create({
          data: {
            orderId: order.id,
            platformSku: line.platformSku,
            ...lineData,
          },
        });
      }

      affectedOrderIds.add(order.id);

    }



    await syncOrderStatuses(tx, [...affectedOrderIds]);



    await tx.importJob.update({

      where: { id: importJob.id },

      data: {

        successRows: lines.length,

        errorRows: 0,

      },

    });



    return importJob.id;

  });



  await writeAuditLog({

    userId: auditActorId(authResult.session),

    action: "导入SHEIN订单",

    entity: "ImportJob",

    entityId: result,

    detail: {

      filename: file.name,

      total: lines.length,

      mapped: mappedCount,

      unmapped: unmappedCount,

      ...(fixedStore ? { storeId: fixedStore.id } : {}),

    },

  });



  const response: OrderImportResult = {

    total: lines.length,

    mapped: mappedCount,

    unmapped: unmappedCount,

    uniquePlatformSkuCount: platformSkus.length,

    unmappedPlatformSkus: [...unmappedPlatformSkus],

    importJobId: result,

  };



  return NextResponse.json(response);

}


