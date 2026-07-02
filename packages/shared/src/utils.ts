import type { CompanySkuStatus, PlatformSkuMappingStatus } from "./types";

export function nowText() {
  return new Date().toLocaleString("zh-CN", { hour12: false });
}

export function statusText(status: CompanySkuStatus | PlatformSkuMappingStatus) {
  const map: Record<CompanySkuStatus | PlatformSkuMappingStatus, string> = {
    active: "启用",
    inactive: "停用",
    pending: "待绑定",
    conflict: "冲突",
  };

  return map[status] || status;
}

export function statusTone(status: CompanySkuStatus | PlatformSkuMappingStatus) {
  if (status === "active") return "success";
  if (status === "pending") return "warning";
  if (status === "conflict") return "danger";
  return "neutral";
}

export function platformText(platform: string) {
  return platform === "SHEIN" ? "SHEIN" : platform || "-";
}

export function includesQuery(values: string[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return values.join(" ").toLowerCase().includes(normalized);
}

export async function readJsonResponse<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
