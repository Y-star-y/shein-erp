"use client";

import { readJsonResponse } from "@/lib/api-response";
import { AppModal, Panel, useErpStore } from "@shein-erp/shared";
import { Button, Descriptions, Form, Input, Space, Spin } from "antd";
import { Eye, EyeOff } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

type ProfileData = {
  name: string;
  email: string;
  genderLabel: string | null;
  phone: string | null;
  idNumberMasked: string | null;
  idNumber: string | null;
};

type ContactField = "email" | "phone";

function validateContactField(field: ContactField, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return field === "email" ? "请输入邮箱" : "请输入手机号码";
  }
  if (field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "请输入有效邮箱";
  }
  if (field === "phone" && !/^1\d{10}$/.test(trimmed)) {
    return "请输入有效的手机号码";
  }
  return null;
}

function InlineContactField({
  field,
  value,
  isEditing,
  saving,
  onStartEdit,
  onSave,
  onCancelEdit,
}: {
  field: ContactField;
  value: string | null | undefined;
  isEditing: boolean;
  saving: boolean;
  onStartEdit: () => void;
  onSave: (value: string) => void;
  onCancelEdit: () => void;
}) {
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (isEditing) {
      setDraft(value ?? "");
    }
  }, [isEditing, value]);

  if (isEditing) {
    return (
      <div className="profile-editable-value profile-editable-value--editing">
        <Input
          autoFocus
          className="profile-editable-input"
          placeholder={field === "email" ? "name@company.com" : "11 位手机号"}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              onCancelEdit();
            }
            if (event.key === "Enter") {
              onSave(field === "email" ? draft.trim().toLowerCase() : draft.trim());
            }
          }}
        />
        <button
          type="button"
          className="profile-edit-link profile-edit-link--visible"
          disabled={saving}
          onClick={() => onSave(field === "email" ? draft.trim().toLowerCase() : draft.trim())}
        >
          {saving ? "保存中…" : "保存"}
        </button>
        <button
          type="button"
          className="profile-edit-link profile-edit-link--visible profile-edit-link--muted"
          disabled={saving}
          onClick={onCancelEdit}
        >
          取消
        </button>
      </div>
    );
  }

  return (
    <div className="profile-editable-value">
      <span className="profile-editable-value__text">{value?.trim() || "—"}</span>
      <button type="button" className="profile-edit-link" onClick={onStartEdit}>
        编辑
      </button>
    </div>
  );
}

