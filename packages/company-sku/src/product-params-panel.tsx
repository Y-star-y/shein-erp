"use client";

import {
  getEditableProductAttributes,
  isTextAttributeType,
  type CompanySku,
  type ProductAttribute,
} from "@shein-erp/shared";
import { Tag } from "antd";

function attributeTypeLabel(type: ProductAttribute["type"]) {
  return isTextAttributeType(type) ? "文字" : "数值";
}

export function ProductParamsPanel({ item }: { item: CompanySku }) {
  const params = getEditableProductAttributes(item.attributes).filter((attribute) => attribute.key.trim());

  if (!params.length) {
    return <div className="product-params-panel product-params-panel--empty">暂无参数</div>;
  }

  return (
    <div className="product-params-panel">
      <div className="product-params-panel__title">参数列表</div>
      <dl className="product-params-list">
        {params.map((attribute, index) => (
          <div key={`${attribute.key}-${index}`} className="product-params-list__item">
            <dt>{attribute.key}</dt>
            <dd>
              <span>{String(attribute.value ?? "").trim() || "—"}</span>
              <Tag className="product-params-list__type">{attributeTypeLabel(attribute.type)}</Tag>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
