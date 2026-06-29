"use client";

import { EmptyBlock } from "@shein-erp/shared";
import { Alert } from "antd";
import { AlertTriangle } from "lucide-react";

export function StoreExceptionOrdersTab({ storeId }: { storeId: string }) {
  void storeId;

  return (
    <div className="store-exception-orders-tab">
      <Alert
        showIcon
        style={{ marginBottom: 16 }}
        type="info"
        title="功能筹备中"
        description="异常订单识别与处理功能筹备中，后续将支持发货异常、售后异常等场景。"
      />
      <EmptyBlock
        icon={<AlertTriangle size={22} />}
        text="预留接口：GET /api/stores/{id}/exception-orders"
        title="暂无异常订单"
      />
    </div>
  );
}
