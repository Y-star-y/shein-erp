"use client";

import { Alert, Button, Form, Input } from "antd";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { useSessionGuard } from "@/hooks/use-session-guard";

export function ChangePasswordRequiredForm() {
  const { update } = useSession();
  useSessionGuard();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(values: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/change-password-required", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    const data = (await response.json()) as { error?: string };
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "修改失败");
      return;
    }

    try {
      await update({ mustChangePassword: false });
    } catch {
      setError("密码已更新，但会话刷新失败，请重新登录");
      return;
    }

    window.location.assign("/");
  }

  return (
    <Form layout="vertical" requiredMark={false} onFinish={handleSubmit}>
      {error ? <Alert showIcon style={{ marginBottom: 16 }} type="error" title={error} /> : null}
      <Alert
        showIcon
        style={{ marginBottom: 16 }}
        type="warning"
        title="首次登录或管理员重置密码后，请先修改密码再继续使用系统。"
      />
      <Form.Item
        label="当前密码"
        name="currentPassword"
        rules={[{ required: true, message: "请输入当前密码" }]}
      >
        <Input.Password autoComplete="current-password" size="large" />
      </Form.Item>
      <Form.Item
        label="新密码"
        name="newPassword"
        rules={[
          { required: true, message: "请输入新密码" },
          { min: 8, message: "密码至少 8 位" },
        ]}
      >
        <Input.Password autoComplete="new-password" size="large" />
      </Form.Item>
      <Form.Item
        label="确认新密码"
        name="confirmPassword"
        rules={[{ required: true, message: "请再次输入新密码" }]}
      >
        <Input.Password autoComplete="new-password" size="large" />
      </Form.Item>
      <Form.Item style={{ marginBottom: 0 }}>
        <Button block htmlType="submit" loading={loading} size="large" type="primary">
          更新密码并继续
        </Button>
      </Form.Item>
      <Button
        block
        style={{ marginTop: 12 }}
        type="link"
        onClick={() => void signOut({ callbackUrl: "/login" })}
      >
        退出登录
      </Button>
    </Form>
  );
}
