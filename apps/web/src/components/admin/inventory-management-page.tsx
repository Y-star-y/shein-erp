"use client";

import { InventoryOverviewTab } from "@/components/admin/inventory-overview-tab";
import { InventoryPurchaseOrdersTab } from "@/components/admin/inventory-purchase-orders-tab";
import { Tabs, Typography } from "antd";
import { useState } from "react";

export function InventoryManagementPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [purchaseRefreshKey, setPurchaseRefreshKey] = useState(0);

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 16 }}>
        库存管理
      </Typography.Title>
      <Tabs
        className="inventory-management-tabs"
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "overview",
            label: "库存管理",
            children: (
              <InventoryOverviewTab
                onPurchaseSubmitted={() => {
                  setPurchaseRefreshKey((key) => key + 1);
                  setActiveTab("orders");
                }}
              />
            ),
          },
          {
            key: "orders",
            label: "采购订单",
            children: <InventoryPurchaseOrdersTab refreshKey={purchaseRefreshKey} />,
          },
        ]}
      />
    </div>
  );
}
