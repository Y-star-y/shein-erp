"use client";

import { Alert, Button, Card, Empty, Form, Input, Modal, Select, Space, Tag } from "antd";
import { AlertCircle, Check, Package } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { ModalNoticeProvider, useModalNotice } from "./modal-notice";
import { useErpStore } from "./store";
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

export function FormSection({
  children,
  layout = "grid",
  title,
}: {
  children: ReactNode;
  layout?: "grid" | "stack";
  title: string;
}) {
  return (
    <section className="form-section">
      <h4>{title}</h4>
      <div className={layout === "stack" ? "form-stack" : "form-grid"}>{children}</div>
    </section>
  );
}

export function CopyableCodeText({
  className,
  emptyText = "—",
  stopPropagation = false,
  value,
}: {
  className?: string;
  emptyText?: string;
  stopPropagation?: boolean;
  value: string;
}) {
  const [feedback, setFeedback] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const timerRef = useRef<number | null>(null);
  const trimmed = value.trim();

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  function showFeedback(text: string, tone: "success" | "error") {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    setFeedback({ text, tone });
    timerRef.current = window.setTimeout(() => {
      setFeedback(null);
      timerRef.current = null;
    }, 2800);
  }

  async function copyCode(event: React.MouseEvent<HTMLButtonElement>) {
    if (stopPropagation) {
      event.stopPropagation();
    }
    if (!trimmed) return;

    try {
      await navigator.clipboard.writeText(trimmed);
      showFeedback("已复制", "success");
    } catch {
      showFeedback("复制失败", "error");
    }
  }

  if (!trimmed) {
    return <span className="readonly-value-field">{emptyText}</span>;
  }

  return (
    <span className="copyable-code-wrap">
      <button
        className={className ? `copyable-code-text ${className}` : "copyable-code-text"}
        title="点击复制"
        type="button"
        onClick={(event) => void copyCode(event)}
      >
        {trimmed}
      </button>
      {feedback ? (
        <span className={`copyable-code-feedback${feedback.tone === "error" ? " is-error" : ""}`}>
          {feedback.text}
        </span>
      ) : null}
    </span>
  );
}

export function CopyableCodeField({
  emptyText = "—",
  label,
  value,
}: {
  emptyText?: string;
  label: string;
  value: string;
}) {
  return (
    <Form.Item className="form-item" label={label}>
      <CopyableCodeText emptyText={emptyText} value={value} />
    </Form.Item>
  );
}

export function ReadOnlyValueField({
  emptyText = "—",
  error,
  label,
  secondaryText,
  value,
}: {
  emptyText?: string;
  error?: string;
  label: string;
  secondaryText?: string;
  value: string;
}) {
  return (
    <Form.Item
      className="form-item form-item-readonly"
      help={error}
      label={label}
      validateStatus={error ? "error" : undefined}
    >
      <div className="readonly-value-field">
        <div>{value.trim() || emptyText}</div>
        {secondaryText ? <div className="readonly-value-field__secondary">{secondaryText}</div> : null}
      </div>
    </Form.Item>
  );
}

export function TextField({
  error,
  label,
  multiline,
  onBlur,
  onChange,
  placeholder,
  readOnly,
  required,
  value,
}: {
  error?: string;
  label: string;
  multiline?: boolean;
  onBlur?: () => void;
  onChange: (value: string) => void;
  placeholder?: string;
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
          placeholder={placeholder}
          readOnly={readOnly}
          value={value}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          placeholder={placeholder}
          readOnly={readOnly}
          value={value}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Form.Item>
  );
}

export function AppSelect({
  error,
  filterOption,
  label,
  onChange,
  onSearch,
  optionRender,
  options,
  placeholder = "请选择",
  required,
  searchValue,
  showSearch,
  value,
  width,
}: {
  error?: string;
  filterOption?: (input: string, option?: { label?: ReactNode; value?: string | number; title?: string }) => boolean;
  label?: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  optionRender?: (option: SelectOption, searchQuery: string) => ReactNode;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  searchValue?: string;
  showSearch?: boolean;
  value: string;
  width?: number;
}) {
  const [internalSearchValue, setInternalSearchValue] = useState("");
  const activeSearchValue = searchValue ?? internalSearchValue;

  const defaultFilterOption = (input: string, option?: { label?: ReactNode; value?: string | number; title?: string }) => {
    const query = input.trim().toLowerCase();
    if (!query) return true;
    const labelText = String(option?.label ?? "").toLowerCase();
    const valueText = String(option?.value ?? "").toLowerCase();
    const descriptionText = String(option?.title ?? "").toLowerCase();
    return labelText.includes(query) || valueText.includes(query) || descriptionText.includes(query);
  };

  const handleSearch = (nextValue: string) => {
    if (searchValue === undefined) {
      setInternalSearchValue(nextValue);
    }
    onSearch?.(nextValue);
  };

  const optionByValue = useMemo(() => new Map(options.map((option) => [option.value, option])), [options]);

  return (
    <Form.Item
      className="form-item"
      help={error}
      label={label}
      required={required}
      validateStatus={error ? "error" : undefined}
      style={width ? { width, marginBottom: 0 } : undefined}
    >
      <Select
        filterOption={showSearch ? filterOption ?? defaultFilterOption : undefined}
        optionLabelProp="label"
        optionRender={
          optionRender
            ? (option) => {
                const matched = optionByValue.get(String(option.value ?? ""));
                if (!matched) {
                  return option.label;
                }
                return optionRender(matched, activeSearchValue);
              }
            : undefined
        }
        options={options.map((option) => ({
          disabled: option.disabled,
          label: option.label,
          value: option.value,
          title: option.description,
        }))}
        placeholder={placeholder}
        showSearch={showSearch}
        value={value || undefined}
        onChange={onChange}
        onSearch={showSearch ? handleSearch : undefined}
      />
    </Form.Item>
  );
}

export function AppModal({
  children,
  className,
  onClose,
  title,
  width = 840,
}: {
  children: ReactNode;
  className?: string;
  onClose: () => void;
  title: string;
  width?: number | string;
}) {
  return (
    <Modal
      className={className ? `app-modal ${className}` : "app-modal"}
      footer={null}
      open
      title={title}
      width={width}
      onCancel={onClose}
    >
      <ModalNoticeProvider>{children}</ModalNoticeProvider>
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
