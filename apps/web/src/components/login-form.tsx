"use client";

import { Alert, Button, Form, Input, Space } from "antd";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type LoginValues = {
  email: string;
  password: string;
  captchaCode?: string;
};

const wecomEnabled = process.env.NEXT_PUBLIC_WEWORK_ENABLED === "true";

function formatLockTime(iso: string) {
  return new Date(iso).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const [form] = Form.useForm<LoginValues>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [requiresCaptcha, setRequiresCaptcha] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [captchaId, setCaptchaId] = useState("");
  const [captchaSvg, setCaptchaSvg] = useState("");

  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const resetSuccess = searchParams.get("reset") === "1";
  const disabledLogout = searchParams.get("reason") === "disabled";

  const loadCaptcha = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/captcha");
      const data = (await response.json()) as { captchaId?: string; svg?: string };
      if (response.ok && data.captchaId && data.svg) {
        setCaptchaId(data.captchaId);
        setCaptchaSvg(data.svg);
        form.setFieldValue("captchaCode", "");
      }
    } catch {
      setError("验证码加载失败");
    }
  }, [form]);

  const refreshLoginStatus = useCallback(
    async (email?: string) => {
      const query = email ? `?email=${encodeURIComponent(email)}` : "";
      try {
        const response = await fetch(`/api/auth/login-status${query}`);
        const data = (await response.json()) as {
          requiresCaptcha?: boolean;
          locked?: boolean;
          lockedUntil?: string | null;
        };
        setRequiresCaptcha(Boolean(data.requiresCaptcha));
        setLocked(Boolean(data.locked));
        setLockedUntil(data.lockedUntil ?? null);
        if (data.requiresCaptcha && !captchaId) {
          await loadCaptcha();
        }
      } catch {
        // ignore precheck errors
      }
    },
    [captchaId, loadCaptcha],
  );

  useEffect(() => {
    void refreshLoginStatus();
  }, [refreshLoginStatus]);

  useEffect(() => {
    if (requiresCaptcha && !captchaSvg) {
      void loadCaptcha();
    }
  }, [requiresCaptcha, captchaSvg, loadCaptcha]);

  async function handleSubmit(values: LoginValues) {
    if (locked) return;

    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: values.email.trim().toLowerCase(),
        password: values.password,
        captchaId: requiresCaptcha ? captchaId : undefined,
        captchaCode: requiresCaptcha ? values.captchaCode : undefined,
      }),
    });

    const data = (await response.json()) as {
      error?: string;
      code?: string;
      requiresCaptcha?: boolean;
      lockedUntil?: string | null;
    };

    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "登录失败");
      setRequiresCaptcha(Boolean(data.requiresCaptcha));
      if (data.code === "LOCKED") {
        setLocked(true);
        setLockedUntil(data.lockedUntil ?? null);
      } else {
        setLocked(false);
        setLockedUntil(null);
      }
      if (data.requiresCaptcha) {
        await loadCaptcha();
      }
      return;
    }

    window.location.assign(callbackUrl);
  }

  async function handleWeComLogin() {
    setLoading(true);
    const { signIn } = await import("next-auth/react");
    await signIn("wecom", { callbackUrl });
  }

  return (
    <Form form={form} layout="vertical" requiredMark={false} onFinish={handleSubmit}>
      {resetSuccess ? (
        <Alert showIcon style={{ marginBottom: 16 }} type="success" title="密码已重置，请使用新密码登录" />
      ) : null}
      {disabledLogout ? (
        <Alert showIcon style={{ marginBottom: 16 }} type="warning" title="账户已禁用或会话已失效，请联系管理员" />
      ) : null}
      {locked ? (
        <Alert
          showIcon
          style={{ marginBottom: 16 }}
          type="warning"
          title={
            lockedUntil
              ? `账户已锁定，请于 ${formatLockTime(lockedUntil)} 后再试或联系管理员`
              : "账户已锁定，请联系管理员"
          }
        />
      ) : null}
      {error ? <Alert showIcon style={{ marginBottom: 16 }} type="error" title={error} /> : null}
      <Form.Item
        label="邮箱"
        name="email"
        rules={[
          { required: true, message: "请输入邮箱" },
          { type: "email", message: "请输入有效邮箱" },
        ]}
      >
        <Input
          autoComplete="email"
          disabled={locked}
          placeholder="admin@example.com"
          size="large"
          onBlur={(e) => void refreshLoginStatus(e.target.value.trim().toLowerCase())}
        />
      </Form.Item>
      <Form.Item label="密码" name="password" rules={[{ required: true, message: "请输入密码" }]}>
        <Input.Password autoComplete="current-password" disabled={locked} placeholder="请输入密码" size="large" />
      </Form.Item>
      {requiresCaptcha ? (
        <>
          <Form.Item label="验证码">
            <Space align="start">
              <div
                dangerouslySetInnerHTML={{ __html: captchaSvg }}
                style={{ border: "1px solid #d9d9d9", borderRadius: 8, lineHeight: 0 }}
              />
              <Button disabled={locked} onClick={() => void loadCaptcha()}>
                换一张
              </Button>
            </Space>
          </Form.Item>
          <Form.Item
            name="captchaCode"
            rules={[{ required: true, message: "请输入验证码" }]}
          >
            <Input disabled={locked} placeholder="请输入上图验证码" size="large" />
          </Form.Item>
        </>
      ) : null}
      <Form.Item style={{ marginBottom: 8 }}>
        <Button block disabled={locked} htmlType="submit" loading={loading} size="large" type="primary">
          登录
        </Button>
      </Form.Item>
      {wecomEnabled ? (
        <Form.Item style={{ marginBottom: 8 }}>
          <Button block disabled={locked} loading={loading} size="large" onClick={() => void handleWeComLogin()}>
            企业微信登录
          </Button>
        </Form.Item>
      ) : null}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <Link href="/forgot-password">忘记密码？</Link>
      </div>
    </Form>
  );
}

export function LoginPageShell({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
