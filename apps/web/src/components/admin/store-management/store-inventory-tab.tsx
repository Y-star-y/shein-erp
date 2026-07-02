"use client";

import { readJsonResponse } from "@/lib/api-response";
import { EmptyBlock } from "@shein-erp/shared";
import type { StoreInventoryRow } from "@shein-erp/shared";
import { InputNumber, Spin, Table, Tag, message } from "antd";
import { Warehouse } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

function formatQty(value: number | null) {
  return value === null ? "—" : value;
}

export function StoreInventoryTab({ storeId }: { storeId: string }) {
  const [rows, setRows] = useState<StoreInventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProductId, setSavingProductId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/stores/${storeId}/inventory`);
      const data = await readJsonResponse<{ rows?: StoreInventoryRow[]; error?: string }>(response);
      if (!response.ok) throw new Error(data?.error ?? "加载失败");
      setRows(data?.rows ?? []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveWarning = useCallback(
    async (internalProductId: string, warningQuantity: number) => {
      setSavingProductId(internalProductId);
      try {
        const response = await fetch(`/api/stores/${storeId}/inventory-warnings`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ internalProductId, warningQuantity }),
        });
        const data = await readJsonResponse<{ warningQuantity?: number; error?: string }>(response);
        if (!response.ok) throw new Error(data?.error ?? "保存失败");

        const savedQuantity = data?.warningQuantity ?? warningQuantity;
        setRows((current) =>
          current.map((row) => {
            if (row.internalProductId !== internalProductId) return row;
            const isLowStock =
              savedQuantity > 0 && row.warehouseQty !== null && row.warehouseQty <= savedQuantity;
            return { ...row, warningQuantity: savedQuantity, isLowStock };
          }),
        );
        message.success("库存预警已保存");
      } catch (error) {
        message.error(error instanceof Error ? error.message : "保存失败");
        void load();
      } finally {
        setSavingProductId(null);
      }
    },
    [load, storeId],
  );

  const columns = useMemo(
    () => [
      { title: "内部商品 ID", dataIndex: "internalProductId", width: 220, ellipsis: true },
      { title: "商品名称", dataIndex: "productName", ellipsis: true },
      { title: "仓库 SKU", dataIndex: "sku", width: 120, render: (v: string | null) => v ?? "—" },
      {
        title: "仓库库存",
        dataIndex: "warehouseQty",
        width: 100,
        align: "right" as const,
        render: formatQty,
      },
      {
        title: "在途",
        dataIndex: "inTransitQty",
        width: 80,
        align: "right" as const,
      },
      {
        title: "可售",
        dataIndex: "availableQty",
        width: 80,
        align: "right" as const,
        render: formatQty,
      },
      {
        title: "库存预警",
        dataIndex: "warningQuantity",
        width: 120,
        className: "table-cell-interactive",
        render: (value: number, row: StoreInventoryRow) =>
          row.internalProductId ? (
            <InputNumber
              min={0}
              precision={0}
              size="small"
              style={{ width: "100%" }}
              value={value}
              disabled={savingProductId === row.internalProductId}
              onChange={(next) => {
                if (next === null) return;
                setRows((current) =>
                  current.map((item) =>
                    item.internalProductId === row.internalProductId
                      ? { ...item, warningQuantity: next }
                      : item,
                  ),
                );
              }}
              onBlur={() => {
                void saveWarning(row.internalProductId!, row.warningQuantity);
              }}
              onPressEnter={() => {
                void saveWarning(row.internalProductId!, row.warningQuantity);
              }}
            />
          ) : (
            "—"
          ),
      },
      {
        title: "状态",
        key: "stockStatus",
        width: 90,
        render: (_: unknown, row: StoreInventoryRow) =>
          row.warningQuantity > 0 ? (
            row.isLowStock ? (
              <Tag color="orange">库存不足</Tag>
            ) : (
              <Tag color="green">正常</Tag>
            )
          ) : (
            <Tag>未设置</Tag>
          ),
      },
    ],
    [saveWarning, savingProductId],
  );

  return (
    <Spin spinning={loading}>
      <Table
        rowKey="mappingId"
        dataSource={rows}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        tableLayout="fixed"
        rowClassName={(row) => (row.isLowStock ? "store-inventory-row-low" : "")}
        locale={{
          emptyText: (
            <EmptyBlock
              icon={<Warehouse size={22} />}
              text="为该店铺配置 SHEIN 映射后，可在此查看关联 SKU 的仓库库存，并按店铺自定义库存预警。"
              title="暂无库存数据"
            />
          ),
        }}
        columns={columns}
      />
    </Spin>
  );
}
