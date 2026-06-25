import type { CompanySkuStatus, PlatformSkuMappingStatus } from "./types";

export function nowText() {
  return new Date().toLocaleString("zh-CN", { hour12: false });
}

export function statusText(status: CompanySkuStatus | PlatformSkuMappingStatus) {
  return status === "active" ? "启用" : "停用";
}

export function platformText(platform: string) {
  return platform === "SHEIN" ? "SHEIN" : platform || "-";
}

export function includesQuery(values: string[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return values.join(" ").toLowerCase().includes(normalized);
}
