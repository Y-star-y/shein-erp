"use client";

import { readJsonResponse } from "@/lib/api-response";
import { AppModal } from "@shein-erp/shared";
import { Button, Input } from "antd";
import { useEffect, useState } from "react";

export function StoreDeactivateModal({
  open,
  storeId,
  storeName,
  onClose,
  onSuccess,
}: {
  open: boolean;
  storeId: string;
  storeName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setPassword("");
      setError("");
    }
  }, [open, storeId]);

  async function submit() {
    if (!password.trim()) {
      setError("请输入登录密码");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/stores/${storeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false, password: password.trim() }),
      });
      const data = await readJsonResponse<{ error?: string }>(response);
      if (!response.ok) {
        setError(data?.error ?? "注销失败");
        return;
      }
      onSuccess();
      onClose();
    } catch {
      setError("注销失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <AppModal title="注销店铺" onClose={onClose}>
      <p style={{ marginBottom: 16 }}>
        确定注销店铺「{storeName}」？注销后店铺将停用，可稍后重新启用。请输入登录密码验证身份。
      </p>
      <Input.Password
        autoComplete="current-password"
        placeholder="登录密码"
        status={error && !password.trim() ? "error" : undefined}
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          setError("");
        }}
        onPressEnter={() => void submit()}
      />
      {error ? <p className="form-error">{error}</p> : null}
      <div className="modal-actions" style={{ marginTop: 16 }}>
        <Button onClick={onClose}>取消</Button>
        <Button danger loading={loading} type="primary" onClick={() => void submit()}>
          确认注销
        </Button>
      </div>
    </AppModal>
  );
}
