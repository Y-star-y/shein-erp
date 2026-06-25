import { toPlatformSkuMapping } from "@/lib/master-data";
import { prisma } from "@/lib/prisma";
import type { PlatformSkuMapping } from "@shein-erp/shared";
import { NextResponse } from "next/server";

async function resolveRefs(body: Partial<PlatformSkuMapping>) {
  const storeName = body.storeName?.trim();
  const internalSku = body.internalSku?.trim();

  const [store, product] = await Promise.all([
    storeName
      ? prisma.store.upsert({
          where: { name: storeName },
          update: { platform: body.platform?.trim() || "SHEIN" },
          create: { name: storeName, platform: body.platform?.trim() || "SHEIN" },
        })
      : Promise.resolve(null),
    internalSku ? prisma.internalProduct.findUnique({ where: { internalSku } }) : Promise.resolve(null),
  ]);

  if (internalSku && !product) {
    return { error: NextResponse.json({ error: "内部商品不存在" }, { status: 400 }) };
  }

  return { store, product };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as Partial<PlatformSkuMapping>;
  const refs = await resolveRefs(body);
  if ("error" in refs) return refs.error;

  if (body.status === "active" || body.storeName || body.internalSku) {
    const current = await prisma.sheinProductMapping.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: "映射不存在" }, { status: 404 });

    const storeId = refs.store?.id || current.storeId;
    const internalProductId = refs.product?.id || current.internalProductId;

    if (internalProductId) {
      const activeDuplicate = await prisma.sheinProductMapping.findFirst({
        where: {
          id: { not: id },
          storeId,
          internalProductId,
          status: "active",
        },
      });

      if (activeDuplicate && (body.status || current.status) === "active") {
        return NextResponse.json({ error: "该店铺已经有这个内部商品的启用映射" }, { status: 409 });
      }
    }
  }

  const mapping = await prisma.sheinProductMapping.update({
    where: { id },
    data: {
      ...(body.platform !== undefined ? { platform: body.platform.trim() || "SHEIN" } : {}),
      ...(refs.store ? { storeId: refs.store.id } : {}),
      ...(refs.product ? { internalProductId: refs.product.id } : {}),
      ...(body.platformSkc !== undefined ? { platformSkc: body.platformSkc.trim() } : {}),
      ...(body.platformSku !== undefined ? { platformSku: body.platformSku.trim() || null } : {}),
      ...(body.platformSpu !== undefined ? { platformSpu: body.platformSpu.trim() || null } : {}),
      ...(body.sheinProductId !== undefined ? { sheinProductId: body.sheinProductId.trim() || null } : {}),
      ...(body.sellerSku !== undefined ? { sellerSku: body.sellerSku.trim() || null } : {}),
      ...(body.sheinProductName !== undefined ? { sheinProductName: body.sheinProductName.trim() || null } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.remark !== undefined ? { remark: body.remark.trim() || null } : {}),
    },
    include: { store: true, internalProduct: true },
  });

  return NextResponse.json(toPlatformSkuMapping(mapping));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.sheinProductMapping.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
