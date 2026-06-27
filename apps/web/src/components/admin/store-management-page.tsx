"use client";

import { readJsonResponse } from "@/lib/api-response";
import { AppModal, ConfirmModal, Panel, useErpStore } from "@shein-erp/shared";
import { Button, Collapse, Form, Input, Space, Spin, Switch, Table, Tag } from "antd";
import { Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";

type StoreRecord = {
  id: string;
  name: string;
  platform: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
};

type StoreFormValues = {
  name: string;
  platform: string;
  active: boolean;
};

type OwnerStoreGroup = {
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  stores: StoreRecord[];
};

function buildStoreColumns(
  form: ReturnType<typeof Form.useForm<StoreFormValues>>[0],
  onEdit: (store: StoreRecord) => void,
  onDelete: (store: StoreRecord) => void,
) {
  return [
    { title: "店铺名称", dataIndex: "name", key: "name" },
    { title: "平台", dataIndex: "platform", key: "platform" },
    {
      title: "状态",
      dataIndex: "active",
      key: "active",
      render: (active: boolean) => (active ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
    },
    {
      title: "操作",
      key: "actions",
      render: (_: unknown, store: StoreRecord) => (
        <Space>
          <Button
            size="small"
            onClick={() => {
              onEdit(store);
              form.setFieldsValue({
                name: store.name,
                platform: store.platform,
                active: store.active,
              });
            }}
          >
            编辑
          </Button>
          <Button danger size="small" onClick={() => onDelete(store)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];
}

export function StoreManagementPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const { pushToast } = useErpStore();
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | { mode: "create" | "edit"; store?: StoreRecord; error?: string }>(null);
  const [confirm, setConfirm] = useState<StoreRecord | null>(null);
  const [form] = Form.useForm<StoreFormValues>();

  const loadStores = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/stores");
      const data = await readJsonResponse<{ stores?: StoreRecord[]; error?: string }>(response);
      if (!response.ok) throw new Error(data?.error ?? "加载店铺失败");
      setStores(data?.stores ?? []);
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "加载店铺失败");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void loadStores();
  }, [loadStores]);

  async function saveStore(values: StoreFormValues) {
    if (!modal) return;
    const response = await fetch(modal.mode === "create" ? "/api/stores" : `/api/stores/${modal.store!.id}`, {
      method: modal.mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await readJsonResponse<{ error?: string }>(response);
    if (!response.ok) {
      setModal({ ...modal, error: data?.error ?? "保存失败" });
      return;
    }
    pushToast("success", modal.mode === "create" ? "店铺已创建" : "店铺已更新");
    setModal(null);
    await loadStores();
  }

  async function deleteStore(store: StoreRecord) {
    const response = await fetch(`/api/stores/${store.id}`, { method: "DELETE" });
    const data = await readJsonResponse<{ error?: string }>(response);
    if (!response.ok) {
      pushToast("error", data?.error ?? "删除失败");
      return;
    }
    pushToast("success", "店铺已删除");
    setConfirm(null);
    await loadStores();
  }

  const openEditModal = useCallback((store: StoreRecord) => {
    setModal({ mode: "edit", store });
  }, []);

  const openDeleteConfirm = useCallback((store: StoreRecord) => {
    setConfirm(store);
  }, []);

  const storeColumns = useMemo(
    () => buildStoreColumns(form, openEditModal, openDeleteConfirm),
    [form, openEditModal, openDeleteConfirm],
  );

  const ownerGroups = useMemo<OwnerStoreGroup[]>(() => {
    const grouped = new Map<string, OwnerStoreGroup>();

    for (const store of stores) {
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
        stores: [...group.stores].sort((a, b) => a.name.localeCompare(b.name, "zh-CN")),
      }))
      .sort((a, b) => a.ownerName.localeCompare(b.ownerName, "zh-CN"));
  }, [stores]);

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
          <Table
            rowKey="id"
            dataSource={group.stores}
            pagination={false}
            size="small"
            columns={storeColumns}
          />
        ),
      })),
    [ownerGroups, storeColumns],
  );

  return (
    <div className="page-stack">
      <Panel
        title={isAdmin ? "全部店铺" : "我的店铺"}
        count={stores.length}
        action={
          <Button icon={<Plus size={16} />} type="primary" onClick={() => setModal({ mode: "create" })}>
            新增店铺
          </Button>
        }
      >
        {isAdmin ? (
          <Spin spinning={loading}>
            {ownerGroups.length ? (
              <Collapse
                className="store-owner-collapse"
                items={collapseItems}
                bordered={false}
                expandIconPosition="start"
              />
            ) : (
              <p className="empty-hint">{loading ? "加载中…" : "暂无店铺"}</p>
            )}
          </Spin>
        ) : (
          <Table
            loading={loading}
            rowKey="id"
            dataSource={stores}
            pagination={{ pageSize: 10 }}
            columns={storeColumns}
          />
        )}
      </Panel>

      {modal ? (
        <AppModal title={modal.mode === "create" ? "新增店铺" : "编辑店铺"} onClose={() => setModal(null)}>
          {modal.error ? <p className="form-error">{modal.error}</p> : null}
          <Form
            form={form}
            initialValues={{ name: "", platform: "SHEIN", active: true }}
            layout="vertical"
            onFinish={saveStore}
          >
            <Form.Item label="店铺名称" name="name" rules={[{ required: true, message: "请输入店铺名称" }]}>
              <Input placeholder="如：SHEIN-旗舰店" />
            </Form.Item>
            <Form.Item label="平台" name="platform">
              <Input placeholder="SHEIN" />
            </Form.Item>
            <Form.Item label="启用" name="active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Form>
          <div className="modal-actions" style={{ marginTop: 16 }}>
            <Button onClick={() => setModal(null)}>取消</Button>
            <Button type="primary" onClick={() => form.submit()}>
              保存
            </Button>
          </div>
        </AppModal>
      ) : null}

      <ConfirmModal
        confirm={
          confirm
            ? {
                title: "删除店铺",
                description: `确定删除店铺「${confirm.name}」？`,
                confirmText: "删除",
                tone: "danger",
                onConfirm: () => void deleteStore(confirm),
              }
            : null
        }
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
