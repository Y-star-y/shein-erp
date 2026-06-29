import type { AuditSeverity } from "@prisma/client";

export const AUDIT_SEVERITY_LABELS: Record<AuditSeverity, string> = {
  notice: "通知",
  info: "日常",
  warn: "警告",
  critical: "异常",
};

export const AUDIT_SEVERITY_ORDER: AuditSeverity[] = ["critical", "warn", "info", "notice"];

export const AUDIT_SEVERITY_COLORS: Record<AuditSeverity, string> = {
  notice: "default",
  info: "processing",
  warn: "warning",
  critical: "error",
};

export const AUDIT_SEVERITY_STYLE: Record<
  AuditSeverity,
  { accent: string; background: string; border: string }
> = {
  notice: { accent: "#8c8c8c", background: "#fafafa", border: "#f0f0f0" },
  info: { accent: "#1677ff", background: "#f0f7ff", border: "#d6e8ff" },
  warn: { accent: "#fa8c16", background: "#fff7e6", border: "#ffe7ba" },
  critical: { accent: "#ff4d4f", background: "#fff2f0", border: "#ffccc7" },
};

const ACTION_SEVERITY: Record<string, AuditSeverity> = {
  登录失败: "critical",
  企业微信登录失败: "critical",

  修改个人密码: "warn",
  重置密码: "warn",
  完成强制改密: "warn",
  查看证件号码: "warn",
  删除员工: "warn",
  删除店铺: "warn",
  删除SHEIN映射: "warn",
  删除内部商品: "warn",

  新增员工: "info",
  编辑员工: "info",
  新增公司: "info",
  编辑公司: "info",
  新增店铺: "info",
  编辑店铺: "info",
  店铺过户: "warn",
  新增内部商品: "info",
  编辑内部商品: "info",
  设置店铺库存预警: "info",
  新增SHEIN映射: "info",
  编辑SHEIN映射: "info",
  导入SHEIN订单: "info",
  绑定SHEIN订单SKU: "info",
  登记入库: "info",
  登记出库: "info",

  登录成功: "notice",
  企业微信登录成功: "notice",
  退出登录: "notice",
  修改个人手机: "notice",
  修改个人邮箱: "notice",
  修改个人联系方式: "notice",
};

export function resolveAuditSeverity(action: string): AuditSeverity {
  const severity = ACTION_SEVERITY[action];
  if (severity) return severity;

  if (process.env.NODE_ENV === "development") {
    console.warn(`[audit] unmapped action severity: "${action}", fallback to info`);
  }
  return "info";
}

export function formatAuditDetail(detail: unknown): string | null {
  if (detail == null) return null;
  if (typeof detail !== "object") return String(detail);

  const record = detail as Record<string, unknown>;
  const parts: string[] = [];

  if (typeof record.email === "string") parts.push(record.email);
  if (typeof record.name === "string") parts.push(record.name);
  if (typeof record.internalSku === "string") parts.push(record.internalSku);
  if (typeof record.platformSkc === "string") parts.push(record.platformSkc);
  if (typeof record.sellerSku === "string") parts.push(record.sellerSku);
  if (typeof record.filename === "string") parts.push(record.filename);
  if (typeof record.reason === "string") parts.push(record.reason);

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function formatAuditTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function auditLogDateGroup(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  if (date >= startOfToday) return "今天";
  if (date >= startOfYesterday) return "昨天";
  return date.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
}
