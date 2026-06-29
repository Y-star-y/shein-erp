"use client";

import { readJsonResponse } from "@/lib/api-response";
import { unmappedGroupKey } from "@shein-erp/core";
import { EmptyBlock, getOrderStatusDisplay } from "@shein-erp/shared";
import type {
  OrderQuickFilter,
  StoreOrderDetail,
  StoreOrderLineDetail,
  StoreOrderSummary,
  StoreOrdersListResponse,
  StoreRecord,
  UnmappedOrderLine,
} from "@shein-erp/shared";
import { OrderImportButton } from "@shein-erp/order-binding";
import { Badge, Input, Segmented, Spin, Table, Tag } from "antd";
import { ClipboardList, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type QuickFilter = "all" | "unmapped" | "pending_ship" | "shipped";

const quickFilterLabels: Record<Exclude<QuickFilter, "all">, string> = {
  unmapped: "待绑定",
  pending_ship: "待发货",
  shipped: "已发货/运输中",
};

type FilterCounts = {
  unmapped: number;
  pendingShip: number;
  shipped: number;
};

function FilterSegmentLabel({ label, showDot }: { label: string; showDot: boolean }) {
  return (
    <span className="order-filter-segment">
      {label}
      {showDot ? <span className="order-filter-dot" aria-hidden /> : null}
    </span>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function OrderShippingAddressPanel({
  detail,
  loading,
}: {
  detail: StoreOrderDetail | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="order-shipping-address order-shipping-address--loading">
        <Spin size="small" />
        <span>加载发货地址…</span>
      </div>
    );
  }

  const hasAddress =
    detail?.recipientName ||
    detail?.recipientPhone ||
    detail?.recipientAddress ||
    detail?.recipientPostalCode;

  if (!hasAddress) {
    return (
      <div className="order-shipping-address order-shipping-address--empty">
        <strong>发货地址</strong>
        <span>暂无地址信息，请重新导入包含收件人地址的 SHEIN 订单 Excel</span>
      </div>
    );
  }

  return (
    <div className="order-shipping-address">
      <strong className="order-shipping-address__label">发货地址</strong>
      <div className="order-shipping-address__content">
        {detail.recipientName || detail.recipientPhone ? (
          <div className="order-shipping-address__row">
            {[detail.recipientName, detail.recipientPhone].filter(Boolean).join(" · ")}
          </div>
        ) : null}
        {detail.country || detail.recipientAddress || detail.recipientPostalCode ? (
          <div className="order-shipping-address__row">
            {[detail.country, detail.recipientAddress, detail.recipientPostalCode && `邮编 ${detail.recipientPostalCode}`]
              .filter(Boolean)
              .join(" ")}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function OrderLinesTable({
  lines,
  loading,
  onBindLine,
}: {
  lines: StoreOrderLineDetail[] | null;
  loading: boolean;
  onBindLine?: (line: StoreOrderLineDetail) => void;
}) {
  if (loading) {
    return (
      <div style={{ padding: "16px 48px" }}>
        <Spin size="small" />
      </div>
    );
  }

  if (!lines?.length) {
    return <div style={{ padding: "12px 48px", color: "var(--text-muted)" }}>暂无商品明细</div>;
  }

  return (
    <div className="order-lines-table">
      <Table
        rowKey="id"
        size="small"
        pagination={false}
        dataSource={lines}
        scroll={{ x: 600 }}
        columns={[
          {
            title: "卖家 SKU",
            dataIndex: "sellerSku",
            width: 160,
            render: (value: string) => <code style={{ whiteSpace: "normal", wordBreak: "break-all" }}>{value}</code>,
          },
          {
            title: "商品名称",
            dataIndex: "productName",
            width: 240,
            render: (value: string) => (
              <span style={{ whiteSpace: "normal", wordBreak: "break-word" }}>{value}</span>
            ),
          },
          {
            title: "规格",
            dataIndex: "spec",
            width: 120,
            render: (value: string | null) => (
              <span style={{ whiteSpace: "normal", wordBreak: "break-word" }}>{value || "—"}</span>
            ),
          },
          {
            title: "数量",
            dataIndex: "quantity",
            width: 64,
            align: "center" as const,
          },
          {
            title: "绑定",
            dataIndex: "mappingStatus",
            width: 140,
            render: (value: string, record: StoreOrderLineDetail) =>
              value === "mapped" ? (
                <Tag color="green">{record.internalSku || "已绑定"}</Tag>
              ) : onBindLine ? (
                <Tag
                  color="blue"
                  style={{ cursor: "pointer", textDecoration: "underline" }}
                  onClick={(event) => {
                    event.stopPropagation();
                    onBindLine(record);
                  }}
                >
                  待绑定
                </Tag>
              ) : (
                <Tag color="blue">待绑定</Tag>
              ),
          },
        ]}
      />
    </div>
  );
}

function lineToUnmappedOrderLine(
  line: StoreOrderLineDetail,
  order: StoreOrderSummary,
  storeName: string,
): UnmappedOrderLine {
  const sellerSku = line.sellerSku.trim();
  const platformSku = line.platformSku?.trim() || "";

  return {
    lineId: line.id,
    groupKey: unmappedGroupKey(sellerSku, platformSku),
    platformSkc: line.platformSkc?.trim() || "",
    sellerSku,
    platformSku,
    platformSpu: line.platformSpu?.trim() || "",
    sheinProductName: line.productName,
    storeName,
    orderCount: 1,
    sampleOrderNo: order.orderNo,
    orderNo: order.orderNo,
    orderCreatedAt: order.createdAt,
    shipBy: order.shipBy,
    deliverBy: order.deliverBy,
  };
}

export function StoreOrdersTab({
  store,
  onImported,
  onBind,
  bindReloadKey = 0,
  initialOrdersFilter = "all",
}: {
  store: StoreRecord;
  onImported?: () => void;
  onBind?: (line: UnmappedOrderLine) => void;
  bindReloadKey?: number;
  initialOrdersFilter?: OrderQuickFilter;
}) {
  const [orders, setOrders] = useState<StoreOrderSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(initialOrdersFilter);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, StoreOrderDetail>>({});
  const [loadingLines, setLoadingLines] = useState<Record<string, boolean>>({});
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [filterCounts, setFilterCounts] = useState<FilterCounts>({
    unmapped: 0,
    pendingShip: 0,
    shipped: 0,
  });

  useEffect(() => {
    setQuickFilter(initialOrdersFilter);
    setPage(1);
  }, [initialOrdersFilter, store.id]);

  const loadFilterCounts = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/filter-counts?storeId=${store.id}`);
      const data = await readJsonResponse<FilterCounts & { error?: string }>(response);
      if (!response.ok) return;
      setFilterCounts({
        unmapped: data?.unmapped ?? 0,
        pendingShip: data?.pendingShip ?? 0,
        shipped: data?.shipped ?? 0,
      });
    } catch {
      setFilterCounts({ unmapped: 0, pendingShip: 0, shipped: 0 });
    }
  }, [store.id]);

  const filterSegmentOptions = useMemo(
    () => [
      { value: "all", label: "全部" },
      {
        value: "unmapped",
        label: (
          <FilterSegmentLabel label={quickFilterLabels.unmapped} showDot={filterCounts.unmapped > 0} />
        ),
      },
      {
        value: "pending_ship",
        label: (
          <FilterSegmentLabel
            label={quickFilterLabels.pending_ship}
            showDot={filterCounts.pendingShip > 0}
          />
        ),
      },
      {
        value: "shipped",
        label: (
          <FilterSegmentLabel label={quickFilterLabels.shipped} showDot={filterCounts.shipped > 0} />
        ),
      },
    ],
    [filterCounts],
  );

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        storeId: store.id,
        page: String(page),
        pageSize: String(pageSize),
      });
      if (query.trim()) params.set("q", query.trim());

      if (quickFilter === "unmapped") {
        params.set("hasUnmapped", "true");
      } else if (quickFilter === "pending_ship") {
        params.set("statuses", "PENDING,READY");
      } else if (quickFilter === "shipped") {
        params.set("status", "SHIPPED");
      }

      const response = await fetch(`/api/orders?${params.toString()}`);
      const data = await readJsonResponse<StoreOrdersListResponse & { error?: string }>(response);
      if (!response.ok) throw new Error(data?.error ?? "加载失败");
      setOrders(data?.orders ?? []);
      setTotal(data?.total ?? 0);
    } catch {
      setOrders([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [store.id, page, pageSize, quickFilter, query]);

  useEffect(() => {
    void loadOrders();
    void loadFilterCounts();
  }, [loadOrders, loadFilterCounts, reloadKey, bindReloadKey]);

  const fetchOrderDetail = useCallback(async (orderId: string) => {
    const response = await fetch(`/api/orders/${orderId}`);
    const data = await readJsonResponse<StoreOrderDetail & { error?: string }>(response);
    if (!response.ok) throw new Error(data?.error ?? "加载失败");
    if (!data) throw new Error("加载失败");
    setExpandedDetails((current) => ({ ...current, [orderId]: data }));
    return data;
  }, []);

  const loadOrderDetail = useCallback(
    async (orderId: string) => {
      if (expandedDetails[orderId]) return;

      setLoadingLines((current) => ({ ...current, [orderId]: true }));
      try {
        await fetchOrderDetail(orderId);
      } catch {
        setExpandedDetails((current) => {
          const next = { ...current };
          delete next[orderId];
          return next;
        });
      } finally {
        setLoadingLines((current) => ({ ...current, [orderId]: false }));
      }
    },
    [expandedDetails, fetchOrderDetail],
  );

  const handleImported = useCallback(() => {
    setReloadKey((value) => value + 1);
    setExpandedDetails({});
    setExpandedRowKeys([]);
    onImported?.();
  }, [onImported]);

  const handleBindLine = useCallback(
    (order: StoreOrderSummary, line: StoreOrderLineDetail) => {
      onBind?.(lineToUnmappedOrderLine(line, order, store.name));
    },
    [onBind, store.name],
  );

  return (
    <div className="store-orders-tab page-stack">
      <OrderImportButton storeId={store.id} storeName={store.name} onImported={handleImported} />

      <section className="store-orders-list table-panel">
        <div className="table-toolbar" style={{ marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
          <Input
            allowClear
            className="table-search"
            placeholder="搜索订单号"
            prefix={<Search size={15} />}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
          <Segmented
            options={filterSegmentOptions}
            value={quickFilter}
            onChange={(value) => {
              setQuickFilter(value as QuickFilter);
              setPage(1);
            }}
          />
        </div>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={orders}
          scroll={{ x: 980 }}
          className="store-orders-table"
          expandable={{
            expandedRowKeys,
            expandIconColumnIndex: -1,
            expandIcon: () => null,
            expandedRowRender: (record) => (
              <div className="order-expanded-panel">
                <OrderShippingAddressPanel
                  detail={expandedDetails[record.id] ?? null}
                  loading={Boolean(loadingLines[record.id])}
                />
                <OrderLinesTable
                  lines={expandedDetails[record.id]?.lines ?? null}
                  loading={Boolean(loadingLines[record.id])}
                  onBindLine={onBind ? (line) => handleBindLine(record, line) : undefined}
                />
              </div>
            ),
            onExpand: (expanded, record) => {
              if (expanded) void loadOrderDetail(record.id);
            },
          }}
          onRow={(record) => ({
            className: expandedRowKeys.includes(record.id)
              ? "store-order-row is-expanded"
              : "store-order-row",
            onClick: () => {
              const isExpanded = expandedRowKeys.includes(record.id);
              setExpandedRowKeys((keys) =>
                isExpanded ? keys.filter((key) => key !== record.id) : [...keys, record.id],
              );
              if (!isExpanded) void loadOrderDetail(record.id);
            },
          })}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (nextPage, nextSize) => {
              setExpandedRowKeys([]);
              setPage(nextPage);
              setPageSize(nextSize);
            },
          }}
          locale={{
            emptyText: (
              <EmptyBlock
                icon={<ClipboardList size={22} />}
                text="点击上方「导入订单」上传 SHEIN Excel，点击订单行展开查看商品明细并绑定。"
                title="暂无订单"
              />
            ),
          }}
          columns={[
            {
              title: "GSP 订单",
              dataIndex: "orderNo",
              width: 188,
              render: (value: string, record: StoreOrderSummary) => (
                <span
                  style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                  title={`${record.lineCount} 个商品`}
                >
                  <Badge
                    count={record.lineCount}
                    overflowCount={99}
                    showZero
                    size="small"
                    color="#1677ff"
                    style={{ flexShrink: 0 }}
                  />
                  <strong>{value}</strong>
                </span>
              ),
              onCell: () => ({ className: "table-cell-interactive" }),
            },
            {
              title: "创建时间",
              dataIndex: "createdAt",
              width: 148,
              render: formatDateTime,
            },
            {
              title: "要求发货",
              dataIndex: "shipBy",
              width: 148,
              render: formatDateTime,
            },
            {
              title: "要求签收",
              dataIndex: "deliverBy",
              width: 148,
              render: formatDateTime,
            },
            {
              title: "订单状态",
              key: "orderStatus",
              width: 120,
              render: (_value: unknown, record: StoreOrderSummary) => {
                const display = getOrderStatusDisplay(record);
                const isExpanded = expandedRowKeys.includes(record.id);
                const hint =
                  display.key === "unmapped" && !isExpanded
                    ? "展开订单后，点击商品行的「待绑定」进行绑定"
                    : undefined;

                return (
                  <Tag color={display.color} title={hint}>
                    {display.label}
                  </Tag>
                );
              },
            },
            {
              title: "物流",
              key: "logistics",
              width: 160,
              ellipsis: true,
              render: (_value: unknown, record: StoreOrderSummary) => {
                if (!record.logisticsNo && !record.logisticsCompany) return "—";
                return (
                  <span title={[record.logisticsCompany, record.logisticsNo].filter(Boolean).join(" ")}>
                    {record.logisticsCompany ? `${record.logisticsCompany} ` : ""}
                    {record.logisticsNo ?? ""}
                  </span>
                );
              },
            },
          ]}
        />
      </section>
    </div>
  );
}
