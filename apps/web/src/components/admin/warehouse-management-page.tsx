"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Form, Input, InputNumber, Spin, Table, Tabs, message } from "antd";
import { Panel } from "@shein-erp/shared";

type MovementType = "inbound" | "outbound";

interface MovementRow {
  id: string;
  type: MovementType;
  sku: string;
  productName: string;
  quantity: number;
  warehouse: string;
  operator: string;
  createdAt: string;
  remark?: string;
}

export function WarehouseManagementPage() {
  const [inboundRows, setInboundRows] = useState<MovementRow[]>([]);
  const [outboundRows, setOutboundRows] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inForm] = Form.useForm();
  const [outForm] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inRes, outRes] = await Promise.all([
        fetch("/api/warehouse/movements?type=inbound"),
        fetch("/api/warehouse/movements?type=outbound"),
      ]);
      const inData = (await inRes.json()) as { rows?: MovementRow[] };
      const outData = (await outRes.json()) as { rows?: MovementRow[] };
      setInboundRows(inData.rows ?? []);
      setOutboundRows(outData.rows ?? []);
    } catch {
      message.error("加载流水失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submitMovement = async (type: MovementType, values: { sku: string; quantity: number; warehouse: string; remark?: string }) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/warehouse/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, ...values }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        message.error(data.error ?? "提交失败");
        return;
      }
      message.success(data.message ?? "已提交");
      if (type === "inbound") inForm.resetFields();
      else outForm.resetFields();
      await load();
    } catch {
      message.error("网络错误");
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { title: "SKU", dataIndex: "sku", width: 120 },
    { title: "商品", dataIndex: "productName" },
    { title: "数量", dataIndex: "quantity", width: 80, align: "right" as const },
    { title: "仓库", dataIndex: "warehouse", width: 100 },
    { title: "操作人", dataIndex: "operator", width: 100 },
    { title: "时间", dataIndex: "createdAt", width: 160 },
    { title: "备注", dataIndex: "remark" },
  ];

  return (
    <div className="page-stack">
      <Tabs
        items={[
          {
            key: "inbound",
            label: "入库管理",
            children: (
              <section className="dashboard-grid">
                <Panel title="登记入库">
                  <Form form={inForm} layout="vertical" onFinish={(v) => submitMovement("inbound", v)}>
                    <Form.Item name="sku" label="SKU" rules={[{ required: true, message: "请输入 SKU" }]}>
                      <Input placeholder="内部 SKU" />
                    </Form.Item>
                    <Form.Item name="quantity" label="数量" rules={[{ required: true, message: "请输入数量" }]}>
                      <InputNumber min={1} style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item name="warehouse" label="仓库" rules={[{ required: true, message: "请输入仓库" }]}>
                      <Input placeholder="如：深圳仓" />
                    </Form.Item>
                    <Form.Item name="remark" label="备注">
                      <Input.TextArea rows={2} />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={submitting}>
                      提交入库
                    </Button>
                  </Form>
                </Panel>
                <Panel title="入库流水">
                  <Spin spinning={loading}>
                    <Table
                      rowKey="id"
                      dataSource={inboundRows}
                      columns={columns}
                      pagination={{ pageSize: 10 }}
                      locale={{ emptyText: "暂无入库记录" }}
                      size="small"
                    />
                  </Spin>
                </Panel>
              </section>
            ),
          },
          {
            key: "outbound",
            label: "出库管理",
            children: (
              <section className="dashboard-grid">
                <Panel title="登记出库">
                  <Form form={outForm} layout="vertical" onFinish={(v) => submitMovement("outbound", v)}>
                    <Form.Item name="sku" label="SKU" rules={[{ required: true, message: "请输入 SKU" }]}>
                      <Input placeholder="内部 SKU" />
                    </Form.Item>
                    <Form.Item name="quantity" label="数量" rules={[{ required: true, message: "请输入数量" }]}>
                      <InputNumber min={1} style={{ width: "100%" }} />
                    </Form.Item>
                    <Form.Item name="warehouse" label="仓库" rules={[{ required: true, message: "请输入仓库" }]}>
                      <Input placeholder="如：深圳仓" />
                    </Form.Item>
                    <Form.Item name="remark" label="备注">
                      <Input.TextArea rows={2} />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={submitting}>
                      提交出库
                    </Button>
                  </Form>
                </Panel>
                <Panel title="出库流水">
                  <Spin spinning={loading}>
                    <Table
                      rowKey="id"
                      dataSource={outboundRows}
                      columns={columns}
                      pagination={{ pageSize: 10 }}
                      locale={{ emptyText: "暂无出库记录" }}
                      size="small"
                    />
                  </Spin>
                </Panel>
              </section>
            ),
          },
        ]}
      />
    </div>
  );
}
