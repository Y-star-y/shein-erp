import { auditActorId, writeAuditLog } from "@/lib/audit-log";
import { getPrismaClientStaleMessage } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { toCompanyRecord } from "@/lib/companies";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type CreateCompanyBody = {
  name: string;
};

export async function GET() {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  try {
    const companies = await prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { users: true } } },
    });

    return NextResponse.json({ companies: companies.map(toCompanyRecord) });
  } catch (error) {
    console.error("[GET /api/companies]", error);
    const stale = getPrismaClientStaleMessage();
    return NextResponse.json(
      { error: stale ?? "加载公司列表失败" },
      { status: stale ? 503 : 500 },
    );
  }
}

export async function POST(request: Request) {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  const stale = getPrismaClientStaleMessage();
  if (stale) {
    return NextResponse.json({ error: stale }, { status: 503 });
  }

  try {
    const body = (await request.json()) as CreateCompanyBody;
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "公司名称不能为空" }, { status: 400 });
    }

    const existing = await prisma.company.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: "公司名称已存在" }, { status: 409 });
    }

    const company = await prisma.company.create({
      data: { name, active: true },
      include: { _count: { select: { users: true } } },
    });

    await writeAuditLog({
      userId: auditActorId(authResult.session),
      action: "新增公司",
      entity: "Company",
      entityId: company.id,
      detail: { name: company.name },
    });

    return NextResponse.json(toCompanyRecord(company), { status: 201 });
  } catch (error) {
    console.error("[POST /api/companies]", error);
    const staleMessage = getPrismaClientStaleMessage();
    return NextResponse.json(
      { error: staleMessage ?? "创建公司失败，请稍后重试" },
      { status: staleMessage ? 503 : 500 },
    );
  }
}
