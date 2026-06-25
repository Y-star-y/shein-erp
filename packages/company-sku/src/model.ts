import type { CompanySku } from "@shein-erp/shared";
import { nowText } from "@shein-erp/shared";

type LegacyCompanySku = Partial<CompanySku> & {
  platformSkc?: string;
};

export function createCompanySku(): CompanySku {
  const now = nowText();

  return {
    id: `company-sku-${Date.now()}`,
    internalSku: "",
    productGroupName: "",
    productNameCn: "",
    status: "active",
    specification: "",
    color: "",
    size: "",
    model: "",
    imageUrl: "",
    supplierUrl: "",
    defaultWarningQuantity: "",
    source: "manual",
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeCompanySku(item: LegacyCompanySku): CompanySku {
  const now = nowText();
  const normalized = {
    ...createCompanySku(),
    ...item,
    internalSku: item.internalSku || item.platformSkc || "",
    source: item.source || "manual",
    status: item.status || "active",
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || item.createdAt || now,
  };

  return normalized;
}

export function isSkuIncomplete(item: CompanySku) {
  return (
    item.status === "active" &&
    [
      item.productGroupName,
      item.productNameCn,
      item.specification,
      item.color,
      item.size,
      item.imageUrl,
      item.supplierUrl,
      item.defaultWarningQuantity,
    ].some((value) => !value.trim())
  );
}

export function validateCompanySku(value: CompanySku, companySkus: CompanySku[], mode: "create" | "edit") {
  const errors: Record<string, string> = {};
  const internalSku = value.internalSku.trim();

  if (!internalSku) errors.internalSku = "内部商品编码不能为空";
  if (!value.productNameCn.trim()) errors.productNameCn = "商品名称不能为空";
  if (
    internalSku &&
    companySkus.some((item) => item.internalSku.trim() === internalSku && (mode === "create" || item.id !== value.id))
  ) {
    errors.internalSku = "内部商品编码已存在";
  }

  return errors;
}

export function resolveCompanySkuState(internalSku: string, companySkus: CompanySku[]) {
  const sku = companySkus.find((item) => item.internalSku === internalSku);
  if (!sku) return { label: "内部商品不存在", tone: "danger" as const };
  if (sku.status === "inactive") return { label: "内部商品已停用", tone: "warning" as const };
  return { label: "已绑定", tone: "success" as const };
}

export function countMappingsForSku(internalSku: string, mappings: { internalSku: string }[]) {
  return mappings.filter((mapping) => mapping.internalSku === internalSku).length;
}
