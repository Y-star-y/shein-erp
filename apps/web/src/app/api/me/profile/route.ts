import { auditActorId, writeAuditLog } from "@/lib/audit-log";
import { getSessionOr401 } from "@/lib/auth-helpers";
import { GENDER_LABELS, toUserRecord } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  maskIdNumber,
  normalizeEmail,
  normalizePhone,
  validateEmail,
  validatePhone,
} from "@/lib/user-profile";
import { NextResponse } from "next/server";

function buildProfileResponse(
  user: Parameters<typeof toUserRecord>[0],
  idNumberRevealed: boolean,
) {
  const record = toUserRecord(user);
  return {
    profile: {
      ...record,
      genderLabel: user.gender ? GENDER_LABELS[user.gender] : null,
      idNumberMasked: maskIdNumber(user.idNumber),
      idNumber: idNumberRevealed ? user.idNumber : null,
    },
  };
}

export async function GET() {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const user = await prisma.user.findUnique({ where: { id: authResult.session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  return NextResponse.json(
    buildProfileResponse(user, Boolean(authResult.session.user.idNumberRevealed)),
  );
}

export async function PATCH(request: Request) {
  const authResult = await getSessionOr401();
  if ("error" in authResult) return authResult.error;

  const body = (await request.json()) as { phone?: string; email?: string };
  const hasPhone = body.phone !== undefined;
  const hasEmail = body.email !== undefined;

  if (!hasPhone && !hasEmail) {
    return NextResponse.json({ error: "请提供要修改的手机号或邮箱" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: authResult.session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  const data: { phone?: string | null; email?: string } = {};
  const auditDetails: Record<string, unknown> = {};

  if (hasPhone) {
    const phone = normalizePhone(body.phone);
    const phoneError = validatePhone(phone);
    if (phoneError) {
      return NextResponse.json({ error: phoneError }, { status: 400 });
    }
    if (phone === user.phone) {
      return NextResponse.json({ error: "新手机号与当前相同" }, { status: 400 });
    }
    data.phone = phone;
    auditDetails.phone = { from: user.phone, to: phone };
  }

  if (hasEmail) {
    const email = normalizeEmail(body.email);
    const emailError = validateEmail(email);
    if (emailError) {
      return NextResponse.json({ error: emailError }, { status: 400 });
    }
    if (email === user.email) {
      return NextResponse.json({ error: "新邮箱与当前相同" }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "邮箱已被使用" }, { status: 409 });
    }
    data.email = email;
    auditDetails.email = { from: user.email, to: email };
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
  });

  await writeAuditLog({
    userId: auditActorId(authResult.session),
    action: hasPhone && hasEmail ? "修改个人联系方式" : hasPhone ? "修改个人手机" : "修改个人邮箱",
    entity: "User",
    entityId: user.id,
    detail: auditDetails,
  });

  return NextResponse.json(
    buildProfileResponse(updated, Boolean(authResult.session.user.idNumberRevealed)),
  );
}
