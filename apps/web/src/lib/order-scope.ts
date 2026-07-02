import type { Prisma } from "@prisma/client";

type BindingCheckLine = {
  mappingStatus: string;
  sheinMappingId?: string | null;
  sheinMapping?: {
    status: string;
    internalProductId: string | null;
  } | null;
};

/** 订单行是否仍缺少有效的内部商品绑定（不含已强制排除的行） */
export function lineNeedsInternalProductBinding(line: BindingCheckLine): boolean {
  if (line.mappingStatus === "excluded") return false;
  if (line.mappingStatus === "unmapped") return true;
  if (!line.sheinMappingId) return true;

  const mapping = line.sheinMapping;
  if (!mapping) return true;

  return mapping.status !== "active" || !mapping.internalProductId;
}

/** 仍阻塞发货、应进入异常订单的订单行 */
export const unresolvedBindingLineOr: Prisma.OrderLineWhereInput[] = [
  { mappingStatus: "unmapped" },
  { mappingStatus: "mapped", sheinMappingId: null },
  {
    mappingStatus: "mapped",
    sheinMapping: {
      is: {
        OR: [{ status: { not: "active" } }, { internalProductId: null }],
      },
    },
  },
];

export const unresolvedBindingLineWhere: Prisma.OrderLineWhereInput = {
  OR: unresolvedBindingLineOr,
};

/** @deprecated 使用 unresolvedBindingLineWhere */
export const blockingUnmappedLineWhere = unresolvedBindingLineWhere;

/**
 * 异常订单：同一订单内只要存在未绑定内部商品的行，整单不得进入发货列表。
 * 亦包含平台/系统标记为异常的订单。
 */
export const exceptionOrderOr: Prisma.OrderWhereInput[] = [
  { lines: { some: unresolvedBindingLineWhere } },
  { status: "EXCEPTION" },
];

/** 可进入发货列表的订单条件（全部商品已绑定，或待绑定行已强制排除） */
export const shippableOrderWhere: Prisma.OrderWhereInput = {
  NOT: { OR: exceptionOrderOr },
};

export function isExceptionOrderScope(scope: string | null | undefined) {
  return scope === "exception";
}

export function isNormalOrderScope(scope: string | null | undefined) {
  return scope === "normal";
}

export function applyOrderListScope(
  where: Prisma.OrderWhereInput,
  scope: string | null | undefined,
): Prisma.OrderWhereInput {
  if (isExceptionOrderScope(scope)) {
    return { ...where, OR: exceptionOrderOr };
  }

  if (isNormalOrderScope(scope)) {
    return { ...where, ...shippableOrderWhere };
  }

  return where;
}

export function filterMappingsForStore<T extends { storeId: string }>(
  mappings: T[],
  storeId?: string | null,
): T[] {
  if (!storeId) return mappings;
  return mappings.filter((item) => item.storeId === storeId);
}
