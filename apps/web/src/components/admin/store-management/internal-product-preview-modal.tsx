"use client";

import { readJsonResponse } from "@/lib/api-response";
import {
  AppModal,
  CopyableCodeText,
  StatusTag,
  getEditableProductAttributes,
  getProductDisplayName,
  isTextAttributeType,
  statusText,
  statusTone,
  type CompanySku,
  type ProductAttribute,
} from "@shein-erp/shared";
import { Spin, Tag } from "antd";
import { useCallback, useEffect, useState } from "react";

function attributeTypeLabel(type: ProductAttribute["type"]) {
  return isTextAttributeType(type) ? "文字" : "数值";
}

function ProductParamsPanel({ item }: { item: CompanySku }) {
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

export function InternalProductPreviewModal({
  internalProductId,
  open,
  onClose,
}: {
  internalProductId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [product, setProduct] = useState<CompanySku | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProduct = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setProduct(null);
    try {
      const response = await fetch(`/api/internal-products/lookup?id=${encodeURIComponent(id)}`);
      const data = await readJsonResponse<{ product?: CompanySku; error?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.error ?? "加载失败");
      }
      setProduct(data?.product ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !internalProductId) {
      setProduct(null);
      setError(null);
      return;
    }
    void loadProduct(internalProductId);
  }, [internalProductId, loadProduct, open]);

  if (!open) return null;

  return (
    <AppModal title="内部商品" onClose={onClose}>
      {loading ? (
        <div className="internal-product-preview__loading">
          <Spin />
          <span>加载商品信息…</span>
        </div>
      ) : error ? (
        <p className="form-error">{error}</p>
      ) : product ? (
        <div className="internal-product-preview">
          <dl className="internal-product-preview__meta">
            <div>
              <dt>商品名称</dt>
              <dd>{getProductDisplayName(product)}</dd>
            </div>
            <div>
              <dt>内部商品 ID</dt>
              <dd>
                <CopyableCodeText stopPropagation value={product.id} />
              </dd>
            </div>
            <div>
              <dt>公司</dt>
              <dd>{product.companyName || "—"}</dd>
            </div>
            <div>
              <dt>状态</dt>
              <dd>
                <StatusTag tone={statusTone(product.status)} value={statusText(product.status)} />
              </dd>
            </div>
            <div>
              <dt>更新时间</dt>
              <dd>{product.updatedAt}</dd>
            </div>
          </dl>
          <ProductParamsPanel item={product} />
        </div>
      ) : (
        <p className="empty-hint">暂无商品信息</p>
      )}
    </AppModal>
  );
}
