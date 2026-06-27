import { auditActorId, writeAuditLog } from "@/lib/audit-log";
import { getSessionOr401, requireModule } from "@/lib/auth-helpers";
import { normalizeOrderLineKey, parseImportDate, parseOptionalDate } from "@/lib/order-import";
import { prisma } from "@/lib/prisma";
import { resolveOrCreateStore } from "@/lib/store-access";
import { parseSheinOrderImportExcel, resolveOrderLineMapping } from "@shein-erp/core";
import type { OrderImportResult } from "@shein-erp/shared";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const denied = requireModule(authResult.session, "orderManagement");
  if (denied) return denied;

  const formData = await request.formData();
  const file = formData.get("file");
  const defaultStoreName = String(formData.get("storeName") || "").trim();

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
    return NextResponse.json({ error: "未找到可导入的订单明细" }, { status: 400 });
  }

  const sellerSkus = [...new Set(lines.map((line) => line.sellerSku).filter(Boolean))];
  const platformSkus = [...new Set(lines.map((line) => line.platformSku).filter(Boolean))];

  const existingMappings = await prisma.sheinProductMapping.findMany({
    where: {
      OR: [
        ...(sellerSkus.length ? [{ sellerSku: { in: sellerSkus } }] : []),
        ...(platformSkus.length ? [{ platformSku: { in: platformSkus } }] : []),
      ],
    },
    select: {
      id: true,
      sellerSku: true,
      platformSku: true,
      status: true,
      internalProductId: true,
    },
  });

  let mappedCount = 0;
  let unmappedCount = 0;
  const newSellerSkus = new Set<string>();

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
      const storeName = line.storeName || defaultStoreName;
      const store = storeName ? await resolveOrCreateStore(authResult.session, storeName, "SHEIN") : null;
      const createdAt = parseImportDate(line.createdAt);
      const shipBy = parseOptionalDate(line.shipBy);

      const mappingResult = resolveOrderLineMapping(
        { sellerSku: line.sellerSku, platformSku: line.platformSku },
        existingMappings,
      );

      if (mappingResult.status === "mapped") {
        mappedCount += 1;
      } else {
        unmappedCount += 1;
        if (line.sellerSku) {
          newSellerSkus.add(line.sellerSku);
        }
      }

      const order = await tx.order.upsert({
        where: { orderNo: line.orderNo },
        create: {
          platform: "SHEIN",
          orderNo: line.orderNo,
          createdAt,
          shipBy,
          country: line.country || null,
          currency: line.currency || null,
          storeId: store?.id ?? null,
          importJobId: importJob.id,
        },
        update: {
          createdAt,
          shipBy,
          country: line.country || null,
          currency: line.currency || null,
          ...(store ? { storeId: store.id } : {}),
          importJobId: importJob.id,
        },
      });

      await tx.orderLine.upsert({
        where: {
          orderId_sellerSku: {
            orderId: order.id,
            sellerSku: line.sellerSku,
          },
        },
        create: {
          orderId: order.id,
          sellerSku: line.sellerSku,
          platformSku: line.platformSku || null,
          platformSkc: line.platformSkc || null,
          platformSpu: line.platformSpu || null,
          productName: line.productName || line.sellerSku,
          spec: line.spec || null,
          quantity: line.quantity,
          price: line.price || null,
          mappingStatus: mappingResult.status,
          sheinMappingId: mappingResult.mappingId ?? null,
        },
        update: {
          platformSku: line.platformSku || null,
          platformSkc: line.platformSkc || null,
          platformSpu: line.platformSpu || null,
          productName: line.productName || line.sellerSku,
          spec: line.spec || null,
          quantity: line.quantity,
          price: line.price || null,
          mappingStatus: mappingResult.status,
          sheinMappingId: mappingResult.mappingId ?? null,
        },
      });
    }

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
    },
  });

  const response: OrderImportResult = {
    total: lines.length,
    mapped: mappedCount,
    unmapped: unmappedCount,
    newSellerSkus: [...newSellerSkus],
    importJobId: result,
  };

  return NextResponse.json(response);
}
