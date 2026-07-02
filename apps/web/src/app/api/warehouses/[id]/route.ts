import { auditActorId, writeAuditLog } from "@/lib/audit-log";
import { getPrismaClientStaleMessage } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { toWarehouseRecord } from "@/lib/warehouses";
import { NextResponse } from "next/server";

type UpdateWarehouseBody = {
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
    const body = (await request.json()) as UpdateWarehouseBody;

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: { _count: { select: { stocks: true } } },
    });
    if (!warehouse) {
      return NextResponse.json({ error: "仓库不存在" }, { status: 404 });
    }

    const nextName = body.name !== undefined ? body.name.trim() : warehouse.name;

    if (!nextName) {
      return NextResponse.json({ error: "仓库名称不能为空" }, { status: 400 });
    }

    if (nextName !== warehouse.name) {
      const nameTaken = await prisma.warehouse.findUnique({ where: { code: nextName } });
      if (nameTaken) {
        return NextResponse.json({ error: "仓库名称已存在" }, { status: 409 });
      }
    }

    const updated = await prisma.warehouse.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: nextName, code: nextName } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
      },
      include: { _count: { select: { stocks: true } } },
    });

    await writeAuditLog({
      userId: auditActorId(authResult.session),
      action: "编辑仓库",
      entity: "Warehouse",
      entityId: updated.id,
      detail: { code: updated.code, name: updated.name, active: updated.active },
    });

    return NextResponse.json(toWarehouseRecord(updated));
  } catch (error) {
    console.error("[PATCH /api/warehouses/[id]]", error);
    const staleMessage = getPrismaClientStaleMessage();
    return NextResponse.json(
      { error: staleMessage ?? "更新仓库失败，请稍后重试" },
      { status: staleMessage ? 503 : 500 },
    );
  }
}
