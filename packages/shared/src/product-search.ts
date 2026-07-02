import {
  PRODUCT_NAME_ATTRIBUTE_KEY,
  getEditableProductAttributes,
  getProductAttributeString,
  getProductNameAttribute,
  productAttributesToSearchText,
} from "./product-attributes";
import type { CompanySku, ProductAttribute } from "./types";
import { includesQuery } from "./utils";

export type FieldValueSearchFilter = {
  key: string;
  value: string;
};

export type CompanySkuDisplaySegment = {
  segmentId: string;
  key: string;
  value: string;
};

const FIELD_VALUE_TOKEN = /^([^:：]+)[:：](.+)$/;
const INTERNAL_PRODUCT_ID_KEYS = new Set(["内部商品ID", "商品ID", "内部编码", "内部商品编码"]);

function splitSearchSegments(query: string) {
  const trimmed = query.trim();
  if (/[,，]/.test(trimmed)) {
    return trimmed.split(/[,，]/);
  }
  return trimmed.split(/\s+/);
}

export function parseFieldValueSearchQuery(query: string): {
  freeText: string;
  fieldFilters: FieldValueSearchFilter[];
} {
  const trimmed = query.trim();
  if (!trimmed) {
    return { freeText: "", fieldFilters: [] };
  }

  const fieldFilters: FieldValueSearchFilter[] = [];
  const freeTextParts: string[] = [];

  for (const segment of splitSearchSegments(trimmed)) {
    const part = segment.trim();
    if (!part) {
      continue;
    }

    const match = part.match(FIELD_VALUE_TOKEN);
    if (match) {
      const key = match[1]?.trim() ?? "";
      const value = match[2]?.trim() ?? "";
      if (key && value) {
        fieldFilters.push({ key, value });
        continue;
      }
    }
    freeTextParts.push(part);
  }

  return {
    freeText: freeTextParts.join(" "),
    fieldFilters,
  };
}

export function matchesFieldValueFilter(fieldValue: string, expected: string) {
  const normalizedField = fieldValue.trim().toLowerCase();
  const normalizedExpected = expected.trim().toLowerCase();
  if (!normalizedExpected) return true;
  if (!normalizedField) return false;
  return normalizedField.includes(normalizedExpected);
}

export function resolveProductAttributeKey(attributes: ProductAttribute[], filterKey: string) {
  const normalized = filterKey.trim();
  if (!normalized) {
    return null;
  }

  const candidates = getEditableProductAttributes(attributes).filter((attribute) => attribute.key.trim());
  const exact = candidates.find((attribute) => attribute.key.trim() === normalized);
  if (exact) {
    return exact.key.trim();
  }

  const partialMatches = candidates.filter((attribute) => {
    const key = attribute.key.trim();
    return key.includes(normalized) || normalized.includes(key);
  });

  if (!partialMatches.length) {
    return null;
  }

  const endingMatches = partialMatches.filter((attribute) => attribute.key.trim().endsWith(normalized));
  const pool = endingMatches.length ? endingMatches : partialMatches;
  return pool
    .slice()
    .sort((left, right) => left.key.trim().length - right.key.trim().length)[0]
    ?.key.trim() ?? null;
}

export function resolveCompanySkuFilterSegmentId(item: CompanySku, filterKey: string) {
  const normalized = filterKey.trim();
  if (!normalized) {
    return null;
  }

  if (INTERNAL_PRODUCT_ID_KEYS.has(normalized) || normalized.toLowerCase() === "id") {
    return "__id__";
  }
  if (normalized === "公司名称") {
    return "__companyName__";
  }
  if (normalized === "产品名称" || normalized === "产品名字") {
    return PRODUCT_NAME_ATTRIBUTE_KEY;
  }

  return resolveProductAttributeKey(item.attributes, normalized);
}

export function getCompanySkuDisplaySegments(item: CompanySku): CompanySkuDisplaySegment[] {
  const segments: CompanySkuDisplaySegment[] = [{ segmentId: "__id__", key: "内部商品 ID", value: item.id }];

  const productName = getProductNameAttribute(item.attributes).trim();
  if (productName) {
    segments.push({
      segmentId: PRODUCT_NAME_ATTRIBUTE_KEY,
      key: PRODUCT_NAME_ATTRIBUTE_KEY,
      value: productName,
    });
  }

  if (item.companyName.trim()) {
    segments.push({
      segmentId: "__companyName__",
      key: "公司名称",
      value: item.companyName.trim(),
    });
  }

  for (const attribute of getEditableProductAttributes(item.attributes)) {
    const key = attribute.key.trim();
    if (!key) {
      continue;
    }
    const value = String(attribute.value ?? "").trim();
    if (!value) {
      continue;
    }
    segments.push({ segmentId: key, key, value });
  }

  return segments;
}

export function companySkuOptionPlainLabel(item: CompanySku) {
  return getCompanySkuDisplaySegments(item)
    .map((segment) => segment.value)
    .join(" / ");
}

export function getMatchedCompanySkuSegmentIds(item: CompanySku, query: string) {
  const trimmed = query.trim();
  const matched = new Set<string>();
  if (!trimmed) {
    return matched;
  }

  const { freeText, fieldFilters } = parseFieldValueSearchQuery(trimmed);

  for (const filter of fieldFilters) {
    const segmentId = resolveCompanySkuFilterSegmentId(item, filter.key);
    if (!segmentId) {
      continue;
    }
    if (matchesFieldValueFilter(companySkuFieldValue(item, filter.key), filter.value)) {
      matched.add(segmentId);
    }
  }

  if (freeText) {
    const normalized = freeText.toLowerCase();
    for (const segment of getCompanySkuDisplaySegments(item)) {
      if (
        segment.value.toLowerCase().includes(normalized) ||
        segment.key.toLowerCase().includes(normalized)
      ) {
        matched.add(segment.segmentId);
      }
    }
  }

  return matched;
}

export function companySkuSearchText(item: CompanySku) {
  return [item.id, item.companyName, productAttributesToSearchText(item.attributes)].join(" ");
}

function companySkuFieldValue(item: CompanySku, key: string) {
  const normalizedKey = key.trim();
  if (INTERNAL_PRODUCT_ID_KEYS.has(normalizedKey) || normalizedKey.toLowerCase() === "id") {
    return item.id;
  }
  if (normalizedKey === "公司名称") {
    return item.companyName;
  }
  if (normalizedKey === "产品名称" || normalizedKey === "产品名字") {
    return getProductNameAttribute(item.attributes);
  }

  const resolvedKey = resolveProductAttributeKey(item.attributes, normalizedKey);
  if (resolvedKey) {
    return getProductAttributeString(item.attributes, resolvedKey);
  }

  return getProductAttributeString(item.attributes, normalizedKey);
}

export function matchesCompanySkuSearch(item: CompanySku, query: string) {
  const { freeText, fieldFilters } = parseFieldValueSearchQuery(query);
  if (!freeText && fieldFilters.length === 0) {
    return true;
  }

  if (freeText && !includesQuery([companySkuSearchText(item)], freeText)) {
    return false;
  }

  return fieldFilters.every((filter) =>
    matchesFieldValueFilter(companySkuFieldValue(item, filter.key), filter.value),
  );
}
