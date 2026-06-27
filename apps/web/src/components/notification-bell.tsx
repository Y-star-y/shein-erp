"use client";

import type { AppNotification, NotificationsSummary, PageKey } from "@shein-erp/shared";
import { Badge, Button, Dropdown, Empty, Spin } from "antd";
import { Bell, ClipboardList, Link2 } from "lucide-react";
import { useState } from "react";

const TYPE_ICONS = {
  order_bind: Link2,
  pending_order: ClipboardList,
} as const;

type NotificationBellProps = {
  summary: NotificationsSummary;
  loading?: boolean;
  onNavigate: (page: PageKey, tab?: string) => void;
};

export function NotificationBell({ summary, loading = false, onNavigate }: NotificationBellProps) {
  const [open, setOpen] = useState(false);

  function handleSelect(item: AppNotification) {
    setOpen(false);
    onNavigate(item.page, item.tab);
  }

  const dropdownContent = (
    <div className="notification-panel">
      <div className="notification-panel__header">
        <strong>待办通知</strong>
        {summary.total > 0 ? <span className="notification-panel__count">{summary.total} 项待处理</span> : null}
      </div>

      <Spin spinning={loading}>
        {summary.items.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无待办" className="notification-panel__empty" />
        ) : (
          <ul className="notification-list">
            {summary.items.map((item) => {
              const Icon = TYPE_ICONS[item.type];
              return (
                <li key={item.id}>
                  <button type="button" className="notification-item" onClick={() => handleSelect(item)}>
                    <span className={`notification-item__icon notification-item__icon--${item.type}`}>
                      <Icon size={16} />
                    </span>
                    <span className="notification-item__body">
                      <span className="notification-item__title">
                        {item.title}
                        <Badge count={item.count} size="small" />
                      </span>
                      <span className="notification-item__desc">{item.description}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Spin>
    </div>
  );

  return (
    <Dropdown
      open={open}
      trigger={["click"]}
      placement="bottomRight"
      popupRender={() => dropdownContent}
      onOpenChange={setOpen}
    >
      <Badge count={summary.total} size="small" overflowCount={99} className="notification-bell-badge">
        <Button
          aria-label="待办通知"
          className="notification-bell-btn"
          icon={<Bell size={18} />}
          type="text"
        />
      </Badge>
    </Dropdown>
  );
}
