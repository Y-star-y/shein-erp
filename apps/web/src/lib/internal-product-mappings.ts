import { auditActorId, writeAuditLog } from "@/lib/audit-log";
import { findAccessibleInternalProductById, isInternalProductAdmin } from "@/lib/internal-product-access";
import { findActiveMappingByPlatformSku, validateMappingSkuKeys } from "@/lib/mapping-validation";
import { syncOrderStatuses } from "@/lib/order-sync";
import { prisma } from "@/lib/prisma";
import { mappingsWhereForSession, findAccessibleStore, findAccessibleStoresForSession, isStoreAdmin, toStoreRecord } from "@/lib/store-access";
import type { SheinProductMapping, Store, User } from "@prisma/client";
import type { Session } from "next-auth";

type MappingWithStore = SheinProductMapping & {
  store: Store & {
    owner: Pick<User, "name" | "email">;
  };
};

export type InternalProductMappingRow = {
  id: string;
  storeName: string;
  storePlatform: string;
  ownerName?: string;
  ownerEmail?: string;
  platformSku: string | null;
  sellerSku: string | null;
  platformSkc: string | null;
  status: string;
  updatedAt: string;
};

export function toInternalProductMappingRow(
  session: Session,
  mapping: MappingWithStore,
): InternalProductMappingRow {
  return {
    id: mapping.id,
    storeName: mapping.store.name,
    storePlatform: mapping.store.platform,
    ...(isInternalProductAdmin(session)
      ? {
          ownerName: mapping.store.owner.name,
          ownerEmail: mapping.store.owner.email,
        }
      : {}),
    platformSku: mapping.platformSku,
    sellerSku: mapping.sellerSku,
    platformSkc: mapping.platformSkc,
    status: mapping.status,
    updatedAt: mapping.updatedAt.toLocaleString("zh-CN", { hour12: false }),
  };
}

export async function findAccessibleMappingsForProduct(session: Session, productId: string) {
  return prisma.sheinProductMapping.findMany({
    where: {
      internalProductId: productId,
      ...mappingsWhereForSession(session),
    },
    include: {
      store: {
        select: {
          name: true,
          platform: true,
          owner: { select: { name: true, email: true } },
        },
      },
    },
    orderBy: [{ store: { name: "asc" } }, { updatedAt: "desc" }],
  }) as Promise<MappingWithStore[]>;
}

export async function getAccessibleMappingCounts(session: Session, productIds: string[]) {
  if (!productIds.length) {
    return {} as Record<string, number>;
  }

  const groups = await prisma.sheinProductMapping.groupBy({
    by: ["internalProductId"],
    where: {
      internalProductId: { in: productIds },
      ...mappingsWhereForSession(session),
    },
    _count: { _all: true },
  });

  const counts: Record<string, number> = {};
  for (const group of groups) {
    if (group.internalProductId) {
      counts[group.internalProductId] = group._count._all;
    }
  }

  return counts;
}

export async function getAccessibleMappingsForProduct(session: Session, productId: string) {
  const productResult = await findAccessibleInternalProductById(session, productId);
  if ("error" in productResult) {
    return productResult;
  }

  const mappings = await findAccessibleMappingsForProduct(session, productId);
  const stores = await findAccessibleStoresForSession(session);
  const includeOwner = isStoreAdmin(session);

  return {
    product: {
      id: productResult.product.id,
      companyName: productResult.product.companyName,
    },
    mappings: mappings.map((mapping) => toInternalProductMappingRow(session, mapping)),
    stores: stores.map((store) => toStoreRecord(store, includeOwner)),
  };
}

