"use client";

import type { OpsTodoTaskSummary } from "@shein-erp/shared";
import { Badge, Spin, Tag } from "antd";
import { AlertTriangle, ClipboardList, Link2, RotateCcw } from "lucide-react";

const TASK_ICONS = {
  order_bind: Link2,
  pending_ship: ClipboardList,
  after_sales: RotateCcw,
  shipment_exception: AlertTriangle,
} as const;

function TaskCard({
  task,
  onOpen,
}: {
  task: OpsTodoTaskSummary;
  onOpen: (task: OpsTodoTaskSummary) => void;
}) {
  const Icon = TASK_ICONS[task.id];
  const clickable = task.implemented;

  return (
    <button
      type="button"
      className={`store-card ops-todo-card${clickable ? "" : " is-placeholder"}`}
      disabled={!clickable}
      onClick={() => clickable && onOpen(task)}
    >
      <span className="store-card__icon">
        <Icon size={20} />
      </span>
      <span className="store-card__name-row">
        <span className="store-card__name">{task.title}</span>
        {task.count > 0 ? <Badge count={task.count} size="small" /> : null}
      </span>
      <span className="store-card__meta">
        {task.implemented ? (
          task.count > 0 ? (
            <Tag color="orange">待处理</Tag>
          ) : (
            <Tag color="green">已完成</Tag>
          )
        ) : (
          <Tag>敬请期待</Tag>
        )}
      </span>
      <span className="store-card__owner">{task.description}</span>
    </button>
  );
}

export function OpsTodoListPanel({
  tasks,
  loading,
  onOpenTask,
}: {
  tasks: OpsTodoTaskSummary[];
  loading: boolean;
  onOpenTask: (task: OpsTodoTaskSummary) => void;
}) {
  return (
    <Spin spinning={loading}>
      <div className="store-card-grid">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onOpen={onOpenTask} />
        ))}
      </div>
    </Spin>
  );
}
