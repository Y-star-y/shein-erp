import { prisma } from "@/lib/prisma";

export async function findSellerSkuConflict(sellerSku: string, excludeMappingId?: string) {
  const trimmed = sellerSku.trim();
  if (!trimmed) {
    return null;
  }

  return prisma.sheinProductMapping.findFirst({
    where: {
      sellerSku: trimmed,
      ...(excludeMappingId ? { id: { not: excludeMappingId } } : {}),
    },
  });
}

export async function findPlatformSkuConflict(platformSku: string, excludeMappingId?: string) {
  const trimmed = platformSku.trim();
  if (!trimmed) {
    return null;
  }

  return prisma.sheinProductMapping.findFirst({
    where: {
      platformSku: trimmed,
      ...(excludeMappingId ? { id: { not: excludeMappingId } } : {}),
    },
  });
}

export async function findActiveMappingBySellerSku(sellerSku: string, excludeMappingId?: string) {
  const trimmed = sellerSku.trim();
  if (!trimmed) {
    return null;
  }

  return prisma.sheinProductMapping.findFirst({
    where: {
      sellerSku: trimmed,
      status: "active",
      internalProductId: { not: null },
      ...(excludeMappingId ? { id: { not: excludeMappingId } } : {}),
    },
  });
}

export async function findActiveMappingByPlatformSku(platformSku: string, excludeMappingId?: string) {
  const trimmed = platformSku.trim();
  if (!trimmed) {
    return null;
  }

  return prisma.sheinProductMapping.findFirst({
    where: {
      platformSku: trimmed,
      status: "active",
      internalProductId: { not: null },
      ...(excludeMappingId ? { id: { not: excludeMappingId } } : {}),
    },
  });
}

export async function validateSellerSkuUnique(sellerSku: string, excludeMappingId?: string) {
  const trimmed = sellerSku.trim();
  if (!trimmed) {
    return { ok: true as const };
  }

  const conflict = await findSellerSkuConflict(trimmed, excludeMappingId);
  if (conflict) {
    return { ok: false as const, error: "卖家 SKU 已被其他 SHEIN 映射使用" };
  }

  return { ok: true as const };
}

export async function validatePlatformSkuUnique(platformSku: string, excludeMappingId?: string) {
  const trimmed = platformSku.trim();
  if (!trimmed) {
    return { ok: true as const };
  }

  const conflict = await findPlatformSkuConflict(trimmed, excludeMappingId);
  if (conflict) {
    return { ok: false as const, error: "平台 SKU 已被其他 SHEIN 映射使用" };
  }

  return { ok: true as const };
}

export async function validateMappingSkuKeys(sellerSku: string, platformSku: string, excludeMappingId?: string) {
  if (!sellerSku.trim() && !platformSku.trim()) {
    return { ok: false as const, error: "卖家 SKU 与平台 SKU 至少填写一项" };
  }

  const sellerValidation = await validateSellerSkuUnique(sellerSku, excludeMappingId);
  if (!sellerValidation.ok) return sellerValidation;

  const platformValidation = await validatePlatformSkuUnique(platformSku, excludeMappingId);
  if (!platformValidation.ok) return platformValidation;

  return { ok: true as const };
}
