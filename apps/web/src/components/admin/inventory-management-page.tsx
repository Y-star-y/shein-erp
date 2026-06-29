"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Card, Spin, Table, Typography } from "antd";

interface InventoryRow {
  productId: string;
  sku: string;
  name: string;
  warehouseQty: number;
  inTransitQty: number;
  availableQty: number;
}

export function InventoryManagementPage() {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/inventory");
      const data = (await res.json()) as { rows?: InventoryRow[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "加载失败");
        return;
      }
      setRows(data.rows ?? []);
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        库存管理
      </Typography.Title>
      {error && (
        <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />
      )}
      <Card>
        <Spin spinning={loading}>
          <Table
            rowKey="productId"
            dataSource={rows}
            pagination={{ pageSize: 20, showSizeChanger: true }}
            columns={[
              { title: "SKU", dataIndex: "sku", width: 140 },
              { title: "商品名称", dataIndex: "name" },
              { title: "仓库库存", dataIndex: "warehouseQty", width: 100, align: "right" },
              { title: "在途", dataIndex: "inTransitQty", width: 80, align: "right" },
              { title: "可售", dataIndex: "availableQty", width: 80, align: "right" },
            ]}
            locale={{ emptyText: loading ? "加载中…" : "暂无商品或库存数据" }}
          />
        </Spin>
      </Card>
    </div>
  );
}
