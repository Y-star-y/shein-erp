"use client";

import { readJsonResponse } from "@/lib/api-response";
import {
  AUDIT_SEVERITY_LABELS,
  AUDIT_SEVERITY_ORDER,
  AUDIT_SEVERITY_STYLE,
  auditLogDateGroup,
  formatAuditDetail,
  formatAuditTime,
} from "@/lib/audit-actions";
import { Panel, useErpStore } from "@shein-erp/shared";
import type { AuditSeverity } from "@prisma/client";
import { Empty, Input, Spin, Tag } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";

export type AuditLogRecord = {
  id: string;
  action: string;
  severity: AuditSeverity;
  detail: unknown;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
};

type SeverityFilter = AuditSeverity | "all";

type AuditLogPanelProps = {
  refreshKey?: number;
};

function groupLogsByDate(logs: AuditLogRecord[]): { label: string; items: AuditLogRecord[] }[] {
  const groups = new Map<string, AuditLogRecord[]>();
  for (const log of logs) {
    const label = auditLogDateGroup(log.createdAt);
    const bucket = groups.get(label) ?? [];
    bucket.push(log);
    groups.set(label, bucket);
  }
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

export function AuditLogPanel({ refreshKey = 0 }: AuditLogPanelProps) {
  const { pushToast } = useErpStore();
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (severity !== "all") params.set("severity", severity);
      if (searchQuery) params.set("q", searchQuery);

      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      const data = await readJsonResponse<{ logs?: AuditLogRecord[]; error?: string }>(response);
      if (!response.ok) {
        throw new Error(data?.error ?? "加载操作日志失败");
      }
      setLogs(data?.logs ?? []);
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "加载操作日志失败");
    } finally {
      setLoading(false);
    }
  }, [pushToast, searchQuery, severity]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs, refreshKey]);

  const groupedLogs = useMemo(() => groupLogsByDate(logs), [logs]);

  return (
    <Panel title="操作日志" count={logs.length}>
      <div className="audit-log-toolbar">
        <Input.Search
          allowClear
          placeholder="搜索动作、操作人姓名或邮箱"
          className="audit-log-search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <div className="audit-log-filters" role="tablist" aria-label="日志等级筛选">
          <button
            type="button"
            className={`audit-log-filter${severity === "all" ? " is-active" : ""}`}
            onClick={() => setSeverity("all")}
          >
            全部
          </button>
          {AUDIT_SEVERITY_ORDER.map((level) => {
            const style = AUDIT_SEVERITY_STYLE[level];
            return (
              <button
                key={level}
                type="button"
                className={`audit-log-filter audit-log-filter--${level}${severity === level ? " is-active" : ""}`}
                style={
                  severity === level
                    ? { borderColor: style.accent, color: style.accent, background: style.background }
                    : undefined
                }
                onClick={() => setSeverity(level)}
              >
                {AUDIT_SEVERITY_LABELS[level]}
              </button>
            );
          })}
        </div>
      </div>

      <Spin spinning={loading}>
        {logs.length === 0 && !loading ? (
          <Empty description="暂无操作日志" className="audit-log-empty" />
        ) : (
          <div className="audit-log-feed">
            {groupedLogs.map((group) => (
              <section key={group.label} className="audit-log-group">
                <div className="audit-log-group__label">{group.label}</div>
                <div className="audit-log-group__items">
                  {group.items.map((log) => {
                    const style = AUDIT_SEVERITY_STYLE[log.severity];
                    const detail = formatAuditDetail(log.detail);
                    return (
                      <article
                        key={log.id}
                        className={`audit-log-item audit-log-item--${log.severity}`}
                        style={{
                          background: style.background,
                          borderColor: style.border,
                          borderLeftColor: style.accent,
                        }}
                      >
                        <div className="audit-log-item__head">
                          <Tag
                            variant="filled"
                            className="audit-log-item__tag"
                            style={{ color: style.accent, background: "#fff" }}
                          >
                            {AUDIT_SEVERITY_LABELS[log.severity]}
                          </Tag>
                          <span className="audit-log-item__action">{log.action}</span>
                          <time className="audit-log-item__time" dateTime={log.createdAt}>
                            {formatAuditTime(log.createdAt)}
                          </time>
                        </div>
                        <div className="audit-log-item__meta">
                          <span className="audit-log-item__actor">{log.user?.name ?? "系统"}</span>
                          {log.user?.email ? (
                            <span className="audit-log-item__email">{log.user.email}</span>
                          ) : null}
                        </div>
                        {detail ? <p className="audit-log-item__detail">{detail}</p> : null}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </Spin>
    </Panel>
  );
}
