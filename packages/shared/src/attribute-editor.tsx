"use client";

import { Input, InputNumber } from "antd";
import type { InputRef } from "antd/es/input";
import { Plus, Trash2 } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";
import {
  PRODUCT_ATTRIBUTE_TYPE_OPTIONS,
  createEmptyProductAttribute,
  getMaxProductAttributes,
  isTextAttributeType,
  type ProductAttributeType,
} from "./product-attributes";
import type { FormErrors, ProductAttribute } from "./types";
import { AppSelect, Button } from "./ui";

type ValueInputHandle = Pick<InputRef, "focus"> | null;

export function ProductAttributeEditor({
  attributes,
  errors,
  onChange,
}: {
  attributes: ProductAttribute[];
  errors: FormErrors;
  onChange: (attributes: ProductAttribute[]) => void;
}) {
  const valueInputRefs = useRef<ValueInputHandle[]>([]);

  function focusValueInput(index: number) {
    valueInputRefs.current[index]?.focus({ cursor: "end" });
  }

  function handleValueKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key !== "Tab") {
      return;
    }

    const targetIndex = event.shiftKey ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= attributes.length) {
      return;
    }

    event.preventDefault();
    focusValueInput(targetIndex);
  }

  function setValueInputRef(index: number, instance: ValueInputHandle) {
    valueInputRefs.current[index] = instance;
  }

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
    if (attributes.length >= getMaxProductAttributes()) {
      return;
    }
    onChange([...attributes, createEmptyProductAttribute()]);
  }

  const maxAttributes = getMaxProductAttributes();
  const atAttributeLimit = attributes.length >= maxAttributes;

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
                  ref={(instance) => setValueInputRef(index, instance)}
                  status={valueError ? "error" : undefined}
                  value={String(attribute.value ?? "")}
                  onChange={(event) => updateAttribute(index, { value: event.target.value, type: "text" })}
                  onKeyDown={(event) => handleValueKeyDown(event, index)}
                />
              ) : (
                <InputNumber
                  className="product-attribute-number"
                  placeholder="参数值"
                  ref={(instance) => setValueInputRef(index, instance)}
                  status={valueError ? "error" : undefined}
                  style={{ width: "100%" }}
                  value={typeof attribute.value === "number" ? attribute.value : undefined}
                  onChange={(next) => updateAttribute(index, { value: next ?? 0, type: "number" })}
                  onKeyDown={(event) => handleValueKeyDown(event, index)}
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

      {errors.form ? <div className="product-attribute-error">{errors.form}</div> : null}

      <Button
        block
        disabled={atAttributeLimit}
        icon={<Plus size={14} />}
        title={atAttributeLimit ? `最多 ${maxAttributes} 条自定义参数` : undefined}
        type="dashed"
        onClick={addAttribute}
      >
        添加参数{atAttributeLimit ? `（已达上限 ${maxAttributes} 条）` : `（${attributes.length}/${maxAttributes}）`}
      </Button>
    </div>
  );
}
