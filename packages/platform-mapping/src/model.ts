import type { CompanySku, PlatformSkuMapping } from "@shein-erp/shared";
import { nowText } from "@shein-erp/shared";

type LegacyMapping = Partial<PlatformSkuMapping> & {
  companySku?: string;
  internalSku?: string;
};

export function createPlatformMapping(defaultInternalProductId = ""): PlatformSkuMapping {
  const now = nowText();

  return {
    id: `platform-mapping-${Date.now()}`,
    platform: "SHEIN",
    storeName: "",
    internalProductId: defaultInternalProductId,
    platformSkc: "",
    platformSku: "",
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

export function normalizeMapping(item: LegacyMapping): PlatformSkuMapping {
  const now = nowText();

  return {
    ...createPlatformMapping(),
    ...item,
    platform: item.platform || "SHEIN",
    internalProductId: item.internalProductId || item.internalSku || item.companySku || "",
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
  const storeName = value.storeName.trim();
  const internalProductId = value.internalProductId.trim();
  const platformSku = value.platformSku.trim();
  const targetSku = companySkus.find((item) => item.id === internalProductId);

  if (!platform) errors.platform = "平台不能为空";
  if (!storeName) errors.storeName = "店铺不能为空";
  if (!platformSku) errors.platformSku = "平台 SKU 不能为空";
  if (!internalProductId) errors.internalProductId = "必须选择内部商品";
  if (internalProductId && !targetSku) errors.internalProductId = "内部商品不存在";
  if (targetSku?.status === "inactive") errors.internalProductId = "停用的内部商品不能新增映射";

  if (
    platformSku &&
    mappings.some((item) => item.platformSku.trim() === platformSku && (mode === "create" || item.id !== value.id))
  ) {
    errors.platformSku = "该平台 SKU 已存在映射";
  }

  return errors;
}

/** 用于确认弹窗等场景，展示平台 SKU 匹配键 */
export function mappingMatchKeyLabel(item: Pick<PlatformSkuMapping, "platformSku" | "platformSkc">) {
  const platformSku = item.platformSku?.trim();
  if (platformSku) return `平台 SKU「${platformSku}」`;

  const platformSkc = item.platformSkc?.trim();
  if (platformSkc) return `平台 SKC「${platformSkc}」（参考）`;

  return "该映射";
}
