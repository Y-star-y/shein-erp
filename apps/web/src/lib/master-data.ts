import type { InternalProduct, SheinProductMapping, Store } from "@prisma/client";
import {
  normalizeProductAttributes,
  productAttributesForClient,
  type CompanySku,
  type PlatformSkuMapping,
  type ProductAttribute,
} from "@shein-erp/shared";

export type MappingWithStore = SheinProductMapping & {
  store: Store;
  internalProduct?: InternalProduct | null;
};

export type InternalProductRecord = InternalProduct;

function text(value: unknown) {
  return String(value ?? "");
}

export function toCompanySku(product: InternalProductRecord): CompanySku {
  return {
    id: product.id,
    companyName: text(product.companyName),
    attributes: productAttributesForClient(normalizeProductAttributes(product.attributes)),
    status: product.status,
    createdAt: product.createdAt.toLocaleString("zh-CN", { hour12: false }),
    updatedAt: product.updatedAt.toLocaleString("zh-CN", { hour12: false }),
  };
}

export function toPlatformSkuMapping(mapping: MappingWithStore): PlatformSkuMapping {
  return {
    id: mapping.id,
    platform: mapping.platform,
    storeName: mapping.store.name,
    internalProductId: mapping.internalProductId || mapping.internalProduct?.id || "",
    platformSkc: text(mapping.platformSkc),
    platformSku: text(mapping.platformSku),
    sheinProductId: text(mapping.sheinProductId),
    platformSpu: text(mapping.platformSpu),
    sellerSku: text(mapping.sellerSku),
    sheinProductName: text(mapping.sheinProductName),
    status: mapping.status,
    remark: text(mapping.remark),
    createdAt: mapping.createdAt.toLocaleString("zh-CN", { hour12: false }),
    updatedAt: mapping.updatedAt.toLocaleString("zh-CN", { hour12: false }),
  };
}

export function productAttributesInput(attributes: ProductAttribute[]) {
  return normalizeProductAttributes(attributes);
}

export function parseWarningQuantity(value: string) {
  const parsed = Number.parseInt(value || "0", 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}
