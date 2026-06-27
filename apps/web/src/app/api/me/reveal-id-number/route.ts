import { auditActorId, writeAuditLog } from "@/lib/audit-log";
import { getSessionOr401 } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { verifyUserPassword } from "@/lib/user-profile";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const body = (await request.json()) as { password?: string };
  const password = body.password?.toString() ?? "";
  if (!password) {
    return NextResponse.json({ error: "请输入登录密码" }, { status: 400 });
  }

  const userId = authResult.session.user.id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) {
    return NextResponse.json({ error: "当前账户未设置密码，请联系管理员" }, { status: 400 });
  }

  const valid = await verifyUserPassword(userId, password);
  if (!valid) {
    return NextResponse.json({ error: "密码不正确" }, { status: 403 });
  }

  if (!user.idNumber) {
    return NextResponse.json({ error: "未登记证件号码" }, { status: 404 });
  }

  await writeAuditLog({
    userId: auditActorId(authResult.session),
    action: "查看证件号码",
    entity: "User",
    entityId: userId,
  });

  return NextResponse.json({ ok: true });
}
