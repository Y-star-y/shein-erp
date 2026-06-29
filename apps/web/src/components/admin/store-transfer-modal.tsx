"use client";

import { readJsonResponse } from "@/lib/api-response";
import { AppModal, useErpStore } from "@shein-erp/shared";
import { Alert, Button, Form, List, Select, Spin } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { UserRecord } from "./user-form";

type StoreOption = {
  id: string;
  name: string;
  platform: string;
  active: boolean;
  mappingCount: number;
};

type TransferFormValues = {
  targetUserId: string;
};

export function StoreTransferModal({
  user,
  users,
  onClose,
  onSuccess,
}: {
  user: UserRecord;
  users: UserRecord[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { pushToast } = useErpStore();
  const [form] = Form.useForm<TransferFormValues>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stores, setStores] = useState<StoreOption[]>([]);

  const targetOptions = useMemo(
    () =>
      users
        .filter((candidate) => candidate.id !== user.id && candidate.active)
        .map((candidate) => ({
          value: candidate.id,
          label: `${candidate.name}（${candidate.email}）`,
          disabled: !candidate.idNumber,
        })),
    [user.id, users],
  );

  const loadStores = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/users/${user.id}/stores`);
      const data = await readJsonResponse<{ stores?: StoreOption[]; error?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.error ?? "加载店铺失败");
      }
      setStores(data?.stores ?? []);
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "加载店铺失败");
    } finally {
      setLoading(false);
    }
  }, [pushToast, user.id]);

  useEffect(() => {
    void loadStores();
  }, [loadStores]);

  useEffect(() => {
    form.setFieldsValue({ targetUserId: undefined });
  }, [form]);

  async function handleSubmit(values: TransferFormValues) {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/users/${user.id}/transfer-stores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: values.targetUserId,
        }),
      });

      const data = await readJsonResponse<{
        error?: string;
        storeCount?: number;
        productCount?: number;
      }>(response);

      if (!response.ok) {
        throw new Error(data?.error ?? "过户失败");
      }

      pushToast(
        "success",
        `已过户 ${data?.storeCount ?? 0} 个店铺，更新 ${data?.productCount ?? 0} 个商品证件号`,
      );
      onSuccess();
      onClose();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "过户失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppModal title={`账号过户 — ${user.name}`} onClose={onClose}>
      <Spin spinning={loading}>
        <Alert
          showIcon
          style={{ marginBottom: 16 }}
          type="info"
          message={`整账号过户：将该员工全部 ${stores.length} 个店铺及关联内部商品一并转给接收员工；商品 attributes「证件号」将同步为接收员工证件号。`}
        />

        {!loading && stores.length === 0 ? (
          <Alert showIcon type="warning" message="该员工名下暂无店铺可过户" />
        ) : (
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              label="接收员工"
              name="targetUserId"
              rules={[{ required: true, message: "请选择接收员工" }]}
            >
              <Select
                placeholder="选择接收账号的员工"
                options={targetOptions}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>

            {stores.length > 0 ? (
              <Form.Item label={`将过户的店铺（${stores.length} 个）`}>
                <List
                  bordered
                  dataSource={stores}
                  renderItem={(store) => (
                    <List.Item>
                      {store.name}（{store.platform}，映射 {store.mappingCount}）
                    </List.Item>
                  )}
                  size="small"
                  style={{ maxHeight: 200, overflow: "auto" }}
                />
              </Form.Item>
            ) : null}

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <Button onClick={onClose}>取消</Button>
              <Button
                disabled={stores.length === 0}
                htmlType="submit"
                loading={submitting}
                type="primary"
              >
                确认整账号过户
              </Button>
            </div>
          </Form>
        )}
      </Spin>
    </AppModal>
  );
}
