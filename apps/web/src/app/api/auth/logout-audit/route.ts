import { auditActorId, writeAuditLog } from "@/lib/audit-log";
import { getSessionOr401 } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";

export async function POST() {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  await writeAuditLog({
    userId: auditActorId(authResult.session),
    action: "退出登录",
    entity: "User",
    entityId: authResult.session.user.id,
    detail: { email: authResult.session.user.email },
  });

  return NextResponse.json({ ok: true });
}
