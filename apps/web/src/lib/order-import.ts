import type { ParsedSheinOrderLine } from "@shein-erp/core";

export function parseImportDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return new Date();
  }

  const normalized = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function parseOptionalDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeOrderLineKey(line: ParsedSheinOrderLine) {
  const sellerSku = line.sellerSku.trim() || line.platformSku.trim();
  return {
    ...line,
    sellerSku,
    platformSku: line.platformSku.trim(),
    platformSkc: line.platformSkc.trim(),
  };
}
