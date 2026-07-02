"use client";

import { readJsonResponse } from "@/lib/api-response";
import { unmappedGroupKey } from "@shein-erp/core";
import { EmptyBlock, getOrderStatusDisplay } from "@shein-erp/shared";
import type {
  StoreOrderDetail,
  StoreOrderLineDetail,
  StoreOrderSummary,
  StoreOrdersListResponse,
  StoreRecord,
  UnmappedOrderLine,
} from "@shein-erp/shared";
import { OrderImportButton } from "@shein-erp/order-binding";
import { Alert, Badge, Button, Input, Modal, Segmented, Spin, Table, Tag, message } from "antd";
import { ClipboardList, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InternalProductPreviewModal } from "./internal-product-preview-modal";

function resolveLineInternalProductId(line: StoreOrderLineDetail) {
  return line.internalProductId?.trim() || "";
}

function lineNeedsBinding(line: StoreOrderLineDetail) {
  if (line.mappingStatus === "excluded") return false;
  if (line.mappingStatus === "unmapped") return true;
  return !resolveLineInternalProductId(line);
}

type QuickFilter = "all" | "pending_ship" | "shipped";

const quickFilterLabels: Record<Exclude<QuickFilter, "all">, string> = {
  pending_ship: "待发货",
  shipped: "已发货/运输中",
};

