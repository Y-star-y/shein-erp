import type { CompanySku } from "@shein-erp/shared";
import {
  generateClientInternalSku,
  getDefaultProductAttributes,
  getEditableProductAttributes,
  getEmployeeAccountAttribute,
  getProductAttributeString,
  getProductNameAttribute,
  mergeStoredTopLevelAttributes,
  nowText,
  productAttributesToSearchText,
  validateProductAttributes,
} from "@shein-erp/shared";

type LegacyCompanySku = Partial<CompanySku> & {
  platformSkc?: string;
  productGroupName?: string;
  productNameCn?: string;
  specification?: string;
  color?: string;
  size?: string;
  model?: string;
  imageUrl?: string;
  supplierUrl?: string;
};

function legacyAttributesFromItem(item: LegacyCompanySku) {
  const attributes = [];

  if (item.productNameCn?.trim()) {
    attributes.push({ key: "产品名称", type: "text" as const, value: item.productNameCn.trim() });
  }
  if (item.productGroupName?.trim()) {
    attributes.push({ key: "商品组/款式", type: "text" as const, value: item.productGroupName.trim() });
  }
  if (item.specification?.trim()) {
    attributes.push({ key: "规格", type: "text" as const, value: item.specification.trim() });
  }
  if (item.color?.trim()) {
    attributes.push({ key: "颜色", type: "text" as const, value: item.color.trim() });
  }
  if (item.size?.trim()) {
    attributes.push({ key: "尺码", type: "text" as const, value: item.size.trim() });
  }
  if (item.model?.trim()) {
    attributes.push({ key: "型号", type: "text" as const, value: item.model.trim() });
  }
  if (item.imageUrl?.trim()) {
    attributes.push({ key: "图片 URL", type: "text" as const, value: item.imageUrl.trim() });
  }
  if (item.supplierUrl?.trim()) {
    attributes.push({ key: "供应商链接", type: "text" as const, value: item.supplierUrl.trim() });
  }

  return attributes;
}

export function createCompanySku(options?: {
  internalSku?: string;
  companyName?: string;
  employeeAccount?: string;
}): CompanySku {
  const now = nowText();

  return {
    id: `company-sku-${Date.now()}`,
    internalSku: options?.internalSku ?? generateClientInternalSku(),
    companyName: options?.companyName ?? "",
    attributes: mergeStoredTopLevelAttributes(getDefaultProductAttributes(), {
      employeeAccount: options?.employeeAccount ?? "",
    }),
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeCompanySku(item: LegacyCompanySku): CompanySku {
  const now = nowText();
  const legacyAttributes = legacyAttributesFromItem(item);
  const normalized = {
    ...createCompanySku(),
    ...item,
    internalSku: item.internalSku || item.platformSkc || "",
    companyName: item.companyName || item.productGroupName || "",
    attributes:
      item.attributes && item.attributes.length
        ? item.attributes
        : legacyAttributes.length
          ? legacyAttributes
          : getDefaultProductAttributes(),
    status: item.status || "active",
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || item.createdAt || now,
  };

  return normalized;
}

export function isSkuIncomplete(item: CompanySku) {
  return (
    item.status === "active" &&
    (!item.companyName.trim() ||
      !getProductAttributeString(item.attributes, "产品名称").trim() ||
      item.attributes.every((attribute) => !attribute.key.trim()))
  );
}

export function validateCompanySku(
  value: CompanySku,
  _companySkus: CompanySku[],
  mode: "create" | "edit",
  options?: { requireEmployeeAccount?: boolean },
) {
  const errors: Record<string, string> = {};

  if (!value.companyName.trim()) {
    errors.companyName = "请选择公司名称";
  }

  if (!getProductNameAttribute(value.attributes).trim()) {
    errors.productName = "请填写产品名称";
  }

  if (options?.requireEmployeeAccount && !getEmployeeAccountAttribute(value.attributes).trim()) {
    errors.employeeAccount = "请填写员工账号";
  }

  const attributeErrors = validateProductAttributes(
    getEditableProductAttributes(value.attributes).filter((attribute) => attribute.key.trim()),
  );
  Object.assign(errors, attributeErrors);

  if (mode === "create" && !value.internalSku.trim()) {
    errors.internalSku = "内部商品编码缺失";
  }

  if (mode === "edit" && !value.internalSku.trim()) {
    errors.internalSku = "内部商品编码缺失";
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

export function companySkuSearchText(item: CompanySku) {
  return [item.internalSku, item.companyName, productAttributesToSearchText(item.attributes)].join(" ");
}
