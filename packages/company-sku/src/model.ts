import type { CompanySku } from "@shein-erp/shared";
import { nowText } from "@shein-erp/shared";

export function createCompanySku(): CompanySku {
  const now = nowText();

  return {
    id: `company-sku-${Date.now()}`,
    platformSkc: "",
    productNameCn: "",
    status: "active",
    specification: "",
    color: "",
    model: "",
    imageUrl: "",
    supplierUrl: "",
    defaultWarningQuantity: "",
    source: "manual",
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeCompanySku(item: CompanySku): CompanySku {
  const now = nowText();

  return {
    ...createCompanySku(),
    ...item,
    source: "manual",
    status: item.status || "active",
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || item.createdAt || now,
  };
}

export function isSkuIncomplete(item: CompanySku) {
  return item.status === "active" && [item.specification, item.color, item.model, item.imageUrl, item.supplierUrl, item.defaultWarningQuantity].some((value) => !value.trim());
}

export function validateCompanySku(value: CompanySku, companySkus: CompanySku[], mode: "create" | "edit") {
  const errors: Record<string, string> = {};
  const platformSkc = value.platformSkc.trim();

  if (!platformSkc) errors.platformSkc = "公司 SKU 编码不能为空";
  if (!value.productNameCn.trim()) errors.productNameCn = "产品中文名不能为空";
  if (
    platformSkc &&
    companySkus.some((item) => item.platformSkc.trim() === platformSkc && (mode === "create" || item.id !== value.id))
  ) {
    errors.platformSkc = "该公司 SKU 编码已存在";
  }

  return errors;
}

export function resolveCompanySkuState(platformSkc: string, companySkus: CompanySku[]) {
  const sku = companySkus.find((item) => item.platformSkc === platformSkc);
  if (!sku) return { label: "SKU不存在", tone: "danger" as const };
  if (sku.status === "inactive") return { label: "SKU停用", tone: "warning" as const };
  return { label: "可用", tone: "success" as const };
}

export function countMappingsForSku(platformSkc: string, mappings: { platformSkc: string }[]) {
  return mappings.filter((mapping) => mapping.platformSkc === platformSkc).length;
}
