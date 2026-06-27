"use client";

import { readJsonResponse } from "@/lib/api-response";
import { GENDER_LABELS, MODULE_LABELS, ROLE_LABELS } from "@/lib/permissions";
import { AppModal, ConfirmModal, Panel, useErpStore } from "@shein-erp/shared";
import { Button, Form, Space, Table, Tag } from "antd";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AuditLogPanel } from "./audit-log-panel";
import { UserForm, type UserFormValues, type UserRecord } from "./user-form";

type ModalState = {
  mode: "create" | "edit";
  user?: UserRecord;
  errors: Record<string, string>;
};

function UserFormModal({
  modal,
  onClose,
  onSubmit,
}: {
  modal: ModalState;
  onClose: () => void;
  onSubmit: (values: UserFormValues) => void | Promise<void>;
}) {
  const [form] = Form.useForm<UserFormValues>();

  return (
    <AppModal title={modal.mode === "create" ? "新增员工" : "编辑员工"} onClose={onClose}>
      <UserForm form={form} mode={modal.mode} initial={modal.user} errors={modal.errors} onSubmit={onSubmit} />
      <div className="modal-actions" style={{ marginTop: 16 }}>
        <Button onClick={onClose}>取消</Button>
        <Button type="primary" onClick={() => form.submit()}>
          保存
        </Button>
      </div>
    </AppModal>
  );
}

export function UserManagementPage() {
  const { pushToast } = useErpStore();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [confirm, setConfirm] = useState<{ user: UserRecord } | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/users");
      const data = await readJsonResponse<{ users?: UserRecord[]; error?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.error ?? "加载员工列表失败");
      }
      setUsers(data?.users ?? []);
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "加载员工列表失败");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function refreshAuditLogs() {
    setAuditRefreshKey((key) => key + 1);
  }

  async function saveUser(values: UserFormValues) {
    if (!modal) return;

    const payload =
      modal.mode === "create"
        ? values
        : {
            name: values.name,
            gender: values.gender ?? null,
            idNumber: values.idNumber,
            phone: values.phone,
            role: values.role,
            permissions: values.permissions,
            active: values.active,
            ...(values.password ? { password: values.password } : {}),
          };

    const response = await fetch(modal.mode === "create" ? "/api/users" : `/api/users/${modal.user!.id}`, {
      method: modal.mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await readJsonResponse<{ error?: string }>(response);
    if (!response.ok) {
      setModal({ ...modal, errors: { form: data?.error ?? "保存失败" } });
      return;
    }

    pushToast("success", modal.mode === "create" ? "员工账户已创建" : "员工信息已更新");
    setModal(null);
    await loadUsers();
    refreshAuditLogs();
  }

  async function deleteUser(user: UserRecord) {
    const response = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    const data = await readJsonResponse<{ error?: string }>(response);
    if (!response.ok) {
      pushToast("error", data?.error ?? "删除失败");
      return;
    }
    pushToast("success", "员工账户已删除");
    setConfirm(null);
    await loadUsers();
    refreshAuditLogs();
  }

  async function unlockLogin(user: UserRecord) {
    const response = await fetch(`/api/users/${user.id}/unlock-login`, { method: "POST" });
    const data = await readJsonResponse<{ error?: string }>(response);
    if (!response.ok) {
      pushToast("error", data?.error ?? "解除锁定失败");
      return;
    }
    pushToast("success", "登录锁定已解除");
    await loadUsers();
    refreshAuditLogs();
  }

  function renderLoginStatus(user: UserRecord) {
    if (user.loginLocked && user.lockedUntil) {
      const time = new Date(user.lockedUntil).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return <Tag color="red">已锁定(至 {time})</Tag>;
    }
    if (user.failedLoginAttempts > 0) {
      return <Tag color="orange">需验证码({user.failedLoginAttempts}/3)</Tag>;
    }
    return <Tag color="green">正常</Tag>;
  }

  return (
    <div className="page-stack">
      <Panel
        title="员工账户"
        count={users.length}
        action={
          <Button icon={<Plus size={16} />} type="primary" onClick={() => setModal({ mode: "create", errors: {} })}>
            新增员工
          </Button>
        }
      >
        <Table
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          dataSource={users}
          columns={[
            { title: "姓名", dataIndex: "name", key: "name" },
            {
              title: "性别",
              dataIndex: "gender",
              key: "gender",
              render: (gender: UserRecord["gender"]) => (gender ? GENDER_LABELS[gender] : "—"),
            },
            {
              title: "证件号码",
              dataIndex: "idNumber",
              key: "idNumber",
              render: (value: string | null) => value ?? "—",
            },
            {
              title: "手机",
              dataIndex: "phone",
              key: "phone",
              render: (value: string | null) => value ?? "—",
            },
            { title: "邮箱", dataIndex: "email", key: "email" },
            {
              title: "部门",
              dataIndex: "role",
              key: "role",
              render: (role: UserRecord["role"]) => ROLE_LABELS[role] ?? role,
            },
            {
              title: "模块权限",
              dataIndex: "permissions",
              key: "permissions",
              render: (permissions: UserRecord["permissions"]) => (
                <Space wrap size={[4, 4]}>
                  {permissions.map((module) => (
                    <Tag key={module}>{MODULE_LABELS[module] ?? module}</Tag>
                  ))}
                </Space>
              ),
            },
            {
              title: "状态",
              dataIndex: "active",
              key: "active",
              render: (active: boolean) => (active ? <Tag color="green">启用</Tag> : <Tag>禁用</Tag>),
            },
            {
              title: "登录状态",
              key: "loginStatus",
              render: (_, user) => renderLoginStatus(user),
            },
            {
              title: "操作",
              key: "actions",
              render: (_, user) => (
                <Space>
                  <Button size="small" onClick={() => setModal({ mode: "edit", user, errors: {} })}>
                    编辑
                  </Button>
                  {user.failedLoginAttempts > 0 || user.loginLocked ? (
                    <Button size="small" onClick={() => void unlockLogin(user)}>
                      解除锁定
                    </Button>
                  ) : null}
                  <Button danger size="small" onClick={() => setConfirm({ user })}>
                    删除
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Panel>

      <AuditLogPanel refreshKey={auditRefreshKey} />

      {modal ? <UserFormModal modal={modal} onClose={() => setModal(null)} onSubmit={saveUser} /> : null}

      <ConfirmModal
        confirm={
          confirm
            ? {
                title: "删除员工账户",
                description: `确定删除 ${confirm.user.name}（${confirm.user.email}）？此操作不可恢复。`,
                confirmText: "删除",
                tone: "danger",
                onConfirm: () => void deleteUser(confirm.user),
              }
            : null
        }
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
