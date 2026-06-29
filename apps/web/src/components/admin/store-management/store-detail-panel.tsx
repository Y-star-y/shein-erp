"use client";

import type { OrderQuickFilter, StoreDetailTab, StoreRecord, UnmappedOrderLine } from "@shein-erp/shared";
import { readJsonResponse } from "@/lib/api-response";
import { Tabs, Tag } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StoreExceptionOrdersTab } from "./store-exception-orders-tab";
import { StoreInventoryTab } from "./store-inventory-tab";
import { StoreOrdersTab } from "./store-orders-tab";
import { StoreSettingsTab } from "./store-settings-tab";

type StoreTabCounts = {
  orders: number;
  binding: number;
  inventory: number;
  exceptions: number;
};

function TabLabelWithDot({ label, showDot }: { label: string; showDot: boolean }) {
  return (
    <span className="tab-indicator-segment">
      {label}
      {showDot ? <span className="tab-indicator-dot" aria-hidden /> : null}
    </span>
  );
}

function resolveTab(tab: StoreDetailTab): StoreDetailTab {
  if (tab === "shipping" || tab === "binding") return "orders";
  if (tab === "aftersales") return "exceptions";
  return tab;
}

export function StoreDetailPanel({
  store,
  onUpdated,
  onDeleted,
  onBind,
  onImported,
  bindReloadKey = 0,
  activeTab = "orders",
  ordersFilter = "all",
  onTabChange,
}: {
  store: StoreRecord;
  onUpdated: (store: StoreRecord) => void;
  onDeleted: () => void;
  onBind?: (line: UnmappedOrderLine) => void;
  onImported?: () => void;
  bindReloadKey?: number;
  activeTab?: StoreDetailTab;
  ordersFilter?: OrderQuickFilter;
  onTabChange?: (tab: string) => void;
}) {
  const resolvedTab = resolveTab(activeTab);
  const [tabCounts, setTabCounts] = useState<StoreTabCounts>({
    orders: 0,
    binding: 0,
    inventory: 0,
    exceptions: 0,
  });

  const loadTabCounts = useCallback(async () => {
    try {
      const response = await fetch(`/api/stores/${store.id}/tab-counts`);
      const data = await readJsonResponse<StoreTabCounts & { error?: string }>(response);
      if (!response.ok) return;
      setTabCounts({
        orders: data?.orders ?? 0,
        binding: data?.binding ?? 0,
        inventory: data?.inventory ?? 0,
        exceptions: data?.exceptions ?? 0,
      });
    } catch {
      setTabCounts({ orders: 0, binding: 0, inventory: 0, exceptions: 0 });
    }
  }, [store.id]);

  useEffect(() => {
    void loadTabCounts();
  }, [loadTabCounts, bindReloadKey]);

  const handleImported = useCallback(() => {
    void loadTabCounts();
    onImported?.();
  }, [loadTabCounts, onImported]);

  const tabItems = useMemo(
    () => [
      {
        key: "orders",
        label: (
          <TabLabelWithDot
            label="订单管理"
            showDot={tabCounts.orders > 0 || tabCounts.binding > 0}
          />
        ),
        children: (
          <StoreOrdersTab
            bindReloadKey={bindReloadKey}
            initialOrdersFilter={ordersFilter}
            store={store}
            onBind={onBind}
            onImported={handleImported}
          />
        ),
      },
      {
        key: "inventory",
        label: <TabLabelWithDot label="库存管理" showDot={tabCounts.inventory > 0} />,
        children: <StoreInventoryTab storeId={store.id} />,
      },
      {
        key: "exceptions",
        label: <TabLabelWithDot label="异常订单" showDot={tabCounts.exceptions > 0} />,
        children: <StoreExceptionOrdersTab storeId={store.id} />,
      },
      {
        key: "settings",
        label: "店铺设置",
        children: (
          <StoreSettingsTab store={store} onDeleted={onDeleted} onUpdated={onUpdated} />
        ),
      },
    ],
    [
      bindReloadKey,
      handleImported,
      onBind,
      onDeleted,
      onUpdated,
      ordersFilter,
      store,
      tabCounts.binding,
      tabCounts.exceptions,
      tabCounts.inventory,
      tabCounts.orders,
    ],
  );

  return (
    <div className="store-detail-panel">
      <div className="store-detail-meta">
        <Tag>{store.platform}</Tag>
        {store.active ? <Tag color="green">启用</Tag> : <Tag>已注销</Tag>}
        {store.ownerName ? <Tag>{store.ownerName}</Tag> : null}
      </div>

      <Tabs
        activeKey={resolvedTab}
        className="store-detail-tabs"
        items={tabItems}
        onChange={onTabChange}
      />
    </div>
  );
}
