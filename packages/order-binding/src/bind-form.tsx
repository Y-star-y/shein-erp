"use client";

import {
  AppSelect,
  Button,
  FormSection,
  TextField,
  getProductDisplayName,
  getProductAttributeString,
  type CompanySku,
  type FormErrors,
  type OrderBindRequest,
  type SelectOption,
} from "@shein-erp/shared";
import type { FormEvent } from "react";

function companySkuDescription(item: CompanySku) {
  const parts = [
    item.companyName,
    getProductAttributeString(item.attributes, "颜色"),
    getProductAttributeString(item.attributes, "尺码"),
  ].filter(Boolean);
  return parts.join(" / ") || undefined;
}

export function BindForm({
  activeCompanySkus,
  errors,
  onChange,
  onSubmit,
  value,
}: {
  activeCompanySkus: CompanySku[];
  errors: FormErrors;
  onChange: (value: OrderBindRequest) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  value: OrderBindRequest;
}) {
  const skuOptions: SelectOption[] = activeCompanySkus.map((item) => ({
    label: `${item.internalSku} / ${getProductDisplayName(item)}`,
    value: item.internalSku,
    description: companySkuDescription(item),
  }));

  function setField<K extends keyof OrderBindRequest>(field: K, fieldValue: OrderBindRequest[K]) {
    onChange({ ...value, [field]: fieldValue });
  }

  return (
    <form className="modal-form" noValidate onSubmit={onSubmit}>
      <FormSection layout="stack" title="SHEIN 订单信息（来自导入）">
        <TextField label="平台 SKU" readOnly value={value.platformSku} onChange={() => undefined} />
        <TextField label="平台 SKC（参考）" readOnly value={value.platformSkc} onChange={() => undefined} />
        <TextField
          error={errors.sellerSku}
          label="卖家 SKU"
          required
          value={value.sellerSku}
          onChange={(fieldValue) => setField("sellerSku", fieldValue)}
        />
      </FormSection>
      <FormSection layout="stack" title="绑定内部商品">
        <AppSelect
          error={errors.internalSku}
          label="内部商品"
          onChange={(fieldValue) => setField("internalSku", fieldValue)}
          options={skuOptions}
          placeholder="选择仓库内部商品"
          required
          value={value.internalSku}
        />
        <TextField
          error={errors.remark}
          label="备注"
          value={value.remark}
          onChange={(fieldValue) => setField("remark", fieldValue)}
        />
      </FormSection>
      <div className="modal-actions">
        <Button htmlType="submit" type="primary">
          确认绑定
        </Button>
      </div>
    </form>
  );
}
