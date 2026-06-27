"use client";

import { LoginPageShell } from "@/components/login-form";
import { Alert, Button, Form, Input, Typography } from "antd";
import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [devLink, setDevLink] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(values: { email: string }) {
    setLoading(true);
    setError("");
    setMessage("");
    setDevLink("");

    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: values.email.trim().toLowerCase() }),
    });

    const data = (await response.json()) as { error?: string; message?: string; devLink?: string };
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "请求失败");
      return;
    }

    setMessage(data.message ?? "若该邮箱已注册，请查收重置邮件（开发环境见服务端日志）");
    if (data.devLink) {
      setDevLink(data.devLink);
    }
  }

  return (
    <LoginPageShell>
      <div className="login-page">
        <div className="login-card">
          <div className="login-brand">
            <div>
              <strong>忘记密码</strong>
              <span>输入注册邮箱获取重置链接</span>
            </div>
          </div>
          <Form layout="vertical" requiredMark={false} onFinish={handleSubmit}>
            {error ? <Alert showIcon style={{ marginBottom: 16 }} type="error" title={error} /> : null}
            {message ? (
              <Alert
                showIcon
                style={{ marginBottom: 16 }}
                type="success"
                title={message}
                description={
                  devLink ? (
                    <Typography.Link href={devLink} target="_blank" rel="noopener noreferrer">
                      {devLink}
                    </Typography.Link>
                  ) : undefined
                }
              />
            ) : null}
            <Form.Item
              label="邮箱"
              name="email"
              rules={[
                { required: true, message: "请输入邮箱" },
                { type: "email", message: "请输入有效邮箱" },
              ]}
            >
              <Input autoComplete="email" placeholder="name@company.com" size="large" />
            </Form.Item>
            <Form.Item style={{ marginBottom: 8 }}>
              <Button block htmlType="submit" loading={loading} size="large" type="primary">
                发送重置链接
              </Button>
            </Form.Item>
            <Link href="/login">返回登录</Link>
          </Form>
        </div>
      </div>
    </LoginPageShell>
  );
}
