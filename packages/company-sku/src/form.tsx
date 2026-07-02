"use client";

import {
  AppSelect,
  Button,
  CopyableCodeField,
  FormSection,
  ReadOnlyValueField,
  TextField,
  AdminEmployeeAccountFields,
  statusOptions,
  getEditableProductAttributes,
  getEmployeeAccountAttribute,
  getProductNameAttribute,
  mergeStoredTopLevelAttributes,
  type CompanySku,
  type CompanySkuStatus,
  type FormErrors,
  type SelectOption,
  ProductAttributeEditor,
} from "@shein-erp/shared";
import type { FormEvent } from "react";

export function CompanySkuForm({
  allowCompanyEdit = false,
  allowEmployeeAccountEdit = false,
  companyOptions = [],
  errors,
  mode,
  onChange,
  onSubmit,
  value,
}: {
  allowCompanyEdit?: boolean;
  allowEmployeeAccountEdit?: boolean;
  companyOptions?: SelectOption[];
  errors: FormErrors;
  mode: "create" | "edit";
  onChange: (value: CompanySku) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  value: CompanySku;
}) {
  function setField<K extends keyof CompanySku>(field: K, fieldValue: CompanySku[K]) {
    onChange({ ...value, [field]: fieldValue });
  }

  const employeeAccount = getEmployeeAccountAttribute(value.attributes);

  return (
    <form className="modal-form" noValidate onSubmit={onSubmit}>
      <FormSection layout="stack" title="内部商品">
        {mode === "edit" ? <CopyableCodeField label="内部商品 ID" value={value.id} /> : null}
        {allowCompanyEdit ? (
          <AppSelect
            error={errors.companyName}
            label="公司名称"
            onChange={(fieldValue) => setField("companyName", fieldValue)}
            options={companyOptions}
            placeholder="请选择公司"
            required
            value={value.companyName}
          />
        ) : (
          <ReadOnlyValueField error={errors.companyName} label="公司名称" value={value.companyName} />
        )}
        {allowEmployeeAccountEdit ? (
          <AdminEmployeeAccountFields
            accountError={errors.employeeAccount}
            employeeAccount={employeeAccount}
            employeeName=""
            onChange={({ employeeAccount: nextAccount }) =>
              onChange({
                ...value,
                attributes: mergeStoredTopLevelAttributes(value.attributes, {
                  employeeAccount: nextAccount,
                }),
              })
            }
          />
        ) : null}
        <TextField
          error={errors.productName}
          label="产品名称"
          onChange={(fieldValue) =>
            onChange({
              ...value,
              attributes: mergeStoredTopLevelAttributes(value.attributes, { productName: fieldValue }),
            })
          }
          required
          value={getProductNameAttribute(value.attributes)}
        />
        <AppSelect
          error={errors.status}
          label="状态"
          onChange={(fieldValue) => setField("status", fieldValue as CompanySkuStatus)}
          options={statusOptions}
          value={value.status}
        />
      </FormSection>
      <FormSection layout="stack" title="参数编辑">
        <ProductAttributeEditor
          attributes={getEditableProductAttributes(value.attributes)}
          errors={errors}
          onChange={(attributes) =>
            setField(
              "attributes",
              mergeStoredTopLevelAttributes(attributes, {
                productName: getProductNameAttribute(value.attributes),
                employeeAccount,
              }),
            )
          }
        />
      </FormSection>
      <div className="modal-actions">
        <span>{mode === "create" ? "先创建内部商品，再按平台 SKU 绑定各店铺订单。" : `创建时间：${value.createdAt}`}</span>
        <Button htmlType="submit" type="primary">
          保存
        </Button>
      </div>
    </form>
  );
}
