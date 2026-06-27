import { auditActorId, writeAuditLog } from "@/lib/audit-log";
import { getPrismaClientStaleMessage } from "@/lib/api-response";
import { getSessionOr401, requireAdmin } from "@/lib/auth-helpers";
import { EMPLOYEE_ROLES, normalizePermissions, ROLE_DEFAULT_MODULES, toUserRecord } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { AppModule, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

type UpdateUserBody = {
  name?: string;
  gender?: "MALE" | "FEMALE" | null;
  idNumber?: string;
  phone?: string;
  role?: Role;
  permissions?: AppModule[];
  active?: boolean;
  password?: string;
};

function normalizeIdNumber(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toUpperCase() : null;
}

function normalizePhone(value?: string) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function validateProfileFields(body: { idNumber?: string | null; phone?: string | null }) {
  if (body.idNumber && !/^\d{15}$|^\d{17}[\dXx]$/.test(body.idNumber)) {
    return "证件号码格式不正确";
  }
  if (body.phone && !/^1\d{10}$/.test(body.phone)) {
    return "手机号码格式不正确";
  }
  return null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const stale = getPrismaClientStaleMessage();
  if (stale) {
    return NextResponse.json({ error: stale }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as UpdateUserBody;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    if (user.role === "ADMIN") {
      return NextResponse.json({ error: "不能编辑管理员账户" }, { status: 403 });
    }

    const nextRole = body.role ?? user.role;
    if (!EMPLOYEE_ROLES.includes(nextRole)) {
      return NextResponse.json({ error: "只能设置运营部或物流部" }, { status: 400 });
    }

    let permissions = user.permissions;
    if (body.permissions !== undefined || body.role !== undefined) {
      const selected = body.permissions?.length
        ? body.permissions
        : body.role !== undefined
          ? ROLE_DEFAULT_MODULES[nextRole as Exclude<Role, "ADMIN">]
          : user.permissions;

      const normalized = normalizePermissions(nextRole, selected);
      if ("error" in normalized) {
        return NextResponse.json({ error: normalized.error }, { status: 400 });
      }
      permissions = normalized.permissions;
    }

    if (body.password !== undefined && body.password.length > 0 && body.password.length < 8) {
      return NextResponse.json({ error: "密码至少 8 位" }, { status: 400 });
    }

    const nextIdNumber = body.idNumber !== undefined ? normalizeIdNumber(body.idNumber) : user.idNumber;
    const nextPhone = body.phone !== undefined ? normalizePhone(body.phone) : user.phone;
    const profileError = validateProfileFields({ idNumber: nextIdNumber, phone: nextPhone });
    if (profileError) {
      return NextResponse.json({ error: profileError }, { status: 400 });
    }

    if (nextIdNumber && nextIdNumber !== user.idNumber) {
      const idTaken = await prisma.user.findUnique({ where: { idNumber: nextIdNumber } });
      if (idTaken) {
        return NextResponse.json({ error: "证件号码已被使用" }, { status: 409 });
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.gender !== undefined ? { gender: body.gender } : {}),
        ...(body.idNumber !== undefined ? { idNumber: nextIdNumber } : {}),
        ...(body.phone !== undefined ? { phone: nextPhone } : {}),
        ...(body.role !== undefined ? { role: nextRole } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
        ...(body.active === false ? { sessionVersion: { increment: 1 } } : {}),
        permissions,
        ...(body.password
          ? {
              passwordHash: await bcrypt.hash(body.password, 12),
              mustChangePassword: true,
            }
          : {}),
      },
    });

    await writeAuditLog({
      userId: auditActorId(authResult.session),
      action: "编辑员工",
      entity: "User",
      entityId: updated.id,
      detail: {
        email: updated.email,
        role: updated.role,
        permissions: updated.permissions,
        active: updated.active,
        gender: updated.gender,
        idNumber: updated.idNumber,
        phone: updated.phone,
      },
    });

    return NextResponse.json(toUserRecord(updated));
  } catch (error) {
    console.error("[PATCH /api/users/[id]]", error);
    const staleMessage = getPrismaClientStaleMessage();
    return NextResponse.json(
      { error: staleMessage ?? "更新员工失败，请稍后重试" },
      { status: staleMessage ? 503 : 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const sessionResult = await getSessionOr401();
  if ("error" in sessionResult) return sessionResult.error;

  try {
    const { id } = await params;
    if (sessionResult.session.user.id === id) {
      return NextResponse.json({ error: "不能删除当前登录账户" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    if (user.role === "ADMIN") {
      return NextResponse.json({ error: "不能删除管理员账户" }, { status: 403 });
    }

    await prisma.user.delete({ where: { id } });

    await writeAuditLog({
      userId: auditActorId(authResult.session),
      action: "删除员工",
      entity: "User",
      entityId: id,
      detail: { email: user.email, name: user.name },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/users/[id]]", error);
    return NextResponse.json({ error: "删除员工失败，请稍后重试" }, { status: 500 });
  }
}
