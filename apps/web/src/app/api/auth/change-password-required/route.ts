import { auditActorId, writeAuditLog } from "@/lib/audit-log";
import { getSessionOr401 } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const body = (await request.json()) as {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  };

  const currentPassword = body.currentPassword?.toString() ?? "";
  const newPassword = body.newPassword?.toString() ?? "";
  const confirmPassword = body.confirmPassword?.toString() ?? "";

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "请输入当前密码和新密码" }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "新密码至少 8 位" }, { status: 400 });
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "两次输入的新密码不一致" }, { status: 400 });
  }

  const userId = authResult.session.user.id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) {
    return NextResponse.json({ error: "当前账户未设置密码" }, { status: 400 });
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "当前密码不正确" }, { status: 403 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      mustChangePassword: false,
      failedLoginAttempts: 0,
      loginFailureWindowStart: null,
      lockedUntil: null,
    },
  });

  await writeAuditLog({
    userId: auditActorId(authResult.session),
    action: "完成强制改密",
    entity: "User",
    entityId: userId,
  });

  return NextResponse.json({ ok: true, mustChangePassword: false });
}
