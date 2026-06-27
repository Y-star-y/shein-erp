"use client";

import { Alert, Button, Card, Empty, Form, Input, Modal, Select, Space, Tag } from "antd";
import { AlertCircle, Check, Package } from "lucide-react";
import { type FormEvent, type ReactNode } from "react";
import type { ConfirmState, SelectOption, Toast } from "./types";

export function PageHeader({ action, description, title }: { action: ReactNode; description: string; title: string }) {
  return (
    <Card className="page-header" variant="borderless">
      <div>
        <span className="eyebrow">商品资料管理</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </Card>
  );
}

export function Panel({ action, children, count, title }: { action?: ReactNode; children: ReactNode; count?: number; title: string }) {
  return (
    <Card
      className="panel"
      title={
        <div>
          <h3>{title}</h3>
          {typeof count === "number" && <span>{count} 条</span>}
        </div>
      }
      extra={action}
    >
      {children}
    </Card>
  );
}

export function FormSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="form-section">
      <h4>{title}</h4>
      <div className="form-grid">{children}</div>
    </section>
  );
}

export function TextField({
  error,
  label,
  multiline,
  onChange,
  readOnly,
  required,
  value,
}: {
  error?: string;
  label: string;
  multiline?: boolean;
  onChange: (value: string) => void;
  readOnly?: boolean;
  required?: boolean;
  value: string;
}) {
  return (
    <Form.Item
      className="form-item"
      help={error}
      label={label}
      required={required}
      validateStatus={error ? "error" : undefined}
    >
      {multiline ? (
        <Input.TextArea
          autoSize={{ minRows: 3, maxRows: 6 }}
          readOnly={readOnly}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input readOnly={readOnly} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </Form.Item>
  );
}

export function AppSelect({
  error,
  label,
  onChange,
  options,
  placeholder = "请选择",
  value,
  width,
}: {
  error?: string;
  label?: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  value: string;
  width?: number;
}) {
  return (
    <Form.Item
      className="form-item"
      help={error}
      label={label}
      validateStatus={error ? "error" : undefined}
      style={width ? { width, marginBottom: 0 } : undefined}
    >
      <Select
        optionLabelProp="label"
        options={options.map((option) => ({
          disabled: option.disabled,
          label: option.label,
          value: option.value,
          title: option.description,
        }))}
        placeholder={placeholder}
        value={value || undefined}
        onChange={onChange}
      />
    </Form.Item>
  );
}

export function AppModal({ children, onClose, title }: { children: ReactNode; onClose: () => void; title: string }) {
  return (
    <Modal className="app-modal" footer={null} open title={title} width={840} onCancel={onClose}>
      {children}
    </Modal>
  );
}

export function ConfirmModal({ confirm, onCancel }: { confirm: ConfirmState; onCancel: () => void }) {
  if (!confirm) return null;

  return (
    <Modal
      centered
      okButtonProps={{ danger: confirm.tone === "danger" }}
      okText={confirm.confirmText}
      open
      title={confirm.title}
      onCancel={onCancel}
      onOk={confirm.onConfirm}
    >
      <Space align="start">
        <AlertCircle size={22} />
        <p className="confirm-copy">{confirm.description}</p>
      </Space>
    </Modal>
  );
}

export function ToastHost({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toast-host">
      {toasts.map((toast) => (
        <Alert
          className="toast"
          icon={toast.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
          key={toast.id}
          showIcon
          title={toast.message}
          type={toast.type === "error" ? "error" : toast.type === "success" ? "success" : "info"}
        />
      ))}
    </div>
  );
}

const tagColor = {
  success: "success",
  warning: "warning",
  danger: "error",
  neutral: "default",
} as const;

export function StatusTag({ tone, value }: { tone: "success" | "warning" | "danger" | "neutral"; value: string }) {
  return <Tag color={tagColor[tone]}>{value}</Tag>;
}

export function EmptyTableRow({ colSpan, text, title }: { colSpan: number; text: string; title: string }) {
  return (
    <tr>
      <td className="empty-table-cell" colSpan={colSpan}>
        <EmptyBlock icon={<Package size={22} />} text={text} title={title} />
      </td>
    </tr>
  );
}

export function EmptyBlock({ icon, text, title }: { icon: ReactNode; text: string; title: string }) {
  return (
    <Empty
      className="empty-block"
      description={
        <span>
          <strong>{title}</strong>
          <em>{text}</em>
        </span>
      }
      image={icon}
      styles={{ image: { height: 28 } }}
    />
  );
}

export { Button };
export type { FormEvent };
