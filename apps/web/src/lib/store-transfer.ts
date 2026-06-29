import { prisma } from "@/lib/prisma";
import { normalizeIdNumber } from "@/lib/user-profile";
import {
  ID_NUMBER_ATTRIBUTE_KEY,
  mergeStoredTopLevelAttributes,
  normalizeProductAttributes,
} from "@shein-erp/shared";
import type { InternalProduct } from "@prisma/client";
import { Role } from "@prisma/client";

export type TransferStoresInput = {
  fromUserId: string;
  toUserId: string;
  /** @deprecated 仅支持整账号过户；若传入且不等于全部店铺则拒绝 */
  storeIds?: string[];
};

export type TransferStoresResult =
  | {
      ok: true;
      storeCount: number;
      productCount: number;
      storeNames: string[];
    }
  | { ok: false; error: string };

async function loadTransferUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      idNumber: true,
      active: true,
      role: true,
    },
  });
}

async function findInternalProductIdsByIdNumber(idNumber: string) {
  const normalized = normalizeIdNumber(idNumber);
  if (!normalized) return [];

  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM "InternalProduct"
    WHERE EXISTS (
      SELECT 1
      FROM jsonb_array_elements(attributes::jsonb) AS elem
      WHERE elem->>'key' = ${ID_NUMBER_ATTRIBUTE_KEY}
        AND UPPER(TRIM(elem->>'value')) = ${normalized}
    )
  `;

  return rows.map((row) => row.id);
}

async function collectProductIdsForFullTransfer(fromUserId: string, fromUserIdNumber: string | null) {
  const storeIds = (
    await prisma.store.findMany({
      where: { ownerId: fromUserId },
      select: { id: true },
    })
  ).map((store) => store.id);

  const mappingProductIds =
    storeIds.length > 0
      ? (
          await prisma.sheinProductMapping.findMany({
            where: {
              storeId: { in: storeIds },
              internalProductId: { not: null },
            },
            select: { internalProductId: true },
          })
        )
          .map((mapping) => mapping.internalProductId)
          .filter((id): id is string => Boolean(id))
      : [];

  const idNumberProductIds = fromUserIdNumber
    ? await findInternalProductIdsByIdNumber(fromUserIdNumber)
    : [];

  return [...new Set([...mappingProductIds, ...idNumberProductIds])];
}

function patchProductAttributesForTransfer(
  product: Pick<InternalProduct, "attributes">,
  target: { idNumber: string; email: string },
) {
  return mergeStoredTopLevelAttributes(normalizeProductAttributes(product.attributes), {
    idNumber: target.idNumber,
    employeeAccount: target.email,
  });
}

export async function transferUserStores(input: TransferStoresInput): Promise<TransferStoresResult> {
  const { fromUserId, toUserId, storeIds } = input;

  if (fromUserId === toUserId) {
    return { ok: false, error: "转出与接收员工不能相同" };
  }

  const [fromUser, toUser] = await Promise.all([
    loadTransferUser(fromUserId),
    loadTransferUser(toUserId),
  ]);

  if (!fromUser || fromUser.role === Role.ADMIN) {
    return { ok: false, error: "转出员工不存在或不能过户管理员账户" };
  }

  if (!toUser || toUser.role === Role.ADMIN || !toUser.active) {
    return { ok: false, error: "接收员工不存在、已禁用或为管理员" };
  }

  if (!toUser.idNumber?.trim()) {
    return { ok: false, error: "接收员工未配置证件号码，无法更新商品证件号" };
  }

  const allFromStores = await prisma.store.findMany({
    where: { ownerId: fromUserId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  if (!allFromStores.length) {
    return { ok: false, error: "该员工名下暂无店铺" };
  }

  if (storeIds?.length) {
    const allStoreIdSet = new Set(allFromStores.map((store) => store.id));
    const isFullTransfer =
      storeIds.length === allFromStores.length && storeIds.every((id) => allStoreIdSet.has(id));

    if (!isFullTransfer) {
      return { ok: false, error: "仅支持整账号过户，请过户该员工全部店铺" };
    }
  }

  const targetStoreNames = new Set(
    (
      await prisma.store.findMany({
        where: { ownerId: toUserId },
        select: { name: true },
      })
    ).map((store) => store.name),
  );

  const conflicts = allFromStores.filter((store) => targetStoreNames.has(store.name));
  if (conflicts.length) {
    return {
      ok: false,
      error: `接收员工已有同名店铺：${conflicts.map((store) => store.name).join("、")}`,
    };
  }

  const transferStoreIds = allFromStores.map((store) => store.id);
  const targetIdNumber = toUser.idNumber!.trim();
  const targetEmail = toUser.email.trim().toLowerCase();

  const productIds = await collectProductIdsForFullTransfer(fromUserId, fromUser.idNumber);

  await prisma.$transaction(async (tx) => {
    await tx.store.updateMany({
      where: { id: { in: transferStoreIds } },
      data: { ownerId: toUserId },
    });

    if (productIds.length) {
      const products = await tx.internalProduct.findMany({
        where: { id: { in: productIds } },
        select: { id: true, attributes: true },
      });

      for (const product of products) {
        await tx.internalProduct.update({
          where: { id: product.id },
          data: {
            attributes: patchProductAttributesForTransfer(product, {
              idNumber: targetIdNumber,
              email: targetEmail,
            }),
          },
        });
      }
    }
  });

  return {
    ok: true,
    storeCount: allFromStores.length,
    productCount: productIds.length,
    storeNames: allFromStores.map((store) => store.name),
  };
}
