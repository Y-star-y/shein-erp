"use client";

import { AlertCircle, Check, ChevronDown, Package, X } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import type { ConfirmState, SelectOption, Toast } from "./types";

export function PageHeader({ action, description, title }: { action: ReactNode; description: string; title: string }) {
  return (
    <section className="page-header">
      <div>
        <span className="eyebrow">SKU 管理</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </section>
  );
}

export function Panel({ action, children, count, title }: { action?: ReactNode; children: ReactNode; count?: number; title: string }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h3>{title}</h3>
          {typeof count === "number" && <span>{count} 条</span>}
        </div>
        {action}
      </div>
      {children}
    </section>
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
  required,
  value,
}: {
  error?: string;
  label: string;
  multiline?: boolean;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  return (
    <label className={`field ${error ? "has-error" : ""}`}>
      <span>
        {label}
        {required && <b>*</b>}
      </span>
      {multiline ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} />
      )}
      {error && <em>{error}</em>}
    </label>
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
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className={`select-field ${error ? "has-error" : ""}`} ref={rootRef} style={width ? { width } : undefined}>
      {label && <span>{label}</span>}
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        type="button"
        className={open ? "open" : ""}
        onClick={() => setOpen((current) => !current)}
      >
        <strong>{selected?.label || placeholder}</strong>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="select-popover" role="listbox">
          {options.map((option) => (
            <button
              aria-selected={option.value === value}
              className={option.value === value ? "selected" : ""}
              disabled={option.disabled}
              key={option.value}
              role="option"
              type="button"
              onClick={() => {
                if (option.disabled) return;
                onChange(option.value);
                setOpen(false);
              }}
            >
              <span>
                <b>{option.label}</b>
                {option.description && <em>{option.description}</em>}
              </span>
              {option.value === value && <Check size={15} />}
            </button>
          ))}
        </div>
      )}
      {error && <em>{error}</em>}
    </div>
  );
}

export function AppModal({ children, onClose, title }: { children: ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="modal-mask" onMouseDown={onClose}>
      <section className="app-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span>冰域 ERP</span>
            <h3>{title}</h3>
          </div>
          <button aria-label="关闭弹窗" type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function ConfirmModal({ confirm, onCancel }: { confirm: ConfirmState; onCancel: () => void }) {
  if (!confirm) return null;

  return (
    <div className="modal-mask">
      <section className="confirm-modal">
        <div className={`confirm-icon ${confirm.tone === "danger" ? "danger" : "primary"}`}>
          <AlertCircle size={22} />
        </div>
        <h3>{confirm.title}</h3>
        <p>{confirm.description}</p>
        <div>
          <button type="button" onClick={onCancel}>取消</button>
          <button className={confirm.tone === "danger" ? "danger-btn" : "primary-btn"} type="button" onClick={confirm.onConfirm}>
            {confirm.confirmText}
          </button>
        </div>
      </section>
    </div>
  );
}

export function ToastHost({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toast-host">
      {toasts.map((toast) => (
        <div className={`toast ${toast.type}`} key={toast.id}>
          {toast.type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}

export function StatusTag({ tone, value }: { tone: "success" | "warning" | "danger" | "neutral"; value: string }) {
  return <span className={`status-tag ${tone}`}>{value}</span>;
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
    <div className="empty-block">
      {icon}
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

export type { FormEvent };
