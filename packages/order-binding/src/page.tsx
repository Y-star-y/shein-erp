"use client";

import { Alert } from "antd";
import { UnmappedTab } from "./unmapped-tab";

export function OrderBindingPage({
  onBind,
  unmappedReloadKey = 0,
}: {
  onBind: (group: import("@shein-erp/shared").UnmappedOrderLine) => void;
  unmappedReloadKey?: number;
}) {
  return (
    <div className="page-stack">
      <Alert
        showIcon
        style={{ marginBottom: 0 }}
        type="info"
        title="订单导入已移至店铺管理"
        description="请进入「店铺管理 → 选择店铺 → 订单 → 导入订单」。本页展示所有店铺的待绑定商品汇总。"
      />
      <UnmappedTab reloadKey={unmappedReloadKey} onBind={onBind} />
    </div>
  );
}
