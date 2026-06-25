import type { CompanySku, PlatformSkuMapping } from "@shein-erp/shared";
import { nowText } from "@shein-erp/shared";

type LegacyMapping = Partial<PlatformSkuMapping> & {
  companySku?: string;
};

export function createPlatformMapping(defaultInternalSku = ""): PlatformSkuMapping {
  const now = nowText();

  return {
    id: `platform-mapping-${Date.now()}`,
    platform: "SHEIN",
    storeName: "",
    internalSku: defaultInternalSku,
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
    internalSku: item.internalSku || item.companySku || "",
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
  const internalSku = value.internalSku.trim();
  const platformSkc = value.platformSkc.trim();
  const targetSku = companySkus.find((item) => item.internalSku === internalSku);

  if (!platform) errors.platform = "平台不能为空";
  if (!storeName) errors.storeName = "店铺不能为空";
  if (!platformSkc) errors.platformSkc = "SHEIN SKC 不能为空";
  if (!internalSku) errors.internalSku = "必须选择内部商品";
  if (internalSku && !targetSku) errors.internalSku = "内部商品不存在";
  if (targetSku?.status === "inactive") errors.internalSku = "停用的内部商品不能新增映射";

  if (
    platformSkc &&
    mappings.some((item) => item.platformSkc.trim() === platformSkc && (mode === "create" || item.id !== value.id))
  ) {
    errors.platformSkc = "该 SHEIN SKC 已存在映射";
  }

  if (
    platform &&
    storeName &&
    internalSku &&
    value.status === "active" &&
    mappings.some(
      (item) =>
        item.platform === platform &&
        item.storeName.trim() === storeName &&
        item.internalSku.trim() === internalSku &&
        item.status === "active" &&
        (mode === "create" || item.id !== value.id),
    )
  ) {
    errors.internalSku = "该店铺已经有这个内部商品的启用映射";
  }

  return errors;
}
