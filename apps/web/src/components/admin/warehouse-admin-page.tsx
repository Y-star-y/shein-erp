"use client";

import { readJsonResponse } from "@/lib/api-response";
import { AppModal, Panel, useErpStore } from "@shein-erp/shared";
import { Button, Form, Input, Select, Table, Tag } from "antd";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AuditLogPanel } from "./audit-log-panel";

export type WarehouseRecord = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  stockCount: number;
  createdAt: string;
  updatedAt: string;
};

type WarehouseFormValues = {
  name: string;
  active: boolean;
};

type ModalState = {
  mode: "create" | "edit";
  warehouse?: WarehouseRecord;
  errors: Record<string, string>;
};

function WarehouseFormModal({
  modal,
  onClose,
  onSubmit,
}: {
  modal: ModalState;
  onClose: () => void;
  onSubmit: (values: WarehouseFormValues) => void | Promise<void>;
}) {
  const [form] = Form.useForm<WarehouseFormValues>();

  return (
    <AppModal title={modal.mode === "create" ? "新增仓库" : "编辑仓库"} onClose={onClose}>
      <Form
        form={form}
        initialValues={{
          name: modal.warehouse?.name ?? "",
          active: modal.warehouse?.active ?? true,
        }}
        layout="vertical"
        requiredMark={false}
        onFinish={onSubmit}
      >
        {modal.errors.form ? <p className="form-error">{modal.errors.form}</p> : null}
        <Form.Item label="仓库名称" name="name" rules={[{ required: true, message: "请输入仓库名称" }]}>
          <Input placeholder="仓库名称" />
        </Form.Item>
        {modal.mode === "edit" ? (
          <Form.Item label="状态" name="active">
            <Select
              options={[
                { value: true, label: "启用" },
                { value: false, label: "停用" },
              ]}
            />
          </Form.Item>
        ) : null}
      </Form>
      <div className="modal-actions" style={{ marginTop: 16 }}>
        <Button onClick={onClose}>取消</Button>
        <Button type="primary" onClick={() => form.submit()}>
          保存
        </Button>
      </div>
    </AppModal>
  );
}

export function WarehouseAdminPage() {
  const { pushToast } = useErpStore();
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);
  const [modal, setModal] = useState<ModalState | null>(null);

  const loadWarehouses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/warehouses");
      const data = await readJsonResponse<{ warehouses?: WarehouseRecord[]; error?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.error ?? "加载仓库列表失败");
      }
      setWarehouses(data?.warehouses ?? []);
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "加载仓库列表失败");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void loadWarehouses();
  }, [loadWarehouses]);

  async function saveWarehouse(values: WarehouseFormValues) {
    if (!modal) return;

    const response = await fetch(
      modal.mode === "create" ? "/api/warehouses" : `/api/warehouses/${modal.warehouse!.id}`,
      {
        method: modal.mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      },
    );

    const data = await readJsonResponse<{ error?: string }>(response);
    if (!response.ok) {
      setModal({ ...modal, errors: { form: data?.error ?? "保存失败" } });
      return;
    }

    pushToast("success", modal.mode === "create" ? "仓库已创建" : "仓库信息已更新");
    setModal(null);
    await loadWarehouses();
    setAuditRefreshKey((key) => key + 1);
  }

  return (
    <div className="page-stack">
      <Panel
        title="仓库列表"
        count={warehouses.length}
        action={
          <Button icon={<Plus size={16} />} type="primary" onClick={() => setModal({ mode: "create", errors: {} })}>
            新增仓库
          </Button>
        }
      >
        <Table
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          dataSource={warehouses}
          columns={[
            { title: "仓库名称", dataIndex: "name", key: "name" },
            {
              title: "状态",
              dataIndex: "active",
              key: "active",
              render: (active: boolean) => (active ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
            },
            {
              title: "库存 SKU 数",
              dataIndex: "stockCount",
              key: "stockCount",
              width: 120,
            },
            {
              title: "操作",
              key: "actions",
              render: (_, warehouse) => (
                <Button size="small" onClick={() => setModal({ mode: "edit", warehouse, errors: {} })}>
                  编辑
                </Button>
              ),
            },
          ]}
        />
      </Panel>

      <AuditLogPanel refreshKey={auditRefreshKey} />

      {modal ? <WarehouseFormModal modal={modal} onClose={() => setModal(null)} onSubmit={saveWarehouse} /> : null}
    </div>
  );
}
