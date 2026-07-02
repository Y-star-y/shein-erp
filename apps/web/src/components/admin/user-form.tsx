"use client";

import { ASSIGNABLE_BY_ROLE, GENDER_LABELS, MODULE_LABELS, ROLE_DEFAULT_MODULES, ROLE_LABELS } from "@/lib/permissions";
import type { AppModule, Gender, Role } from "@prisma/client";
import { Checkbox, Form, Input, Select } from "antd";
import type { FormInstance } from "antd/es/form";

export type UserFormValues = {
  name: string;
  gender?: Gender | null;
  idNumber: string;
  phone: string;
  email: string;
  password: string;
  companyId: string;
  role: Exclude<Role, "ADMIN">;
  permissions: AppModule[];
  active: boolean;
};

export type CompanyOption = {
  id: string;
  name: string;
  active: boolean;
};

export type UserRecord = {
  id: string;
  name: string;
  gender: Gender | null;
  idNumber: string | null;
  phone: string | null;
  email: string;
  companyId: string | null;
  companyName: string | null;
  role: Role;
  permissions: AppModule[];
  active: boolean;
  failedLoginAttempts: number;
  loginFailureWindowStart: string | null;
  lockedUntil: string | null;
  loginLocked: boolean;
  createdAt: string;
  updatedAt: string;
};

type UserFormProps = {
  form: FormInstance<UserFormValues>;
  mode: "create" | "edit";
  initial?: UserRecord;
  companies: CompanyOption[];
  errors?: Record<string, string>;
  onSubmit: (values: UserFormValues) => void | Promise<void>;
};

const employeeRoleOptions = [
  { value: "OPERATIONS" as const, label: ROLE_LABELS.OPERATIONS },
  { value: "LOGISTICS" as const, label: ROLE_LABELS.LOGISTICS },
];

const genderOptions = [
  { value: "MALE" as const, label: GENDER_LABELS.MALE },
  { value: "FEMALE" as const, label: GENDER_LABELS.FEMALE },
];

export function UserForm({ form, mode, initial, companies, errors, onSubmit }: UserFormProps) {
  const role = Form.useWatch("role", form) ?? (initial?.role === "ADMIN" ? "OPERATIONS" : initial?.role ?? "OPERATIONS");
  const assignableModules = ASSIGNABLE_BY_ROLE[role as Exclude<Role, "ADMIN">] ?? [];
  const defaultRole = initial?.role === "ADMIN" ? "OPERATIONS" : (initial?.role ?? "OPERATIONS");
  const defaultPermissions =
    initial?.permissions.filter(
      (item) => item !== "userManagement" && item !== "companyManagement" && item !== "warehouseAdmin",
    ) ??
    ROLE_DEFAULT_MODULES[defaultRole as Exclude<Role, "ADMIN">];

  const activeCompanies = companies.filter((company) => company.active || company.id === initial?.companyId);
  const defaultCompanyId = initial?.companyId ?? activeCompanies[0]?.id;

  return (
    <Form
      form={form}
      initialValues={{
        name: initial?.name ?? "",
        gender: initial?.gender ?? undefined,
        idNumber: initial?.idNumber ?? "",
        phone: initial?.phone ?? "",
        email: initial?.email ?? "",
        password: "",
        companyId: defaultCompanyId,
        role: defaultRole as Exclude<Role, "ADMIN">,
        permissions: defaultPermissions,
        active: initial?.active ?? true,
      }}
      layout="vertical"
      requiredMark={false}
      onFinish={onSubmit}
    >
      {errors?.form ? <p className="form-error">{errors.form}</p> : null}
      <Form.Item label="姓名" name="name" rules={[{ required: true, message: "请输入姓名" }]}>
        <Input placeholder="员工姓名" />
      </Form.Item>
      <Form.Item label="性别" name="gender">
        <Select allowClear options={genderOptions} placeholder="请选择" />
      </Form.Item>
      <Form.Item
        label="证件号码"
        name="idNumber"
        rules={[
          {
            validator: (_, value: string) => {
              const trimmed = value?.trim();
              if (!trimmed) return Promise.resolve();
              if (!/^\d{15}$|^\d{17}[\dXx]$/.test(trimmed)) {
                return Promise.reject(new Error("请输入有效的身份证号码"));
              }
              return Promise.resolve();
            },
          },
        ]}
      >
        <Input placeholder="身份证号码" />
      </Form.Item>
      <Form.Item
        label="手机"
        name="phone"
        rules={[
          {
            validator: (_, value: string) => {
              const trimmed = value?.trim();
              if (!trimmed) return Promise.resolve();
              if (!/^1\d{10}$/.test(trimmed)) {
                return Promise.reject(new Error("请输入有效的手机号码"));
              }
              return Promise.resolve();
            },
          },
        ]}
      >
        <Input placeholder="11 位手机号" />
      </Form.Item>
      <Form.Item
        label="邮箱"
        name="email"
        rules={[
          { required: true, message: "请输入邮箱" },
          { type: "email", message: "请输入有效邮箱" },
        ]}
      >
        <Input disabled={mode === "edit"} placeholder="name@company.com" />
      </Form.Item>
      <Form.Item
        label={mode === "create" ? "初始密码" : "重置密码（留空则不修改）"}
        name="password"
        rules={mode === "create" ? [{ required: true, message: "请输入密码" }, { min: 8, message: "密码至少 8 位" }] : []}
      >
        <Input.Password placeholder={mode === "create" ? "至少 8 位" : "留空表示不修改"} />
      </Form.Item>
      <Form.Item label="部门" name="role" rules={[{ required: true, message: "请选择部门" }]}>
        <Select
          options={employeeRoleOptions}
          onChange={(nextRole: Exclude<Role, "ADMIN">) => {
            form.setFieldValue("permissions", ROLE_DEFAULT_MODULES[nextRole]);
          }}
        />
      </Form.Item>
      <Form.Item label="所属公司" name="companyId" rules={[{ required: true, message: "请选择所属公司" }]}>
        <Select
          options={activeCompanies.map((company) => ({
            value: company.id,
            label: company.active ? company.name : `${company.name}（已停用）`,
          }))}
          placeholder="请选择公司"
        />
      </Form.Item>
      <Form.Item
        label="可访问模块"
        name="permissions"
        rules={[{ required: true, message: "至少选择一个模块" }]}
      >
        <Checkbox.Group
          options={assignableModules.map((module) => ({
            label: MODULE_LABELS[module],
            value: module,
          }))}
        />
      </Form.Item>
      {mode === "edit" ? (
        <Form.Item label="账户状态" name="active">
          <Select
            options={[
              { value: true, label: "启用" },
              { value: false, label: "禁用" },
            ]}
          />
        </Form.Item>
      ) : null}
    </Form>
  );
}
