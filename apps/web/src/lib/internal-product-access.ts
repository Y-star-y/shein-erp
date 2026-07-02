import { prisma } from "@/lib/prisma";
import { readStoredEmployeeIdNumber, resolveUserIdNumber } from "@/lib/product-company";
import { normalizeIdNumber } from "@/lib/user-profile";
import { ID_NUMBER_ATTRIBUTE_KEY } from "@shein-erp/shared";
import type { InternalProduct } from "@prisma/client";
import type { Session } from "next-auth";
import { NextResponse } from "next/server";

export function isInternalProductAdmin(session: Session) {
  return session.user.role === "ADMIN";
}

export function internalProductBelongsToIdNumber(
  product: Pick<InternalProduct, "attributes">,
  idNumber: string,
) {
  const stored = normalizeIdNumber(readStoredEmployeeIdNumber(product.attributes));
  const expected = normalizeIdNumber(idNumber);
  return Boolean(stored && expected && stored === expected);
}

export async function resolveSessionEmployeeIdNumber(session: Session) {
  if (isInternalProductAdmin(session)) {
    return null;
  }
  return resolveUserIdNumber(session.user.id);
}

export async function checkInternalProductAccess(
  session: Session,
  product: Pick<InternalProduct, "attributes"> | null | undefined,
) {
  if (!product) {
    return { ok: false as const, error: "内部商品不存在" };
  }
  if (isInternalProductAdmin(session)) {
    return { ok: true as const };
  }

  const idNumber = await resolveSessionEmployeeIdNumber(session);
  if (!idNumber) {
    return { ok: false as const, error: "当前账号未配置证件号" };
  }
  if (!internalProductBelongsToIdNumber(product, idNumber)) {
    return { ok: false as const, error: "无权访问该内部商品" };
  }

  return { ok: true as const };
}

export function internalProductAccessDeniedResponse(error: string, notFound = false) {
  return NextResponse.json({ error }, { status: notFound ? 404 : 403 });
}

export async function requireInternalProductAccess(
  session: Session,
  product: Pick<InternalProduct, "attributes"> | null | undefined,
  options?: { notFoundWhenMissing?: boolean },
) {
  const result = await checkInternalProductAccess(session, product);
  if (result.ok) {
    return null;
  }

  const treatAsNotFound = options?.notFoundWhenMissing && result.error === "内部商品不存在";
  return internalProductAccessDeniedResponse(result.error, treatAsNotFound);
}

export async function findInternalProductsForSession(session: Session) {
  if (isInternalProductAdmin(session)) {
    return prisma.internalProduct.findMany({ orderBy: { updatedAt: "desc" } });
  }

  const idNumber = normalizeIdNumber(await resolveSessionEmployeeIdNumber(session));
  if (!idNumber) {
    return [];
  }

  return prisma.$queryRaw<InternalProduct[]>`
    SELECT *
    FROM "InternalProduct"
    WHERE EXISTS (
      SELECT 1
      FROM jsonb_array_elements(attributes::jsonb) AS elem
      WHERE elem->>'key' = ${ID_NUMBER_ATTRIBUTE_KEY}
        AND UPPER(TRIM(elem->>'value')) = ${idNumber}
    )
    ORDER BY "updatedAt" DESC
  `;
}

export async function findAccessibleInternalProductById(session: Session, id: string) {
  const product = await prisma.internalProduct.findUnique({ where: { id } });
  const access = await checkInternalProductAccess(session, product);
  if (!access.ok) {
    return { error: access.error };
  }
  return { product: product! };
}
