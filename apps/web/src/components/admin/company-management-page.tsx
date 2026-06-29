"use client";

import { readJsonResponse } from "@/lib/api-response";
import { AppModal, Panel, useErpStore } from "@shein-erp/shared";
import { Button, Form, Input, Select, Table, Tag } from "antd";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AuditLogPanel } from "./audit-log-panel";

export type CompanyRecord = {
  id: string;
  name: string;
  active: boolean;
  userCount: number;
  createdAt: string;
  updatedAt: string;
};

type CompanyFormValues = {
  name: string;
  active: boolean;
};

type ModalState = {
  mode: "create" | "edit";
  company?: CompanyRecord;
  errors: Record<string, string>;
};

function CompanyFormModal({
  modal,
  onClose,
  onSubmit,
}: {
  modal: ModalState;
  onClose: () => void;
  onSubmit: (values: CompanyFormValues) => void | Promise<void>;
}) {
  const [form] = Form.useForm<CompanyFormValues>();

  return (
    <AppModal title={modal.mode === "create" ? "新增公司" : "编辑公司"} onClose={onClose}>
      <Form
        form={form}
        initialValues={{
          name: modal.company?.name ?? "",
          active: modal.company?.active ?? true,
        }}
        layout="vertical"
        requiredMark={false}
        onFinish={onSubmit}
      >
        {modal.errors.form ? <p className="form-error">{modal.errors.form}</p> : null}
        <Form.Item label="公司名称" name="name" rules={[{ required: true, message: "请输入公司名称" }]}>
          <Input placeholder="公司全称" />
        </Form.Item>
        {modal.mode === "edit" ? (
          <Form.Item label="状态" name="active">
            <Select
              options={[
                { value: true, label: "启用" },
                { value: false, label: "停用" },
              ]}
            />
          </Form.Item>
        ) : null}
      </Form>
      <div className="modal-actions" style={{ marginTop: 16 }}>
        <Button onClick={onClose}>取消</Button>
        <Button type="primary" onClick={() => form.submit()}>
          保存
        </Button>
      </div>
    </AppModal>
  );
}

export function CompanyManagementPage() {
  const { pushToast } = useErpStore();
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);
  const [modal, setModal] = useState<ModalState | null>(null);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/companies");
      const data = await readJsonResponse<{ companies?: CompanyRecord[]; error?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.error ?? "加载公司列表失败");
      }
      setCompanies(data?.companies ?? []);
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "加载公司列表失败");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  async function saveCompany(values: CompanyFormValues) {
    if (!modal) return;

    const response = await fetch(
      modal.mode === "create" ? "/api/companies" : `/api/companies/${modal.company!.id}`,
      {
        method: modal.mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      },
    );

    const data = await readJsonResponse<{ error?: string }>(response);
    if (!response.ok) {
      setModal({ ...modal, errors: { form: data?.error ?? "保存失败" } });
      return;
    }

    pushToast("success", modal.mode === "create" ? "公司已创建" : "公司信息已更新");
    setModal(null);
    await loadCompanies();
    setAuditRefreshKey((key) => key + 1);
  }

  return (
    <div className="page-stack">
      <Panel
        title="公司列表"
        count={companies.length}
        action={
          <Button icon={<Plus size={16} />} type="primary" onClick={() => setModal({ mode: "create", errors: {} })}>
            新增公司
          </Button>
        }
      >
        <Table
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          dataSource={companies}
          columns={[
            { title: "公司名称", dataIndex: "name", key: "name" },
            {
              title: "状态",
              dataIndex: "active",
              key: "active",
              render: (active: boolean) => (active ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
            },
            {
              title: "员工数",
              dataIndex: "userCount",
              key: "userCount",
              width: 100,
            },
            {
              title: "操作",
              key: "actions",
              render: (_, company) => (
                <Button size="small" onClick={() => setModal({ mode: "edit", company, errors: {} })}>
                  编辑
                </Button>
              ),
            },
          ]}
        />
      </Panel>

      <AuditLogPanel refreshKey={auditRefreshKey} />

      {modal ? <CompanyFormModal modal={modal} onClose={() => setModal(null)} onSubmit={saveCompany} /> : null}
    </div>
  );
}
