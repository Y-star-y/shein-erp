-- Remove "todo" severity; rename to "info" (日常业务日志)

ALTER TYPE "AuditSeverity" RENAME VALUE 'todo' TO 'info';

ALTER TABLE "AuditLog" ALTER COLUMN "severity" SET DEFAULT 'info';
