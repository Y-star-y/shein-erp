"use client";

import { readJsonResponse } from "@/lib/api-response";
import type { InventoryInboundType } from "@/lib/inventory-inbound";
import { AppModal } from "@shein-erp/shared";
import type { InternalProductInventoryRow, InternalProductWarehouseStock } from "@shein-erp/shared";
import { Button, Form, InputNumber, Typography } from "antd";
import { useState } from "react";

const INBOUND_TITLES: Record<InventoryInboundType, string> = {
  purchase: "采购入库",
  borrow: "借货入库",
};

export type InventoryInboundModalState = {
  inboundType: InventoryInboundType;
  product: InternalProductInventoryRow;
  warehouse: InternalProductWarehouseStock;
};

export function InventoryInboundModal({
  modal,
  onClose,
  onSuccess,
}: {
  modal: InventoryInboundModalState;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form] = Form.useForm<{ quantity: number }>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: { quantity: number }) {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/inventory/inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          internalProductId: modal.product.internalProductId,
          warehouseId: modal.warehouse.warehouseId,
          sellerSku: modal.product.sellerSku,
          inboundType: modal.inboundType,
          quantity: values.quantity,
        }),
      });
      const data = await readJsonResponse<{ error?: string }>(response);
      if (!response.ok) {
        setError(data?.error ?? "入库失败");
        return;
      }
      onSuccess();
      onClose();
    } catch {
      setError("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppModal title={INBOUND_TITLES[modal.inboundType]} onClose={onClose}>
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        {modal.product.productName} · {modal.warehouse.warehouseName}
      </Typography.Paragraph>
      {error ? <p className="form-error">{error}</p> : null}
      <Form form={form} layout="vertical" requiredMark={false} onFinish={handleSubmit}>
        <Form.Item
          label="入库数量"
          name="quantity"
          rules={[{ required: true, message: "请输入入库数量" }]}
        >
          <InputNumber min={1} precision={0} style={{ width: "100%" }} placeholder="数量" />
        </Form.Item>
      </Form>
      <div className="modal-actions" style={{ marginTop: 16 }}>
        <Button onClick={onClose}>取消</Button>
        <Button type="primary" loading={submitting} onClick={() => form.submit()}>
          确认入库
        </Button>
      </div>
    </AppModal>
  );
}
