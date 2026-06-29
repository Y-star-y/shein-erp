import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";

type InternalProductLookup = (internalSku: string) => Promise<{ id: string } | null>;

export function formatInternalProductCode() {
  return randomUUID();
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidInternalProductCode(value: string) {
  return UUID_PATTERN.test(value.trim());
}

export async function generateUniqueInternalSku(findUnique: InternalProductLookup) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = formatInternalProductCode();
    const existing = await findUnique(candidate);
    if (!existing) return candidate;
  }

  throw new Error("INTERNAL_SKU_GENERATION_FAILED");
}

export async function generateUniqueInternalSkuWithTx(tx: Prisma.TransactionClient) {
  return generateUniqueInternalSku((internalSku) =>
    tx.internalProduct.findUnique({ where: { internalSku }, select: { id: true } }),
  );
}
