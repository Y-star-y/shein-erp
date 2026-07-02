"use client";

import { readJsonResponse } from "@/lib/api-response";
import type { PurchaseOrderSummary } from "@shein-erp/shared";
import { EmptyBlock } from "@shein-erp/shared";
import { Alert, Card, Spin, Table, Tag } from "antd";
import { ClipboardList } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export function InventoryPurchaseOrdersTab({ refreshKey = 0 }: { refreshKey?: number }) {
  const [orders, setOrders] = useState<PurchaseOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/inventory/purchase-orders");
      const data = await readJsonResponse<{ orders?: PurchaseOrderSummary[]; error?: string }>(response);
      if (!response.ok) {
        setError(data?.error ?? "加载失败");
        return;
      }
      setOrders(data?.orders ?? []);
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const lineColumns = useMemo(
    () => [
      { title: "内部产品 ID", dataIndex: "internalProductId", ellipsis: true },
      { title: "产品名称", dataIndex: "productName", ellipsis: true },
      { title: "采购数量", dataIndex: "quantity", width: 100, align: "right" as const },
    ],
    [],
  );

  const columns = useMemo(
    () => [
      { title: "采购单号", dataIndex: "orderNo", width: 180, ellipsis: true },
      {
        title: "类型",
        dataIndex: "purchaseTypeLabel",
        width: 100,
        render: (value: string, record: PurchaseOrderSummary) => (
          <Tag color={record.purchaseType === "batch" ? "blue" : "default"}>{value}</Tag>
        ),
      },
      { title: "物流单号", dataIndex: "logisticsNo", width: 160, ellipsis: true },
      { title: "SKU 数", dataIndex: "lineCount", width: 80, align: "right" as const },
      { title: "总数量", dataIndex: "totalQuantity", width: 90, align: "right" as const },
      {
        title: "提交人",
        dataIndex: "operatorName",
        width: 100,
        render: (value: string | null) => value ?? "—",
      },
      { title: "提交时间", dataIndex: "createdAt", width: 170 },
    ],
    [],
  );

  return (
    <>
      {error ? <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} /> : null}
      <Card>
        <Spin spinning={loading}>
          <Table
            rowKey="orderNo"
            dataSource={orders}
            columns={columns}
            pagination={{ pageSize: 20, showSizeChanger: true }}
            expandable={{
              expandedRowRender: (record) => (
                <Table
                  size="small"
                  rowKey="internalProductId"
                  pagination={false}
                  dataSource={record.lines}
                  columns={lineColumns}
                />
              ),
            }}
            locale={{
              emptyText: (
                <EmptyBlock
                  icon={<ClipboardList size={22} />}
                  title="暂无采购订单"
                  text="在「库存管理」页签中通过「批量采购」提交后，订单会出现在这里。"
                />
              ),
            }}
          />
        </Spin>
      </Card>
    </>
  );
}
