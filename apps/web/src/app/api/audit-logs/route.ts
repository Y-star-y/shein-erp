import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import type { AuditSeverity } from "@prisma/client";
import { NextResponse } from "next/server";

const VALID_SEVERITIES = new Set<string>(["notice", "info", "warn", "critical"]);

export async function GET(request: Request) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
  const severityParam = searchParams.get("severity");
  const q = searchParams.get("q")?.trim() ?? "";

  const severity =
    severityParam && VALID_SEVERITIES.has(severityParam) ? (severityParam as AuditSeverity) : undefined;

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(severity ? { severity } : {}),
      ...(q
        ? {
            OR: [
              { action: { contains: q, mode: "insensitive" } },
              { user: { name: { contains: q, mode: "insensitive" } } },
              { user: { email: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({
    logs: logs.map((log) => ({
      id: log.id,
      action: log.action,
      severity: log.severity,
      detail: log.detail,
      createdAt: log.createdAt.toISOString(),
      user: log.user ? { id: log.user.id, name: log.user.name, email: log.user.email } : null,
    })),
  });
}
