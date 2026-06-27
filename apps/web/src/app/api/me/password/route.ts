import { auditActorId, writeAuditLog } from "@/lib/audit-log";
import { getSessionOr401 } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { verifyUserPassword } from "@/lib/user-profile";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const body = (await request.json()) as { currentPassword?: string; newPassword?: string };
  const currentPassword = body.currentPassword?.toString() ?? "";
  const newPassword = body.newPassword?.toString() ?? "";

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "请输入原密码和新密码" }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "新密码至少 8 位" }, { status: 400 });
  }

  if (currentPassword === newPassword) {
    return NextResponse.json({ error: "新密码不能与原密码相同" }, { status: 400 });
  }

  const userId = authResult.session.user.id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) {
    return NextResponse.json({ error: "当前账户未设置密码，请联系管理员" }, { status: 400 });
  }

  const valid = await verifyUserPassword(userId, currentPassword);
  if (!valid) {
    return NextResponse.json({ error: "原密码不正确" }, { status: 403 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  await writeAuditLog({
    userId: auditActorId(authResult.session),
    action: "修改个人密码",
    entity: "User",
    entityId: userId,
  });

  return NextResponse.json({ ok: true });
}
