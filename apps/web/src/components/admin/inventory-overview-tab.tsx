"use client";

import { BatchPurchaseModal } from "@/components/admin/batch-purchase-modal";
import { InventoryProductHistory } from "@/components/admin/inventory-product-history";
import { readJsonResponse } from "@/lib/api-response";
import type { InternalProductInventoryRow } from "@shein-erp/shared";
import { EmptyBlock } from "@shein-erp/shared";
import { Alert, Button, Card, Spin, Table, Typography, message } from "antd";
import { ChevronDown, ChevronRight, Warehouse } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

function formatQty(value: number | null) {
  return value === null ? "—" : value;
}

export function InventoryOverviewTab({
  onPurchaseSubmitted,
}: {
  onPurchaseSubmitted?: () => void;
}) {
  const [rows, setRows] = useState<InternalProductInventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [batchPurchaseOpen, setBatchPurchaseOpen] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/inventory");
      const data = await readJsonResponse<{ rows?: InternalProductInventoryRow[]; error?: string }>(res);
      if (!res.ok) {
        setError(data?.error ?? "加载失败");
        return;
      }
      setRows(data?.rows ?? []);
      setHistoryRefreshKey((key) => key + 1);
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleRow = useCallback((internalProductId: string) => {
    setExpandedRowKeys((current) =>
      current.includes(internalProductId)
        ? current.filter((key) => key !== internalProductId)
        : [...current, internalProductId],
    );
  }, []);

  const buildWarehouseColumns = useCallback(
    () => [
      { title: "仓库", dataIndex: "warehouseName", ellipsis: true },
      {
        title: "可用库存量",
        dataIndex: "availableQty",
        width: 100,
        align: "right" as const,
      },
      {
        title: "总库存量",
        dataIndex: "totalQty",
        width: 90,
        align: "right" as const,
      },
      {
        title: "在途库存",
        dataIndex: "inTransitQty",
        width: 90,
        align: "right" as const,
      },
      {
        title: "占用库存",
        dataIndex: "occupiedQty",
        width: 90,
        align: "right" as const,
      },
      {
        title: "操作库存",
        key: "actions",
        width: 160,
        className: "table-cell-interactive",
        render: () => (
          <div className="inventory-warehouse-actions" onClick={(event) => event.stopPropagation()}>
            <Button type="link" size="small">
              采购入库
            </Button>
            <Button type="link" size="small">
              借货入库
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const columns = useMemo(
    () => [
      {
        title: "",
        key: "expand",
        width: 40,
        className: "inventory-expand-cell",
        render: (_: unknown, record: InternalProductInventoryRow) =>
          expandedRowKeys.includes(record.internalProductId) ? (
            <ChevronDown size={16} aria-hidden />
          ) : (
            <ChevronRight size={16} aria-hidden />
          ),
      },
      {
        title: "内部产品 ID",
        dataIndex: "internalProductId",
        width: 220,
        ellipsis: true,
      },
      {
        title: "产品名称",
        dataIndex: "productName",
        ellipsis: true,
      },
      {
        title: "卖家 SKU",
        dataIndex: "sellerSku",
        width: 140,
        render: (value: string | null) => value ?? "—",
      },
      {
        title: "可用库存量",
        dataIndex: "availableQty",
        width: 110,
        align: "right" as const,
        render: formatQty,
      },
      {
        title: "总库存量",
        dataIndex: "totalQty",
        width: 100,
        align: "right" as const,
        render: formatQty,
      },
      {
        title: "在途库存",
        dataIndex: "inTransitQty",
        width: 100,
        align: "right" as const,
      },
    ],
    [expandedRowKeys],
  );

  return (
    <>
      <div className="inventory-page-header">
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          点击任意商品行可展开查看各仓库库存明细。
        </Typography.Paragraph>
        <Button type="primary" onClick={() => setBatchPurchaseOpen(true)}>
          批量采购
        </Button>
      </div>
      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16, marginTop: 16 }} />}
      <Card>
        <Spin spinning={loading}>
          <Table
            className="inventory-table"
            rowKey="internalProductId"
            dataSource={rows}
            pagination={{ pageSize: 20, showSizeChanger: true }}
            tableLayout="fixed"
            scroll={{ x: 980 }}
            columns={columns}
            expandable={{
              expandedRowKeys,
              expandIcon: () => null,
              expandIconColumnIndex: -1,
              expandedRowRender: (record) => (
                <div className="inventory-expanded-panel" onClick={(event) => event.stopPropagation()}>
                  <Table
                    size="small"
                    className="inventory-warehouse-table"
                    rowKey="warehouseId"
                    pagination={false}
                    dataSource={record.warehouses}
                    columns={buildWarehouseColumns()}
                    locale={{ emptyText: "暂无启用仓库" }}
                  />
                  <InventoryProductHistory
                    internalProductId={record.internalProductId}
                    refreshKey={historyRefreshKey}
                  />
                </div>
              ),
            }}
            onRow={(record) => ({
              className: expandedRowKeys.includes(record.internalProductId)
                ? "inventory-row is-expanded"
                : "inventory-row",
              onClick: () => toggleRow(record.internalProductId),
            })}
            locale={{
              emptyText: loading ? (
                "加载中…"
              ) : (
                <EmptyBlock
                  icon={<Warehouse size={22} />}
                  title="暂无库存数据"
                  text="当前账号下还没有内部产品，或尚未配置卖家 SKU 与仓库库存。"
                />
              ),
            }}
          />
        </Spin>
      </Card>

      {batchPurchaseOpen ? (
        <BatchPurchaseModal
          onClose={() => setBatchPurchaseOpen(false)}
          onSuccess={() => {
            message.success("批量采购已登记");
            void load();
            onPurchaseSubmitted?.();
          }}
        />
      ) : null}
    </>
  );
}
