"use client";

import { EmptyBlock, includesQuery, PageHeader, type UnmappedOrderLine } from "@shein-erp/shared";
import { Button, Input, Table, Tag } from "antd";
import { Link2, Search, Tag as TagIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

function formatOrderDateTime(value: string | null | undefined) {
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

export function UnmappedTab({
  onBind,
  reloadKey = 0,
}: {
  onBind: (group: UnmappedOrderLine) => void;
  reloadKey?: number;
}) {
  const [items, setItems] = useState<UnmappedOrderLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/orders/unmapped");
      if (!response.ok) {
        throw new Error("加载失败");
      }
      const body = (await response.json()) as UnmappedOrderLine[];
      setItems(body);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems, reloadKey]);

  const filteredItems = useMemo(() => {
    return items.filter((item) =>
      includesQuery(
        [item.orderNo, item.sellerSku, item.sheinProductName, item.storeName],
        query,
      ),
    );
  }, [items, query]);

  const columns = useMemo(
    () => [
      {
        title: "GSP 订单",
        dataIndex: "orderNo",
        width: 160,
        render: (value: string) => <strong>{value || "—"}</strong>,
      },
      {
        title: "订单时间",
        dataIndex: "orderCreatedAt",
        width: 168,
        render: (value: string | null) => formatOrderDateTime(value),
      },
      {
        title: "要求签收时间",
        dataIndex: "shipBy",
        width: 168,
        render: (value: string | null) => formatOrderDateTime(value),
      },
      { title: "卖家 SKU", dataIndex: "sellerSku", width: 140, render: (value: string) => value || "—" },
      { title: "SHEIN 商品名", dataIndex: "sheinProductName", ellipsis: true },
      { title: "店铺", dataIndex: "storeName", width: 120, render: (value: string) => value || "—" },
      {
        title: "操作",
        key: "actions",
        width: 100,
        fixed: "right" as const,
        render: (_: unknown, item: UnmappedOrderLine) => (
          <Button icon={<Link2 size={14} />} size="small" type="link" onClick={() => onBind(item)}>
            绑定商品
          </Button>
        ),
      },
    ],
    [onBind],
  );

  return (
    <div className="page-stack">
      <PageHeader
        action={
          <Button onClick={() => void loadItems()} loading={loading}>
            刷新
          </Button>
        }
        description="以下商品来自订单导入且尚未绑定内部商品，按订单明细展示。"
        title="待绑定商品"
      />

      <section className="table-panel">
        <div className="table-toolbar">
          <Input
            className="table-search"
            prefix={<Search size={15} />}
            placeholder="搜索 GSP 订单、卖家 SKU、商品名、店铺"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Tag className="count-pill">{filteredItems.length}/{items.length}</Tag>
        </div>
        <Table
          columns={columns}
          dataSource={filteredItems}
          loading={loading}
          locale={{
            emptyText: (
              <EmptyBlock
                icon={<TagIcon size={22} />}
                text="导入 SHEIN 订单后，未匹配的商品会出现在这里。"
                title="暂无待绑定商品"
              />
            ),
          }}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          rowKey="lineId"
          scroll={{ x: 1100 }}
          size="middle"
        />
      </section>
    </div>
  );
}
