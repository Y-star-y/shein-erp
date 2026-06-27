"use client";

import { LoginPageShell } from "@/components/login-form";
import { Alert, Button, Form, Input } from "antd";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(values: { password: string; confirmPassword: string }) {
    if (!token) {
      setError("无效的重置链接");
      return;
    }

    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        password: values.password,
        confirmPassword: values.confirmPassword,
      }),
    });

    const data = (await response.json()) as { error?: string };
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "重置失败");
      return;
    }

    router.push("/login?reset=1");
  }

  if (!token) {
    return (
      <LoginPageShell>
        <div className="login-page">
          <div className="login-card">
            <Alert showIcon type="error" title="无效的重置链接" />
            <Link href="/forgot-password">重新申请重置</Link>
          </div>
        </div>
      </LoginPageShell>
    );
  }

  return (
    <LoginPageShell>
      <div className="login-page">
        <div className="login-card">
          <div className="login-brand">
            <div>
              <strong>重置密码</strong>
              <span>设置新密码</span>
            </div>
          </div>
          <Form layout="vertical" requiredMark={false} onFinish={handleSubmit}>
            {error ? <Alert showIcon style={{ marginBottom: 16 }} type="error" title={error} /> : null}
            <Form.Item
              label="新密码"
              name="password"
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
                确认重置
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </LoginPageShell>
  );
}
