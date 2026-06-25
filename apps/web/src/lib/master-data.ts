import type { InternalProduct, SheinProductMapping, Store } from "@prisma/client";
import type { CompanySku, PlatformSkuMapping } from "@shein-erp/shared";

export type MappingWithStore = SheinProductMapping & {
  store: Store;
  internalProduct?: InternalProduct | null;
};

function text(value: unknown) {
  return String(value ?? "");
}

export function toCompanySku(product: InternalProduct): CompanySku {
  return {
    id: product.id,
    internalSku: product.internalSku,
    productGroupName: "",
    productNameCn: product.productNameCn,
    status: product.status,
    specification: text(product.specification),
    color: text(product.color),
    size: text(product.size),
    model: text(product.model),
    imageUrl: text(product.imageUrl),
    supplierUrl: text(product.supplierUrl),
    defaultWarningQuantity: String(product.defaultWarningQuantity ?? ""),
    source: product.source === "shein_order" ? "shein_order" : "manual",
    createdAt: product.createdAt.toLocaleString("zh-CN", { hour12: false }),
    updatedAt: product.updatedAt.toLocaleString("zh-CN", { hour12: false }),
  };
}

export function toPlatformSkuMapping(mapping: MappingWithStore): PlatformSkuMapping {
  return {
    id: mapping.id,
    platform: mapping.platform,
    storeName: mapping.store.name,
    internalSku: mapping.internalProduct?.internalSku || "",
    platformSkc: mapping.platformSkc,
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

export function parseWarningQuantity(value: string) {
  const parsed = Number.parseInt(value || "0", 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}