export function ProfilePage() {
  const { data: session, update } = useSession();
  const { pushToast } = useErpStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingField, setSavingField] = useState<ContactField | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const [revealLoading, setRevealLoading] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactField | null>(null);
  const [passwordForm] = Form.useForm<{ currentPassword: string; newPassword: string; confirmPassword: string }>();
  const [revealForm] = Form.useForm<{ password: string }>();

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/me/profile");
      const data = await readJsonResponse<{ profile?: ProfileData; error?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.error ?? "加载个人信息失败");
      }
      setProfile(data?.profile ?? null);
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "加载个人信息失败");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile, session?.user?.idNumberRevealed]);

  async function saveContactField(field: ContactField, rawValue: string) {
    const validationError = validateContactField(field, rawValue);
    if (validationError) {
      pushToast("error", validationError);
      return;
    }

    const payload = field === "email" ? { email: rawValue } : { phone: rawValue };

    setSavingField(field);
    try {
      const response = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readJsonResponse<{ profile?: ProfileData; error?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.error ?? "保存失败");
      }

      const updated = data?.profile ?? null;
      if (field === "email" && updated?.email) {
        await update({ email: updated.email });
      }
      setProfile(updated);
      setEditingContact(null);

      pushToast("success", field === "email" ? "邮箱已更新，下次登录请使用新邮箱" : "手机号已更新");
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "保存失败");
    } finally {
      setSavingField(null);
    }
  }

  async function savePassword(values: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    if (values.newPassword !== values.confirmPassword) {
      pushToast("error", "两次输入的新密码不一致");
      return;
    }

    setPasswordSaving(true);
    try {
      const response = await fetch("/api/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });
      const data = await readJsonResponse<{ error?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.error ?? "修改密码失败");
      }
      passwordForm.resetFields();
      pushToast("success", "密码已更新，下次登录请使用新密码");
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "修改密码失败");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function revealIdNumber(values: { password: string }) {
    setRevealLoading(true);
    try {
      const response = await fetch("/api/me/reveal-id-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: values.password }),
      });
      const data = await readJsonResponse<{ ok?: boolean; error?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.error ?? "验证失败");
      }
      await update({ idNumberRevealed: true });
      setRevealOpen(false);
      revealForm.resetFields();
      pushToast("success", "证件号码已展示");
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "验证失败");
    } finally {
      setRevealLoading(false);
    }
  }

  async function hideIdNumber() {
    await update({ idNumberRevealed: false });
    setProfile((current) => (current ? { ...current, idNumber: null } : current));
    pushToast("success", "证件号码已隐藏，再次查看需验证密码");
  }

  const idNumberRevealed = Boolean(session?.user?.idNumberRevealed);
  const idNumberDisplay = profile?.idNumber ?? profile?.idNumberMasked;

  return (
    <div className="page-stack">
      <Panel title="基本信息">
        <Spin spinning={loading}>
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="姓名">{profile?.name ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="性别">{profile?.genderLabel ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="邮箱">
              <InlineContactField
                field="email"
                value={profile?.email}
                isEditing={editingContact === "email"}
                saving={savingField === "email"}
                onCancelEdit={() => setEditingContact(null)}
                onSave={(next) => void saveContactField("email", next)}
                onStartEdit={() => setEditingContact("email")}
              />
            </Descriptions.Item>
            <Descriptions.Item label="手机">
              <InlineContactField
                field="phone"
                value={profile?.phone}
                isEditing={editingContact === "phone"}
                saving={savingField === "phone"}
                onCancelEdit={() => setEditingContact(null)}
                onSave={(next) => void saveContactField("phone", next)}
                onStartEdit={() => setEditingContact("phone")}
              />
            </Descriptions.Item>
            <Descriptions.Item label="证件号码">
              {profile?.idNumberMasked ? (
                <Space wrap>
                  <span className="profile-id-number">{idNumberDisplay}</span>
                  {idNumberRevealed ? (
                    <Button icon={<EyeOff size={14} />} size="small" type="link" onClick={() => void hideIdNumber()}>
                      隐藏
                    </Button>
                  ) : (
                    <Button icon={<Eye size={14} />} size="small" type="link" onClick={() => setRevealOpen(true)}>
                      查看完整号码
                    </Button>
                  )}
                </Space>
              ) : (
                "—"
              )}
            </Descriptions.Item>
          </Descriptions>
        </Spin>
      </Panel>

      <Panel title="修改密码">
        <Form form={passwordForm} layout="vertical" onFinish={savePassword} style={{ maxWidth: 360 }}>
          <Form.Item
            label="原密码"
            name="currentPassword"
            rules={[{ required: true, message: "请输入原密码" }]}
          >
            <Input.Password placeholder="当前登录密码" />
          </Form.Item>
          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[
              { required: true, message: "请输入新密码" },
              { min: 8, message: "密码至少 8 位" },
            ]}
          >
            <Input.Password placeholder="至少 8 位" />
          </Form.Item>
          <Form.Item
            label="确认新密码"
            name="confirmPassword"
            rules={[{ required: true, message: "请再次输入新密码" }]}
          >
            <Input.Password placeholder="再次输入新密码" />
          </Form.Item>
          <Form.Item>
            <Button htmlType="submit" loading={passwordSaving} type="primary">
              更新密码
            </Button>
          </Form.Item>
        </Form>
      </Panel>

      {revealOpen ? (
        <AppModal title="验证身份" onClose={() => setRevealOpen(false)}>
          <p style={{ marginBottom: 16, color: "var(--text-secondary, #666)" }}>
            请输入登录密码以查看完整证件号码。可随时点击「隐藏」；再次查看需重新验证密码。
          </p>
          <Form form={revealForm} layout="vertical" onFinish={revealIdNumber}>
            <Form.Item
              label="登录密码"
              name="password"
              rules={[{ required: true, message: "请输入登录密码" }]}
            >
              <Input.Password placeholder="当前登录密码" />
            </Form.Item>
          </Form>
          <div className="modal-actions" style={{ marginTop: 16 }}>
            <Button onClick={() => setRevealOpen(false)}>取消</Button>
            <Button loading={revealLoading} type="primary" onClick={() => revealForm.submit()}>
              确认
            </Button>
          </div>
        </AppModal>
      ) : null}
    </div>
  );
}
