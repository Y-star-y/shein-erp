import { resolveAuditSeverity } from "@/lib/audit-actions";
import { prisma } from "@/lib/prisma";
import type { AuditSeverity, Prisma } from "@prisma/client";

type AuditInput = {
  userId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  severity?: AuditSeverity;
  detail?: Prisma.InputJsonValue;
};

export async function writeAuditLog(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        severity: input.severity ?? resolveAuditSeverity(input.action),
        detail: input.detail ?? undefined,
      },
    });
  } catch (error) {
    console.error("[writeAuditLog]", error);
  }
}

export function auditActorId(session: { user?: { id?: string } | null }) {
  return session?.user?.id ?? null;
}
