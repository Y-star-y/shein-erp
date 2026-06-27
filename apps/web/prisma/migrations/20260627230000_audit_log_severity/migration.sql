-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('error', 'warn', 'info', 'notice');

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN "severity" "AuditSeverity" NOT NULL DEFAULT 'info';

-- Backfill severity by action
UPDATE "AuditLog" SET "severity" = 'error' WHERE "action" IN ('登录失败', '企业微信登录失败');

UPDATE "AuditLog" SET "severity" = 'warn' WHERE "action" IN (
  '修改个人密码',
  '重置密码',
  '完成强制改密',
  '查看证件号码',
  '删除员工',
  '删除店铺',
  '删除SHEIN映射',
  '删除内部商品'
);

UPDATE "AuditLog" SET "severity" = 'notice' WHERE "action" IN (
  '登录成功',
  '企业微信登录成功',
  '退出登录',
  '修改个人手机',
  '修改个人邮箱',
  '修改个人联系方式'
);

-- CreateIndex
CREATE INDEX "AuditLog_severity_createdAt_idx" ON "AuditLog"("severity", "createdAt");
