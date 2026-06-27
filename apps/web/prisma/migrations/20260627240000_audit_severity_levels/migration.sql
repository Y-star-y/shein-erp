-- Rename audit severity levels: notice / todo / warn / critical (通知/待办/警告/异常)

CREATE TYPE "AuditSeverity_new" AS ENUM ('notice', 'todo', 'warn', 'critical');

ALTER TABLE "AuditLog" ALTER COLUMN "severity" DROP DEFAULT;

ALTER TABLE "AuditLog" ALTER COLUMN "severity" TYPE "AuditSeverity_new" USING (
  CASE "severity"::text
    WHEN 'error' THEN 'critical'::"AuditSeverity_new"
    WHEN 'warn' THEN 'warn'::"AuditSeverity_new"
    WHEN 'info' THEN 'todo'::"AuditSeverity_new"
    WHEN 'notice' THEN 'notice'::"AuditSeverity_new"
    ELSE 'todo'::"AuditSeverity_new"
  END
);

ALTER TABLE "AuditLog" ALTER COLUMN "severity" SET DEFAULT 'todo';

DROP TYPE "AuditSeverity";

ALTER TYPE "AuditSeverity_new" RENAME TO "AuditSeverity";
