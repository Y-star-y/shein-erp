import { auditActorId, writeAuditLog } from "@/lib/audit-log";
import { consumeResetToken } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { token?: string; password?: string; confirmPassword?: string };
  const token = body.token?.toString() ?? "";
  const password = body.password?.toString() ?? "";
  const confirmPassword = body.confirmPassword?.toString() ?? "";

  if (!token || !password) {
    return NextResponse.json({ error: "无效的重置请求" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "密码至少 8 位" }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ error: "两次输入的密码不一致" }, { status: 400 });
  }

  const user = await consumeResetToken(token);
  if (!user) {
    return NextResponse.json({ error: "链接无效或已过期" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      mustChangePassword: false,
      failedLoginAttempts: 0,
      loginFailureWindowStart: null,
      lockedUntil: null,
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "重置密码",
    entity: "User",
    entityId: user.id,
    detail: { email: user.email },
  });

  return NextResponse.json({ ok: true });
}
