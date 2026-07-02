import type { ProductAttribute, ProductAttributeType } from "./types/sku";



export type { ProductAttribute, ProductAttributeType };



export const DEFAULT_PRODUCT_ATTRIBUTES_CONFIG = "产品产地:TEXT,颜色:TEXT,尺码:TEXT";

export const DEFAULT_MAX_PRODUCT_ATTRIBUTES = 30;

export function getMaxProductAttributes() {
  const configured =
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_MAX_PRODUCT_ATTRIBUTES?.trim() : "";
  if (!configured) {
    return DEFAULT_MAX_PRODUCT_ATTRIBUTES;
  }

  const parsed = Number.parseInt(configured, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_MAX_PRODUCT_ATTRIBUTES;
  }

  return parsed;
}



export const PRODUCT_NAME_ATTRIBUTE_KEY = "产品名称";

export const ID_NUMBER_ATTRIBUTE_KEY = "证件号";



/** @deprecated 历史数据兼容读取，新商品不再写入 */

export const EMPLOYEE_ACCOUNT_ATTRIBUTE_KEY = "员工账号";

/** @deprecated 历史数据兼容读取，新商品不再写入 */

export const EMPLOYEE_NAME_ATTRIBUTE_KEY = "员工名字";



const TOP_LEVEL_ATTRIBUTE_KEYS = new Set([

  PRODUCT_NAME_ATTRIBUTE_KEY,

  ID_NUMBER_ATTRIBUTE_KEY,

  EMPLOYEE_ACCOUNT_ATTRIBUTE_KEY,

  EMPLOYEE_NAME_ATTRIBUTE_KEY,

  "员工名",

  "公司名称",

]);



export const PRODUCT_ATTRIBUTE_TYPE_OPTIONS: { label: string; value: ProductAttributeType }[] = [

  { label: "文字", value: "text" },

  { label: "数值", value: "number" },

];



const DISPLAY_NAME_KEYS = ["产品名称", "商品名称", "产品名", "商品名"];



function normalizeAttributeType(type: unknown): ProductAttributeType | null {

  if (type === "text" || type === "string") return "text";

  if (type === "number" || type === "integer") return "number";

  return null;

}



export function isTextAttributeType(type: unknown): type is "text" | "string" {

  return type === "text" || type === "string";

}



export function isNumberAttributeType(type: unknown): type is "number" | "integer" {

  return type === "number" || type === "integer";

}



export function isTopLevelProductAttributeKey(key: string) {

  return TOP_LEVEL_ATTRIBUTE_KEYS.has(key.trim());

}



export function getEditableProductAttributes(attributes: ProductAttribute[]) {

  return attributes.filter((attribute) => !isTopLevelProductAttributeKey(attribute.key));

}



export function getProductNameAttribute(attributes: ProductAttribute[]) {

  return getProductAttributeString(attributes, PRODUCT_NAME_ATTRIBUTE_KEY);

}



export function getEmployeeIdNumberAttribute(attributes: ProductAttribute[]) {

  return getProductAttributeString(attributes, ID_NUMBER_ATTRIBUTE_KEY);

}



/** @deprecated 使用 getEmployeeIdNumberAttribute */

export function getEmployeeAccountAttribute(attributes: ProductAttribute[]) {

  return getProductAttributeString(attributes, EMPLOYEE_ACCOUNT_ATTRIBUTE_KEY);

}



/** @deprecated 使用 getEmployeeIdNumberAttribute */

export function getEmployeeNameAttribute(attributes: ProductAttribute[]) {

  for (const key of [EMPLOYEE_NAME_ATTRIBUTE_KEY, "员工名"]) {

    const value = getProductAttributeString(attributes, key);

    if (value.trim()) return value;

  }

  return "";

}



export function mergeStoredTopLevelAttributes(

  attributes: ProductAttribute[],

  patch: Partial<{ productName: string; idNumber: string; employeeAccount: string }>,

) {

  const stored = {

    productName: getProductNameAttribute(attributes),

    idNumber: getEmployeeIdNumberAttribute(attributes),

    employeeAccount: getEmployeeAccountAttribute(attributes),

    ...patch,

  };



  let next = getEditableProductAttributes(attributes);



  if (stored.employeeAccount.trim()) {

    next = [

      { key: EMPLOYEE_ACCOUNT_ATTRIBUTE_KEY, type: "text", value: stored.employeeAccount.trim() },

      ...next,

    ];

  }



  if (stored.idNumber.trim()) {

    next = [{ key: ID_NUMBER_ATTRIBUTE_KEY, type: "text", value: stored.idNumber.trim() }, ...next];

  }



  if (stored.productName.trim()) {

    next = [{ key: PRODUCT_NAME_ATTRIBUTE_KEY, type: "text", value: stored.productName.trim() }, ...next];

  }



  return next;

}



export function mergeProductNameAttribute(attributes: ProductAttribute[], productName: string) {

  return mergeStoredTopLevelAttributes(attributes, { productName });

}



export function mergeEmployeeIdNumberAttribute(attributes: ProductAttribute[], idNumber: string) {

  return mergeStoredTopLevelAttributes(attributes, { idNumber });

}



export function parseProductAttributesConfig(config: string): ProductAttribute[] {

  return config

    .split(",")

    .map((part) => part.trim())

    .filter(Boolean)

    .map((part) => {

      const separatorIndex = part.lastIndexOf(":");

      const key = (separatorIndex >= 0 ? part.slice(0, separatorIndex) : part).trim();

      const typeToken = (separatorIndex >= 0 ? part.slice(separatorIndex + 1) : "TEXT").trim().toUpperCase();

      const type: ProductAttributeType =

        typeToken === "NUMBER" || typeToken === "NUMERIC" || typeToken === "数值" ? "number" : "text";



      return {

        key,

        type,

        value: type === "text" ? "" : 0,

      };

    })

    .filter((attribute) => attribute.key.length > 0);

}



