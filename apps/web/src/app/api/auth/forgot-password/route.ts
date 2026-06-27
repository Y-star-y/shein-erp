import {
  buildResetLink,
  createPasswordResetToken,
  isSmtpConfigured,
  resolveAppOrigin,
  sendPasswordResetEmail,
} from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const GENERIC_MESSAGE =
  "若该邮箱已注册，您将收到重置密码链接；内网未配置邮件时，请查看下方链接或服务端终端";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "请输入邮箱" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  let devLink: string | undefined;

  if (user?.active && user.passwordHash) {
    const rawToken = await createPasswordResetToken(user.id);
    const origin = resolveAppOrigin(request);
    const resetLink = buildResetLink(origin, rawToken);
    const result = await sendPasswordResetEmail(email, resetLink);

    if (!isSmtpConfigured() && result.devLink) {
      devLink = result.devLink;
    }
  }

  return NextResponse.json({
    ok: true,
    message: devLink
      ? "重置链接已生成（内网模式，请使用下方链接或查看服务端终端）"
      : GENERIC_MESSAGE,
    ...(devLink ? { devLink } : {}),
  });
}
