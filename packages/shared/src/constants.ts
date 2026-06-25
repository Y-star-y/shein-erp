export const COMPANY_SKU_STORAGE_KEY = "bingyu-erp-company-skus-v2";
export const PLATFORM_MAPPING_STORAGE_KEY = "bingyu-erp-platform-sku-mappings-v2";
export const MAINTENANCE_EVENT_STORAGE_KEY = "bingyu-erp-maintenance-events-v1";

export const platformOptions = [
  { label: "SHEIN", value: "SHEIN" },
  { label: "其他平台", value: "OTHER" },
];

export const statusOptions = [
  { label: "启用", value: "active" },
  { label: "停用", value: "inactive" },
];

export const mappingStatusOptions = [
  { label: "待绑定", value: "pending" },
  { label: "启用", value: "active" },
  { label: "停用", value: "inactive" },
  { label: "冲突", value: "conflict" },
];