export function getDefaultProductAttributes(): ProductAttribute[] {

  const configured =

    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_DEFAULT_PRODUCT_ATTRIBUTES?.trim() : "";

  return parseProductAttributesConfig(configured || DEFAULT_PRODUCT_ATTRIBUTES_CONFIG).filter(

    (attribute) => !isTopLevelProductAttributeKey(attribute.key),

  );

}



export function normalizeProductAttributes(input: unknown): ProductAttribute[] {

  if (!Array.isArray(input)) return [];



  return input

    .map((item) => {

      if (!item || typeof item !== "object") return null;

      const record = item as Record<string, unknown>;

      const key = String(record.key ?? "").trim();

      const type = normalizeAttributeType(record.type);

      if (!key || !type) return null;



      if (type === "text") {

        return { key, type, value: String(record.value ?? "") };

      }



      const numeric = Number(record.value);

      if (!Number.isFinite(numeric)) return null;



      return { key, type, value: numeric };

    })

    .filter((item): item is ProductAttribute => item !== null);

}



export function getProductAttribute(

  attributes: ProductAttribute[],

  key: string,

): ProductAttribute | undefined {

  return attributes.find((item) => item.key === key);

}



export function getProductAttributeString(attributes: ProductAttribute[], key: string, fallback = "") {

  const match = getProductAttribute(attributes, key);

  if (!match) return fallback;

  return String(match.value ?? fallback);

}



export function getProductDisplayName(item: { id: string; attributes: ProductAttribute[] }) {

  for (const key of DISPLAY_NAME_KEYS) {

    const value = getProductAttributeString(item.attributes, key);

    if (value.trim()) return value;

  }



  const firstText = item.attributes.find(

    (attribute) => isTextAttributeType(attribute.type) && String(attribute.value).trim(),

  );

  if (firstText) return String(firstText.value);



  return item.id;
}



export function productAttributesToSearchText(attributes: ProductAttribute[]) {

  return attributes

    .map((attribute) => `${attribute.key} ${String(attribute.value)}`)

    .join(" ");

}



export function validateProductAttributes(

  attributes: ProductAttribute[],

  options?: { requiredKeys?: string[]; attributeCount?: number; maxCount?: number },

) {

  const errors: Record<string, string> = {};

  const seen = new Set<string>();

  const requiredKeys = new Set(options?.requiredKeys ?? []);

  const maxCount = options?.maxCount ?? getMaxProductAttributes();

  const attributeCount = options?.attributeCount ?? attributes.length;



  if (attributeCount > maxCount) {

    errors.form = `自定义参数最多 ${maxCount} 条`;

  }



  attributes.forEach((attribute, index) => {

    const prefix = `attributes.${index}`;

    const key = attribute.key.trim();



    if (!key) {

      errors[`${prefix}.key`] = "参数名称不能为空";

      return;

    }



    if (seen.has(key)) {

      errors[`${prefix}.key`] = "参数名称不能重复";

      return;

    }

    if (isTopLevelProductAttributeKey(key)) {

      errors[`${prefix}.key`] = "该字段请在上方基础信息中填写";

      return;

    }

    seen.add(key);



    const hasValue =

      isTextAttributeType(attribute.type)

        ? String(attribute.value).trim().length > 0

        : Number.isFinite(Number(attribute.value));



    if (!hasValue) {

      if (requiredKeys.has(key)) {

        errors[`${prefix}.value`] = isTextAttributeType(attribute.type) ? "文字值不能为空" : "请输入有效数值";

      }

      return;

    }



    if (isTextAttributeType(attribute.type)) {

      return;

    }



    const numeric = Number(attribute.value);

    if (!Number.isFinite(numeric)) {

      errors[`${prefix}.value`] = "请输入有效数值";

    }

  });



  return errors;

}



export function createEmptyProductAttribute(): ProductAttribute {

  return { key: "", type: "text", value: "" };

}



export function attributesFromSellerSkuParts(parts: {

  originCountry: string;

  employeeName: string;

  productNameCn: string;

  color: string;

  size: string;

}): ProductAttribute[] {

  const valueByKey: Record<string, string> = {

    产品产地: parts.originCountry,

    颜色: parts.color,

    尺码: parts.size,

  };



  const filled = getDefaultProductAttributes().map((attribute) => {

    const raw = valueByKey[attribute.key];

    if (!raw?.trim()) return attribute;



    if (attribute.type === "number") {

      const numeric = Number(raw);

      return { ...attribute, value: Number.isFinite(numeric) ? numeric : 0 };

    }



    return { ...attribute, value: raw.trim() };

  });



  return mergeStoredTopLevelAttributes(filled, {

    productName: parts.productNameCn,

  });

}



export function serializeProductAttributes(attributes: ProductAttribute[]) {

  return normalizeProductAttributes(attributes);

}



/** 返回给前端的属性：不含证件号等员工标识字段 */
export function productAttributesForClient(attributes: ProductAttribute[]) {
  return mergeStoredTopLevelAttributes(getEditableProductAttributes(attributes), {
    productName: getProductNameAttribute(attributes),
  });
}



export function hasProductAttributeValue(attributes: ProductAttribute[], key: string) {

  const value = getProductAttributeString(attributes, key);

  return Boolean(value.trim());

}


