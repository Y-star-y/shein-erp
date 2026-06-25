import type { CompanySku, PlatformSkuMapping } from "@shein-erp/shared";
import { nowText } from "@shein-erp/shared";

export function createPlatformMapping(defaultSkc = ""): PlatformSkuMapping {
  const now = nowText();

  return {
    id: `platform-mapping-${Date.now()}`,
    platform: "SHEIN",
    platformSku: "",
    platformSkc: defaultSkc,
    sheinProductId: "",
    platformSpu: "",
    sellerSku: "",
    sheinProductName: "",
    status: "active",
    remark: "",
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeMapping(item: PlatformSkuMapping): PlatformSkuMapping {
  const now = nowText();

  return {
    ...createPlatformMapping(),
    ...item,
    platform: item.platform || "SHEIN",
    status: item.status || "active",
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || item.createdAt || now,
  };
}

export function validateMapping(
  value: PlatformSkuMapping,
  companySkus: CompanySku[],
  mappings: PlatformSkuMapping[],
  mode: "create" | "edit",
) {
  const errors: Record<string, string> = {};
  const platform = value.platform.trim() || "SHEIN";
  const platformSku = value.platformSku.trim();
  const platformSkc = value.platformSkc.trim();
  const targetSku = companySkus.find((item) => item.platformSkc === platformSkc);

  if (!platform) errors.platform = "平台不能为空";
  if (!platformSku) errors.platformSku = "平台 SKU 不能为空";
  if (!platformSkc) errors.platformSkc = "必须选择公司 SKU";
  if (platformSkc && !targetSku) errors.platformSkc = "关联的公司 SKU 不存在";
  if (targetSku?.status === "inactive") errors.platformSkc = "停用公司 SKU 不能新增映射";
  if (
    platform &&
    platformSku &&
    mappings.some((item) => item.platform === platform && item.platformSku.trim() === platformSku && (mode === "create" || item.id !== value.id))
  ) {
    errors.platformSku = "该平台 SKU 已存在映射";
  }

  return errors;
}
