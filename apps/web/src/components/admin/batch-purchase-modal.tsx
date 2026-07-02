"use client";

import { readJsonResponse } from "@/lib/api-response";
import { AppModal, CompanySkuSelect, type CompanySku } from "@shein-erp/shared";
import { Button, Input, InputNumber, Table } from "antd";
import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export type BatchPurchaseLine = {
  key: string;
  internalProductId: string;
  quantity: number | null;
};

function createEmptyLine(): BatchPurchaseLine {
  return {
    key: `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    internalProductId: "",
    quantity: null,
  };
}

export function BatchPurchaseModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [lines, setLines] = useState<BatchPurchaseLine[]>([createEmptyLine()]);
  const [logisticsNo, setLogisticsNo] = useState("");
  const [products, setProducts] = useState<CompanySku[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadProducts() {
      setLoadingProducts(true);
      setError(null);
      try {
        const response = await fetch("/api/inventory/internal-products");
        const data = await readJsonResponse<{ products?: CompanySku[]; error?: string }>(response);
        if (!response.ok) {
          throw new Error(data?.error ?? "加载内部产品失败");
        }
        if (!cancelled) {
          setProducts(data?.products ?? []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "加载内部产品失败");
          setProducts([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingProducts(false);
        }
      }
    }

    void loadProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateLine = useCallback((key: string, patch: Partial<BatchPurchaseLine>) => {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }, []);

  const addLine = useCallback(() => {
    setLines((current) => [...current, createEmptyLine()]);
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((current) => {
      const next = current.filter((line) => line.key !== key);
      return next.length ? next : [createEmptyLine()];
    });
  }, []);

  async function handleSubmit() {
    const trimmedLogisticsNo = logisticsNo.trim();
    if (!trimmedLogisticsNo) {
      setError("请填写物流单号");
      return;
    }

    const validLines = lines.filter(
      (line) => line.internalProductId.trim() && line.quantity !== null && line.quantity > 0,
    );
    if (!validLines.length) {
      setError("请至少添加一条有效的内部产品与采购数量");
      return;
    }

    const duplicateIds = new Set<string>();
    for (const line of validLines) {
      if (duplicateIds.has(line.internalProductId)) {
        setError("采购清单中不能重复添加同一内部产品");
        return;
      }
      duplicateIds.add(line.internalProductId);
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/inventory/batch-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logisticsNo: trimmedLogisticsNo,
          lines: validLines.map((line) => ({
            internalProductId: line.internalProductId,
            quantity: line.quantity,
          })),
        }),
      });
      const data = await readJsonResponse<{ error?: string }>(response);
      if (!response.ok) {
        setError(data?.error ?? "提交失败");
        return;
      }
      onSuccess?.();
      onClose();
    } catch {
      setError("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  const columns = useMemo(
    () => [
      {
        title: "内部产品",
        key: "product",
        render: (_: unknown, line: BatchPurchaseLine) => (
          <CompanySkuSelect
            companySkus={products}
            value={line.internalProductId}
            onChange={(value) => updateLine(line.key, { internalProductId: value })}
            placeholder={loadingProducts ? "加载中…" : "搜索并选择内部产品"}
          />
        ),
      },
      {
        title: "采购数量",
        key: "quantity",
        width: 140,
        render: (_: unknown, line: BatchPurchaseLine) => (
          <InputNumber
            min={1}
            precision={0}
            style={{ width: "100%" }}
            placeholder="数量"
            value={line.quantity}
            onChange={(value) => updateLine(line.key, { quantity: value })}
          />
        ),
      },
      {
        title: "",
        key: "actions",
        width: 56,
        className: "table-cell-interactive",
        render: (_: unknown, line: BatchPurchaseLine) => (
          <Button
            type="text"
            danger
            icon={<Trash2 size={14} />}
            aria-label="删除"
            onClick={() => removeLine(line.key)}
          />
        ),
      },
    ],
    [loadingProducts, products, removeLine, updateLine],
  );

  return (
    <AppModal title="批量采购" onClose={onClose}>
      {error ? <p className="form-error">{error}</p> : null}
      <div style={{ marginBottom: 16 }}>
        <label className="field-label" htmlFor="batch-purchase-logistics-no">
          物流单号
        </label>
        <Input
          id="batch-purchase-logistics-no"
          placeholder="请输入物流单号"
          value={logisticsNo}
          onChange={(event) => setLogisticsNo(event.target.value)}
        />
      </div>
      <Table
        className="batch-purchase-table"
        rowKey="key"
        dataSource={lines}
        columns={columns}
        pagination={false}
        size="small"
        locale={{ emptyText: "请添加采购产品" }}
      />
      <Button
        type="link"
        icon={<Plus size={14} />}
        className="batch-purchase-add-line"
        onClick={addLine}
        style={{ marginTop: 12, padding: 0 }}
      >
        添加产品
      </Button>
      <div className="modal-actions" style={{ marginTop: 16 }}>
        <Button onClick={onClose}>取消</Button>
        <Button type="primary" loading={submitting} onClick={() => void handleSubmit()}>
          提交采购清单
        </Button>
      </div>
    </AppModal>
  );
}
