"use client";

import type { StoreDetailTab, StoreRecord, UnmappedOrderLine, UnmappedSkcGroup } from "@shein-erp/shared";
import { readJsonResponse } from "@/lib/api-response";
import { EmptyBlock } from "@shein-erp/shared";
import { Tabs, Tag } from "antd";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ClipboardList,
  Construction,
  History,
  Link2,
  Settings,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StoreExceptionOrdersTab } from "./store-exception-orders-tab";
import { StoreOrdersTab } from "./store-orders-tab";
import { StoreProductBindTab } from "./store-product-bind-tab";
import { StoreSettingsTab } from "./store-settings-tab";

type StoreTabCounts = {
  orders: number;
  binding: number;
  exceptions: number;
};

function TabLabel({
  icon: Icon,
  label,
  showDot = false,
}: {
  icon: LucideIcon;
  label: string;
  showDot?: boolean;
}) {
  return (
    <span className="tab-indicator-segment">
      <Icon size={15} aria-hidden />
      {label}
      {showDot ? <span className="tab-indicator-dot" aria-hidden /> : null}
    </span>
  );
}

function resolveTab(tab: StoreDetailTab): StoreDetailTab {
  if (tab === "shipping") return "orders";
  if (tab === "inventory") return "orders";
  if (tab === "aftersales") return "exceptions";
  return tab;
}

function toBindLine(group: UnmappedSkcGroup, storeName: string): UnmappedOrderLine {
  return {
    ...group,
    storeName: group.storeName || storeName,
    lineId: "",
    orderNo: group.sampleOrderNo,
    orderCreatedAt: null,
    shipBy: null,
    deliverBy: null,
  };
}

export function StoreDetailPanel({
  store,
  onUpdated,
  onDeleted,
  onBind,
  onImported,
  bindReloadKey = 0,
  activeTab = "orders",
  onTabChange,
}: {
  store: StoreRecord;
  onUpdated: (store: StoreRecord) => void;
  onDeleted: () => void;
  onBind?: (line: UnmappedOrderLine) => void;
  onImported?: () => void;
  bindReloadKey?: number;
  activeTab?: StoreDetailTab;
  onTabChange?: (tab: string) => void;
}) {
  const resolvedTab = resolveTab(activeTab);
  const [tabCounts, setTabCounts] = useState<StoreTabCounts>({
    orders: 0,
    binding: 0,
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
        exceptions: data?.exceptions ?? 0,
      });
    } catch {
      setTabCounts({ orders: 0, binding: 0, exceptions: 0 });
    }
  }, [store.id]);

  useEffect(() => {
    void loadTabCounts();
  }, [loadTabCounts, bindReloadKey]);

  const [importReloadKey, setImportReloadKey] = useState(0);

  const handleImported = useCallback(() => {
    void loadTabCounts();
    setImportReloadKey((value) => value + 1);
    onImported?.();
  }, [loadTabCounts, onImported]);

  const dataReloadKey = bindReloadKey + importReloadKey;

  const tabItems = useMemo(
    () => [
      {
        key: "orders",
        label: (
          <TabLabel icon={ClipboardList} label="订单管理" showDot={tabCounts.orders > 0} />
        ),
        children: (
          <StoreOrdersTab
            bindReloadKey={bindReloadKey}
            store={store}
            onBind={onBind}
            onImported={handleImported}
          />
        ),
      },
      {
        key: "binding",
        label: <TabLabel icon={Link2} label="绑定产品" showDot={tabCounts.binding > 0} />,
        children: (
          <StoreProductBindTab
            reloadKey={dataReloadKey}
            store={store}
            onBind={onBind ? (group) => onBind(toBindLine(group, store.name)) : undefined}
          />
        ),
      },
      {
        key: "exceptions",
        label: (
          <TabLabel icon={AlertTriangle} label="异常订单" showDot={tabCounts.exceptions > 0} />
        ),
        children: (
          <StoreExceptionOrdersTab
            bindReloadKey={dataReloadKey}
            store={store}
            onBind={onBind}
          />
        ),
      },
      {
        key: "finance",
        label: <TabLabel icon={Wallet} label="财务管理" />,
        children: (
          <EmptyBlock
            icon={<Construction size={22} />}
            title="功能开发中"
            text="财务管理功能即将上线。"
          />
        ),
      },
      {
        key: "history",
        label: <TabLabel icon={History} label="历史订单" />,
        children: (
          <EmptyBlock
            icon={<Construction size={22} />}
            title="功能开发中"
            text="历史订单功能即将上线。"
          />
        ),
      },
      {
        key: "settings",
        label: <TabLabel icon={Settings} label="店铺设置" />,
        children: (
          <StoreSettingsTab store={store} onDeleted={onDeleted} onUpdated={onUpdated} />
        ),
      },
    ],
    [
      dataReloadKey,
      handleImported,
      onBind,
      onDeleted,
      onUpdated,
      store,
      tabCounts.binding,
      tabCounts.exceptions,
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
