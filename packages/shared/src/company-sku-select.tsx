"use client";

import { useMemo } from "react";
import {
  companySkuOptionPlainLabel,
  getCompanySkuDisplaySegments,
  getMatchedCompanySkuSegmentIds,
  matchesCompanySkuSearch,
} from "./product-search";
import type { CompanySku, SelectOption } from "./types";
import { AppSelect } from "./ui";

export function CompanySkuOptionLabel({ item, query }: { item: CompanySku; query: string }) {
  const segments = getCompanySkuDisplaySegments(item);
  const matchedSegmentIds = getMatchedCompanySkuSegmentIds(item, query);

  return (
    <span className="company-sku-option-label">
      {segments.map((segment, index) => (
        <span key={segment.segmentId}>
          {index > 0 ? <span className="company-sku-option-label__sep"> / </span> : null}
          <span
            className={
              matchedSegmentIds.has(segment.segmentId)
                ? "company-sku-option-label__segment company-sku-option-label__segment--matched"
                : "company-sku-option-label__segment"
            }
          >
            {segment.value}
          </span>
        </span>
      ))}
    </span>
  );
}

export function CompanySkuSelect({
  companySkuLookup,
  companySkus,
  error,
  extraOptions = [],
  label,
  onChange,
  placeholder = "搜索产品名称，或多字段 产地:地球, 颜色:红（冒号、逗号均支持中英文）",
  required,
  value,
}: {
  companySkuLookup?: CompanySku[];
  companySkus: CompanySku[];
  error?: string;
  extraOptions?: SelectOption[];
  label?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  value: string;
}) {
  const lookupItems = companySkuLookup ?? companySkus;
  const skuById = useMemo(() => new Map(lookupItems.map((item) => [item.id, item])), [lookupItems]);

  const options = useMemo<SelectOption[]>(
    () => [
      ...extraOptions,
      ...companySkus.map((item) => ({
        value: item.id,
        label: companySkuOptionPlainLabel(item),
      })),
    ],
    [companySkus, extraOptions],
  );

  return (
    <AppSelect
      error={error}
      filterOption={(input, option) => {
        const item = skuById.get(String(option?.value ?? ""));
        if (item) {
          return matchesCompanySkuSearch(item, input);
        }
        const query = input.trim().toLowerCase();
        if (!query) {
          return true;
        }
        return String(option?.label ?? "").toLowerCase().includes(query);
      }}
      label={label}
      optionRender={(option, searchQuery) => {
        const item = skuById.get(option.value);
        if (item) {
          return <CompanySkuOptionLabel item={item} query={searchQuery} />;
        }
        return option.label;
      }}
      options={options}
      placeholder={placeholder}
      required={required}
      showSearch
      value={value}
      onChange={onChange}
    />
  );
}
