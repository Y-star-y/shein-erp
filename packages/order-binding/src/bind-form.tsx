"use client";

import {
  AppSelect,
  Button,
  FormSection,
  TextField,
  type CompanySku,
  type FormErrors,
  type OrderBindRequest,
  type SelectOption,
} from "@shein-erp/shared";
import { Segmented } from "antd";
import type { FormEvent } from "react";

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
  const isCreateMode = value.productMode === "create";
  const companyOptions: SelectOption[] = activeCompanySkus.map((item) => ({
    label: `${item.internalSku} / ${item.productNameCn}`,
    value: item.internalSku,
    description: [item.productGroupName, item.color, item.size].filter(Boolean).join(" / ") || undefined,
  }));

  function setField<K extends keyof OrderBindRequest>(field: K, fieldValue: OrderBindRequest[K]) {
    onChange({ ...value, [field]: fieldValue });
  }

  function setNewProductField(field: keyof OrderBindRequest["newProduct"], fieldValue: string) {
    onChange({
      ...value,
      newProduct: { ...value.newProduct, [field]: fieldValue },
    });
  }

  return (
    <form className="modal-form" noValidate onSubmit={onSubmit}>
      <FormSection title="SHEIN 订单信息（来自导入）">
        <TextField label="卖家 SKU" readOnly value={value.sellerSku} onChange={() => undefined} />
        <TextField label="平台 SKU" readOnly value={value.platformSku} onChange={() => undefined} />
        <TextField label="平台 SKC（款式/颜色）" readOnly value={value.platformSkc} onChange={() => undefined} />
        <TextField label="SHEIN 商品名" readOnly value={value.sheinProductName} onChange={() => undefined} />
        <TextField
          error={errors.storeName}
          label="店铺"
          readOnly={Boolean(value.storeName.trim())}
          required={!value.storeName.trim()}
          value={value.storeName}
          onChange={(fieldValue) => setField("storeName", fieldValue)}
        />
        <TextField label="平台 SPU" readOnly value={value.platformSpu} onChange={() => undefined} />
      </FormSection>
      <FormSection title="绑定内部商品">
        <Segmented
          block
          options={[
            { label: "选择已有商品", value: "existing" },
            { label: "新建内部商品", value: "create" },
          ]}
          value={value.productMode}
          onChange={(mode) => setField("productMode", mode as OrderBindRequest["productMode"])}
        />
        {isCreateMode ? (
          <>
            <TextField
              error={errors["newProduct.internalSku"]}
              label="内部商品编码"
              required
              value={value.newProduct.internalSku}
              onChange={(fieldValue) => setNewProductField("internalSku", fieldValue)}
            />
            <TextField
              error={errors["newProduct.productNameCn"]}
              label="商品名称"
              required
              value={value.newProduct.productNameCn}
              onChange={(fieldValue) => setNewProductField("productNameCn", fieldValue)}
            />
            <TextField
              label="商品组/款式"
              value={value.newProduct.productGroupName}
              onChange={(fieldValue) => setNewProductField("productGroupName", fieldValue)}
            />
            <TextField
              label="规格"
              value={value.newProduct.specification}
              onChange={(fieldValue) => setNewProductField("specification", fieldValue)}
            />
            <TextField
              label="颜色"
              value={value.newProduct.color}
              onChange={(fieldValue) => setNewProductField("color", fieldValue)}
            />
            <TextField
              label="尺码"
              value={value.newProduct.size}
              onChange={(fieldValue) => setNewProductField("size", fieldValue)}
            />
          </>
        ) : (
          <AppSelect
            error={errors.internalSku}
            label="内部商品"
            onChange={(fieldValue) => setField("internalSku", fieldValue)}
            options={companyOptions}
            placeholder="选择仓库内部商品"
            value={value.internalSku}
          />
        )}
        <TextField
          error={errors.remark}
          label="备注"
          value={value.remark}
          onChange={(fieldValue) => setField("remark", fieldValue)}
        />
      </FormSection>
      <div className="modal-actions">
        <Button htmlType="submit" type="primary">
          {isCreateMode ? "创建并绑定" : "确认绑定"}
        </Button>
      </div>
    </form>
  );
}