export async function deleteAccessibleProductMapping(
  session: Session,
  productId: string,
  mappingId: string,
) {
  const productResult = await findAccessibleInternalProductById(session, productId);
  if ("error" in productResult) {
    return productResult;
  }

  const mapping = await prisma.sheinProductMapping.findFirst({
    where: {
      id: mappingId,
      internalProductId: productId,
      ...mappingsWhereForSession(session),
    },
    include: { store: true },
  });

  if (!mapping) {
    return { error: "映射不存在或无权访问" as const };
  }

  const unmappedLineCount = await prisma.$transaction(async (tx) => {
    const affectedOrders = await tx.orderLine.findMany({
      where: { sheinMappingId: mappingId },
      select: { orderId: true },
      distinct: ["orderId"],
    });

    const updateResult = await tx.orderLine.updateMany({
      where: { sheinMappingId: mappingId },
      data: { sheinMappingId: null, mappingStatus: "unmapped" },
    });
    await tx.sheinProductMapping.delete({ where: { id: mappingId } });
    await syncOrderStatuses(
      tx,
      affectedOrders.map((row) => row.orderId),
    );
    return updateResult.count;
  });

  await writeAuditLog({
    userId: auditActorId(session),
    action: "删除SHEIN映射",
    entity: "SheinProductMapping",
    entityId: mappingId,
    detail: {
      internalProductId: productResult.product.id,
      platformSkc: mapping.platformSkc,
      platformSku: mapping.platformSku,
      sellerSku: mapping.sellerSku,
      storeName: mapping.store.name,
      unmappedLineCount,
    },
  });

  return { ok: true as const, unmappedLineCount };
}

export async function createAccessibleProductMapping(
  session: Session,
  productId: string,
  input: {
    storeId: string;
    platformSku: string;
  },
) {
  const storeId = input.storeId.trim();
  const platformSku = input.platformSku.trim();

  if (!storeId) {
    return { error: "请选择店铺" as const };
  }

  if (!platformSku) {
    return { error: "平台 SKU 不能为空" as const };
  }

  const productResult = await findAccessibleInternalProductById(session, productId);
  if ("error" in productResult) {
    return productResult;
  }

  if (productResult.product.status !== "active") {
    return { error: "停用的内部商品不能新增映射" as const };
  }

  const store = await findAccessibleStore(session, storeId);
  if (!store) {
    return { error: "店铺不存在或无权访问" as const };
  }

  const skuValidation = await validateMappingSkuKeys("", platformSku);
  if (!skuValidation.ok) {
    return { error: skuValidation.error };
  }

  const activePlatform = await findActiveMappingByPlatformSku(platformSku);
  if (activePlatform) {
    return { error: "该平台 SKU 已有启用映射" as const };
  }

  const result = await prisma.$transaction(async (tx) => {
    const mapping = await tx.sheinProductMapping.create({
        data: {
          platform: store.platform,
          storeId: store.id,
          internalProductId: productResult.product.id,
          platformSkc: null,
          platformSku,
          sellerSku: null,
          status: "active",
        },
        include: {
          store: {
            select: {
              name: true,
              platform: true,
              owner: { select: { name: true, email: true } },
            },
          },
        },
      });

      const updateResult = await tx.orderLine.updateMany({
        where: {
          mappingStatus: "unmapped",
          platformSku,
        },
        data: {
          mappingStatus: "mapped",
          sheinMappingId: mapping.id,
        },
      });

      const affectedOrders = await tx.orderLine.findMany({
        where: { sheinMappingId: mapping.id },
        select: { orderId: true },
        distinct: ["orderId"],
      });
      await syncOrderStatuses(
        tx,
        affectedOrders.map((row) => row.orderId),
      );

    return { mapping: mapping as MappingWithStore, updatedLineCount: updateResult.count };
  });

  await writeAuditLog({
    userId: auditActorId(session),
    action: "新增SHEIN映射",
    entity: "SheinProductMapping",
    entityId: result.mapping.id,
    detail: {
      internalProductId: productResult.product.id,
      platformSkc: result.mapping.platformSkc,
      platformSku: result.mapping.platformSku,
      storeName: result.mapping.store.name,
      updatedLineCount: result.updatedLineCount,
    },
  });

  return {
    mapping: toInternalProductMappingRow(session, result.mapping),
    updatedLineCount: result.updatedLineCount,
  };
}
