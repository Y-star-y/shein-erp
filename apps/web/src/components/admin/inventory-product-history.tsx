"use client";

import { readJsonResponse } from "@/lib/api-response";
import type { InternalProductInventoryLogRow } from "@shein-erp/shared";
import { Spin, Table, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";

export function InventoryProductHistory({
  internalProductId,
  refreshKey = 0,
}: {
  internalProductId: string;
  refreshKey?: number;
}) {
  const [logs, setLogs] = useState<InternalProductInventoryLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/inventory/internal-products/${internalProductId}/logs`);
      const data = await readJsonResponse<{ logs?: InternalProductInventoryLogRow[] }>(response);
      if (!response.ok) {
        setLogs([]);
        return;
      }
      setLogs(data?.logs ?? []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [internalProductId, refreshKey]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="inventory-product-history">
      <Typography.Text strong>出入库记录</Typography.Text>
      <Spin spinning={loading}>
        <Table
          size="small"
          rowKey="id"
          pagination={{ pageSize: 5, hideOnSinglePage: true }}
          dataSource={logs}
          locale={{ emptyText: "暂无出入库记录" }}
          columns={[
            { title: "时间", dataIndex: "createdAt", width: 160 },
            { title: "方向", dataIndex: "directionLabel", width: 72 },
            { title: "类型", dataIndex: "sourceLabel", width: 100 },
            { title: "数量", dataIndex: "quantity", width: 72, align: "right" },
            {
              title: "物流单号",
              dataIndex: "logisticsNo",
              width: 140,
              render: (value: string | null) => value ?? "—",
            },
            {
              title: "仓库",
              dataIndex: "warehouseName",
              width: 100,
              render: (value: string | null) => value ?? "—",
            },
            {
              title: "操作人",
              dataIndex: "operatorName",
              width: 88,
              render: (value: string | null) => value ?? "—",
            },
            {
              title: "说明",
              dataIndex: "remark",
              ellipsis: true,
              render: (value: string | null) => value ?? "—",
            },
          ]}
        />
      </Spin>
    </div>
  );
}
