"use client";

import type { StoreRecord } from "@shein-erp/shared";
import { Badge, Collapse, Input, Spin, Tag } from "antd";
import { Search, Store } from "lucide-react";
import { useMemo, useState } from "react";
import type { OwnerStoreGroup } from "./types";

function storeTaskCount(
  storeId: string,
  unmappedCounts: Record<string, number>,
  pendingShipCounts: Record<string, number>,
) {
  return (unmappedCounts[storeId] ?? 0) + (pendingShipCounts[storeId] ?? 0);
}

function sortStoresByTasks(
  stores: StoreRecord[],
  unmappedCounts: Record<string, number>,
  pendingShipCounts: Record<string, number>,
) {
  return [...stores].sort((a, b) => {
    const tasksA = storeTaskCount(a.id, unmappedCounts, pendingShipCounts);
    const tasksB = storeTaskCount(b.id, unmappedCounts, pendingShipCounts);
    const hasTasksA = tasksA > 0;
    const hasTasksB = tasksB > 0;
    if (hasTasksA !== hasTasksB) return hasTasksA ? -1 : 1;
    if (tasksB !== tasksA) return tasksB - tasksA;
    return a.name.localeCompare(b.name, "zh-CN");
  });
}

function StoreCard({
  store,
  unmappedCount,
  pendingShipCount,
  onOpen,
}: {
  store: StoreRecord;
  unmappedCount: number;
  pendingShipCount: number;
  onOpen: (store: StoreRecord) => void;
}) {
  return (
    <button
      type="button"
      className={`store-card${store.active ? "" : " is-inactive"}`}
      onClick={() => onOpen(store)}
    >
      <span className="store-card__icon">
        <Store size={20} />
      </span>
      <span className="store-card__name-row">
        <span className="store-card__name">{store.name}</span>
        <span className="store-card__badges">
          {unmappedCount > 0 ? (
            <Badge count={unmappedCount} size="small" title="异常订单（待绑定）" />
          ) : null}
          {pendingShipCount > 0 ? (
            <Badge count={pendingShipCount} size="small" color="orange" title="待发货" />
          ) : null}
        </span>
      </span>
      <span className="store-card__meta">
        <Tag>{store.platform}</Tag>
        {store.active ? <Tag color="green">启用</Tag> : <Tag>已注销</Tag>}
      </span>
      {store.ownerName ? <span className="store-card__owner">{store.ownerName}</span> : null}
    </button>
  );
}

function StoreCardGrid({
  stores,
  unmappedCounts,
  pendingShipCounts,
  onOpen,
}: {
  stores: StoreRecord[];
  unmappedCounts: Record<string, number>;
  pendingShipCounts: Record<string, number>;
  onOpen: (store: StoreRecord) => void;
}) {
  return (
    <div className="store-card-grid">
      {stores.map((store) => (
        <StoreCard
          key={store.id}
          pendingShipCount={pendingShipCounts[store.id] ?? 0}
          store={store}
          unmappedCount={unmappedCounts[store.id] ?? 0}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}

export function StoreListPanel({
  stores,
  loading,
  isAdmin,
  unmappedCounts,
  pendingShipCounts,
  onOpenStore,
}: {
  stores: StoreRecord[];
  loading: boolean;
  isAdmin: boolean;
  unmappedCounts: Record<string, number>;
  pendingShipCounts: Record<string, number>;
  onOpenStore: (store: StoreRecord) => void;
}) {
  const [query, setQuery] = useState("");

  const filteredStores = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter(
      (store) =>
        store.name.toLowerCase().includes(q) ||
        store.platform.toLowerCase().includes(q) ||
        store.ownerName?.toLowerCase().includes(q),
    );
  }, [stores, query]);

  const sortedStores = useMemo(
    () => sortStoresByTasks(filteredStores, unmappedCounts, pendingShipCounts),
    [filteredStores, pendingShipCounts, unmappedCounts],
  );

  const ownerGroups = useMemo<OwnerStoreGroup[]>(() => {
    const grouped = new Map<string, OwnerStoreGroup>();

    for (const store of sortedStores) {
      const ownerId = store.ownerId ?? "unknown";
      const existing = grouped.get(ownerId);
      if (existing) {
        existing.stores.push(store);
        continue;
      }
      grouped.set(ownerId, {
        ownerId,
        ownerName: store.ownerName ?? "未知员工",
        ownerEmail: store.ownerEmail ?? "",
        stores: [store],
      });
    }

    return Array.from(grouped.values())
      .map((group) => ({
        ...group,
        stores: sortStoresByTasks(group.stores, unmappedCounts, pendingShipCounts),
      }))
      .sort((a, b) => {
        const tasksA = a.stores.reduce(
          (sum, store) => sum + storeTaskCount(store.id, unmappedCounts, pendingShipCounts),
          0,
        );
        const tasksB = b.stores.reduce(
          (sum, store) => sum + storeTaskCount(store.id, unmappedCounts, pendingShipCounts),
          0,
        );
        const hasTasksA = tasksA > 0;
        const hasTasksB = tasksB > 0;
        if (hasTasksA !== hasTasksB) return hasTasksA ? -1 : 1;
        if (tasksB !== tasksA) return tasksB - tasksA;
        return a.ownerName.localeCompare(b.ownerName, "zh-CN");
      });
  }, [sortedStores, pendingShipCounts, unmappedCounts]);

  const collapseItems = useMemo(
    () =>
      ownerGroups.map((group) => ({
        key: group.ownerId,
        label: (
          <div className="store-owner-collapse-label">
            <span className="store-owner-name">{group.ownerName}</span>
            <span className="store-owner-email">{group.ownerEmail}</span>
            <Tag className="count-pill">{group.stores.length} 家店铺</Tag>
          </div>
        ),
        children: (
          <StoreCardGrid
            pendingShipCounts={pendingShipCounts}
            stores={group.stores}
            unmappedCounts={unmappedCounts}
            onOpen={onOpenStore}
          />
        ),
      })),
    [ownerGroups, onOpenStore, pendingShipCounts, unmappedCounts],
  );

  return (
    <section className="store-list-section">
      <Input
        allowClear
        className="store-list-search"
        placeholder="搜索店铺名称、平台或负责人"
        prefix={<Search size={15} />}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <Spin spinning={loading}>
        {filteredStores.length ? (
          isAdmin ? (
            <Collapse
              bordered={false}
              className="store-owner-collapse store-list-collapse"
              defaultActiveKey={ownerGroups.map((g) => g.ownerId)}
              expandIconPlacement="start"
              items={collapseItems}
            />
          ) : (
            <StoreCardGrid
              pendingShipCounts={pendingShipCounts}
              stores={sortedStores}
              unmappedCounts={unmappedCounts}
              onOpen={onOpenStore}
            />
          )
        ) : (
          <p className="empty-hint">{loading ? "加载中…" : "暂无店铺，请先注册店铺"}</p>
        )}
      </Spin>
    </section>
  );
}
