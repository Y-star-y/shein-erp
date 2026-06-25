"use client";

import {
  AppSelect,
  FormSection,
  TextField,
  mappingStatusOptions,
  platformOptions,
  type CompanySku,
  type FormErrors,
  type PlatformSkuMapping,
  type PlatformSkuMappingStatus,
  type SelectOption,
} from "@shein-erp/shared";
import type { FormEvent } from "react";

export function MappingForm({
  activeCompanySkus,
  companySkus,
  errors,
  mode,
  onChange,
  onSubmit,
  value,
}: {
  activeCompanySkus: CompanySku[];
  companySkus: CompanySku[];
  errors: FormErrors;
  mode: "create" | "edit";
  onChange: (value: PlatformSkuMapping) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  value: PlatformSkuMapping;
}) {
  const selectedCompanySku = companySkus.find((item) => item.internalSku === value.internalSku);
  const companyOptions: SelectOption[] = activeCompanySkus.map((item) => ({
    label: `${item.internalSku} / ${item.productNameCn}`,
    value: item.internalSku,
    description: [item.productGroupName, item.color, item.size].filter(Boolean).join(" / ") || undefined,
  }));

  if (mode === "edit" && selectedCompanySku && selectedCompanySku.status === "inactive") {
    companyOptions.unshift({
      label: `${selectedCompanySku.internalSku} / ${selectedCompanySku.productNameCn}（已停用）`,
      value: selectedCompanySku.internalSku,
      description: "已有映射可保留该值，但不建议继续使用停用商品。",
      disabled: true,
    });
  }

  function setField<K extends keyof PlatformSkuMapping>(field: K, fieldValue: PlatformSkuMapping[K]) {
    onChange({ ...value, [field]: fieldValue });
  }

  return (
    <form className="modal-form" noValidate onSubmit={onSubmit}>
      <FormSection title="SHEIN 上架信息">
        <AppSelect
          error={errors.platform}
          label="平台"
          onChange={(fieldValue) => setField("platform", fieldValue)}
          options={platformOptions}
          value={value.platform}
        />
        <TextField error={errors.storeName} label="店铺" required value={value.storeName} onChange={(fieldValue) => setField("storeName", fieldValue)} />
        <TextField
          error={errors.platformSkc}
          label="SHEIN 平台 SKC"
          required
          value={value.platformSkc}
          onChange={(fieldValue) => setField("platformSkc", fieldValue)}
        />
        <AppSelect
          error={errors.internalSku}
          label="内部商品"
          onChange={(fieldValue) => setField("internalSku", fieldValue)}
          options={companyOptions}
          placeholder="选择内部商品"
          value={value.internalSku}
        />
      </FormSection>
      <FormSection title="平台字段">
        <TextField label="SHEIN 商品 ID" value={value.sheinProductId} onChange={(fieldValue) => setField("sheinProductId", fieldValue)} />
        <TextField label="平台 SPU" value={value.platformSpu} onChange={(fieldValue) => setField("platformSpu", fieldValue)} />
        <TextField label="平台 SKU" value={value.platformSku} onChange={(fieldValue) => setField("platformSku", fieldValue)} />
        <TextField label="卖家 SKU" value={value.sellerSku} onChange={(fieldValue) => setField("sellerSku", fieldValue)} />
        <TextField label="SHEIN 商品名称" value={value.sheinProductName} onChange={(fieldValue) => setField("sheinProductName", fieldValue)} />
      </FormSection>
      <FormSection title="状态与备注">
        <AppSelect
          error={errors.status}
          label="映射状态"
          onChange={(fieldValue) => setField("status", fieldValue as PlatformSkuMappingStatus)}
          options={mappingStatusOptions}
          value={value.status}
        />
        <TextField label="备注" multiline value={value.remark} onChange={(fieldValue) => setField("remark", fieldValue)} />
      </FormSection>
      <div className="modal-actions">
        <span>{mode === "create" ? "一个 SHEIN SKC 只能绑定一个内部商品。" : `创建时间：${value.createdAt}`}</span>
        <button className="primary-btn" type="submit">保存</button>
      </div>
    </form>
  );
}
