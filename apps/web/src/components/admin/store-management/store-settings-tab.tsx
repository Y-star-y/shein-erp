"use client";

import { readJsonResponse } from "@/lib/api-response";
import { ConfirmModal, useErpStore } from "@shein-erp/shared";
import type { StoreRecord } from "@shein-erp/shared";
import { Alert, Button, Form, Input, Space, Switch } from "antd";
import { useEffect, useState } from "react";
import { StoreDeactivateModal } from "./store-deactivate-modal";
import type { StoreFormValues } from "./types";

export function StoreSettingsTab({
  store,
  onUpdated,
  onDeleted,
}: {
  store: StoreRecord;
  onUpdated: (store: StoreRecord) => void;
  onDeleted: () => void;
}) {
  const { pushToast } = useErpStore();
  const [form] = Form.useForm<StoreFormValues>();
  const [saving, setSaving] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    form.setFieldsValue({
      name: store.name,
      platform: store.platform,
      active: store.active,
    });
  }, [store, form]);

  async function saveSettings(values: StoreFormValues) {
    if (values.active === false && store.active) {
      pushToast("error", "请使用「注销店铺」按钮并验证登录密码");
      form.setFieldValue("active", true);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/stores/${store.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await readJsonResponse<StoreRecord & { error?: string }>(response);
      if (!response.ok) {
        pushToast("error", data?.error ?? "保存失败");
        return;
      }
      pushToast("success", "店铺已更新");
      onUpdated(data as StoreRecord);
    } catch {
      pushToast("error", "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivateSuccess() {
    const response = await fetch("/api/stores");
    const data = await readJsonResponse<{ stores?: StoreRecord[] }>(response);
    const updated = data?.stores?.find((item) => item.id === store.id);
    if (updated) {
      onUpdated(updated);
    }
    pushToast("success", "店铺已注销");
  }

  async function reactivateStore() {
    const response = await fetch(`/api/stores/${store.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: true }),
    });
    const data = await readJsonResponse<StoreRecord & { error?: string }>(response);
    if (!response.ok) {
      pushToast("error", data?.error ?? "启用失败");
      return;
    }
    pushToast("success", "店铺已重新启用");
    onUpdated(data as StoreRecord);
  }

  async function deleteStore() {
    const response = await fetch(`/api/stores/${store.id}`, { method: "DELETE" });
    const data = await readJsonResponse<{ error?: string }>(response);
    if (!response.ok) {
      pushToast("error", data?.error ?? "删除失败");
      return;
    }
    pushToast("success", "店铺已永久删除");
    setConfirmDelete(false);
    onDeleted();
  }

  return (
    <div className="store-settings-tab">
      {!store.active ? (
        <Alert
          showIcon
          style={{ marginBottom: 16 }}
          type="warning"
          title="该店铺已注销"
          action={
            <Button size="small" type="primary" onClick={() => void reactivateStore()}>
              重新启用
            </Button>
          }
        />
      ) : null}

      <Form form={form} layout="vertical" onFinish={saveSettings}>
        <Form.Item label="店铺名称" name="name" rules={[{ required: true, message: "请输入店铺名称" }]}>
          <Input placeholder="如：SHEIN-旗舰店" />
        </Form.Item>
        <Form.Item label="平台" name="platform">
          <Input placeholder="SHEIN" />
        </Form.Item>
        <Form.Item label="启用" name="active" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Space>
          <Button htmlType="submit" loading={saving} type="primary">
            保存设置
          </Button>
          {store.active ? (
            <Button danger onClick={() => setDeactivateOpen(true)}>
              注销店铺
            </Button>
          ) : null}
        </Space>
      </Form>

      <div className="store-settings-danger">
        <h4>危险操作</h4>
        <p className="empty-hint">永久删除仅在该店铺无 SHEIN 映射时可用。</p>
        <Button danger type="text" onClick={() => setConfirmDelete(true)}>
          永久删除店铺
        </Button>
      </div>

      <StoreDeactivateModal
        open={deactivateOpen}
        storeId={store.id}
        storeName={store.name}
        onClose={() => setDeactivateOpen(false)}
        onSuccess={() => void handleDeactivateSuccess()}
      />

      <ConfirmModal
        confirm={
          confirmDelete
            ? {
                title: "永久删除店铺",
                description: `确定永久删除店铺「${store.name}」？此操作不可恢复。`,
                confirmText: "删除",
                tone: "danger",
                onConfirm: () => void deleteStore(),
              }
            : null
        }
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