type FilterCounts = {
  pendingShip: number;
  shipped: number;
  pendingLineCount: number;
  pendingUniquePlatformSkuCount: number;
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

function OrderLinesSummary({ lines }: { lines: StoreOrderLineDetail[] }) {
  const mappedCount = lines.filter((line) => !lineNeedsBinding(line)).length;
  const unmappedCount = lines.filter((line) => lineNeedsBinding(line)).length;
  const excludedCount = lines.filter((line) => line.mappingStatus === "excluded").length;
  const uniquePlatformSkuCount = new Set(
    lines.map((line) => line.platformSku.trim()).filter(Boolean),
  ).size;

  return (
    <div className="order-lines-summary">
      <span className="order-lines-summary__label">商品明细</span>
      <span className="order-lines-summary__counts">
        共 <strong>{lines.length}</strong> 件
        {uniquePlatformSkuCount < lines.length ? (
          <>
            {" "}
            （<strong>{uniquePlatformSkuCount}</strong> 个平台 SKU）
          </>
        ) : null}
        {mappedCount > 0 ? (
          <>
            {" · "}
            <Tag color="green" variant="filled">
              已绑定 {mappedCount}
            </Tag>
          </>
        ) : null}
        {unmappedCount > 0 ? (
          <>
            {" · "}
            <Tag color="blue" variant="filled">
              待绑定 {unmappedCount}
            </Tag>
          </>
        ) : null}
        {excludedCount > 0 ? (
          <>
            {" · "}
            <Tag variant="filled">已排除 {excludedCount}</Tag>
          </>
        ) : null}
      </span>
    </div>
  );
}

function OrderBindingSummary({ record }: { record: StoreOrderSummary }) {
  return (
    <span className="order-binding-summary">
      <span>共 {record.lineCount} 件</span>
      {record.mappedLineCount > 0 ? (
        <Tag color="green" variant="filled">
          已绑定 {record.mappedLineCount}
        </Tag>
      ) : null}
      {record.unmappedLineCount > 0 ? (
        <Tag color="blue" variant="filled">
          待绑定 {record.unmappedLineCount}
        </Tag>
      ) : null}
      {record.excludedLineCount > 0 ? (
        <Tag variant="filled">已排除 {record.excludedLineCount}</Tag>
      ) : null}
    </span>
  );
}

function OrderLinesTable({
  lines,
  loading,
  onBindLine,
  onOpenInternalProduct,
}: {
  lines: StoreOrderLineDetail[] | null;
  loading: boolean;
  onBindLine?: (line: StoreOrderLineDetail) => void;
  onOpenInternalProduct?: (internalProductId: string) => void;
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
        scroll={{ x: 780 }}
        rowClassName={(record: StoreOrderLineDetail) =>
          lineNeedsBinding(record) ? "order-line-unmapped" : ""
        }
        columns={[
          {
            title: "平台 SKU",
            dataIndex: "platformSku",
            width: 160,
            render: (value: string, record: StoreOrderLineDetail) => {
              const platformSku = value?.trim() || "";
              if (!platformSku) return "—";
              if (lineNeedsBinding(record)) {
                return <strong className="order-line-unmapped-sku">{platformSku}</strong>;
              }
              return <code>{platformSku}</code>;
            },
          },
          {
            title: "内部商品 ID",
            dataIndex: "internalProductId",
            width: 220,
            render: (_value: string, record: StoreOrderLineDetail) => {
              const internalProductId = resolveLineInternalProductId(record);
              if (!internalProductId) {
                return <span>—</span>;
              }

              if (!onOpenInternalProduct) {
                return (
                  <code style={{ whiteSpace: "normal", wordBreak: "break-all" }}>{internalProductId}</code>
                );
              }

              return (
                <button
                  className="order-line-internal-sku-link"
                  title="查看内部商品"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenInternalProduct(internalProductId);
                  }}
                >
                  <code>{internalProductId}</code>
                </button>
              );
            },
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
            render: (value: string, record: StoreOrderLineDetail) => {
              if (!lineNeedsBinding(record)) {
                return (
                  <Tag color="green" title={record.internalProductId || undefined}>
                    已绑定
                  </Tag>
                );
              }
              if (value === "excluded" || record.mappingStatus === "excluded") {
                return <Tag color="default">已排除</Tag>;
              }
              return onBindLine ? (
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
              );
            },
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
  const platformSku = line.platformSku?.trim() || "";

  return {
    lineId: line.id,
    groupKey: unmappedGroupKey("", platformSku),
    platformSkc: line.platformSkc?.trim() || "",
    sellerSku: "",
    platformSku,
    platformSpu: line.platformSpu?.trim() || "",
    sheinProductName: line.productName,
    spec: line.spec?.trim() || "",
    articleNo: line.articleNo?.trim() || "",
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
  variant = "orders",
}: {
  store: StoreRecord;
  onImported?: () => void;
  onBind?: (line: UnmappedOrderLine) => void;
  bindReloadKey?: number;
  variant?: "orders" | "exceptions";
}) {
  const isExceptionView = variant === "exceptions";
  const [orders, setOrders] = useState<StoreOrderSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, StoreOrderDetail>>({});
  const [loadingLines, setLoadingLines] = useState<Record<string, boolean>>({});
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [filterCounts, setFilterCounts] = useState<FilterCounts>({
    pendingShip: 0,
    shipped: 0,
    pendingLineCount: 0,
    pendingUniquePlatformSkuCount: 0,
  });
  const [forceShippingOrderId, setForceShippingOrderId] = useState<string | null>(null);
  const [filterInitialized, setFilterInitialized] = useState(isExceptionView);
  const [previewInternalProductId, setPreviewInternalProductId] = useState<string | null>(null);
  const userChangedFilterRef = useRef(false);
  const defaultFilterAppliedRef = useRef(false);

  useEffect(() => {
    userChangedFilterRef.current = false;
    defaultFilterAppliedRef.current = false;
    setQuickFilter("all");
    setFilterInitialized(isExceptionView);
  }, [store.id, isExceptionView]);

  const loadFilterCounts = useCallback(async () => {
    if (isExceptionView) {
      setFilterInitialized(true);
      return;
    }
    const storeId = store.id;
    try {
      const response = await fetch(`/api/orders/filter-counts?storeId=${storeId}`);
      const data = await readJsonResponse<FilterCounts & { error?: string }>(response);
      if (storeId !== store.id) return;
      if (!response.ok) {
        setFilterCounts({ pendingShip: 0, shipped: 0, pendingLineCount: 0, pendingUniquePlatformSkuCount: 0 });
        return;
      }
      const pendingShip = data?.pendingShip ?? 0;
      const shipped = data?.shipped ?? 0;
      const pendingLineCount = data?.pendingLineCount ?? 0;
      const pendingUniquePlatformSkuCount = data?.pendingUniquePlatformSkuCount ?? 0;
      setFilterCounts({ pendingShip, shipped, pendingLineCount, pendingUniquePlatformSkuCount });
      if (!defaultFilterAppliedRef.current && !userChangedFilterRef.current) {
        setQuickFilter(pendingShip > 0 ? "pending_ship" : "all");
        setPage(1);
        defaultFilterAppliedRef.current = true;
      }
    } catch {
      if (storeId !== store.id) return;
      setFilterCounts({ pendingShip: 0, shipped: 0, pendingLineCount: 0, pendingUniquePlatformSkuCount: 0 });
    } finally {
      if (storeId === store.id) {
        setFilterInitialized(true);
      }
    }
  }, [isExceptionView, store.id]);

  const filterSegmentOptions = useMemo(
    () => [
      { value: "all", label: "全部" },
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
        scope: isExceptionView ? "exception" : "normal",
      });
      if (query.trim()) params.set("q", query.trim());

      if (!isExceptionView) {
        if (quickFilter === "pending_ship") {
          params.set("statuses", "PENDING,READY");
        } else if (quickFilter === "shipped") {
          params.set("status", "SHIPPED");
        }
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
  }, [isExceptionView, store.id, page, pageSize, quickFilter, query]);

  useEffect(() => {
    void loadFilterCounts();
  }, [loadFilterCounts, reloadKey, bindReloadKey]);

  useEffect(() => {
    if (!filterInitialized) return;
    void loadOrders();
  }, [loadOrders, filterInitialized, reloadKey, bindReloadKey]);

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

  const handleForcePartialShip = useCallback(
    async (order: StoreOrderSummary) => {
      const detail = expandedDetails[order.id] ?? (await fetchOrderDetail(order.id));
      const unmappedCount = detail.lines.filter((line) => lineNeedsBinding(line)).length;
      const mappedCount = detail.lines.filter((line) => line.mappingStatus === "mapped").length;

      if (!unmappedCount || !mappedCount) return;

      Modal.confirm({
        title: "强制发货已绑定商品",
        content: (
          <p>
            订单 <strong>{order.orderNo}</strong> 含 {unmappedCount} 个待绑定商品、{mappedCount}{" "}
            个已绑定商品。确认后仅已绑定商品进入发货列表，待绑定商品将标记为「已排除」。
          </p>
        ),
        okText: "确认强制发货",
        cancelText: "取消",
        onOk: async () => {
          setForceShippingOrderId(order.id);
          try {
            const response = await fetch(`/api/orders/${order.id}/force-ship`, { method: "POST" });
            const data = await readJsonResponse<{ error?: string }>(response);
            if (!response.ok) throw new Error(data?.error ?? "操作失败");
            message.success("已强制发货已绑定商品，订单将进入发货列表");
            setExpandedDetails((current) => {
              const next = { ...current };
              delete next[order.id];
              return next;
            });
            setExpandedRowKeys((keys) => keys.filter((key) => key !== order.id));
            setReloadKey((value) => value + 1);
          } catch (error) {
            message.error(error instanceof Error ? error.message : "操作失败");
          } finally {
            setForceShippingOrderId(null);
          }
        },
      });
    },
    [expandedDetails, fetchOrderDetail],
  );

  const handleBindLine = useCallback(
    (order: StoreOrderSummary, line: StoreOrderLineDetail) => {
      onBind?.(lineToUnmappedOrderLine(line, order, store.name));
    },
    [onBind, store.name],
  );

  const handleOpenInternalProduct = useCallback((internalProductId: string) => {
    setPreviewInternalProductId(internalProductId);
  }, []);

  const tableColumns = useMemo(() => {
    const baseColumns = [
      {
        title: "GSP 订单",
        dataIndex: "orderNo",
        width: 188,
        render: (value: string, record: StoreOrderSummary) => (
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            title={
              isExceptionView
                ? `共 ${record.lineCount} 件，已绑定 ${record.mappedLineCount}，待绑定 ${record.unmappedLineCount}`
                : `${record.lineCount} 个商品`
            }
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
      ...(isExceptionView
        ? [
            {
              title: "商品绑定",
              key: "lineBinding",
              width: 220,
              render: (_value: unknown, record: StoreOrderSummary) => (
                <OrderBindingSummary record={record} />
              ),
            },
          ]
        : []),
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
            display.label === "待绑定" && !isExpanded
              ? "展开订单查看全部商品，点击「待绑定」行进行补全"
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
    ];

    return baseColumns;
  }, [expandedRowKeys, isExceptionView]);

  return (
    <div className="store-orders-tab page-stack">
      {isExceptionView ? (
        <Alert
          showIcon
          style={{ marginBottom: 0 }}
          type="warning"
          title="异常订单"
          description="同一订单内只要存在未绑定商品，整单不会进入发货列表。展开订单可查看全部商品及绑定情况，逐行补全映射，或对含已绑定商品的订单执行「强制发货已绑定商品」。"
        />
      ) : (
        <>
          <OrderImportButton storeId={store.id} storeName={store.name} onImported={handleImported} />
          <Alert
            showIcon
            style={{ marginBottom: 0 }}
            type="info"
            title="订单分流说明"
            description="含未绑定内部商品的平台 SKU 时，整笔订单会进入「异常订单」，不会出现在下方待发货列表。请先在「绑定产品」补全映射，或于异常订单中逐行处理。"
          />
        </>
      )}

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
          {!isExceptionView ? (
            <Segmented
              options={filterSegmentOptions}
              value={quickFilter}
              onChange={(value) => {
                userChangedFilterRef.current = true;
                setQuickFilter(value as QuickFilter);
                setPage(1);
              }}
            />
          ) : null}
          {!isExceptionView &&
          quickFilter === "pending_ship" &&
          filterCounts.pendingLineCount > 0 ? (
            <span className="order-filter-summary">
              {filterCounts.pendingShip} 笔订单 · {filterCounts.pendingLineCount} 件商品
              {filterCounts.pendingUniquePlatformSkuCount < filterCounts.pendingLineCount
                ? ` · ${filterCounts.pendingUniquePlatformSkuCount} 个平台 SKU`
                : ""}
            </span>
          ) : null}
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
            expandedRowRender: (record) => {
              const detail = expandedDetails[record.id];
              const unmappedCount =
                detail?.lines.filter((line) => lineNeedsBinding(line)).length ?? 0;
              const mappedCount =
                detail?.lines.filter((line) => line.mappingStatus === "mapped").length ?? 0;
              const canForcePartialShip =
                isExceptionView && !loadingLines[record.id] && unmappedCount > 0 && mappedCount > 0;

              return (
                <div className="order-expanded-panel">
                  <OrderShippingAddressPanel
                    detail={detail ?? null}
                    loading={Boolean(loadingLines[record.id])}
                  />
                  {canForcePartialShip ? (
                    <div style={{ padding: "0 48px 12px" }}>
                      <Button
                        loading={forceShippingOrderId === record.id}
                        type="primary"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleForcePartialShip(record);
                        }}
                      >
                        强制发货已绑定商品（{mappedCount} 件）
                      </Button>
                    </div>
                  ) : null}
                  {detail?.lines?.length ? <OrderLinesSummary lines={detail.lines} /> : null}
                  <OrderLinesTable
                    lines={detail?.lines ?? null}
                    loading={Boolean(loadingLines[record.id])}
                    onBindLine={onBind ? (line) => handleBindLine(record, line) : undefined}
                    onOpenInternalProduct={handleOpenInternalProduct}
                  />
                </div>
              );
            },
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
                text={
                  isExceptionView
                    ? "暂无异常订单。含未绑定商品的整单会出现在此处，补全映射或强制发货已绑定商品后可进入发货列表。"
                    : "点击上方「导入订单」上传 SHEIN Excel，点击订单行展开查看商品明细。"
                }
                title={isExceptionView ? "暂无异常订单" : "暂无订单"}
              />
            ),
          }}
          columns={tableColumns}
        />
      </section>

      <InternalProductPreviewModal
        internalProductId={previewInternalProductId}
        open={Boolean(previewInternalProductId)}
        onClose={() => setPreviewInternalProductId(null)}
      />
    </div>
  );
}
