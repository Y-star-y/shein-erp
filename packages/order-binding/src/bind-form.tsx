"use client";



import {

  Button,

  CompanySkuSelect,

  FormSection,

  ReadOnlyValueField,

  TextField,

  type CompanySku,

  type FormErrors,

  type OrderBindRequest,

} from "@shein-erp/shared";

import { Plus } from "lucide-react";

import type { FormEvent } from "react";



function displayValue(value: string) {

  return value.trim() || "—";

}



export function BindForm({

  activeCompanySkus,

  errors,

  onChange,

  onCreateProduct,

  onSubmit,

  value,

}: {

  activeCompanySkus: CompanySku[];

  errors: FormErrors;

  onChange: (value: OrderBindRequest) => void;

  onCreateProduct?: () => void;

  onSubmit: (event: FormEvent<HTMLFormElement>) => void;

  value: OrderBindRequest;

}) {

  const platformSkuLocked = Boolean(value.platformSku.trim());

  const hasOrderContext = Boolean(

    value.sheinProductName.trim() || value.spec.trim() || value.articleNo.trim(),

  );



  function setField<K extends keyof OrderBindRequest>(field: K, fieldValue: OrderBindRequest[K]) {

    onChange({ ...value, [field]: fieldValue });

  }



  return (

    <form className="modal-form" noValidate onSubmit={onSubmit}>

      <FormSection layout="stack" title="绑定信息">

        {platformSkuLocked ? (

          <ReadOnlyValueField label="平台 SKU" value={value.platformSku} />

        ) : (

          <TextField

            error={errors.platformSku}

            label="平台 SKU"

            required

            value={value.platformSku}

            onChange={(fieldValue) => setField("platformSku", fieldValue)}

          />

        )}

        <ReadOnlyValueField label="店铺" value={displayValue(value.storeName)} />

        {hasOrderContext ? (

          <>

            <ReadOnlyValueField label="产品名称" value={displayValue(value.sheinProductName)} />

            <ReadOnlyValueField label="规格" value={displayValue(value.spec)} />

            <ReadOnlyValueField label="货号" value={displayValue(value.articleNo)} />

          </>

        ) : null}

        <CompanySkuSelect

          companySkus={activeCompanySkus}

          error={errors.internalProductId}

          label="内部商品"

          onChange={(fieldValue) => setField("internalProductId", fieldValue)}

          value={value.internalProductId}

        />

        {onCreateProduct ? (

          <Button icon={<Plus size={14} />} onClick={onCreateProduct} type="default">

            新建内部商品

          </Button>

        ) : null}

        <TextField

          error={errors.remark}

          label="备注"

          value={value.remark}

          onChange={(fieldValue) => setField("remark", fieldValue)}

        />

      </FormSection>

      {errors.form ? <p className="form-error">{errors.form}</p> : null}

      <div className="modal-actions">

        <Button htmlType="submit" type="primary">

          确认绑定

        </Button>

      </div>

    </form>

  );

}

