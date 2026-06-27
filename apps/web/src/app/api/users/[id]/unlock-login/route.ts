import { auditActorId, writeAuditLog } from "@/lib/audit-log";
import { requireAdmin } from "@/lib/auth-helpers";
import { clearLoginLock } from "@/lib/auth-login";
import { toUserRecord } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "员工不存在" }, { status: 404 });
  }

  if (user.role === "ADMIN") {
    return NextResponse.json({ error: "不能对管理员执行此操作" }, { status: 403 });
  }

  await clearLoginLock(id);

  await writeAuditLog({
    userId: auditActorId(authResult.session),
    action: "解除登录锁定",
    entity: "User",
    entityId: id,
    detail: { email: user.email },
  });

  const updated = await prisma.user.findUniqueOrThrow({ where: { id } });
  return NextResponse.json({ user: toUserRecord(updated) });
}
