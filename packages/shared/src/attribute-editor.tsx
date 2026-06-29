"use client";

import { Input, InputNumber } from "antd";
import { Plus, Trash2 } from "lucide-react";
import {
  PRODUCT_ATTRIBUTE_TYPE_OPTIONS,
  createEmptyProductAttribute,
  isTextAttributeType,
  type ProductAttributeType,
} from "./product-attributes";
import type { FormErrors, ProductAttribute } from "./types";
import { AppSelect, Button } from "./ui";

export function ProductAttributeEditor({
  attributes,
  errors,
  onChange,
}: {
  attributes: ProductAttribute[];
  errors: FormErrors;
  onChange: (attributes: ProductAttribute[]) => void;
}) {
  function updateAttribute(index: number, patch: Partial<ProductAttribute>) {
    onChange(
      attributes.map((attribute, currentIndex) =>
        currentIndex === index ? { ...attribute, ...patch } : attribute,
      ),
    );
  }

  function removeAttribute(index: number) {
    onChange(attributes.filter((_, currentIndex) => currentIndex !== index));
  }

  function addAttribute() {
    onChange([...attributes, createEmptyProductAttribute()]);
  }

  return (
    <div className="product-attribute-editor">
      {attributes.map((attribute, index) => {
        const keyError = errors[`attributes.${index}.key`];
        const valueError = errors[`attributes.${index}.value`];
        const attributeType = isTextAttributeType(attribute.type) ? "text" : "number";

        return (
          <div className="product-attribute-row" key={`attribute-${index}`}>
            <div className="product-attribute-key">
              <Input
                placeholder="参数名称，如：产品产地"
                status={keyError ? "error" : undefined}
                value={attribute.key}
                onChange={(event) => updateAttribute(index, { key: event.target.value })}
              />
            </div>
            <div className="product-attribute-value">
              {attributeType === "text" ? (
                <Input
                  placeholder="参数值"
                  status={valueError ? "error" : undefined}
                  value={String(attribute.value ?? "")}
                  onChange={(event) => updateAttribute(index, { value: event.target.value, type: "text" })}
                />
              ) : (
                <InputNumber
                  className="product-attribute-number"
                  placeholder="参数值"
                  status={valueError ? "error" : undefined}
                  style={{ width: "100%" }}
                  value={typeof attribute.value === "number" ? attribute.value : undefined}
                  onChange={(next) => updateAttribute(index, { value: next ?? 0, type: "number" })}
                />
              )}
            </div>
            <div className="product-attribute-type">
              <AppSelect
                onChange={(value) => {
                  const nextType = value as ProductAttributeType;
                  updateAttribute(index, {
                    type: nextType,
                    value: nextType === "text" ? String(attribute.value ?? "") : Number(attribute.value) || 0,
                  });
                }}
                options={PRODUCT_ATTRIBUTE_TYPE_OPTIONS.map((option) => ({
                  label: option.label,
                  value: option.value,
                }))}
                value={attributeType}
              />
            </div>
            <div className="product-attribute-actions">
              <Button
                aria-label="删除参数"
                icon={<Trash2 size={14} />}
                type="text"
                onClick={() => removeAttribute(index)}
              />
            </div>
            {(keyError || valueError) && (
              <div className="product-attribute-error">{keyError || valueError}</div>
            )}
          </div>
        );
      })}

      <Button block icon={<Plus size={14} />} type="dashed" onClick={addAttribute}>
        添加参数
      </Button>
    </div>
  );
}
