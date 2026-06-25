"use client";

import {
  AppSelect,
  FormSection,
  TextField,
  statusOptions,
  type CompanySku,
  type CompanySkuStatus,
  type FormErrors,
} from "@shein-erp/shared";
import type { FormEvent } from "react";

export function CompanySkuForm({
  errors,
  mode,
  onChange,
  onSubmit,
  value,
}: {
  errors: FormErrors;
  mode: "create" | "edit";
  onChange: (value: CompanySku) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  value: CompanySku;
}) {
  function setField<K extends keyof CompanySku>(field: K, fieldValue: CompanySku[K]) {
    onChange({ ...value, [field]: fieldValue });
  }

  return (
    <form className="modal-form" noValidate onSubmit={onSubmit}>
      <FormSection title="内部商品">
        <TextField
          error={errors.internalSku}
          label="内部商品编码"
          required
          value={value.internalSku}
          onChange={(fieldValue) => setField("internalSku", fieldValue)}
        />
        <TextField
          label="商品组/款式"
          value={value.productGroupName}
          onChange={(fieldValue) => setField("productGroupName", fieldValue)}
        />
        <TextField
          error={errors.productNameCn}
          label="商品名称"
          required
          value={value.productNameCn}
          onChange={(fieldValue) => setField("productNameCn", fieldValue)}
        />
        <AppSelect
          error={errors.status}
          label="状态"
          onChange={(fieldValue) => setField("status", fieldValue as CompanySkuStatus)}
          options={statusOptions}
          value={value.status}
        />
      </FormSection>
      <FormSection title="规格信息">
        <TextField label="规格" value={value.specification} onChange={(fieldValue) => setField("specification", fieldValue)} />
        <TextField label="颜色" value={value.color} onChange={(fieldValue) => setField("color", fieldValue)} />
        <TextField label="尺码" value={value.size} onChange={(fieldValue) => setField("size", fieldValue)} />
        <TextField label="型号" value={value.model} onChange={(fieldValue) => setField("model", fieldValue)} />
      </FormSection>
      <FormSection title="供应与预警">
        <TextField label="图片 URL" value={value.imageUrl} onChange={(fieldValue) => setField("imageUrl", fieldValue)} />
        <TextField label="供应商链接" value={value.supplierUrl} onChange={(fieldValue) => setField("supplierUrl", fieldValue)} />
        <TextField
          label="默认库存预警数量"
          value={value.defaultWarningQuantity}
          onChange={(fieldValue) => setField("defaultWarningQuantity", fieldValue)}
        />
      </FormSection>
      <div className="modal-actions">
        <span>{mode === "create" ? "先创建 ERP 内部商品，再绑定各店铺的 SHEIN SKC。" : `创建时间：${value.createdAt}`}</span>
        <button className="primary-btn" type="submit">保存</button>
      </div>
    </form>
  );
}
