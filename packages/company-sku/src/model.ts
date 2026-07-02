import type { CompanySku, ProductAttribute } from "@shein-erp/shared";
import {
  getDefaultProductAttributes,
  getEditableProductAttributes,
  getEmployeeAccountAttribute,
  getProductAttributeString,
  getProductNameAttribute,
  mergeStoredTopLevelAttributes,
  matchesCompanySkuSearch,
  nowText,
  validateProductAttributes,
} from "@shein-erp/shared";

export { matchesCompanySkuSearch };

type LegacyCompanySku = Partial<CompanySku> & {
  internalSku?: string;
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
  companyName?: string;
  employeeAccount?: string;
  productName?: string;
  spec?: string;
  articleNo?: string;
}): CompanySku {
  const now = nowText();
  const attributes = mergeStoredTopLevelAttributes(getDefaultProductAttributes(), {
    employeeAccount: options?.employeeAccount ?? "",
    productName: options?.productName ?? "",
  });

  const extraAttributes: ProductAttribute[] = [];
  if (options?.spec?.trim()) {
    extraAttributes.push({ key: "规格", type: "text", value: options.spec.trim() });
  }
  if (options?.articleNo?.trim()) {
    extraAttributes.push({ key: "货号", type: "text", value: options.articleNo.trim() });
  }

  return {
    id: `company-sku-${Date.now()}`,
    companyName: options?.companyName ?? "",
    attributes: [...attributes, ...extraAttributes],
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
    id: item.id || item.internalSku || item.platformSkc || `company-sku-${Date.now()}`,
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

  const editable = getEditableProductAttributes(value.attributes);
  const attributeErrors = validateProductAttributes(
    editable.filter((attribute) => attribute.key.trim()),
    { attributeCount: editable.length },
  );
  Object.assign(errors, attributeErrors);

  if (mode === "edit" && !value.id.trim()) {
    errors.id = "内部商品 ID 缺失";
  }

  return errors;
}

export function resolveCompanySkuState(internalProductId: string, companySkus: CompanySku[]) {
  const sku = companySkus.find((item) => item.id === internalProductId);
  if (!sku) return { label: "内部商品不存在", tone: "danger" as const };
  if (sku.status === "inactive") return { label: "内部商品已停用", tone: "warning" as const };
  return { label: "已绑定", tone: "success" as const };
}

export function countMappingsForSku(internalProductId: string, mappings: { internalProductId: string }[]) {
  return mappings.filter((mapping) => mapping.internalProductId === internalProductId).length;
}
