import { auditActorId, writeAuditLog } from "@/lib/audit-log";
import { getPrismaClientStaleMessage } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { toWarehouseRecord } from "@/lib/warehouses";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type CreateWarehouseBody = {
  name: string;
};

export async function GET() {
  const authResult = await requireAdmin();
  if ("error" in authResult) return authResult.error;

  try {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { stocks: true } } },
    });

    return NextResponse.json({ warehouses: warehouses.map(toWarehouseRecord) });
  } catch (error) {
    console.error("[GET /api/warehouses]", error);
    const stale = getPrismaClientStaleMessage();
    return NextResponse.json(
      { error: stale ?? "加载仓库列表失败" },
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
    const body = (await request.json()) as CreateWarehouseBody;
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "仓库名称不能为空" }, { status: 400 });
    }

    const existing = await prisma.warehouse.findUnique({ where: { code: name } });
    if (existing) {
      return NextResponse.json({ error: "仓库名称已存在" }, { status: 409 });
    }

    const warehouse = await prisma.warehouse.create({
      data: { code: name, name, active: true },
      include: { _count: { select: { stocks: true } } },
    });

    await writeAuditLog({
      userId: auditActorId(authResult.session),
      action: "新增仓库",
      entity: "Warehouse",
      entityId: warehouse.id,
      detail: { code: warehouse.code, name: warehouse.name },
    });

    return NextResponse.json(toWarehouseRecord(warehouse), { status: 201 });
  } catch (error) {
    console.error("[POST /api/warehouses]", error);
    const staleMessage = getPrismaClientStaleMessage();
    return NextResponse.json(
      { error: staleMessage ?? "创建仓库失败，请稍后重试" },
      { status: staleMessage ? 503 : 500 },
    );
  }
}
