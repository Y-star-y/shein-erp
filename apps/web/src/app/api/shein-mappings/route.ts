import { toPlatformSkuMapping } from "@/lib/master-data";
import { prisma } from "@/lib/prisma";
import type { PlatformSkuMapping } from "@shein-erp/shared";
import { NextResponse } from "next/server";

async function resolveMappingRefs(body: PlatformSkuMapping) {
  const [store, product] = await Promise.all([
    prisma.store.upsert({
      where: { name: body.storeName.trim() },
      update: { platform: body.platform.trim() || "SHEIN" },
      create: { name: body.storeName.trim(), platform: body.platform.trim() || "SHEIN" },
    }),
    prisma.internalProduct.findUnique({ where: { internalSku: body.internalSku.trim() } }),
  ]);

  if (!product) {
    return { error: NextResponse.json({ error: "内部商品不存在" }, { status: 400 }) };
  }

  return { store, product };
}

export async function POST(request: Request) {
  const body = (await request.json()) as PlatformSkuMapping;
  const refs = await resolveMappingRefs(body);
  if ("error" in refs) return refs.error;

  const activeDuplicate = await prisma.sheinProductMapping.findFirst({
    where: {
      storeId: refs.store.id,
      internalProductId: refs.product.id,
      status: "active",
    },
  });

  if (activeDuplicate && body.status === "active") {
    return NextResponse.json({ error: "该店铺已经有这个内部商品的启用映射" }, { status: 409 });
  }

  const mapping = await prisma.sheinProductMapping.create({
    data: {
      platform: body.platform.trim() || "SHEIN",
      storeId: refs.store.id,
      internalProductId: refs.product.id,
      platformSkc: body.platformSkc.trim(),
      platformSku: body.platformSku.trim() || null,
      platformSpu: body.platformSpu.trim() || null,
      sheinProductId: body.sheinProductId.trim() || null,
      sellerSku: body.sellerSku.trim() || null,
      sheinProductName: body.sheinProductName.trim() || null,
      status: body.status,
      remark: body.remark.trim() || null,
    },
    include: { store: true, internalProduct: true },
  });

  return NextResponse.json(toPlatformSkuMapping(mapping));
}
