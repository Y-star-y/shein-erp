import { auditActorId, writeAuditLog } from "@/lib/audit-log";
import { getPrismaClientStaleMessage } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { toCompanyRecord } from "@/lib/companies";

type UpdateCompanyBody = {
  name?: string;
  active?: boolean;
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const stale = getPrismaClientStaleMessage();
  if (stale) {
    return NextResponse.json({ error: stale }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as UpdateCompanyBody;

    const company = await prisma.company.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!company) {
      return NextResponse.json({ error: "公司不存在" }, { status: 404 });
    }

    const nextName = body.name !== undefined ? body.name.trim() : company.name;
    if (!nextName) {
      return NextResponse.json({ error: "公司名称不能为空" }, { status: 400 });
    }

    if (nextName !== company.name) {
      const nameTaken = await prisma.company.findUnique({ where: { name: nextName } });
      if (nameTaken) {
        return NextResponse.json({ error: "公司名称已存在" }, { status: 409 });
      }
    }

    const updated = await prisma.company.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: nextName } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
      },
      include: { _count: { select: { users: true } } },
    });

    await writeAuditLog({
      userId: auditActorId(authResult.session),
      action: "编辑公司",
      entity: "Company",
      entityId: updated.id,
      detail: { name: updated.name, active: updated.active },
    });

    return NextResponse.json(toCompanyRecord(updated));
  } catch (error) {
    console.error("[PATCH /api/companies/[id]]", error);
    const staleMessage = getPrismaClientStaleMessage();
    return NextResponse.json(
      { error: staleMessage ?? "更新公司失败，请稍后重试" },
      { status: staleMessage ? 503 : 500 },
    );
  }
}
