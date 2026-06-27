import { auditActorId, writeAuditLog } from "@/lib/audit-log";
import { getPrismaClientStaleMessage } from "@/lib/api-response";
import { getSessionOr401, requireAdmin } from "@/lib/auth-helpers";
import {
  EMPLOYEE_ROLES,
  normalizePermissions,
  ROLE_DEFAULT_MODULES,
  toUserRecord,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Role, type AppModule } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

type CreateUserBody = {
  name: string;
  gender?: "MALE" | "FEMALE" | null;
  idNumber?: string;
  phone?: string;
  email: string;
  password: string;
  role: Role;
  permissions?: AppModule[];
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

function prismaStaleResponse() {
  const message = getPrismaClientStaleMessage();
  if (!message) return null;
  return NextResponse.json({ error: message }, { status: 503 });
}

export async function GET() {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  try {
    const users = await prisma.user.findMany({
      where: { role: { not: Role.ADMIN } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users: users.map(toUserRecord) });
  } catch (error) {
    console.error("[GET /api/users]", error);
    const stale = getPrismaClientStaleMessage();
    return NextResponse.json(
      { error: stale ?? "加载员工列表失败" },
      { status: stale ? 503 : 500 },
    );
  }
}

export async function POST(request: Request) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const staleResponse = prismaStaleResponse();
  if (staleResponse) return staleResponse;

  try {
    const body = (await request.json()) as CreateUserBody;
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.toString() ?? "";
    const role = body.role;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "姓名、邮箱和密码不能为空" }, { status: 400 });
    }

    if (!EMPLOYEE_ROLES.includes(role)) {
      return NextResponse.json({ error: "只能创建运营部或物流部员工" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "密码至少 8 位" }, { status: 400 });
    }

    const selected = body.permissions?.length
      ? body.permissions
      : ROLE_DEFAULT_MODULES[role as Exclude<Role, "ADMIN">];

    const normalized = normalizePermissions(role, selected);
    if ("error" in normalized) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }

    const idNumber = normalizeIdNumber(body.idNumber);
    const phone = normalizePhone(body.phone);
    const profileError = validateProfileFields({ idNumber, phone });
    if (profileError) {
      return NextResponse.json({ error: profileError }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "邮箱已被使用" }, { status: 409 });
    }

    if (idNumber) {
      const idTaken = await prisma.user.findUnique({ where: { idNumber } });
      if (idTaken) {
        return NextResponse.json({ error: "证件号码已被使用" }, { status: 409 });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        gender: body.gender ?? null,
        idNumber,
        phone,
        role,
        passwordHash,
        permissions: normalized.permissions,
        active: true,
        mustChangePassword: true,
      },
    });

    await writeAuditLog({
      userId: auditActorId(authResult.session),
      action: "新增员工",
      entity: "User",
      entityId: user.id,
      detail: {
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        gender: user.gender,
        idNumber: user.idNumber,
        phone: user.phone,
      },
    });

    return NextResponse.json(toUserRecord(user), { status: 201 });
  } catch (error) {
    console.error("[POST /api/users]", error);
    const stale = getPrismaClientStaleMessage();
    return NextResponse.json(
      { error: stale ?? "创建员工失败，请稍后重试" },
      { status: stale ? 503 : 500 },
    );
  }
}
